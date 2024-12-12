import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const deleteOrderSchema = z.object({
	id: z.string().min(1, 'Order ID is required'),
})

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 401,
				message: 'Access denied. Only administrators can delete orders.',
			})
		}

		// Получаем и валидируем данные
		const body = await readBody(event)
		const validatedData = deleteOrderSchema.parse(body)

		// Проверяем существование заявки
		const existingOrder = await prisma.orders.findUnique({
			where: { id: validatedData.id },
		})

		if (!existingOrder) {
			throw createError({
				statusCode: 404,
				message: 'Order not found',
			})
		}

		// Удаляем заявку
		await prisma.orders.delete({
			where: { id: validatedData.id },
		})

		// Возвращаем только id удаленной заявки
		return {
			success: true,
			data: {
				id: validatedData.id,
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
			message: error.message || 'Failed to delete order',
		})
	}
})
