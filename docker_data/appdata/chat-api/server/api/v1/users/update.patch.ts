import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const updateUserSchema = z.object({
	userId: z.string().optional(), // ID пользователя (для админа)
	name: z.string().min(2, 'Name must be at least 2 characters').optional(),
	companyName: z
		.string()
		.min(2, 'Company name must be at least 2 characters')
		.optional(),
	phone: z
		.string()
		.regex(
			/^(\+7|7|8)?[\s\-]?(\(\d{3}\)|\d{3})[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/,
			'Invalid phone number format'
		)
		.optional()
		.nullable(),
	telegram: z
		.string()
		.regex(/^@[a-zA-Z0-9_]{5,32}$/, 'Invalid telegram username')
		.optional()
		.nullable(),
	role: z.enum(['administrator', 'business', 'manager']).optional(),
	isActive: z.boolean().optional(), // Добавляем поле isActive
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
		const validatedData = updateUserSchema.parse(body)

		// Определяем ID пользователя для обновления
		let targetUserId = user.id

		// Если запрос от администратора и указан userId
		if (user.role === 'administrator' && validatedData.userId) {
			targetUserId = validatedData.userId
		} else if (validatedData.userId && validatedData.userId !== user.id) {
			// Если не админ пытается обновить чужие данные
			throw createError({
				statusCode: 403,
				message: 'You can only update your own data',
			})
		}

		// Проверяем попытку изменения роли или активности
		if (validatedData.role || validatedData.isActive !== undefined) {
			// Только администратор может менять роли и активность
			if (user.role !== 'administrator') {
				throw createError({
					statusCode: 403,
					message:
						'Only administrators can change user roles and activity status',
				})
			}
			// Администратор не может понизить свою роль или деактивировать себя
			if (targetUserId === user.id) {
				throw createError({
					statusCode: 403,
					message:
						'Administrators cannot change their own role or deactivate themselves',
				})
			}
		}

		// Проверяем, есть ли данные для обновления
		const updateData = {
			...(validatedData.name && { name: validatedData.name }),
			...(validatedData.companyName && {
				companyName: validatedData.companyName,
			}),
			...(validatedData.phone !== undefined && { phone: validatedData.phone }),
			...(validatedData.telegram !== undefined && {
				telegram: validatedData.telegram,
			}),
			...(validatedData.role && { role: validatedData.role }),
			...(validatedData.isActive !== undefined && {
				isActive: validatedData.isActive,
			}),
		}

		if (Object.keys(updateData).length === 0) {
			throw createError({
				statusCode: 400,
				message: 'No data to update',
			})
		}

		// Обновляем данные пользователя
		const updatedUser = await prisma.users.update({
			where: { id: targetUserId },
			data: updateData,
			select: {
				id: true,
				email: true,
				name: true,
				companyName: true,
				phone: true,
				telegram: true,
				role: true,
				isActive: true,
				createdAt: true,
				updatedAt: true,
			},
		})

		return {
			success: true,
			data: updatedUser,
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
			message: error.message || 'Failed to update user',
		})
	}
})
