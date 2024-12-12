import { createError, defineEventHandler } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		const { user } = event.context

		if (!user) {
			throw createError({
				statusCode: 401,
				message: 'Unauthorized',
			})
		}

		const botId = event.context.params?.id

		if (!botId) {
			throw createError({
				statusCode: 400,
				message: 'Bot ID is required',
			})
		}

		// Проверяем доступ пользователя к боту
		const bot = await prisma.chatBot.findUnique({
			where: { id: botId },
		})

		if (!bot) {
			throw createError({
				statusCode: 404,
				message: 'Bot not found',
			})
		}

		// Проверяем доступ пользователя к API ключу бота
		const hasAccess = await prisma.users.findFirst({
			where: {
				id: user.id,
				apiKeyIds: {
					has: bot.apiKeyId,
				},
			},
		})

		if (!hasAccess) {
			throw createError({
				statusCode: 403,
				message:
					'Access denied. You do not have permission to view these prompts.',
			})
		}

		// Проверяем наличие PDF промптов
		const hasPdfPrompts = await prisma.prompt.findFirst({
			where: {
				botId,
				category: 'pdf',
			},
		})

		// Получаем все промпты, кроме PDF категории
		const prompts = await prisma.prompt.findMany({
			where: {
				botId,
				category: { not: 'pdf' },
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		return {
			success: true,
			data: {
				prompts,
				hasPdfFile: hasPdfPrompts ? 'PDF file is uploaded' : null,
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get prompts',
		})
	}
})
