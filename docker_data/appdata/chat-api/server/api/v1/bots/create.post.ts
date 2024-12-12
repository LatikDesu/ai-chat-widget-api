import { createError, defineEventHandler } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const createBotSchema = z.object({
	apiKeyId: z.string(),
	role: z.string().optional(),
	tasks: z.string().optional(),
	emotionalProfile: z.string().optional(),
	context: z.string().optional(),
	example: z.string().optional(),
	notes: z.string().optional(),
	categories: z.array(z.string()).optional(),
})

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || (user.role !== 'administrator' && user.role !== 'business')) {
			throw createError({
				statusCode: 403,
				message:
					'Access denied. Only administrators and business users can create bots.',
			})
		}

		// Валидируем входные данные
		const body = await readBody(event)
		const data = createBotSchema.parse(body)

		// Проверяем существование API ключа
		const apiKey = await prisma.apiKey.findUnique({
			where: { id: data.apiKeyId },
		})

		if (!apiKey) {
			throw createError({
				statusCode: 404,
				message: 'API key not found',
			})
		}

		// Проверяем права на API ключ
		if (user.role === 'business' && apiKey.owner !== user.email) {
			throw createError({
				statusCode: 403,
				message:
					'Access denied. You can only create bots for your own API keys.',
			})
		}

		// Проверяем, не существует ли уже бот для этого API ключа
		const existingBot = await prisma.chatBot.findUnique({
			where: { apiKeyId: data.apiKeyId },
		})

		if (existingBot) {
			throw createError({
				statusCode: 400,
				message: 'Bot already exists for this API key',
			})
		}

		// Создаем бота и кастомизацию в одной транзакции
		const bot = await prisma.$transaction(async tx => {
			// Создаем бота
			const bot = await tx.chatBot.create({
				data: {
					apiKeyId: data.apiKeyId,
					role: data.role,
					tasks: data.tasks,
					emotionalProfile: data.emotionalProfile,
					context: data.context,
					example: data.example,
					notes: data.notes,
					categories: data.categories || [],
					// Создаем кастомизацию с дефолтными значениями
					customization: {
						create: {
							greeting: 'Hello! How can I help you today?',
							headerTitle: 'AI Chat',
							headerColor: '#ffffff',
							headerTextColor: '#000000',
							backgroundColor: '#f5f5f5',
							userColor: '#e3f2fd',
							userBorderColor: '#bbdefb',
							userTextColor: '#000000',
							botColor: '#f5f5f5',
							botBorderColor: '#e0e0e0',
							botTextColor: '#000000',
						},
					},
				},
				include: {
					customization: true,
				},
			})

			return bot
		})

		return {
			success: true,
			data: {
				id: bot.id,
				apiKeyId: bot.apiKeyId,
				role: bot.role,
				tasks: bot.tasks,
				emotionalProfile: bot.emotionalProfile,
				context: bot.context,
				example: bot.example,
				notes: bot.notes,
				categories: bot.categories,
				createdAt: bot.createdAt,
				updatedAt: bot.updatedAt,
			},
		}
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			throw createError({
				statusCode: 400,
				message: error.errors[0].message,
			})
		}

		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to create bot',
		})
	}
})
