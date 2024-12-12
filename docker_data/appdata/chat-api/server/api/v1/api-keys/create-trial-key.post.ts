import { createError, defineEventHandler, readBody } from 'h3'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const createTrialKeySchema = z.object({
	title: z.string().min(2, 'Title must be at least 2 characters'),
	owner: z.string().email('Invalid email format').optional(), // Опционально, только для администратора
})

export default defineEventHandler(async event => {
	try {
		// Проверяем авторизацию
		const { user } = event.context
		if (!user) {
			throw createError({
				statusCode: 401,
				message: 'Authentication required',
			})
		}

		// Валидируем входные данные
		const body = await readBody(event)
		const validatedData = createTrialKeySchema.parse(body)

		// Определяем owner
		let owner = user.email
		if (validatedData.owner) {
			// Только администратор может указать другого владельца
			if (user.role !== 'administrator') {
				throw createError({
					statusCode: 403,
					message: 'Only administrators can specify owner',
				})
			}
			owner = validatedData.owner
		}

		// Если не администратор, проверяем наличие других ключей
		if (user.role !== 'administrator') {
			const existingKeys = await prisma.apiKey.findMany({
				where: { owner: user.email },
			})
			if (existingKeys.length > 0) {
				throw createError({
					statusCode: 403,
					message: 'You already have an API key',
				})
			}
		}

		// Создаем API ключ и обновляем пользователя в одной транзакции
		const result = await prisma.$transaction(async tx => {
			// Создаем API ключ
			const apiKey = await tx.apiKey.create({
				data: {
					id: `sk_trial_${nanoid(32)}`,
					owner,
					title: validatedData.title,
					tokenLimit: 50000,
					isActive: true,
					statistics: {
						create: {
							// Создаем связанную статистику
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
				where: { email: owner },
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
			message: error.message || 'Failed to create trial API key',
		})
	}
})
