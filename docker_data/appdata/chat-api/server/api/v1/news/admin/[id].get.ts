import { createError, defineEventHandler } from 'h3'
import { NewsAdminService } from '~/server/services/news'

export default defineEventHandler(async event => {
	try {
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 401,
				message: 'Access denied. Only administrators can view news details.',
			})
		}

		const id = event.context.params?.id
		if (!id) {
			throw createError({
				statusCode: 400,
				message: 'News ID is required',
			})
		}

		const newsService = new NewsAdminService()
		const news = await newsService.getById(id)

		if (!news) {
			throw createError({
				statusCode: 404,
				message: 'News not found',
			})
		}

		return {
			success: true,
			data: news,
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get news details',
		})
	}
})
