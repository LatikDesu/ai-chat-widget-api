import { createError, defineEventHandler, getQuery } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		const query = getQuery(event)
		const token = query.token as string

		if (!token) {
			throw createError({
				statusCode: 400,
				message: 'Activation token is required',
			})
		}

		// Ищем токен активации
		const activationToken = await prisma.activationToken.findUnique({
			where: { token },
			include: { user: true },
		})

		if (!activationToken) {
			throw createError({
				statusCode: 404,
				message: 'Invalid activation token',
			})
		}

		// Проверяем срок действия токена
		if (activationToken.expiresAt < new Date()) {
			// Удаляем просроченный токен
			await prisma.activationToken.delete({
				where: { id: activationToken.id },
			})

			throw createError({
				statusCode: 410,
				message: 'Activation token has expired',
			})
		}

		// Активируем пользователя и удаляем токен в одной транзакции
		await prisma.$transaction([
			// Активируем пользователя
			prisma.users.update({
				where: { id: activationToken.userId },
				data: { isActive: true },
			}),
			// Удаляем использованный токен
			prisma.activationToken.delete({
				where: { id: activationToken.id },
			}),
		])

		return {
			success: true,
			message: 'Account activated successfully',
			user: {
				id: activationToken.user.id,
				email: activationToken.user.email,
				isActive: true,
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Internal server error',
		})
	}
})
