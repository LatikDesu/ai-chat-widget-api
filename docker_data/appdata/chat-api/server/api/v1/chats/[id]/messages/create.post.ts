import { createError, defineEventHandler } from 'h3'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { StatisticsService } from '~/server/services/apiKey/statistics.service'
const createMessageSchema = z.object({
	content: z.string().min(1),
	role: z.enum(['user', 'assistant', 'human']),
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
		const { content, role } = createMessageSchema.parse(body)

		const message = await prisma.message.create({
			data: {
				chatId: id,
				content,
				role,
			},
			select: {
				id: true,
				content: true,
				role: true,
				createdAt: true,
			},
		})

		const chat = await prisma.chat.findUnique({
			where: { id },
			select: {
				apiKeyId: true,
				mode: true,
			},
		})

		if (chat) {
			await new StatisticsService().update({
				apiKeyId: chat.apiKeyId,
				messageType: role === 'user' ? 'user' : 'consultant',
			})
		}

		const response = {
			success: true,
			data: message,
		}

		return response
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw createError({
				statusCode: 400,
				message: error.errors[0].message,
			})
		}

		throw createError({
			statusCode: 500,
			message: 'Failed to create message',
		})
	}
})
