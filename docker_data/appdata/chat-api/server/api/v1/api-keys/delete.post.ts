import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const deleteApiKeySchema = z.object({
	id: z.string().min(1, 'API Key ID is required'),
})

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 403,
				message: 'Access denied. Only administrators can delete API keys.',
			})
		}

		// Валидируем входные данные
		const body = await readBody(event)
		const validatedData = deleteApiKeySchema.parse(body)

		// Проверяем существование ключа
		const apiKey = await prisma.apiKey.findUnique({
			where: { id: validatedData.id },
			select: {
				id: true,
				owner: true,
				title: true,
			},
		})

		if (!apiKey) {
			throw createError({
				statusCode: 404,
				message: 'API key not found',
			})
		}

		// Удаляем ключ и связанные данные в транзакции
		const result = await prisma.$transaction(async tx => {
			// Находим всех пользователей, у которых есть этот ключ
			const users = await tx.users.findMany({
				where: {
					apiKeyIds: {
						has: apiKey.id,
					},
				},
				select: {
					id: true,
					email: true,
					apiKeyIds: true,
				},
			})

			// Удаляем ключ из apiKeyIds у всех пользователей
			const updateResults = await Promise.all(
				users.map(user =>
					tx.users.update({
						where: { id: user.id },
						data: {
							apiKeyIds: {
								set: user.apiKeyIds.filter(id => id !== apiKey.id),
							},
						},
					})
				)
			)

			// Удаляем API ключ (каскадное удаление сработает для связанных таблиц)
			await tx.apiKey.delete({
				where: { id: validatedData.id },
			})

			return {
				updatedUsers: users,
				updateCount: updateResults.length,
			}
		})

		return {
			success: true,
			data: {
				message: 'API key and all related data successfully deleted',
				deletedKey: {
					id: apiKey.id,
					owner: apiKey.owner,
					title: apiKey.title,
				},
				affectedUsers: {
					count: result.updateCount,
					emails: result.updatedUsers.map(u => u.email),
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
			message: error.message || 'Failed to delete API key',
		})
	}
})
