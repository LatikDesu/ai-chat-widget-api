import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { PasswordService } from '~/server/services/password.service'

// Схема валидации
const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
		newPassword: z
			.string()
			.min(8, 'New password must be at least 8 characters'),
		newPasswordConfirm: z.string().min(1, 'Password confirmation is required'),
	})
	.refine(data => data.newPassword === data.newPasswordConfirm, {
		message: "Passwords don't match",
		path: ['newPasswordConfirm'],
	})

export default defineEventHandler(async event => {
	try {
		// Проверяем авторизацию
		const { user } = event.context
		if (!user) {
			throw createError({
				statusCode: 401,
				message: 'Authentication required',
			})
		}

		// Валидируем входные данные
		const body = await readBody(event)
		const validatedData = changePasswordSchema.parse(body)

		// Получаем пользователя с паролем
		const currentUser = await prisma.users.findUnique({
			where: { id: user.id },
			select: {
				id: true,
				password: true,
			},
		})

		if (!currentUser) {
			throw createError({
				statusCode: 404,
				message: 'User not found',
			})
		}

		// Проверяем текущий пароль
		const isPasswordValid = await PasswordService.verify(
			validatedData.currentPassword,
			currentUser.password
		)

		if (!isPasswordValid) {
			throw createError({
				statusCode: 400,
				message: 'Current password is incorrect',
			})
		}

		// Хешируем и сохраняем новый пароль
		const hashedPassword = await PasswordService.hash(validatedData.newPassword)
		await prisma.users.update({
			where: { id: user.id },
			data: { password: hashedPassword },
		})

		return {
			success: true,
			message: 'Password has been successfully changed',
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
			message: error.message || 'Failed to change password',
		})
	}
})
