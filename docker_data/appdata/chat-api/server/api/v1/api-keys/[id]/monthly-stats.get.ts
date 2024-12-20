import { createError, defineEventHandler } from 'h3'
import { prisma } from '~/lib/prisma'
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
		if (!user) {
			throw createError({
				statusCode: 403,
				message: 'Access denied',
			})
		}

		// Сначала проверяем, является ли пользователь администратором
		if (user.role === 'administrator') {
			// Администраторы имеют полный доступ
		} else {
			// Проверяем, принадлежит ли ключ пользователю
			const apiKey = await prisma.apiKey.findUnique({
				where: { id },
				select: { owner: true },
			})

			if (!apiKey || apiKey.owner !== user.email) {
				throw createError({
					statusCode: 403,
					message: 'Access denied',
				})
			}
		}

		const statisticsService = new StatisticsService()
		const stats = await statisticsService.getLast12MonthsStatistics(id)

		return {
			success: true,
			data: stats,
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get monthly statistics',
		})
	}
})
