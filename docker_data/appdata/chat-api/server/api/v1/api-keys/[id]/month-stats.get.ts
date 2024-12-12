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

		// Получаем год и месяц из query параметров
		const query = getQuery(event)
		const yearStr = query.year as string
		const monthStr = query.month as string

		// Проверяем корректность параметров
		const year = parseInt(yearStr)
		const month = parseInt(monthStr)

		if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
			throw createError({
				statusCode: 400,
				message: 'Valid year and month (1-12) are required',
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
		const stats = await statisticsService.getMonthStatistics(id, year, month)

		return {
			success: true,
			data: stats,
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get month statistics',
		})
	}
})