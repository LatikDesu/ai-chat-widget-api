import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { PasswordService } from '~/server/services/password.service'

// Схема валидации
const resetPasswordSchema = z
	.object({
		token: z.string().min(1, 'Reset token is required'),
		password: z.string().min(8, 'Password must be at least 8 characters'),
		passwordConfirm: z.string().min(1, 'Password confirmation is required'),
	})
	.refine(data => data.password === data.passwordConfirm, {
		message: "Passwords don't match",
		path: ['passwordConfirm'],
	})

export default defineEventHandler(async event => {
	try {
		// Валидируем входные данные
		const body = await readBody(event)
		const validatedData = resetPasswordSchema.parse(body)

		// Ищем токен и связанного пользователя
		const activationToken = await prisma.activationToken.findUnique({
			where: { token: validatedData.token },
			include: { user: true },
		})

		// Проверяем существование токена
		if (!activationToken) {
			throw createError({
				statusCode: 404,
				message: 'Invalid or expired reset token',
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
				message: 'Reset token has expired',
			})
		}

		// Хешируем новый пароль
		const hashedPassword = await PasswordService.hash(validatedData.password)

		// Обновляем пароль пользователя
		await prisma.users.update({
			where: { id: activationToken.userId },
			data: {
				password: hashedPassword,
				isActive: true, // Активируем аккаунт если он не был активирован
			},
		})

		// Удаляем использованный токен
		await prisma.activationToken.delete({
			where: { id: activationToken.id },
		})

		return {
			success: true,
			message: 'Password has been successfully reset',
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
			message: error.message || 'Failed to reset password',
		})
	}
})
