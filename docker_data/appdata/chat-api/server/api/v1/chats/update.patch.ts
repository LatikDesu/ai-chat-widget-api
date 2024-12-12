import { createError, defineEventHandler, readBody } from 'h3'
import { prisma } from '~/lib/prisma'
import { StatisticsService } from '~/server/services/apiKey/statistics.service'

export default defineEventHandler(async event => {
	try {
		const body = await readBody(event)
		const { id, mode, isClosed } = body

		if (!id) {
			throw createError({
				statusCode: 400,
				message: 'Chat ID is required',
			})
		}

		if (mode === undefined && isClosed === undefined) {
			throw createError({
				statusCode: 400,
				message: 'At least one field (mode or isClosed) must be provided',
			})
		}

		// Находим чат
		const chat = await prisma.chat.findUnique({
			where: { id },
			select: {
				id: true,
				mode: true,
				isClosed: true,
			},
		})

		if (!chat) {
			throw createError({
				statusCode: 404,
				message: 'Chat not found',
			})
		}

		// Формируем данные для обновления и отслеживаем изменения
		const updateData: any = {}
		const changes: string[] = []

		// Проверяем mode
		if (mode !== undefined) {
			// Валидация значения mode
			if (mode === 'bot' || mode === 'human') {
				if (mode !== chat.mode) {
					updateData.mode = mode
					changes.push('mode')
				}
			} else if (mode !== '') {
				throw createError({
					statusCode: 400,
					message: 'Mode must be either "bot" or "human"',
				})
			}
		}

		// Проверяем isClosed
		if (isClosed !== undefined) {
			// Преобразуем в boolean или оставляем текущее значение
			const newIsClosed = isClosed === '' ? chat.isClosed : Boolean(isClosed)
			if (newIsClosed !== chat.isClosed) {
				updateData.isClosed = newIsClosed
				changes.push('isClosed')
			}
		}

		// Если нет изменений, возвращаем текущие данные
		if (Object.keys(updateData).length === 0) {
			return {
				success: true,
				message: 'No changes required',
				data: chat,
			}
		}

		// Обновляем чат
		const updatedChat = await prisma.chat.update({
			where: { id },
			data: updateData,
			select: {
				id: true,
				mode: true,
				isClosed: true,
				apiKeyId: true,
			},
		})

		if (isClosed) {
			await new StatisticsService().update({
				apiKeyId: updatedChat.apiKeyId,
				isChatCompleted: true,
			})
		}

		return {
			success: true,
			message: `Chat updated successfully. Changed fields: ${changes.join(
				', '
			)}`,
			data: updatedChat,
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to update chat',
		})
	}
})
