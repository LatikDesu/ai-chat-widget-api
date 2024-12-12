import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const updateApiKeySchema = z.object({
	id: z.string().min(1, 'API Key ID is required'),
	title: z.string().min(2, 'Title must be at least 2 characters').optional(),
	tokenLimit: z.number().min(1000).optional(),
	isActive: z.boolean().optional(),
	expiredAt: z.string().datetime().optional(),
})

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user) {
			throw createError({
				statusCode: 401,
				message: 'Authentication required',
			})
		}

		// Валидируем входные данные
		const body = await readBody(event)
		const validatedData = updateApiKeySchema.parse(body)

		// Получаем API ключ
		const apiKey = await prisma.apiKey.findUnique({
			where: { id: validatedData.id },
			select: {
				id: true,
				owner: true,
				title: true,
				tokenLimit: true,
				isActive: true,
				expiredAt: true,
			},
		})

		if (!apiKey) {
			throw createError({
				statusCode: 404,
				message: 'API key not found',
			})
		}

		// Проверяем права на обновление
		if (user.role !== 'administrator' && apiKey.owner !== user.email) {
			throw createError({
				statusCode: 403,
				message: 'Access denied. You can only update your own API keys.',
			})
		}

		// Формируем данные для обновления
		const updateData: any = {}

		// Администратор может обновлять все поля
		if (user.role === 'administrator') {
			if (validatedData.title) updateData.title = validatedData.title
			if (validatedData.tokenLimit)
				updateData.tokenLimit = validatedData.tokenLimit
			if (validatedData.isActive !== undefined)
				updateData.isActive = validatedData.isActive
			if (validatedData.expiredAt)
				updateData.expiredAt = new Date(validatedData.expiredAt)
		} else {
			// Обычный пользователь может обновлять только title
			if (validatedData.title) updateData.title = validatedData.title
		}

		// Если нечего обновлять
		if (Object.keys(updateData).length === 0) {
			throw createError({
				statusCode: 400,
				message: 'No data to update',
			})
		}

		// Обновляем API ключ
		const updatedApiKey = await prisma.apiKey.update({
			where: { id: validatedData.id },
			data: updateData,
			select: {
				id: true,
				owner: true,
				title: true,
				tokenLimit: true,
				isActive: true,
				createdAt: true,
				expiredAt: true,
				lastUsedAt: true,
			},
		})

		return {
			success: true,
			data: {
				apiKey: updatedApiKey,
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
			message: error.message || 'Failed to update API key',
		})
	}
})
