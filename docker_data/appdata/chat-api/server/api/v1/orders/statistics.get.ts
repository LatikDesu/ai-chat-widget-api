import { createError, defineEventHandler } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		// Проверяем права доступа
		const { user } = event.context
		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 401,
				message: 'Access denied. Only administrators can view statistics.',
			})
		}

		// Получаем текущую дату и начало периодов
		const now = new Date()
		const dayStart = new Date(now.setHours(0, 0, 0, 0))
		const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

		// Получаем статистику в одной транзакции
		const [
			total,
			totalNew,
			totalProcessing,
			totalCompleted,
			todayTotal,
			weekTotal,
			monthTotal,
		] = await prisma.$transaction([
			// Общее количество заявок
			prisma.orders.count(),

			// Количество по статусам
			prisma.orders.count({ where: { status: 'new' } }),
			prisma.orders.count({ where: { status: 'processing' } }),
			prisma.orders.count({ where: { status: 'completed' } }),

			// Заявки за сегодня
			prisma.orders.count({
				where: {
					createdAt: {
						gte: dayStart,
					},
				},
			}),

			// Заявки за текущую неделю
			prisma.orders.count({
				where: {
					createdAt: {
						gte: weekStart,
					},
				},
			}),

			// Заявки за текущий месяц
			prisma.orders.count({
				where: {
					createdAt: {
						gte: monthStart,
					},
				},
			}),
		])

		return {
			success: true,
			data: {
				total: {
					all: total,
					new: totalNew,
					processing: totalProcessing,
					completed: totalCompleted,
				},
				periods: {
					today: todayTotal,
					week: weekTotal,
					month: monthTotal,
				},
				conversion: {
					processing: total ? ((totalProcessing / total) * 100).toFixed(1) : 0,
					completed: total ? ((totalCompleted / total) * 100).toFixed(1) : 0,
				},
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get orders statistics',
		})
	}
})
