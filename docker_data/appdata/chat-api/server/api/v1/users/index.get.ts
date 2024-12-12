import type { Prisma } from '@prisma/client'
import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации query параметров
const querySchema = z.object({
	skip: z.coerce.number().default(0),
	take: z.coerce.number().default(10),
	role: z.enum(['administrator', 'business', 'manager']).optional(),
	search: z.string().optional(),
	sort: z.enum(['createdAt', 'email', 'role']).default('createdAt'),
	order: z.enum(['asc', 'desc']).default('desc'),
	isActive: z.coerce.boolean().optional(),
})

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 403,
				message: 'Access denied. Only administrators can view users list.',
			})
		}

		// Получаем и валидируем параметры запроса
		const query = getQuery(event)
		const params = querySchema.parse(query)

		// Формируем условия where
		const where: Prisma.UsersWhereInput = {
			...(params.role && { role: params.role }),
			...(params.isActive !== undefined && { isActive: params.isActive }),
			...(params.search && {
				OR: [
					{
						email: {
							contains: params.search,
							mode: 'insensitive' as Prisma.QueryMode,
						},
					},
					{
						name: {
							contains: params.search,
							mode: 'insensitive' as Prisma.QueryMode,
						},
					},
					{
						companyName: {
							contains: params.search,
							mode: 'insensitive' as Prisma.QueryMode,
						},
					},
				],
			}),
		}

		// Получаем пользователей с пагинацией и сортировкой
		const [users, total] = await prisma.$transaction([
			prisma.users.findMany({
				skip: params.skip,
				take: params.take,
				where,
				orderBy: {
					[params.sort]: params.order,
				},
				select: {
					id: true,
					email: true,
					role: true,
					isActive: true,
					companyName: true,
					name: true,
					phone: true,
					telegram: true,
					apiKeyIds: true,
					createdAt: true,
					updatedAt: true,
				},
			}),
			prisma.users.count({ where }),
		])

		return {
			success: true,
			data: {
				items: users,
				pagination: {
					total,
					page: Math.floor(params.skip / params.take) + 1,
					pageSize: params.take,
				},
			},
		}
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw createError({
				statusCode: 400,
				message: error.errors[0].message,
			})
		}

		const err = error as { statusCode?: number; message?: string }
		throw createError({
			statusCode: err.statusCode || 500,
			message: err.message || 'Failed to get users list',
		})
	}
})
