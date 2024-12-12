import { createError, defineEventHandler, readBody } from 'h3'
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

		const body = await readBody(event)
		const { chatIds } = body

		if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
			throw createError({
				statusCode: 400,
				message: 'Chat IDs array is required',
			})
		}

		// Находим первый чат чтобы получить apiKeyId
		const chat = await prisma.chat.findFirst({
			where: {
				id: {
					in: chatIds,
				},
			},
			select: {
				apiKeyId: true,
			},
		})

		if (!chat) {
			throw createError({
				statusCode: 404,
				message: 'Chats not found',
			})
		}

		// Проверяем доступ пользователя к API ключу
		const hasAccess = await prisma.users.findFirst({
			where: {
				id: user.id,
				apiKeyIds: {
					has: chat.apiKeyId,
				},
			},
		})

		if (!hasAccess) {
			throw createError({
				statusCode: 403,
				message:
					'Access denied. You do not have permission to delete these chats.',
			})
		}

		// Удаляем чаты, принадлежащие этому API ключу
		const result = await prisma.chat.deleteMany({
			where: {
				id: {
					in: chatIds,
				},
				apiKeyId: chat.apiKeyId,
			},
		})

		return {
			success: true,
			message: `Successfully deleted ${result.count} chat(s)`,
			data: {
				deletedCount: result.count,
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to delete chats',
		})
	}
})
