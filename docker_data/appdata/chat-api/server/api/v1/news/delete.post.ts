import type { H3Event } from 'h3'
import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации входных данных
const deleteNewsSchema = z.object({
	id: z.string().min(1, 'News ID is required'),
})

export default defineEventHandler(async (event: H3Event) => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 401,
				message: 'Access denied. Only administrators can delete news.',
			})
		}

		// Получаем и валидируем данные
		const body = await readBody(event)

		// Проверяем на пустоту
		if (!body || Object.keys(body).length === 0) {
			throw createError({
				statusCode: 400,
				message: 'Request body cannot be empty',
			})
		}

		const validatedData = deleteNewsSchema.parse(body)

		// Проверяем существование новости
		const existingNews = await prisma.news.findUnique({
			where: { id: validatedData.id },
		})
		if (!existingNews) {
			throw createError({
				statusCode: 404,
				message: 'News not found',
			})
		}

		// Удаляем новость
		await prisma.news.delete({
			where: { id: validatedData.id },
		})

		return {
			success: true,
			data: {
				id: validatedData.id,
			},
		}
	} catch (error: unknown) {
		if (error instanceof z.ZodError) {
			throw createError({
				statusCode: 400,
				message: error.errors[0].message,
			})
		}

		const err = error as { statusCode?: number; message?: string }
		throw createError({
			statusCode: err.statusCode || 500,
			message: err.message || 'Failed to delete news',
		})
	}
})
