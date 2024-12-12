import {
	createError,
	defineEventHandler,
	getRequestHeader,
	getRequestIP,
	readBody,
} from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { NotificationService } from '~/server/services/notification.service'

// Схема валидации
const createOrderSchema = z.object({
	companyName: z.string().min(2, 'Company name must be at least 2 characters'),
	email: z.string().email('Invalid email format'),
	name: z.string().min(2, 'Name must be at least 2 characters'),
	phone: z
		.string()
		.regex(
			/^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
			'Invalid phone number format'
		)
		.optional(),
	telegram: z
		.string()
		.regex(/^@[a-zA-Z0-9_]{5,32}$/, 'Invalid telegram username')
		.optional(),
	notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
})

export default defineEventHandler(async event => {
	try {
		// Валидация данных
		const body = await readBody(event)
		const validatedData = createOrderSchema.parse(body)

		// Проверка на дубликаты за последние 24 часа
		const existingOrder = await prisma.orders.findFirst({
			where: {
				email: validatedData.email,
				companyName: validatedData.companyName,
				createdAt: {
					gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
				},
			},
		})

		if (existingOrder) {
			throw createError({
				statusCode: 400,
				message: 'Similar order already exists within last 24 hours',
			})
		}

		// Добавляем метаданные
		const metadata = {
			ip: getRequestIP(event),
			userAgent: getRequestHeader(event, 'user-agent'),
			referer: getRequestHeader(event, 'referer'),
		}

		// Создаем заявку
		const order = await prisma.orders.create({
			data: {
				...validatedData,
				metadata,
			},
		})

		// Отправляем уведомления через существующий NotificationService
		const notificationService = new NotificationService()
		await notificationService.sendNewOrderEmail(order)
		await notificationService.sendTelegramNotification(order)

		return {
			success: true,
			data: order,
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
			message: error.message || 'Failed to create order',
		})
	}
})
