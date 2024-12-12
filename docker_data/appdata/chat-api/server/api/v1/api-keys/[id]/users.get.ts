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
			},
		})

		if (!apiKey) {
			throw createError({
				statusCode: 404,
				message: 'API key not found',
			})
		}

		// Проверяем права доступа
		if (user.role !== 'administrator' && apiKey.owner !== user.email) {
			throw createError({
				statusCode: 403,
				message: 'Access denied',
			})
		}

		const usersWithAccess = await prisma.users.findMany({
			where: {
				apiKeyIds: {
					has: keyId,
				},
			},
			select: {
				id: true,
				email: true,
				role: true,
				name: true,
				companyName: true,
				isActive: true,
				createdAt: true,
			},
		})

		return {
			success: true,
			data: {
				owner: usersWithAccess.find(u => u.email === apiKey.owner),
				managers: usersWithAccess.filter(u => u.email !== apiKey.owner),
				totalCount: usersWithAccess.length,
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get API key users',
		})
	}
})
