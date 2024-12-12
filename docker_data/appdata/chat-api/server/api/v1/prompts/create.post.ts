import { createError, defineEventHandler } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { GptService } from '~/server/services/chat/gpt.service'

// Схема валидации
const createPromptSchema = z.object({
	botId: z.string().uuid(),
	category: z.string().min(1),
	content: z.string().min(1),
	isActive: z.boolean().default(true),
})

export default defineEventHandler(async event => {
	try {
		// Валидируем входные данные
		const body = await readBody(event)
		const data = createPromptSchema.parse(body)

		// Получаем бота и API ключ для проверки прав
		const bot = await prisma.chatBot.findUnique({
			where: { id: data.botId },
			include: {
				apiKey: true,
			},
		})

		if (!bot) {
			throw createError({
				statusCode: 404,
				message: 'Bot not found',
			})
		}

		// Проверяем права доступа
		const { user } = event.context
		if (
			!user ||
			(user.role !== 'administrator' &&
				(user.role !== 'business' || bot.apiKey.owner !== user.email))
		) {
			throw createError({
				statusCode: 403,
				message: 'Access denied',
			})
		}

		try {
			const response = await new GptService().createPromptEmbeddings(data)
			return {
				success: true,
				data: response.data,
			}
		} catch (error: any) {
			throw createError({
				statusCode: error.statusCode || 500,
				message: error.message || 'Failed to create prompt embeddings',
			})
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
			message: error.message || 'Failed to create prompt',
		})
	}
})
