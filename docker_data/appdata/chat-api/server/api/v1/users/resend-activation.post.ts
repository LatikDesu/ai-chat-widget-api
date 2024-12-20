import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { NotificationService } from '~/server/services/notification.service'
import { getRegistrationEmailTemplate } from '~/server/templates/email/registration'

// Схема валидации
const resendActivationSchema = z.object({
	email: z.string().email('Invalid email format'),
})

export default defineEventHandler(async event => {
	try {
		// Валидируем email
		const body = await readBody(event)
		const { email } = resendActivationSchema.parse(body)

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

		// Проверяем что аккаунт не активирован
		if (user.isActive) {
			throw createError({
				statusCode: 409,
				message: 'Account is already activated',
			})
		}

		// Удаляем старый токен если есть
		await prisma.activationToken.deleteMany({
			where: { userId: user.id },
		})

		// Создаем новый токен
		const activationToken = await prisma.activationToken.create({
			data: {
				userId: user.id,
				token: crypto.randomUUID(),
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
			},
		})

		// Отправляем письмо
		const notificationService = new NotificationService()
		const activationUrl = `${process.env.APP_URL}/activation?token=${activationToken.token}`
		const emailHtml = getRegistrationEmailTemplate({
			activationUrl,
			name: user.name || undefined,
			email: user.email,
		})

		await notificationService.sendRegistrationEmail(
			user.email,
			emailHtml,
			'Активация аккаунта'
		)

		return {
			success: true,
			message: 'Activation email has been resent',
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
			message: error.message || 'Failed to resend activation email',
		})
	}
})
