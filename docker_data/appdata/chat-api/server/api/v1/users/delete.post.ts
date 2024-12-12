import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const deleteUserSchema = z.object({
	userId: z.string().min(1, 'User ID is required'),
})

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 403,
				message: 'Access denied. Only administrators can delete users.',
			})
		}

		// Валидируем входные данные
		const body = await readBody(event)
		const validatedData = deleteUserSchema.parse(body)

		// Проверяем существование пользователя
		const userToDelete = await prisma.users.findUnique({
			where: { id: validatedData.userId },
			select: {
				id: true,
				role: true,
				email: true,
			},
		})

		if (!userToDelete) {
			throw createError({
				statusCode: 404,
				message: 'User not found',
			})
		}

		// Запрещаем удалять администратора
		if (userToDelete.role === 'administrator') {
			throw createError({
				statusCode: 403,
				message: 'Cannot delete administrator account',
			})
		}

		// Запрещаем удалять самого себя
		if (userToDelete.id === user.id) {
			throw createError({
				statusCode: 403,
				message: 'Cannot delete your own account',
			})
		}

		// Обновляем API ключи, где пользователь является владельцем
		await prisma.apiKey.updateMany({
			where: { owner: userToDelete.email },
			data: {
				isActive: false,
				lastUsedAt: new Date(),
				owner: `DELETED_USER:${userToDelete.email}`,
			},
		})

		// Удаляем пользователя
		await prisma.users.delete({
			where: { id: validatedData.userId },
		})

		return {
			success: true,
			data: {
				message: 'User and associated API keys have been deactivated',
				deletedUser: {
					id: userToDelete.id,
					email: userToDelete.email,
					role: userToDelete.role,
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
			message: error.message || 'Failed to delete user',
		})
	}
})
