import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { UserCreateService } from '~/server/services/userCreate.service'

// Схема валидации для регистрации
const registrationSchema = z
	.object({
		name: z.string().min(2, 'Name must be at least 2 characters'),
		email: z.string().email('Invalid email format'),
		password: z.string().min(8, 'Password must be at least 8 characters'),
		passwordConfirm: z.string(),
	})
	.refine(data => data.password === data.passwordConfirm, {
		message: "Passwords don't match",
		path: ['passwordConfirm'],
	})

export default defineEventHandler(async event => {
	try {
		// Валидируем входные данные
		const body = await readBody(event)
		const validatedData = registrationSchema.parse(body)

		// Создаем пользователя через сервис
		const userCreateService = new UserCreateService()
		const { user } = await userCreateService.createUser({
			name: validatedData.name,
			email: validatedData.email,
			password: validatedData.password,
			passwordConfirm: validatedData.passwordConfirm,
			role: 'business', // Явно указываем роль
			isActive: false, // Новые пользователи неактивны до подтверждения
		})

		// Возвращаем только нужные поля
		return {
			success: true,
			data: {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				isActive: user.isActive,
				createdAt: user.createdAt,
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
			message: error.message || 'Registration failed',
		})
	}
})
