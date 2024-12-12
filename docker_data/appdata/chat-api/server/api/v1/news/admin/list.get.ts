import { createError, defineEventHandler, getQuery } from 'h3'
import { z } from 'zod'
import { NewsAdminService } from '~/server/services/news'

// Схема валидации query параметров
const querySchema = z.object({
	skip: z.coerce.number().default(0),
	take: z.coerce.number().default(10),
	status: z.enum(['draft', 'published', 'archived']).optional(),
	type: z.enum(['news', 'update', 'maintenance', 'announcement']).optional(),
	sort: z.enum(['createdAt', 'publishAt', 'priority']).default('createdAt'),
	order: z.enum(['asc', 'desc']).default('desc'),
	search: z.string().optional(),
})

export default defineEventHandler(async event => {
	try {
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 401,
				message: 'Access denied. Only administrators can view this list.',
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

		// Получаем список новостей
		const newsService = new NewsAdminService()
		const news = await newsService.getList({
			skip: params.data.skip,
			take: params.data.take,
			status: params.data.status,
			type: params.data.type,
			search: params.data.search,
			orderBy: {
				[params.data.sort]: params.data.order,
			},
		})

		return {
			success: true,
			data: news,
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
			message: error.message || 'Failed to get news list',
		})
	}
})
