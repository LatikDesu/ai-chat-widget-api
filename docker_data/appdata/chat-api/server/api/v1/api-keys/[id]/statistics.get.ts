import { createError, defineEventHandler } from 'h3'
import { prisma } from '~/lib/prisma'

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

		// Получаем статистику ключа
		const statistics = await prisma.apiKeyStatistics.findUnique({
			where: { apiKeyId: id },
		})

		if (!statistics) {
			throw createError({
				statusCode: 404,
				message: 'Statistics not found',
			})
		}

		return {
			success: true,
			data: {
				tokenUsed: statistics.tokenUsed,
				totalChatsStarted: statistics.totalChatsStarted,
				totalMessagesSent: statistics.totalMessagesSent,
				requestsCount: statistics.requestsCount,
				messages: {
					bot: statistics.botMessagesCount,
					human: statistics.humanMessagesCount,
					consultant: statistics.consultantMessagesCount,
				},
				performance: {
					totalResponseTime: statistics.totalResponseTime,
					responseCount: statistics.responseCount,
					averageResponseTime:
						statistics.responseCount > 0
							? statistics.totalResponseTime / statistics.responseCount
							: 0,
				},
				chats: {
					completed: statistics.completedChats,
					averageDuration:
						statistics.completedChats > 0
							? statistics.totalChatDuration / statistics.completedChats
							: 0,
					shortestDuration: statistics.shortestChatDuration,
					longestDuration: statistics.longestChatDuration,
				},
				activity: {
					mostActiveHour: statistics.mostActiveHour,
					leastActiveHour: statistics.leastActiveHour,
				},
				updatedAt: statistics.updatedAt,
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get API key statistics',
		})
	}
})
