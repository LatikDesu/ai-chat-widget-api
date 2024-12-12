import { createError, defineEventHandler } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		const { user } = event.context
		if (!user) {
			throw createError({
				statusCode: 401,
				message: 'Authentication required',
			})
		}

		const keyId = event.context.params?.id
		if (!keyId) {
			throw createError({
				statusCode: 400,
				message: 'API Key ID is required',
			})
		}

		const apiKey = await prisma.apiKey.findUnique({
			where: { id: keyId },
			select: {
				id: true,
				owner: true,
				title: true,
				tokenLimit: true,
				isActive: true,
				createdAt: true,
				expiredAt: true,
				lastUsedAt: true,
				statistics: {
					select: {
						tokenUsed: true,
					},
				},
				bot: {
					select: {
						id: true,
					},
				},
			},
		})

		if (!apiKey) {
			throw createError({
				statusCode: 404,
				message: 'API key not found',
			})
		}

		// Проверяем права доступа
		if (
			user.role !== 'administrator' &&
			apiKey.owner !== user.email &&
			!user.apiKeyIds.includes(keyId)
		) {
			throw createError({
				statusCode: 403,
				message: 'Access denied',
			})
		}

		const tokenUsed = apiKey.statistics?.tokenUsed || 0

		return {
			success: true,
			data: {
				id: apiKey.id,
				owner: apiKey.owner,
				title: apiKey.title,
				tokenUsed: tokenUsed,
				tokenLimit: apiKey.tokenLimit,
				isActive: apiKey.isActive,
				createdAt: apiKey.createdAt,
				expiredAt: apiKey.expiredAt,
				lastUsedAt: apiKey.lastUsedAt,
				isExpired: apiKey.expiredAt < new Date(),
				daysUntilExpiration: Math.floor(
					(apiKey.expiredAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
				),
				botId: apiKey.bot?.id || null,
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get API key details',
		})
	}
})
