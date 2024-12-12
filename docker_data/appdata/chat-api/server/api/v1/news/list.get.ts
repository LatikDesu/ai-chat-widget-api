import { createError, defineEventHandler, getQuery } from 'h3'
import { NewsUserService } from '~/server/services/news'

export default defineEventHandler(async event => {
	try {
		const { user } = event.context
		if (!user) {
			throw createError({
				statusCode: 401,
				message: 'Authentication required',
			})
		}

		const query = getQuery(event)
		const newsService = new NewsUserService()

		const news = await newsService.getList({
			skip: Number(query.skip) || 0,
			take: Number(query.take) || 10,
			type: query.type?.toString(),
			roles: [user.role],
			userId: user.id,
		})

		return {
			success: true,
			data: news,
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get news list',
		})
	}
})
