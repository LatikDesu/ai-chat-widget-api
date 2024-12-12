import { createError, defineEventHandler } from 'h3'
import { prisma } from '~/lib/prisma'
import { UserRole } from '~/server/types/users'

export default defineEventHandler(async () => {
	try {
		// Получаем общее количество пользователей
		const totalUsers = await prisma.users.count()

		// Получаем количество пользователей по ролям
		const usersByRole = await prisma.users.groupBy({
			by: ['role'],
			_count: true,
		})

		// Получаем количество активных/неактивных пользователей
		const usersByStatus = await prisma.users.groupBy({
			by: ['isActive'],
			_count: true,
		})

		// Получаем пользователей с ключами и без
		const usersWithKeys = await prisma.users.count({
			where: {
				apiKeyIds: {
					isEmpty: false,
				},
			},
		})

		// Получаем статистику по созданию пользователей за последние 30 дней
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

		const recentUsers = await prisma.users.groupBy({
			by: ['role'],
			where: {
				createdAt: {
					gte: thirtyDaysAgo,
				},
			},
			_count: true,
		})

		// Формируем ответ
		return {
			total: totalUsers,
			byRole: usersByRole.reduce(
				(acc, curr) => ({
					...acc,
					[curr.role]: curr._count,
				}),
				{} as Record<UserRole, number>
			),
			byStatus: {
				active: usersByStatus.find(s => s.isActive)?._count || 0,
				inactive: usersByStatus.find(s => !s.isActive)?._count || 0,
			},
			withKeys: {
				with: usersWithKeys,
				without: totalUsers - usersWithKeys,
			},
			recent: {
				total: recentUsers.reduce((sum, curr) => sum + curr._count, 0),
				byRole: recentUsers.reduce(
					(acc, curr) => ({
						...acc,
						[curr.role]: curr._count,
					}),
					{} as Record<UserRole, number>
				),
			},
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Internal server error',
		})
	}
})
