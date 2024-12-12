import { createError, defineEventHandler, readBody, setCookie } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { JWTService } from '~/server/services/jwt.service'

// Схема валидации
const refreshSchema = z.object({
	refreshToken: z.string().min(1, 'Refresh token is required'),
})

export default defineEventHandler(async event => {
	try {
		// Валидируем входные данные
		const body = await readBody(event)
		const { refreshToken } = refreshSchema.parse(body)

		// Проверяем refresh token
		let payload
		try {
			payload = JWTService.verifyRefreshToken(refreshToken)
		} catch (error) {
			throw createError({
				statusCode: 401,
				message: 'Invalid or expired refresh token',
			})
		}

		// Получаем пользователя
		const user = await prisma.users.findUnique({
			where: { id: payload.userId },
			select: {
				id: true,
				email: true,
				role: true,
				isActive: true,
			},
		})

		if (!user || !user.isActive) {
			throw createError({
				statusCode: 401,
				message: 'User not found or inactive',
			})
		}

		// Генерируем новые токены
		const newPayload = {
			userId: user.id,
			email: user.email,
			role: user.role,
		}

		const accessToken = JWTService.generateAccessToken(newPayload)
		const newRefreshToken = JWTService.generateRefreshToken(newPayload)

		// Устанавливаем новый refresh token в куки
		setCookie(event, 'refreshToken', newRefreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60, // 30 дней
		})

		return {
			success: true,
			data: {
				accessToken,
				refreshToken: newRefreshToken,
			},
		}
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			throw createError({
				statusCode: 400,
				message: error.errors[0].message,
			})
		}

		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to refresh token',
		})
	}
})
