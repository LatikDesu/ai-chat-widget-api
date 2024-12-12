import { createError, defineEventHandler, getQuery } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		const { user } = event.context

		if (!user) {
			throw createError({
				statusCode: 401,
				message: 'Unauthorized',
			})
		}

		// Получаем параметры из query
		const query = getQuery(event)
		const {
			apiKeyId,
			mode,
			isClosed,
			search,
			startDate,
			endDate,
			limit = '10',
			page = '1',
		} = query

		if (!apiKeyId) {
			throw createError({
				statusCode: 400,
				message: 'API key ID is required',
			})
		}

		// Проверяем доступ пользователя к API ключу
		const hasAccess = await prisma.users.findFirst({
			where: {
				id: user.id,
				apiKeyIds: {
					has: apiKeyId as string,
				},
			},
		})

		if (!hasAccess) {
			throw createError({
				statusCode: 403,
				message:
					'Access denied. You do not have permission to view these chats.',
			})
		}

		// Формируем условия фильтрации
		const where: any = {
			apiKeyId: apiKeyId as string,
		}

		// Фильтр по режиму
		if (mode) {
			where.mode = mode
		}

		// Фильтр по статусу
		if (isClosed !== undefined) {
			where.isClosed = isClosed === 'true'
		}

		// Поиск по заголовку
		if (search) {
			where.title = {
				contains: search as string,
				mode: 'insensitive',
			}
		}

		// Фильтр по дате
		if (startDate || endDate) {
			where.createdAt = {}
			if (startDate) {
				where.createdAt.gte = new Date(startDate as string)
			}
			if (endDate) {
				where.createdAt.lte = new Date(endDate as string)
			}
		}

		// Пагинация
		const skip = (Number(page) - 1) * Number(limit)
		const take = Number(limit)

		// Получаем общее количество чатов
		const total = await prisma.chat.count({ where })

		// Получаем чаты с учетом фильтров и пагинации
		const chats = await prisma.chat.findMany({
			where,
			orderBy: {
				createdAt: 'desc',
			},
			select: {
				id: true,
				title: true,
				mode: true,
				isClosed: true,
				createdAt: true,
				updatedAt: true,
				_count: {
					select: {
						messages: true,
					},
				},
			},
			skip,
			take,
		})

		return {
			success: true,
			data: {
				items: chats,
				pagination: {
					total,
					page: Number(page),
					pageSize: Number(limit),
					pageCount: Math.ceil(total / Number(limit)),
				},
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get chats',
		})
	}
})
