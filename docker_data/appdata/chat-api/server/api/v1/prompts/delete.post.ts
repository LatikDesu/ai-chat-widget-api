import { createError, defineEventHandler, readBody } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		// Получаем пользователя из контекста
		const { user } = event.context

		if (!user) {
			throw createError({
				statusCode: 401,
				message: 'Unauthorized',
			})
		}

		const body = await readBody(event)
		const { id } = body

		if (!id) {
			throw createError({
				statusCode: 400,
				message: 'Prompt ID is required',
			})
		}

		// Находим промпт для проверки прав доступа
		const prompt = await prisma.prompt.findUnique({
			where: { id },
			include: {
				bot: true, // Включаем связанного бота для проверки apiKeyId
			},
		})

		if (!prompt) {
			throw createError({
				statusCode: 404,
				message: 'Prompt not found',
			})
		}

		// Проверяем доступ пользователя к API ключу бота
		const hasAccess = await prisma.users.findFirst({
			where: {
				id: user.id,
				apiKeyIds: {
					has: prompt.bot.apiKeyId,
				},
			},
		})

		if (!hasAccess) {
			throw createError({
				statusCode: 403,
				message:
					'Access denied. You do not have permission to delete this prompt.',
			})
		}

		// Удаляем промпт
		await prisma.prompt.delete({
			where: { id },
		})

		return {
			success: true,
			message: 'Prompt deleted successfully',
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to delete prompt',
		})
	}
})
