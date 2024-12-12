import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { UserCreateService } from '~/server/services/userCreate.service'

// Схема валидации
const createBusinessUserSchema = z.object({
	email: z.string().email('Invalid email format'),
	name: z.string().min(2, 'Name must be at least 2 characters').optional(),
	companyName: z
		.string()
		.min(2, 'Company name must be at least 2 characters')
		.optional(),
	phone: z
		.string()
		.regex(
			/^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
			'Invalid phone number format'
		)
		.optional(),
	telegram: z
		.string()
		.regex(/^@[a-zA-Z0-9_]{5,32}$/, 'Invalid telegram username')
		.optional(),
})

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 403,
				message:
					'Access denied. Only administrators can create business users.',
			})
		}

		// Валидируем входные данные
		const body = await readBody(event)
		const validatedData = createBusinessUserSchema.parse(body)

		// Создаем пользователя
		const userCreateService = new UserCreateService()
		const { user: newUser, generatedPassword } =
			await userCreateService.createUser({
				...validatedData,
				role: 'business',
				isActive: false,
			})

		return {
			success: true,
			data: {
				user: {
					id: newUser.id,
					email: newUser.email,
					name: newUser.name,
					companyName: newUser.companyName,
					phone: newUser.phone,
					telegram: newUser.telegram,
					role: newUser.role,
					isActive: newUser.isActive,
					createdAt: newUser.createdAt,
				},
				// generatedPassword, // Возвращаем сгенерированный пароль только в ответе администратору
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
			message: error.message || 'Failed to create business user',
		})
	}
})
