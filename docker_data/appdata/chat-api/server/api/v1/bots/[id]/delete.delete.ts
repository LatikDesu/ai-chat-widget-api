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

		// Получаем бота для проверки прав
		const bot = await prisma.chatBot.findUnique({
			where: { id },
			include: { apiKey: true },
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

		// Удаляем бота (связанные таблицы удалятся автоматически благодаря onDelete: Cascade)
		await prisma.chatBot.delete({
			where: { id },
		})

		return {
			success: true,
			message: 'Bot successfully deleted',
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to delete bot',
		})
	}
})
