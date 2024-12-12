import { createError, defineEventHandler, readBody, setCookie } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { JWTService } from '~/server/services/jwt.service'
import { PasswordService } from '~/server/services/password.service'

// Схема валидации
const loginSchema = z.object({
	email: z.string().email('Invalid email format'),
	password: z.string().min(1, 'Password is required'),
})

export default defineEventHandler(async event => {
	try {
		// Валидируем входные данные
		const body = await readBody(event)
		const validatedData = loginSchema.parse(body)

		// Ищем пользователя
		const user = await prisma.users.findUnique({
			where: { email: validatedData.email.toLowerCase().trim() },
			select: {
				id: true,
				email: true,
				password: true,
				role: true,
				name: true,
				isActive: true,
			},
		})

		if (!user) {
			throw createError({
				statusCode: 401,
				message: 'Invalid credentials',
			})
		}

		// Проверяем пароль
		const isValidPassword = await PasswordService.verify(
			validatedData.password,
			user.password
		)

		if (!isValidPassword) {
			throw createError({
				statusCode: 401,
				message: 'Invalid credentials',
			})
		}

		// Проверяем активацию
		if (!user.isActive) {
			throw createError({
				statusCode: 403,
				message: 'Account is not activated',
			})
		}

		// Генерируем токены
		const payload = {
			userId: user.id,
			email: user.email,
			role: user.role,
		}

		const accessToken = JWTService.generateAccessToken(payload)
		const refreshToken = JWTService.generateRefreshToken(payload)

		// Устанавливаем refresh token в куки
		setCookie(event, 'refreshToken', refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60, // 30 дней
		})

		// Возвращаем оба токена в теле ответа
		return {
			success: true,
			data: {
				user: {
					id: user.id,
					email: user.email,
					role: user.role,
					name: user.name,
					isActive: user.isActive,
				},
				tokens: {
					accessToken,
					refreshToken,
				},
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
			message: error.message || 'Login failed',
		})
	}
})
