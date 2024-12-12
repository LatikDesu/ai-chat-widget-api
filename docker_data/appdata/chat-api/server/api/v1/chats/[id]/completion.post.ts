import { createError, defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { StatisticsService } from '~/server/services/apiKey/statistics.service'
import { GptService } from '~/server/services/chat/gpt.service'

const gptSchema = z.object({
	message: z.string().min(1),
})

export default defineEventHandler(async event => {
	try {
		const id = event.context.params?.id
		if (!id) {
			throw createError({
				statusCode: 400,
				message: 'Chat ID is required',
			})
		}

		const body = await readBody(event)
		const { message } = gptSchema.parse(body)
		const chat = await prisma.chat.findUnique({
			where: { id },
			select: {
				apiKeyId: true,
			},
		})

		if (!chat) {
			throw createError({
				statusCode: 404,
				message: 'Chat not found',
			})
		}

		const gptService = new GptService()
		const response = await gptService.getResponse(chat.apiKeyId, id, message)

		// Сохраняем ответ в базу
		await prisma.message.create({
			data: {
				chatId: id,
				content: response?.response || '',
				role: 'assistant',
			},
		})

		// Обновляем статистику

		await new StatisticsService().update({
			apiKeyId: chat.apiKeyId,
			messageType: 'assistant',
			tokens: response?.tokens || 0,
			responseTime: response?.responseTime || 0,
		})

		return {
			success: true,
			data: response,
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get GPT response',
		})
	}
})
