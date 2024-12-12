import { createError, defineEventHandler } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 403,
				message: 'Access denied. Only administrators can view user details.',
			})
		}

		// Получаем ID пользователя из параметров
		const userId = event.context.params?.id
		if (!userId) {
			throw createError({
				statusCode: 400,
				message: 'User ID is required',
			})
		}

		// Получаем информацию о пользователе
		const targetUser = await prisma.users.findUnique({
			where: { id: userId },
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
				createdAt: true,
				updatedAt: true,
			},
		})

		if (!targetUser) {
			throw createError({
				statusCode: 404,
				message: 'User not found',
			})
		}

		// Получаем информацию о ключах пользователя
		const [ownedKeys, accessKeys] = await Promise.all([
			// Ключи, где пользователь владелец
			prisma.apiKey.findMany({
				where: { owner: targetUser.email },
				select: {
					id: true,
					title: true,
					isActive: true,
					tokenLimit: true,
					createdAt: true,
					expiredAt: true,
					lastUsedAt: true,
				},
			}),
			// Ключи, к которым у пользователя есть доступ
			prisma.apiKey.findMany({
				where: {
					id: { in: targetUser.apiKeyIds },
					NOT: { owner: targetUser.email }, // Исключаем ключи, где пользователь владелец
				},
				select: {
					id: true,
					title: true,
					owner: true,
					isActive: true,
					expiredAt: true,
				},
			}),
		])

		return {
			success: true,
			data: {
				user: targetUser,
				keys: {
					owned: ownedKeys, // Ключи, где пользователь владелец
					accessed: accessKeys, // Ключи, к которым есть доступ как у менеджера
				},
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get user details',
		})
	}
})
