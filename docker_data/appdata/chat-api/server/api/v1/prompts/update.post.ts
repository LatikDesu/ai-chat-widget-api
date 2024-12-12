import { createError, defineEventHandler, readBody } from 'h3'
import { prisma } from '~/lib/prisma'
import { GptService } from '~/server/services/chat/gpt.service'

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
		const { id, content, isActive } = body

		if (!id) {
			throw createError({
				statusCode: 400,
				message: 'ID is required.',
			})
		}

		// Находим существующий промпт с информацией о botId
		const existingPrompt = await prisma.prompt.findUnique({
			where: { id },
			include: {
				bot: true, // Включаем связанного бота для проверки apiKeyId
			},
		})

		if (!existingPrompt) {
			throw createError({
				statusCode: 404,
				message: 'Prompt not found.',
			})
		}

		// Проверяем доступ пользователя к API ключу
		const hasAccess = await prisma.users.findFirst({
			where: {
				id: user.id,
				apiKeyIds: {
					has: existingPrompt.bot.apiKeyId,
				},
			},
		})

		if (!hasAccess) {
			throw createError({
				statusCode: 403,
				message:
					'Access denied. You do not have permission to update this prompt.',
			})
		}

		// Проверка состояния isActive
		if (isActive !== undefined && content === undefined) {
			// Если isActive указан, но контент отсутствует, обновляем состояние isActive
			await prisma.prompt.update({
				where: { id },
				data: { isActive },
			})

			return {
				success: true,
				message: 'Prompt status updated successfully.',
				data: { id, isActive },
			}
		}

		// Если контент предоставлен, обновляем промпт
		if (content) {
			try {
				const response = await new GptService().updatePromptEmbeddings({
					id,
					content,
					isActive: isActive !== undefined ? isActive : existingPrompt.isActive,
				})

				return {
					success: true,
					data: response.data,
				}
			} catch (error: any) {
				throw createError({
					statusCode: error.statusCode || 500,
					message: error.message || 'Failed to update prompt embeddings',
				})
			}
		}

		throw createError({
			statusCode: 400,
			message: 'Content is required to update the prompt.',
		})
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Internal server error.',
		})
	}
})
