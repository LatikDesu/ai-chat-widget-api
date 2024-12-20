import { createError, defineEventHandler } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const updateCustomizationSchema = z.object({
	greeting: z.string().optional(),
	headerTitle: z.string().optional(),
	headerColor: z.string().optional(),
	headerTextColor: z.string().optional(),
	backgroundColor: z.string().optional(),
	userColor: z.string().optional(),
	userBorderColor: z.string().optional(),
	userTextColor: z.string().optional(),
	botColor: z.string().optional(),
	botBorderColor: z.string().optional(),
	botTextColor: z.string().optional(),
})

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

		// Валидируем входные данные
		const body = await readBody(event)
		const updateData = updateCustomizationSchema.parse(body)

		// Обновляем кастомизацию
		const updatedCustomization = await prisma.chatCustomization.update({
			where: { botId: id },
			data: updateData,
		})

		return {
			success: true,
			data: {
				greeting: updatedCustomization.greeting,
				headerTitle: updatedCustomization.headerTitle,
				headerColor: updatedCustomization.headerColor,
				headerTextColor: updatedCustomization.headerTextColor,
				backgroundColor: updatedCustomization.backgroundColor,
				userColor: updatedCustomization.userColor,
				userBorderColor: updatedCustomization.userBorderColor,
				userTextColor: updatedCustomization.userTextColor,
				botColor: updatedCustomization.botColor,
				botBorderColor: updatedCustomization.botBorderColor,
				botTextColor: updatedCustomization.botTextColor,
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
			message: error.message || 'Failed to update bot customization',
		})
	}
})
