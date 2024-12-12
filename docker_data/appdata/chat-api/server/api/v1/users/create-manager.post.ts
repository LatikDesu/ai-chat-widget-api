import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { UserCreateService } from '~/server/services/userCreate.service'

// Схема валидации
const createManagerSchema = z.object({
	email: z.string().email('Invalid email format'),
	apiKeyId: z.string().min(1, 'API Key is required'),
	name: z.string().min(2, 'Name must be at least 2 characters').optional(),
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
		if (!user || user.role !== 'business') {
			throw createError({
				statusCode: 403,
				message: 'Access denied. Only business users can create managers.',
			})
		}

		// Валидируем входные данные
		const body = await readBody(event)
		const validatedData = createManagerSchema.parse(body)

		// Проверяем владение API ключом
		const apiKey = await prisma.apiKey.findUnique({
			where: { id: validatedData.apiKeyId },
			select: { owner: true },
		})

		if (!apiKey || apiKey.owner !== user.email) {
			throw createError({
				statusCode: 403,
				message:
					'Access denied. You can only assign managers to your own API keys.',
			})
		}

		// Проверяем существование пользователя
		const existingUser = await prisma.users.findUnique({
			where: { email: validatedData.email.toLowerCase().trim() },
			select: {
				id: true,
				apiKeyIds: true,
				role: true,
			},
		})

		// Если пользователь существует
		if (existingUser) {
			// Проверяем роль
			if (existingUser.role !== 'manager') {
				throw createError({
					statusCode: 400,
					message: 'User exists with different role',
				})
			}

			// Проверяем наличие ключа
			if (existingUser.apiKeyIds.includes(validatedData.apiKeyId)) {
				throw createError({
					statusCode: 409,
					message: 'Manager already has access to this API key',
				})
			}

			// Добавляем ключ существующему менеджеру
			const updatedUser = await prisma.users.update({
				where: { id: existingUser.id },
				data: {
					apiKeyIds: {
						push: validatedData.apiKeyId,
					},
				},
				select: {
					id: true,
					email: true,
					name: true,
					role: true,
					apiKeyIds: true,
				},
			})

			return {
				success: true,
				data: {
					user: updatedUser,
					message: 'API key added to existing manager',
				},
			}
		}

		// Создаем нового менеджера
		const userCreateService = new UserCreateService()
		const { user: newUser, generatedPassword } =
			await userCreateService.createUser({
				...validatedData,
				role: 'manager',
				isActive: false,
				apiKeyId: validatedData.apiKeyId,
			})

		return {
			success: true,
			data: {
				user: {
					id: newUser.id,
					email: newUser.email,
					name: newUser.name,
					phone: newUser.phone,
					telegram: newUser.telegram,
					role: newUser.role,
					isActive: newUser.isActive,
					apiKeyIds: [validatedData.apiKeyId],
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
			message: error.message || 'Failed to create manager',
		})
	}
})
