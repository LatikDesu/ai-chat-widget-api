import { createError, defineEventHandler, readBody } from 'h3'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const createApiKeySchema = z.object({
	owner: z.string().email('Invalid email format'),
	tokenLimit: z.number().min(1000).default(100000),
	expiredAt: z.string().datetime().optional(), // Опциональная дата истечения
})

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 403,
				message: 'Access denied. Only administrators can create API keys.',
			})
		}

		// Валидируем входные данные
		const body = await readBody(event)
		const validatedData = createApiKeySchema.parse(body)

		// Проверяем существование пользователя
		const ownerUser = await prisma.users.findUnique({
			where: { email: validatedData.owner },
			select: { id: true, email: true, role: true },
		})

		if (!ownerUser) {
			throw createError({
				statusCode: 404,
				message: 'User not found',
			})
		}

		// Формируем заголовок
		const title = `API key for ${validatedData.owner}`

		// Устанавливаем дату истечения через 3 месяца, если не указана
		const defaultExpiredAt = new Date()
		defaultExpiredAt.setMonth(defaultExpiredAt.getMonth() + 3)
		const expiredAt = validatedData.expiredAt
			? new Date(validatedData.expiredAt)
			: defaultExpiredAt

		// Создаем API ключ и обновляем пользователя в одной транзакции
		const result = await prisma.$transaction(async tx => {
			// Создаем API ключ
			const apiKey = await tx.apiKey.create({
				data: {
					id: `sk_live_${nanoid(32)}`,
					owner: validatedData.owner,
					title,
					tokenLimit: validatedData.tokenLimit,
					isActive: true,
					expiredAt,
					statistics: {
						create: {
							// Обновляем поля статистики согласно новой модели
							tokenUsed: 0,
							totalChatsStarted: 0,
							totalMessagesSent: 0,
							requestsCount: 0,
							botMessagesCount: 0,
							humanMessagesCount: 0,
							consultantMessagesCount: 0,
							totalResponseTime: 0,
							responseCount: 0,
							completedChats: 0,
							totalChatDuration: 0,
							shortestChatDuration: 0,
							longestChatDuration: 0,
							mostActiveHour: 0,
							leastActiveHour: 0,
						},
					},
				},
				include: {
					statistics: true,
				},
			})

			// Обновляем apiKeyIds пользователя
			await tx.users.update({
				where: { email: validatedData.owner },
				data: {
					apiKeyIds: {
						push: apiKey.id,
					},
				},
			})

			return apiKey
		})

		return {
			success: true,
			data: {
				apiKey: {
					id: result.id,
					owner: result.owner,
					title: result.title,
					tokenLimit: result.tokenLimit,
					isActive: result.isActive,
					createdAt: result.createdAt,
					expiredAt: result.expiredAt,
				},
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
			message: error.message || 'Failed to create API key',
		})
	}
})
