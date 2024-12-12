import { createError, defineEventHandler } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		const id = event.context.params?.id
		if (!id) {
			throw createError({
				statusCode: 400,
				message: 'Bot ID is required',
			})
		}

		// Получаем бота со связанными данными
		const bot = await prisma.chatBot.findUnique({
			where: { id },
			include: {
				apiKey: true,
			},
		})

		if (!bot) {
			throw createError({
				statusCode: 404,
				message: 'Bot not found',
			})
		}

		// Проверяем права доступа
		const { user } = event.context
		if (
			!user ||
			(user.role !== 'administrator' &&
				(user.role !== 'business' || !user.apiKeyIds?.includes(bot.apiKeyId)))
		) {
			throw createError({
				statusCode: 403,
				message: 'Access denied',
			})
		}

		return {
			success: true,
			data: {
				// Данные бота
				id: bot.id,
				apiKeyId: bot.apiKeyId,
				role: bot.role,
				tasks: bot.tasks,
				emotionalProfile: bot.emotionalProfile,
				context: bot.context,
				example: bot.example,
				notes: bot.notes,
				categories: bot.categories,
				createdAt: bot.createdAt,
				updatedAt: bot.updatedAt,
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get bot info',
		})
	}
})
