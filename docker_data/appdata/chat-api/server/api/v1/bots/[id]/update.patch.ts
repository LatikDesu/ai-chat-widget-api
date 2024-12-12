import { createError, defineEventHandler } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'

// Схема валидации
const updateBotSchema = z.object({
	role: z.string().optional(),
	tasks: z.string().optional(),
	emotionalProfile: z.string().optional(),
	context: z.string().optional(),
	example: z.string().optional(),
	notes: z.string().optional(),
	addCategories: z.array(z.string()).optional(),
	removeCategories: z.array(z.string()).optional(),
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

		// Получаем бота для проверки прав и текущих категорий
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

		// Валидируем входные данные
		const body = await readBody(event)
		const { addCategories, removeCategories, ...updateData } =
			updateBotSchema.parse(body)

		// Обрабатываем категории
		let updatedCategories = [...(bot.categories || [])]

		// Добавляем новые категории
		if (addCategories?.length) {
			for (const category of addCategories) {
				if (updatedCategories.includes(category)) {
					throw createError({
						statusCode: 400,
						message: `Category "${category}" already exists`,
					})
				}
				updatedCategories.push(category)
			}
		}

		// Удаляем категории
		if (removeCategories?.length) {
			updatedCategories = updatedCategories.filter(
				cat => !removeCategories.includes(cat)
			)
		}

		// Обновляем бота
		const updatedBot = await prisma.chatBot.update({
			where: { id },
			data: {
				...updateData,
				categories: updatedCategories,
			},
		})

		return {
			success: true,
			data: {
				id: updatedBot.id,
				apiKeyId: updatedBot.apiKeyId,
				role: updatedBot.role,
				tasks: updatedBot.tasks,
				emotionalProfile: updatedBot.emotionalProfile,
				context: updatedBot.context,
				example: updatedBot.example,
				notes: updatedBot.notes,
				categories: updatedBot.categories,
				createdAt: updatedBot.createdAt,
				updatedAt: updatedBot.updatedAt,
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
			message: error.message || 'Failed to update bot',
		})
	}
})
