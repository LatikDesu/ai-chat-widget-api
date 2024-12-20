import { encoding_for_model } from '@dqbd/tiktoken'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama'
import { Prisma, Prompt } from '@prisma/client'
import { createError } from 'h3'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const createPromptSchema = z.object({
	botId: z.string().uuid(),
	category: z.string().min(1),
	content: z.string().min(1),
	isActive: z.boolean().default(true),
})

const updatePromptSchema = z.object({
	id: z.string().uuid(),
	content: z.string().min(1),
	isActive: z.boolean().default(true),
})

export class GptService {
	private chatModel: ChatOllama
	private embeddingsModel: OllamaEmbeddings
	constructor() {
		this.chatModel = new ChatOllama({
			model: process.env.OLLAMA_MODEL,
			baseUrl: process.env.OLLAMA_BASE_URL,
			temperature: 0,
		})
		this.embeddingsModel = new OllamaEmbeddings({
			model: process.env.OLLAMA_EMBEDDING_MODEL,
			baseUrl: process.env.OLLAMA_BASE_URL,
		})
	}

	// Метод для получения ответа от GPT
	async getResponse(apiKeyId: string, chatId: string, content?: string) {
		try {
			const encoding = encoding_for_model('gpt-4o')

			// Получаем бота по apiKeyId
			const question = content || ''
			const botSettings = await this.getBotSettings(apiKeyId, chatId)

			// Получаем векторное хранилище промптов
			const vectorStore = PrismaVectorStore.withModel<Prompt>(prisma).create(
				this.embeddingsModel,
				{
					prisma: Prisma,
					tableName: 'Prompt',
					vectorColumnName: 'vector',
					columns: {
						id: PrismaVectorStore.IdColumn,
						content: PrismaVectorStore.ContentColumn,
					},
					filter: { botId: { equals: botSettings.bot.id } },
				}
			)
			const retriever = vectorStore.asRetriever()

			const outputParser = new StringOutputParser()

			// standalone question chain
			const standaloneQuestionTemplate = `Given a question, convert the question to a standalone question.
			question: {question}
			standalone question:`
			const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
				standaloneQuestionTemplate
			)

			// answer prompt
			const answerTemplate = `
			Роль: ${botSettings.bot.role}
			Задачи: ${botSettings.bot.tasks}
			Особенности эмоционального профиля: ${botSettings.bot.emotionalProfile}
			Контекст: ${botSettings.bot.context}
			Пример: ${botSettings.bot.example}
			Примечания: ${botSettings.bot.notes}
			Информацию ищи только в контексте.
			Попробуйте найти ответ в контесте. Не пытайтесь придумать ответ. Если вопрос не связан с контекстом, ролью, задачами - ответа нет.
			Используй для ответа информацию из контекста. Не отвечайте на просьбы не связанные с контекстом.
			Если вы не можете найти ответ, извинитесь и попросите задавай вопросы по теме. Не используй в ответе слово контекст.
			context: {context}
			question: {question}
			answer: `

			const answerPrompt = PromptTemplate.fromTemplate(answerTemplate)

			const chain = standaloneQuestionPrompt
				.pipe(this.chatModel)
				.pipe(outputParser)
				.pipe(retriever)
				.pipe(docs => ({
					question,
					context: docs.map(e => e.pageContent).join('\n\n'),
				}))
				.pipe(answerPrompt)
				.pipe(this.chatModel)
				.pipe(outputParser)

			// Invoke the chain to get a response from the model
			const startTime = Date.now() // Start timing
			const response = await chain.invoke({
				question: content || '',
			})

			const endTime = Date.now() // End timing
			const responseTime = endTime - startTime
			const Tokens = encoding.encode(response.toString()).length

			if (response) {
				return {
					tokens: Tokens,
					responseTime: responseTime,
					response: response,
				}
			}
		} catch (error) {
			console.error('GPT Error:', error)
			throw new Error('Failed to get GPT response')
		}
	}

	// Получаем настройки бота
	async getBotSettings(apiKeyId: string, chatId: string) {
		try {
			// Получаем бота по apiKeyId
			const bot = await prisma.chatBot.findFirst({
				where: { apiKeyId },
				select: {
					id: true,
					role: true,
					tasks: true,
					emotionalProfile: true,
					context: true,
					example: true,
					notes: true,
					categories: true,
				},
			})

			const messages = await prisma.message.findMany({
				where: { chatId },
				orderBy: { createdAt: 'desc' },
				take: 5,
				select: {
					role: true,
					content: true,
				},
			})

			// Разворачиваем массив, чтобы сообщения шли от старых к новым
			messages.reverse()

			if (!bot) {
				throw new Error('Bot not found')
			}

			return { bot, messages }
		} catch (error) {
			console.error('Chat Processing Error:', error)
			throw error
		}
	}
	async createPromptEmbeddings(data: z.infer<typeof createPromptSchema>) {
		const vectorStore = PrismaVectorStore.withModel<Prompt>(prisma).create(
			this.embeddingsModel,
			{
				prisma: Prisma,
				tableName: 'Prompt',
				vectorColumnName: 'vector',
				columns: {
					id: PrismaVectorStore.IdColumn,
					content: PrismaVectorStore.ContentColumn,
				},
				filter: {
					botId: { equals: data.botId },
				},
			}
		)
		const prompt = await prisma.prompt.create({
			data: {
				content: data.content,
				botId: data.botId,
				category: data.category,
				isActive: data.isActive,
			},
			select: {
				id: true,
				botId: true,
				category: true,
				content: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
			},
		})
		try {
			await vectorStore.addModels([prompt])
		} catch (vectorError) {
			await prisma.prompt.delete({
				where: { id: prompt.id },
			})
			throw createError({
				statusCode: 500,
				message: 'Failed to add prompt to vector store',
			})
		}
		return {
			success: true,
			data: prompt,
		}
	}
	catch(error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to create prompt',
		})
	}

	async updatePromptEmbeddings(data: z.infer<typeof updatePromptSchema>) {
		const existingPrompt = await prisma.prompt.findUnique({
			where: { id: data.id },
			select: { botId: true },
		})

		if (!existingPrompt) {
			throw createError({
				statusCode: 404,
				message: 'Prompt not found',
			})
		}

		const vectorStore = PrismaVectorStore.withModel<Prompt>(prisma).create(
			this.embeddingsModel,
			{
				prisma: Prisma,
				tableName: 'Prompt',
				vectorColumnName: 'vector',
				columns: {
					id: PrismaVectorStore.IdColumn,
					content: PrismaVectorStore.ContentColumn,
				},
				filter: {
					botId: { equals: existingPrompt.botId },
				},
			}
		)

		const prompt = await prisma.prompt.update({
			where: { id: data.id },
			data: {
				content: data.content,
				isActive: data.isActive,
			},
			select: {
				id: true,
				botId: true,
				category: true,
				content: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
			},
		})
		try {
			await vectorStore.addModels([prompt])
			return {
				success: true,
				data: prompt,
			}
		} catch (vectorError) {
			throw createError({
				statusCode: 500,
				message: 'Failed to add prompt to vector store',
			})
		}
	}

	async createPromptsFromPDFEmbeddings(botId: string, filePath: string) {
		try {
			// Загружаем PDF
			const loader = new PDFLoader(filePath)
			const docs = await loader.load()

			// Разбиваем на ч��нки
			const splitter = new RecursiveCharacterTextSplitter({
				chunkSize: 512,
				chunkOverlap: 64,
			})
			const chunks = await splitter.splitDocuments(docs)

			// Создаем векторное хранилище
			const vectorStore = PrismaVectorStore.withModel<Prompt>(prisma).create(
				this.embeddingsModel,
				{
					prisma: Prisma,
					tableName: 'Prompt',
					vectorColumnName: 'vector',
					columns: {
						id: PrismaVectorStore.IdColumn,
						content: PrismaVectorStore.ContentColumn,
					},
				}
			)
			await prisma.prompt.deleteMany({
				where: {
					botId,
					category: 'pdf',
				},
			})
			// Создаем промпты из чанков
			for (const chunk of chunks) {
				const prompt = await prisma.prompt.create({
					data: {
						content: chunk.pageContent,
						botId: botId,
						category: 'pdf',
						isActive: true,
					},
					select: {
						id: true,
						botId: true,
						category: true,
						content: true,
						isActive: true,
						createdAt: true,
						updatedAt: true,
					},
				})

				try {
					await vectorStore.addModels([prompt])
				} catch (vectorError) {
					await prisma.prompt.delete({
						where: { id: prompt.id },
					})
					throw createError({
						statusCode: 500,
						message: 'Failed to add prompt to vector store',
					})
				}
			}

			return {
				success: true,
				data: {
					filePath,
					totalChunks: chunks.length,
				},
			}
		} catch (error: any) {
			throw createError({
				statusCode: error.statusCode || 500,
				message: error.message || 'Failed to create prompt',
			})
		}
	}
}
