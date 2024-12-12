import type { H3Event } from 'h3'
import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации входных данных
const updateNewsSchema = z.object({
	id: z.string().min(1, 'News ID is required'),
	title: z.string().min(1, 'Title is required').optional(),
	content: z.string().min(1, 'Content is required').optional(),
	type: z.enum(['news', 'update', 'maintenance', 'announcement']).optional(),
	status: z.enum(['draft', 'published', 'archived']).optional(),
	priority: z.number().int().min(0).optional(),
	roles: z.array(z.string()).optional(),
	publishAt: z.string().datetime().optional().nullable(),
})

export default defineEventHandler(async (event: H3Event) => {
	try {
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 401,
				message: 'Access denied. Only administrators can update news.',
			})
		}

		// Получаем данные
		const body = await readBody(event)

		// Проверяем на пустоту
		if (!body || Object.keys(body).length === 0) {
			throw createError({
				statusCode: 400,
				message: 'Request body cannot be empty',
			})
		}

		// Проверяем наличие id
		if (!body.id) {
			throw createError({
				statusCode: 400,
				message: 'News ID is required',
			})
		}

		// Проверяем, есть ли поля для обновления
		const updateFields = Object.keys(body).filter(key => key !== 'id')
		if (updateFields.length === 0) {
			throw createError({
				statusCode: 400,
				message: 'No fields to update',
			})
		}

		// Получаем и валидируем данные
		const validatedData = updateNewsSchema.parse(body)

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

		// Собираем объект с обновленными полями
		const updateData = {
			...(validatedData.title && { title: validatedData.title }),
			...(validatedData.content && { content: validatedData.content }),
			...(validatedData.type && { type: validatedData.type }),
			...(validatedData.status && { status: validatedData.status }),
			...(validatedData.priority !== undefined && {
				priority: validatedData.priority,
			}),
			...(validatedData.roles && { roles: validatedData.roles }),
			...(validatedData.publishAt !== undefined && {
				publishAt: validatedData.publishAt
					? new Date(validatedData.publishAt)
					: null,
			}),
		}

		// Обновляем новость
		await prisma.news.update({
			where: { id: validatedData.id },
			data: updateData,
		})

		// Возвращаем только id и обновленные поля
		return {
			success: true,
			data: {
				id: validatedData.id,
				...updateData,
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
			message: err.message || 'Failed to update news',
		})
	}
})
