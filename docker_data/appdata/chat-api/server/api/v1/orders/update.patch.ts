import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const updateOrderSchema = z.object({
	id: z.string().min(1, 'Order ID is required'),
	companyName: z
		.string()
		.min(2, 'Company name must be at least 2 characters')
		.optional(),
	email: z.string().email('Invalid email format').optional(),
	name: z.string().min(2, 'Name must be at least 2 characters').optional(),
	phone: z
		.string()
		.regex(
			/^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
			'Invalid phone number format'
		)
		.optional()
		.nullable(),
	telegram: z
		.string()
		.regex(/^@[a-zA-Z0-9_]{5,32}$/, 'Invalid telegram username')
		.optional()
		.nullable(),
	status: z.enum(['new', 'processing', 'completed']).optional(),
	notes: z
		.string()
		.max(1000, 'Notes cannot exceed 1000 characters')
		.optional()
		.nullable(),
})

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 401,
				message: 'Access denied. Only administrators can update orders.',
			})
		}

		// Получаем и валидируем данные
		const body = await readBody(event)
		const validatedData = updateOrderSchema.parse(body)

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

		// Собираем объект с обновленными полями
		const updateData = {
			...(validatedData.companyName && {
				companyName: validatedData.companyName,
			}),
			...(validatedData.email && { email: validatedData.email }),
			...(validatedData.name && { name: validatedData.name }),
			...(validatedData.phone !== undefined && { phone: validatedData.phone }),
			...(validatedData.telegram !== undefined && {
				telegram: validatedData.telegram,
			}),
			...(validatedData.status && { status: validatedData.status }),
			...(validatedData.notes !== undefined && { notes: validatedData.notes }),
		}

		// Обновляем заявку
		await prisma.orders.update({
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
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			throw createError({
				statusCode: 400,
				message: error.errors[0].message,
			})
		}

		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to update order',
		})
	}
})
