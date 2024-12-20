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

		// Получаем бота с кастомизацией
		const bot = await prisma.chatBot.findUnique({
			where: { id },
			include: {
				customization: true,
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
		if (!user) {
			throw createError({
				statusCode: 403,
				message: 'Access denied',
			})
		}

		// Проверяем права доступа: администратор или владелец ключа
		if (user.role === 'administrator') {
			// Администраторы имеют полный доступ
		} else {
			// Проверяем, принадлежит ли ключ API пользователю
			const apiKey = await prisma.apiKey.findUnique({
				where: { id: bot.apiKeyId },
				select: { owner: true },
			})

			if (!apiKey || apiKey.owner !== user.email) {
				throw createError({
					statusCode: 403,
					message: 'Access denied',
				})
			}
		}

		if (!bot.customization) {
			throw createError({
				statusCode: 404,
				message: 'Customization not found',
			})
		}

		return {
			success: true,
			data: {
				greeting: bot.customization.greeting,
				headerTitle: bot.customization.headerTitle,
				headerColor: bot.customization.headerColor,
				headerTextColor: bot.customization.headerTextColor,
				backgroundColor: bot.customization.backgroundColor,
				userColor: bot.customization.userColor,
				userBorderColor: bot.customization.userBorderColor,
				userTextColor: bot.customization.userTextColor,
				botColor: bot.customization.botColor,
				botBorderColor: bot.customization.botBorderColor,
				botTextColor: bot.customization.botTextColor,
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get bot customization',
		})
	}
})
