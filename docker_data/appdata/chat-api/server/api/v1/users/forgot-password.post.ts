import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { NotificationService } from '~/server/services/notification.service'
import { getResetPasswordEmailTemplate } from '~/server/templates/email/reset-password'

// Схема валидации
const forgotPasswordSchema = z.object({
	email: z.string().email('Invalid email format'),
})

export default defineEventHandler(async event => {
	try {
		// Валидируем email
		const body = await readBody(event)
		const { email } = forgotPasswordSchema.parse(body)

		// Ищем пользователя
		const user = await prisma.users.findUnique({
			where: { email: email.toLowerCase().trim() },
			select: {
				id: true,
				email: true,
				name: true,
				isActive: true,
			},
		})

		if (!user) {
			throw createError({
				statusCode: 404,
				message: 'User not found',
			})
		}

		// Удаляем старый токен если есть
		await prisma.activationToken.deleteMany({
			where: { userId: user.id },
		})

		// Создаем новый токен
		const resetToken = await prisma.activationToken.create({
			data: {
				userId: user.id,
				token: crypto.randomUUID(),
				expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 час
			},
		})

		// Отправляем письмо
		const notificationService = new NotificationService()
		const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken.token}`
		const emailHtml = getResetPasswordEmailTemplate({
			resetUrl,
			name: user.name || undefined,
			email: user.email,
		})

		await notificationService.sendResetPasswordEmail(user.email, emailHtml)

		return {
			success: true,
			message: 'Password reset instructions have been sent to your email',
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
			message: error.message || 'Failed to process password reset request',
		})
	}
})
