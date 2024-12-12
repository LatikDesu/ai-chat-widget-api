import { createError, defineEventHandler, getQuery } from 'h3'
import { StatisticsService } from '~/server/services/apiKey/statistics.service'

export default defineEventHandler(async event => {
	try {
		const id = event.context.params?.id
		if (!id) {
			throw createError({
				statusCode: 400,
				message: 'API key ID is required',
			})
		}

		// Получаем год из query параметров
		const query = getQuery(event)
		const yearStr = query.year as string

		// Проверяем корректность параметра
		const year = parseInt(yearStr)

		if (isNaN(year) || year < 2000 || year > 9999) {
			throw createError({
				statusCode: 400,
				message: 'Valid year is required (2000-9999)',
			})
		}

		// Проверяем права доступа
		const { user } = event.context
		if (
			!user ||
			(user.role !== 'administrator' && !user.apiKeyIds?.includes(id))
		) {
			throw createError({
				statusCode: 403,
				message: 'Access denied',
			})
		}

		const statisticsService = new StatisticsService()
		const stats = await statisticsService.getYearStatistics(id, year)

		return {
			success: true,
			data: stats,
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get year statistics',
		})
	}
})
