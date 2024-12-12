import { createError, defineEventHandler } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { StatisticsService } from '~/server/services/apiKey/statistics.service'

// Схема валидации
const createChatSchema = z.object({
	apiKeyId: z.string(),
	title: z.string().min(1),
	userName: z.string().min(1),
})

export default defineEventHandler(async event => {
	try {
		// Валидируем входные данные
		const body = await readBody(event)
		const { apiKeyId, title, userName } = createChatSchema.parse(body)

		// Проверяем API ключ и получаем бота с настройками
		const apiKey = await prisma.apiKey.findUnique({
			where: { id: apiKeyId },
		})

		if (!apiKey?.isActive) {
			throw createError({
				statusCode: 400,
				message: 'Invalid or inactive API key',
			})
		}

		// Создаем чат и первое сообщение в транзакции
		const result = await prisma.$transaction(async tx => {
			// Создаем чат
			const chat = await tx.chat.create({
				data: {
					title,
					apiKeyId,
				},
			})

			// Формируем приветственное сообщение
			const welcomeMessage = `Здравствуйте, ${userName}! Чем могу помочь?`

			// Создаем сообщение
			await tx.message.create({
				data: {
					chatId: chat.id,
					content: welcomeMessage,
					role: 'assistant',
				},
			})

			// Обновляем статистику
			await new StatisticsService().update({
				apiKeyId,
				isNewChat: true,
				messageType: 'assistant',
			})

			return chat
		})

		return {
			success: true,
			data: {
				id: result.id,
			},
		}
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw createError({
				statusCode: 400,
				message: error.errors[0].message,
			})
		}

		const e = error as { statusCode?: number; message?: string }
		throw createError({
			statusCode: e.statusCode || 500,
			message: e.message || 'Failed to create chat',
		})
	}
})
