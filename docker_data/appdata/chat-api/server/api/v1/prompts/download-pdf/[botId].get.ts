import { readFile } from 'fs/promises'
import { createError, defineEventHandler, send } from 'h3'
import { join } from 'path'
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

		// Получаем id бота из параметров маршрута
		const botId = event.context.params?.botId

		if (!botId) {
			throw createError({
				statusCode: 400,
				message: 'Bot ID is required',
			})
		}

		// Проверяем доступ пользователя к боту
		const bot = await prisma.chatBot.findUnique({
			where: { id: botId },
			select: {
				id: true,
				apiKeyId: true,
			},
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
					'Access denied. You do not have permission to download this file.',
			})
		}

		// Формируем путь к файлу
		const filePath = join(process.cwd(), 'uploads', 'pdf', `${botId}.pdf`)

		// Читаем и отправляем файл
		const file = await readFile(filePath)
		event.node.res.setHeader(
			'Content-Disposition',
			`attachment; filename="${botId}.pdf"`
		)
		return send(event, file, 'application/pdf')
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to download file',
		})
	}
})
