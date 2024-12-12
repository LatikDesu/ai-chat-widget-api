import { createError, defineEventHandler } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		const id = event.context.params?.id
		if (!id) {
			throw createError({
				statusCode: 400,
				message: 'Chat ID is required',
			})
		}

		const chat = await prisma.chat.findUnique({
			where: { id },
			include: {
				messages: {
					orderBy: {
						createdAt: 'asc',
					},
					select: {
						id: true,
						content: true,
						role: true,
						createdAt: true,
					},
				},
			},
		})

		if (!chat) {
			throw createError({
				statusCode: 404,
				message: 'Chat not found',
			})
		}

		return {
			success: true,
			data: {
				id: chat.id,
				title: chat.title,
				mode: chat.mode,
				isClosed: chat.isClosed,
				messages: chat.messages,
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to load chat messages',
		})
	}
})
