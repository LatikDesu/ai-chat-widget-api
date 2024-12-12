import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { prisma } from '~/lib/prisma'
import { GptService } from '~/server/services/chat/gpt.service'
export default defineEventHandler(async event => {
	try {
		// Получаем файл и botId из формы
		const formData = await readMultipartFormData(event)
		if (!formData) {
			throw createError({
				statusCode: 400,
				message: 'No form data provided',
			})
		}

		// Получаем botId и файл
		const botIdField = formData.find(field => field.name === 'botId')
		const pdfFile = formData.find(
			field => field.name === 'file' && field.type === 'application/pdf'
		)

		if (!botIdField?.data) {
			throw createError({
				statusCode: 400,
				message: 'Bot ID is required',
			})
		}

		if (!pdfFile?.data) {
			throw createError({
				statusCode: 400,
				message: 'PDF file is required',
			})
		}

		const botId = botIdField.data.toString()

		// Проверяем существование бота и права доступа
		const bot = await prisma.chatBot.findUnique({
			where: { id: botId },
			include: {
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
		if (
			!user ||
			(user.role !== 'administrator' &&
				(user.role !== 'business' || bot.apiKey.owner !== user.email))
		) {
			throw createError({
				statusCode: 403,
				message: 'Access denied',
			})
		}

		// Создаем директорию для файлов, если её нет
		const uploadDir = join(process.cwd(), 'uploads', 'pdf')
		await createDirectory(uploadDir)

		// Сохраняем файл
		const fileName = `${botId}.pdf`
		const filePath = join(uploadDir, fileName)
		await writeFile(filePath, pdfFile.data)

		try {
			const response = await new GptService().createPromptsFromPDFEmbeddings(
				botId,
				filePath
			)
			return {
				success: true,
				data: {
					fileName,
					...response.data,
				},
			}
		} catch (error: any) {
			throw createError({
				statusCode: error.statusCode || 500,
				message: error.message || 'Failed to create prompt embeddings',
			})
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
			message: error.message || 'Failed to create prompt',
		})
	}

	// Вспомогательная функция для создания директории
	async function createDirectory(path: string) {
		try {
			await mkdir(path, { recursive: true })
		} catch (error) {
			// Типизируем ошибку как NodeJS.ErrnoException
			const nodeError = error as NodeJS.ErrnoException
			if (nodeError.code !== 'EEXIST') {
				throw error
			}
		}
	}
})
