import type { Prisma } from '@prisma/client'
import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации query параметров
const querySchema = z.object({
	skip: z.coerce.number().default(0),
	take: z.coerce.number().default(10),
	status: z.enum(['new', 'processing', 'completed']).optional(),
	search: z.string().optional(), // Поиск по email или companyName
	sort: z.enum(['createdAt', 'status', 'companyName']).default('createdAt'),
	order: z.enum(['asc', 'desc']).default('desc'),
	dateFrom: z.string().datetime().optional(),
	dateTo: z.string().datetime().optional(),
})

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 401,
				message: 'Access denied. Only administrators can view orders list.',
			})
		}

		// Получаем и валидируем параметры запроса
		const query = getQuery(event)
		const params = querySchema.safeParse(query)
		if (!params.success) {
			throw createError({
				statusCode: 400,
				message: 'Invalid query parameters',
			})
		}

		// Формируем условия where
		const where: Prisma.OrdersWhereInput = {
			...(params.data.status && { status: params.data.status }),
			...(params.data.search && {
				OR: [
					{ email: { contains: params.data.search, mode: 'insensitive' } },
					{
						companyName: { contains: params.data.search, mode: 'insensitive' },
					},
				],
			}),
			...(params.data.dateFrom && {
				createdAt: {
					gte: new Date(params.data.dateFrom),
					...(params.data.dateTo && { lte: new Date(params.data.dateTo) }),
				},
			}),
		}

		// Получаем заявки с пагинацией и сортировкой
		const [orders, total] = await prisma.$transaction([
			prisma.orders.findMany({
				skip: params.data.skip,
				take: params.data.take,
				where,
				orderBy: {
					[params.data.sort]: params.data.order,
				},
				select: {
					id: true,
					companyName: true,
					email: true,
					name: true,
					phone: true,
					telegram: true,
					status: true,
					notes: true,
					metadata: true,
					createdAt: true,
					updatedAt: true,
				},
			}),
			prisma.orders.count({ where }),
		])

		return {
			success: true,
			data: {
				items: orders,
				pagination: {
					total,
					page: Math.floor(params.data.skip / params.data.take) + 1,
					pageSize: params.data.take,
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
			message: error.message || 'Failed to get orders list',
		})
	}
})
