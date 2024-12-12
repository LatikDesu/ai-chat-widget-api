import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const removeManagerSchema = z.object({
	managerId: z.string().min(1, 'Manager ID is required'),
	apiKeyId: z.string().min(1, 'API Key ID is required'),
})

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || !['administrator', 'business'].includes(user.role)) {
			throw createError({
				statusCode: 403,
				message:
					'Access denied. Only administrators and business users can remove managers.',
			})
		}

		// Валидируем входные данные
		const body = await readBody(event)
		const validatedData = removeManagerSchema.parse(body)

		// Если пользователь бизнес, проверяем владение API ключом
		if (user.role === 'business') {
			const apiKey = await prisma.apiKey.findUnique({
				where: { id: validatedData.apiKeyId },
				select: { owner: true },
			})

			if (!apiKey || apiKey.owner !== user.email) {
				throw createError({
					statusCode: 403,
					message:
						'Access denied. You can only remove managers from your own API keys.',
				})
			}
		}

		// Проверяем существование менеджера и наличие у него этого ключа
		const manager = await prisma.users.findFirst({
			where: {
				id: validatedData.managerId,
				role: 'manager',
				apiKeyIds: {
					has: validatedData.apiKeyId,
				},
			},
			select: {
				id: true,
				email: true,
				apiKeyIds: true,
			},
		})

		if (!manager) {
			throw createError({
				statusCode: 404,
				message: 'Manager not found or does not have access to this API key',
			})
		}

		// Удаляем ключ из списка доступных ключей менеджера
		const updatedManager = await prisma.users.update({
			where: { id: manager.id },
			data: {
				apiKeyIds: {
					set: manager.apiKeyIds.filter(id => id !== validatedData.apiKeyId),
				},
			},
			select: {
				id: true,
				email: true,
				apiKeyIds: true,
			},
		})

		return {
			success: true,
			data: {
				message: 'API key access removed successfully',
				manager: {
					id: updatedManager.id,
					email: updatedManager.email,
					remainingApiKeys: updatedManager.apiKeyIds.length,
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
			message: error.message || 'Failed to remove manager access',
		})
	}
})
