import { createError, defineEventHandler } from 'h3'
import { prisma } from '~/lib/prisma'
import { UserRole } from '~/server/types/users'

export default defineEventHandler(async event => {
	try {
		const currentUser = event.context.user

		if (!currentUser) {
			throw createError({
				statusCode: 401,
				message: 'Unauthorized',
			})
		}

		// Получаем полные данные пользователя
		const user = await prisma.users.findUnique({
			where: { id: currentUser.id },
			select: {
				id: true,
				email: true,
				role: true,
				isActive: true,
				companyName: true,
				name: true,
				phone: true,
				telegram: true,
				apiKeyIds: true,
			},
		})

		if (!user) {
			throw createError({
				statusCode: 404,
				message: 'User not found',
			})
		}

		// Получаем только id и title ключей пользователя
		const userKeys = await prisma.apiKey.findMany({
			where: {
				id: {
					in: user.apiKeyIds,
				},
			},
			select: {
				id: true,
				title: true,
			},
		})

		return {
			success: true,
			data: {
				user: {
					id: user.id,
					email: user.email,
					role: user.role as UserRole,
					isActive: user.isActive,
					companyName: user.companyName,
					name: user.name,
					phone: user.phone,
					telegram: user.telegram,
					apiKeyIds: user.apiKeyIds,
				},
				apiKeys: userKeys,
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get user info',
		})
	}
})
