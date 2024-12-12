import { createError, defineEventHandler } from 'h3'
import { NewsAdminService, NewsUserService } from '~/server/services/news'

export default defineEventHandler(async event => {
	const { user } = event.context
	if (!user) {
		throw createError({
			statusCode: 401,
			message: 'Authentication required',
		})
	}

	const id = event.context.params?.id
	if (!id) {
		throw createError({
			statusCode: 400,
			message: 'News ID is required',
		})
	}

	// Для админа используем AdminService
	if (user.role === 'administrator') {
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
	}

	// Для пользователя используем UserService
	const newsService = new NewsUserService()
	const news = await newsService.getById(id, {
		roles: [user.role],
		userId: user.id,
	})

	if (!news) {
		throw createError({
			statusCode: 404,
			message: 'News not found or access denied',
		})
	}

	return {
		success: true,
		data: news,
	}
})
