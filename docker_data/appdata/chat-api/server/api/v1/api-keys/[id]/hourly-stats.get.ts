import { createError, defineEventHandler } from 'h3'
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
		const stats = await statisticsService.getLast24HoursStatistics(id)

		return {
			success: true,
			data: stats,
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get hourly statistics',
		})
	}
})
