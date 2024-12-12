import { createError } from '#imports'
import { prisma } from '~/lib/prisma'
import { getRegistrationEmailTemplate } from '~/server/templates/email/registration'
import type { UserCreate } from '~/server/types/users'
import { NotificationService } from './notification.service'
import { PasswordService } from './password.service'

export class UserCreateService {
	async createUser(data: UserCreate) {
		// Проверяем существование пользователя
		const existingUser = await prisma.users.findUnique({
			where: { email: data.email.toLowerCase().trim() },
		})

		if (existingUser) {
			throw createError({
				statusCode: 409,
				message: 'User with this email already exists',
			})
		}

		// Генерация пароля если не указан
		let generatedPassword: string | undefined
		let password = data.password

		if (!password) {
			generatedPassword = PasswordService.generatePassword()
			password = generatedPassword
		}

		// // Проверка совпадения паролей при регистрации
		// if ('passwordConfirm' in data && password !== data.passwordConfirm) {
		// 	throw createError({
		// 		statusCode: 400,
		// 		message: 'Passwords do not match',
		// 	})
		// }

		// Хеширование пароля
		const hashedPassword = await PasswordService.hash(password)

		// Создаем пользователя с указанными значениями
		const user = await prisma.users.create({
			data: {
				email: data.email.toLowerCase().trim(),
				password: hashedPassword,
				role: data.role || 'business',
				isActive: data.isActive ?? false,
				companyName: data.companyName || null,
				name: data.name || null,
				phone: data.phone || null,
				telegram: data.telegram || null,
				apiKeyIds: data.apiKeyId ? [data.apiKeyId] : [],
			},
			select: {
				id: true,
				email: true,
				role: true,
				isActive: true,
				companyName: true,
				name: true,
				phone: true,
				telegram: true,
				createdAt: true,
			},
		})

		// Создаем токен активации если пользователь не активирован
		let activationToken = null
		if (!user.isActive) {
			activationToken = await prisma.activationToken.create({
				data: {
					userId: user.id,
					token: crypto.randomUUID(),
					expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
				},
			})

			const notificationService = new NotificationService()
			const activationUrl = `${process.env.APP_URL}/api/v1/users/activation?token=${activationToken.token}`
			const emailHtml = getRegistrationEmailTemplate({
				activationUrl,
				name: user.name || undefined,
				email: user.email,
				password: generatedPassword,
			})
			await notificationService.sendRegistrationEmail(
				user.email,
				emailHtml,
				'Активация аккаунта'
			)
		}

		return { user, generatedPassword }
	}
}
