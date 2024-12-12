import type { H3Event } from 'h3'
import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации входных данных
const createNewsSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	content: z.string().min(1, 'Content is required'),
	type: z
		.enum(['news', 'update', 'maintenance', 'announcement'])
		.default('news'),
	status: z.enum(['draft', 'published', 'archived']).default('draft'),
	priority: z.number().int().min(0).default(0),
	roles: z.array(z.string()).default([]),
	publishAt: z.string().datetime().optional(),
})

export default defineEventHandler(async (event: H3Event) => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 403,
				message: 'Access denied. Only administrators can create news.',
			})
		}

		// Получаем и валидируем данные
		const body = await readBody(event)
		const validatedData = createNewsSchema.parse(body)

		// Создаем новость
		const news = await prisma.news.create({
			data: {
				title: validatedData.title,
				content: validatedData.content,
				type: validatedData.type,
				status: validatedData.status,
				priority: validatedData.priority,
				roles: validatedData.roles,
				publishAt: validatedData.publishAt
					? new Date(validatedData.publishAt)
					: null,
				viewedBy: [], // Инициализируем пустым массивом
			},
		})

		return {
			success: true,
			data: news,
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
			message: err.message || 'Failed to create news',
		})
	}
})
