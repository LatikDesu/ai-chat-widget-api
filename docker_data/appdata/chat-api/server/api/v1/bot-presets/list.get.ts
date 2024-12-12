import { createError, defineEventHandler, getQuery } from 'h3'
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

		const query = getQuery(event)
		const { isPublic, search } = query

		const where: any = {}

		// Для не-администраторов показываем только публичные пресеты
		if (user.role !== 'administrator') {
			where.isPublic = true
		} else if (isPublic !== undefined) {
			// Для администраторов учитываем параметр isPublic из запроса
			where.isPublic = isPublic === 'true'
		}

		// Добавляем поиск по названию и описанию
		if (search) {
			where.OR = [
				{ title: { contains: search as string, mode: 'insensitive' } },
				{ description: { contains: search as string, mode: 'insensitive' } },
			]
		}

		// Получаем пресеты с сортировкой по дате создания
		const presets = await prisma.botPreset.findMany({
			where,
			orderBy: {
				createdAt: 'desc',
			},
			select: {
				id: true,
				icon: true,
				title: true,
				description: true,
				isPublic: true,
				role: true,
				tasks: true,
				emotionalProfile: true,
				context: true,
				example: true,
				notes: true,
				categories: true,
				customization: true,
				prompts: true,
				createdAt: true,
				updatedAt: true,
			},
		})

		return {
			success: true,
			data: presets || [],
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get presets',
		})
	}
})
