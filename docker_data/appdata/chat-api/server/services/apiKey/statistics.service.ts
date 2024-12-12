import { prisma } from '~/lib/prisma'

interface UpdateStatisticsParams {
	apiKeyId: string
	tokens?: number
	messageType?: 'user' | 'assistant' | 'consultant'
	responseTime?: number
	isNewChat?: boolean
	isChatCompleted?: boolean
	chatDuration?: number
}

export class StatisticsService {
	// Обновление общей статистики
	async updateStatistics(params: UpdateStatisticsParams) {
		try {
			const current = await prisma.apiKeyStatistics.findUnique({
				where: { apiKeyId: params.apiKeyId },
			})

			return await prisma.apiKeyStatistics.upsert({
				where: { apiKeyId: params.apiKeyId },
				create: {
					apiKeyId: params.apiKeyId,
					tokenUsed: params.tokens || 0,
					totalChatsStarted: params.isNewChat ? 1 : 0,
					totalMessagesSent: params.messageType ? 1 : 0,
					requestsCount: 1,
					botMessagesCount: params.messageType === 'assistant' ? 1 : 0,
					humanMessagesCount: params.messageType === 'user' ? 1 : 0,
					consultantMessagesCount: params.messageType === 'consultant' ? 1 : 0,
					totalResponseTime: params.responseTime || 0,
					responseCount: params.responseTime ? 1 : 0,
					completedChats: params.isChatCompleted ? 1 : 0,
					totalChatDuration: params.chatDuration || 0,
					shortestChatDuration: params.chatDuration || 0,
					longestChatDuration: params.chatDuration || 0,
					mostActiveHour: new Date().getHours(),
					leastActiveHour: new Date().getHours(),
				},
				update: {
					tokenUsed: { increment: params.tokens || 0 },
					totalChatsStarted: params.isNewChat ? { increment: 1 } : undefined,
					totalMessagesSent: params.messageType ? { increment: 1 } : undefined,
					requestsCount: { increment: 1 },
					botMessagesCount:
						params.messageType === 'assistant' ? { increment: 1 } : undefined,
					humanMessagesCount:
						params.messageType === 'user' ? { increment: 1 } : undefined,
					consultantMessagesCount:
						params.messageType === 'consultant' ? { increment: 1 } : undefined,
					totalResponseTime: params.responseTime
						? { increment: params.responseTime }
						: undefined,
					responseCount: params.responseTime ? { increment: 1 } : undefined,
					completedChats: params.isChatCompleted ? { increment: 1 } : undefined,
					totalChatDuration: params.chatDuration
						? { increment: params.chatDuration }
						: undefined,
					shortestChatDuration:
						params.chatDuration &&
						(!current?.shortestChatDuration ||
							params.chatDuration < current.shortestChatDuration)
							? { set: params.chatDuration }
							: undefined,
					longestChatDuration:
						params.chatDuration &&
						(!current?.longestChatDuration ||
							params.chatDuration > current.longestChatDuration)
							? { set: params.chatDuration }
							: undefined,
				},
			})
		} catch (error) {
			console.error('Failed to update statistics:', error)
			throw error
		}
	}

	async updateUsageStatistics(params: UpdateStatisticsParams) {
		try {
			const timeInterval = this.roundToHourStart(new Date())

			return await prisma.apiKeyUsage.upsert({
				where: {
					apiKeyId_timeInterval: {
						apiKeyId: params.apiKeyId,
						timeInterval,
					},
				},
				create: {
					apiKeyId: params.apiKeyId,
					timeInterval,
					tokenUsed: params.tokens || 0,
					chatsStarted: params.isNewChat ? 1 : 0,
					messagesSent: params.messageType ? 1 : 0,
					messagesFromBot: params.messageType === 'assistant' ? 1 : 0,
					messagesFromUser:
						params.messageType === 'user' || params.messageType === 'consultant'
							? 1
							: 0,
					requestsCount: 1,
				},
				update: {
					tokenUsed: { increment: params.tokens || 0 },
					chatsStarted: params.isNewChat ? { increment: 1 } : undefined,
					messagesSent: params.messageType ? { increment: 1 } : undefined,
					messagesFromBot:
						params.messageType === 'assistant' ? { increment: 1 } : undefined,
					messagesFromUser:
						params.messageType === 'user' || params.messageType === 'consultant'
							? { increment: 1 }
							: undefined,
					requestsCount: { increment: 1 },
				},
			})
		} catch (error) {
			console.error('Failed to update usage statistics:', error)
			throw error
		}
	}

	// Общий метод для обновления всей статистики
	async update(params: UpdateStatisticsParams) {
		try {
			// Обновляем обе статистики в одной транзакции
			return await prisma.$transaction(async tx => {
				const statistics = await this.updateStatistics(params)
				const usage = await this.updateUsageStatistics(params)

				return {
					statistics,
					usage,
				}
			})
		} catch (error) {
			console.error('Failed to update all statistics:', error)
			throw error
		}
	}

	// Новые методы для агрегации и аналитики
	async recalculateActivityMetrics(apiKeyId: string) {
		try {
			// Получаем статистику использования за последние 24 часа
			const endTime = new Date()
			const startTime = new Date(endTime)
			startTime.setHours(endTime.getHours() - 24)

			const usage = await prisma.apiKeyUsage.findMany({
				where: {
					apiKeyId,
					timeInterval: {
						gte: startTime,
						lte: endTime,
					},
				},
				orderBy: {
					requestsCount: 'desc',
				},
			})

			if (usage.length === 0) return

			// Определяем самые активные/неактивные часы
			const mostActiveHour = usage[0].timeInterval.getHours()
			const leastActiveHour = usage[usage.length - 1].timeInterval.getHours()

			// Обновляем метрики активности
			await prisma.apiKeyStatistics.update({
				where: { apiKeyId },
				data: {
					mostActiveHour,
					leastActiveHour,
				},
			})

			return { mostActiveHour, leastActiveHour }
		} catch (error) {
			console.error('Failed to recalculate activity metrics:', error)
			throw error
		}
	}

	// Метод для агрегации дневной статистики
	async aggregateDailyStatistics(apiKeyId: string) {
		try {
			const yesterday = new Date()
			yesterday.setDate(yesterday.getDate() - 1)
			yesterday.setHours(0, 0, 0, 0)

			const today = new Date()
			today.setHours(0, 0, 0, 0)

			// Получаем все записи за вчерашний день
			const usage = await prisma.apiKeyUsage.findMany({
				where: {
					apiKeyId,
					timeInterval: {
						gte: yesterday,
						lt: today,
					},
				},
			})

			// Агрегируем данные
			const dailyStats = usage.reduce(
				(acc, curr) => ({
					tokenUsed: acc.tokenUsed + curr.tokenUsed,
					chatsStarted: acc.chatsStarted + curr.chatsStarted,
					messagesSent: acc.messagesSent + curr.messagesSent,
					messagesFromBot: acc.messagesFromBot + curr.messagesFromBot,
					messagesFromUser: acc.messagesFromUser + curr.messagesFromUser,
					requestsCount: acc.requestsCount + curr.requestsCount,
				}),
				{
					tokenUsed: 0,
					chatsStarted: 0,
					messagesSent: 0,
					messagesFromBot: 0,
					messagesFromUser: 0,
					requestsCount: 0,
				}
			)

			// Здесь можно сохранить агрегированные данные в отдельную таблицу
			// или использовать для других целей

			return dailyStats
		} catch (error) {
			console.error('Failed to aggregate daily statistics:', error)
			throw error
		}
	}

	// Получение детальной статистики за день
	async getDailyStatistics(apiKeyId: string, date: Date) {
		try {
			const dayStart = new Date(date)
			dayStart.setHours(0, 0, 0, 0)

			const dayEnd = new Date(date)
			dayEnd.setHours(23, 59, 59, 999)

			const usage = await prisma.apiKeyUsage.findMany({
				where: {
					apiKeyId,
					timeInterval: {
						gte: dayStart,
						lte: dayEnd,
					},
				},
				orderBy: {
					timeInterval: 'asc',
				},
			})

			return {
				date: dayStart.toISOString().split('T')[0],
				hourly: usage,
				totals: usage.reduce(
					(acc, curr) => ({
						tokenUsed: acc.tokenUsed + curr.tokenUsed,
						chatsStarted: acc.chatsStarted + curr.chatsStarted,
						messagesSent: acc.messagesSent + curr.messagesSent,
						messagesFromBot: acc.messagesFromBot + curr.messagesFromBot,
						messagesFromUser: acc.messagesFromUser + curr.messagesFromUser,
						requestsCount: acc.requestsCount + curr.requestsCount,
					}),
					{
						tokenUsed: 0,
						chatsStarted: 0,
						messagesSent: 0,
						messagesFromBot: 0,
						messagesFromUser: 0,
						requestsCount: 0,
					}
				),
			}
		} catch (error) {
			console.error('Failed to get daily statistics:', error)
			throw error
		}
	}

	// Получение месячной статистики
	async getMonthlyStatistics(apiKeyId: string, year: number, month: number) {
		try {
			const monthStart = new Date(year, month - 1, 1)
			const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

			const usage = await prisma.apiKeyUsage.findMany({
				where: {
					apiKeyId,
					timeInterval: {
						gte: monthStart,
						lte: monthEnd,
					},
				},
				orderBy: {
					timeInterval: 'asc',
				},
			})

			// Группируем по дням
			const dailyStats = usage.reduce((acc, curr) => {
				const day = curr.timeInterval.toISOString().split('T')[0]
				if (!acc[day]) {
					acc[day] = {
						tokenUsed: 0,
						chatsStarted: 0,
						messagesSent: 0,
						messagesFromBot: 0,
						messagesFromUser: 0,
						requestsCount: 0,
					}
				}

				acc[day].tokenUsed += curr.tokenUsed
				acc[day].chatsStarted += curr.chatsStarted
				acc[day].messagesSent += curr.messagesSent
				acc[day].messagesFromBot += curr.messagesFromBot
				acc[day].messagesFromUser += curr.messagesFromUser
				acc[day].requestsCount += curr.requestsCount

				return acc
			}, {} as Record<string, any>)

			return {
				year,
				month,
				daily: dailyStats,
				totals: usage.reduce(
					(acc, curr) => ({
						tokenUsed: acc.tokenUsed + curr.tokenUsed,
						chatsStarted: acc.chatsStarted + curr.chatsStarted,
						messagesSent: acc.messagesSent + curr.messagesSent,
						messagesFromBot: acc.messagesFromBot + curr.messagesFromBot,
						messagesFromUser: acc.messagesFromUser + curr.messagesFromUser,
						requestsCount: acc.requestsCount + curr.requestsCount,
					}),
					{
						tokenUsed: 0,
						chatsStarted: 0,
						messagesSent: 0,
						messagesFromBot: 0,
						messagesFromUser: 0,
						requestsCount: 0,
					}
				),
			}
		} catch (error) {
			console.error('Failed to get monthly statistics:', error)
			throw error
		}
	}

	// Преобразование времени в UTC
	private roundToHourStart(date: Date): Date {
		const utcDate = new Date(date.toISOString())
		utcDate.setUTCMinutes(0, 0, 0)
		return utcDate
	}

	// Получение почасовой статистики за день с оптимизацией запросов
	async getDayStatistics(apiKeyId: string, date: Date) {
		try {
			const utcDate = new Date(date.toISOString())
			const dayStart = new Date(utcDate)
			dayStart.setUTCHours(0, 0, 0, 0)

			const dayEnd = new Date(utcDate)
			dayEnd.setUTCHours(23, 59, 59, 999)

			// Получаем агрегированные данные за каждый час
			const hourlyStats = await prisma.apiKeyUsage.groupBy({
				by: ['timeInterval'],
				where: {
					apiKeyId,
					timeInterval: {
						gte: dayStart,
						lte: dayEnd,
					},
				},
				_sum: {
					tokenUsed: true,
					chatsStarted: true,
					messagesSent: true,
					messagesFromBot: true,
					messagesFromUser: true,
					requestsCount: true,
				},
			})

			// Создаем полный массив часов
			return {
				date: dayStart.toISOString().split('T')[0],
				hours: Array.from({ length: 24 }, (_, hour) => {
					const hourDate = new Date(dayStart)
					hourDate.setUTCHours(hour)

					const stats = hourlyStats.find(
						stat => new Date(stat.timeInterval).getUTCHours() === hour
					)

					return {
						timeInterval: hourDate.toISOString(),
						tokenUsed: stats?._sum.tokenUsed || 0,
						chatsStarted: stats?._sum.chatsStarted || 0,
						messagesSent: stats?._sum.messagesSent || 0,
						messagesFromBot: stats?._sum.messagesFromBot || 0,
						messagesFromUser: stats?._sum.messagesFromUser || 0,
						requestsCount: stats?._sum.requestsCount || 0,
					}
				}),
			}
		} catch (error) {
			console.error('Failed to get day statistics:', error)
			throw error
		}
	}

	// Получение статистики по дням за месяц с агрегацией на уровне БД
	async getMonthStatistics(apiKeyId: string, year: number, month: number) {
		try {
			const monthStart = new Date(Date.UTC(year, month - 1, 1))
			const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
			const daysInMonth = monthEnd.getUTCDate()

			// Агрегируем данные по дням на уровне БД
			const dailyStats = await prisma.apiKeyUsage.groupBy({
				by: ['timeInterval'],
				where: {
					apiKeyId,
					timeInterval: {
						gte: monthStart,
						lte: monthEnd,
					},
				},
				_sum: {
					tokenUsed: true,
					chatsStarted: true,
					messagesSent: true,
					messagesFromBot: true,
					messagesFromUser: true,
					requestsCount: true,
				},
			})

			return {
				year,
				month,
				days: Array.from({ length: daysInMonth }, (_, index) => {
					const date = new Date(Date.UTC(year, month - 1, index + 1))
					const stats = dailyStats.find(
						stat => new Date(stat.timeInterval).getUTCDate() === index + 1
					)

					return {
						date: date.toISOString().split('T')[0],
						tokenUsed: stats?._sum.tokenUsed || 0,
						chatsStarted: stats?._sum.chatsStarted || 0,
						messagesSent: stats?._sum.messagesSent || 0,
						messagesFromBot: stats?._sum.messagesFromBot || 0,
						messagesFromUser: stats?._sum.messagesFromUser || 0,
						requestsCount: stats?._sum.requestsCount || 0,
					}
				}),
			}
		} catch (error) {
			console.error('Failed to get month statistics:', error)
			throw error
		}
	}

	// Получение статистики по месяцам за год с агрегацией на уровне БД
	async getYearStatistics(apiKeyId: string, year: number) {
		try {
			const yearStart = new Date(Date.UTC(year, 0, 1))
			const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))

			// Агрегируем данные по месяцам на уровне БД
			const monthlyStats = await prisma.apiKeyUsage.groupBy({
				by: ['timeInterval'],
				where: {
					apiKeyId,
					timeInterval: {
						gte: yearStart,
						lte: yearEnd,
					},
				},
				_sum: {
					tokenUsed: true,
					chatsStarted: true,
					messagesSent: true,
					messagesFromBot: true,
					messagesFromUser: true,
					requestsCount: true,
				},
			})

			return {
				year,
				months: Array.from({ length: 12 }, (_, index) => {
					const stats = monthlyStats.filter(
						stat => new Date(stat.timeInterval).getUTCMonth() === index
					)

					return {
						month: index + 1,
						tokenUsed: stats.reduce(
							(sum, s) => sum + (s._sum.tokenUsed || 0),
							0
						),
						chatsStarted: stats.reduce(
							(sum, s) => sum + (s._sum.chatsStarted || 0),
							0
						),
						messagesSent: stats.reduce(
							(sum, s) => sum + (s._sum.messagesSent || 0),
							0
						),
						messagesFromBot: stats.reduce(
							(sum, s) => sum + (s._sum.messagesFromBot || 0),
							0
						),
						messagesFromUser: stats.reduce(
							(sum, s) => sum + (s._sum.messagesFromUser || 0),
							0
						),
						requestsCount: stats.reduce(
							(sum, s) => sum + (s._sum.requestsCount || 0),
							0
						),
					}
				}),
			}
		} catch (error) {
			console.error('Failed to get year statistics:', error)
			throw error
		}
	}

	// Получение статистики за последние 30 дней
	async getLast30DaysStatistics(apiKeyId: string) {
		try {
			const endTime = new Date()
			endTime.setUTCHours(23, 59, 59, 999)

			const startTime = new Date(endTime)
			startTime.setDate(endTime.getDate() - 30)
			startTime.setUTCHours(0, 0, 0, 0)

			// Получаем статистику за каждый день
			const dailyStats = await prisma.apiKeyUsage.groupBy({
				by: ['timeInterval'],
				where: {
					apiKeyId,
					timeInterval: {
						gte: startTime,
						lte: endTime,
					},
				},
				_sum: {
					tokenUsed: true,
					chatsStarted: true,
					messagesSent: true,
					messagesFromBot: true,
					messagesFromUser: true,
					requestsCount: true,
				},
			})

			// Создаем массив с данными за каждый день
			const days = Array.from({ length: 30 }, (_, index) => {
				const date = new Date(endTime)
				date.setDate(date.getDate() - (29 - index))
				date.setUTCHours(0, 0, 0, 0)

				const dayStats = dailyStats.filter(stat => {
					const statDate = new Date(stat.timeInterval)
					return (
						statDate.toISOString().split('T')[0] ===
						date.toISOString().split('T')[0]
					)
				})

				// Суммируем статистику за день
				const daySummary = dayStats.reduce(
					(acc, curr) => ({
						tokenUsed: acc.tokenUsed + (curr._sum.tokenUsed || 0),
						chatsStarted: acc.chatsStarted + (curr._sum.chatsStarted || 0),
						messagesSent: acc.messagesSent + (curr._sum.messagesSent || 0),
						messagesFromBot:
							acc.messagesFromBot + (curr._sum.messagesFromBot || 0),
						messagesFromUser:
							acc.messagesFromUser + (curr._sum.messagesFromUser || 0),
						requestsCount: acc.requestsCount + (curr._sum.requestsCount || 0),
					}),
					{
						tokenUsed: 0,
						chatsStarted: 0,
						messagesSent: 0,
						messagesFromBot: 0,
						messagesFromUser: 0,
						requestsCount: 0,
					}
				)

				return {
					date: date.toISOString().split('T')[0],
					...daySummary,
				}
			})

			return {
				startTime: startTime.toISOString(),
				endTime: endTime.toISOString(),
				days,
				totals: days.reduce(
					(acc, curr) => ({
						tokenUsed: acc.tokenUsed + curr.tokenUsed,
						chatsStarted: acc.chatsStarted + curr.chatsStarted,
						messagesSent: acc.messagesSent + curr.messagesSent,
						messagesFromBot: acc.messagesFromBot + curr.messagesFromBot,
						messagesFromUser: acc.messagesFromUser + curr.messagesFromUser,
						requestsCount: acc.requestsCount + curr.requestsCount,
					}),
					{
						tokenUsed: 0,
						chatsStarted: 0,
						messagesSent: 0,
						messagesFromBot: 0,
						messagesFromUser: 0,
						requestsCount: 0,
					}
				),
			}
		} catch (error) {
			console.error('Failed to get last 30 days statistics:', error)
			throw error
		}
	}

	// Получение статистики за последние 24 часа
	async getLast24HoursStatistics(apiKeyId: string) {
		try {
			const endTime = new Date()
			endTime.setMinutes(59, 59, 999)

			const startTime = new Date(endTime)
			startTime.setHours(endTime.getHours() - 24)
			startTime.setMinutes(0, 0, 0)

			// Получаем статистику за каждый час
			const hourlyStats = await prisma.apiKeyUsage.groupBy({
				by: ['timeInterval'],
				where: {
					apiKeyId,
					timeInterval: {
						gte: startTime,
						lte: endTime,
					},
				},
				_sum: {
					tokenUsed: true,
					chatsStarted: true,
					messagesSent: true,
					messagesFromBot: true,
					messagesFromUser: true,
					requestsCount: true,
				},
			})

			// Создаем массив с данными за каждый час
			const hours = Array.from({ length: 24 }, (_, index) => {
				const date = new Date(endTime)
				date.setHours(endTime.getHours() - (23 - index))
				date.setMinutes(0, 0, 0)

				const hourStats = hourlyStats.filter(stat => {
					const statDate = new Date(stat.timeInterval)
					return statDate.getTime() === date.getTime()
				})

				// Суммируем статистику за час
				const hourSummary = hourStats.reduce(
					(acc, curr) => ({
						tokenUsed: acc.tokenUsed + (curr._sum.tokenUsed || 0),
						chatsStarted: acc.chatsStarted + (curr._sum.chatsStarted || 0),
						messagesSent: acc.messagesSent + (curr._sum.messagesSent || 0),
						messagesFromBot:
							acc.messagesFromBot + (curr._sum.messagesFromBot || 0),
						messagesFromUser:
							acc.messagesFromUser + (curr._sum.messagesFromUser || 0),
						requestsCount: acc.requestsCount + (curr._sum.requestsCount || 0),
					}),
					{
						tokenUsed: 0,
						chatsStarted: 0,
						messagesSent: 0,
						messagesFromBot: 0,
						messagesFromUser: 0,
						requestsCount: 0,
					}
				)

				return {
					hour: date.getHours(),
					time: date.toISOString(),
					...hourSummary,
				}
			})

			return {
				startTime: startTime.toISOString(),
				endTime: endTime.toISOString(),
				hours,
				totals: hours.reduce(
					(acc, curr) => ({
						tokenUsed: acc.tokenUsed + curr.tokenUsed,
						chatsStarted: acc.chatsStarted + curr.chatsStarted,
						messagesSent: acc.messagesSent + curr.messagesSent,
						messagesFromBot: acc.messagesFromBot + curr.messagesFromBot,
						messagesFromUser: acc.messagesFromUser + curr.messagesFromUser,
						requestsCount: acc.requestsCount + curr.requestsCount,
					}),
					{
						tokenUsed: 0,
						chatsStarted: 0,
						messagesSent: 0,
						messagesFromBot: 0,
						messagesFromUser: 0,
						requestsCount: 0,
					}
				),
			}
		} catch (error) {
			console.error('Failed to get last 24 hours statistics:', error)
			throw error
		}
	}

	// Получение статистики за последние 12 месяцев
	async getLast12MonthsStatistics(apiKeyId: string) {
		try {
			const endTime = new Date()
			endTime.setUTCDate(1) // Начало текущего месяца
			endTime.setUTCHours(23, 59, 59, 999)

			const startTime = new Date(endTime)
			startTime.setUTCMonth(endTime.getUTCMonth() - 11) // 12 месяцев назад
			startTime.setUTCHours(0, 0, 0, 0)

			// Получаем статистику за каждый месяц
			const monthlyStats = await prisma.apiKeyUsage.groupBy({
				by: ['timeInterval'],
				where: {
					apiKeyId,
					timeInterval: {
						gte: startTime,
						lte: endTime,
					},
				},
				_sum: {
					tokenUsed: true,
					chatsStarted: true,
					messagesSent: true,
					messagesFromBot: true,
					messagesFromUser: true,
					requestsCount: true,
				},
			})

			// Создаем массив с данными за каждый месяц
			const months = Array.from({ length: 12 }, (_, index) => {
				const date = new Date(endTime)
				date.setUTCMonth(endTime.getUTCMonth() - (11 - index))
				date.setUTCDate(1)
				date.setUTCHours(0, 0, 0, 0)

				const monthStats = monthlyStats.filter(stat => {
					const statDate = new Date(stat.timeInterval)
					return (
						statDate.getUTCFullYear() === date.getUTCFullYear() &&
						statDate.getUTCMonth() === date.getUTCMonth()
					)
				})

				// Суммируем статистику за месяц
				const monthSummary = monthStats.reduce(
					(acc, curr) => ({
						tokenUsed: acc.tokenUsed + (curr._sum.tokenUsed || 0),
						chatsStarted: acc.chatsStarted + (curr._sum.chatsStarted || 0),
						messagesSent: acc.messagesSent + (curr._sum.messagesSent || 0),
						messagesFromBot:
							acc.messagesFromBot + (curr._sum.messagesFromBot || 0),
						messagesFromUser:
							acc.messagesFromUser + (curr._sum.messagesFromUser || 0),
						requestsCount: acc.requestsCount + (curr._sum.requestsCount || 0),
					}),
					{
						tokenUsed: 0,
						chatsStarted: 0,
						messagesSent: 0,
						messagesFromBot: 0,
						messagesFromUser: 0,
						requestsCount: 0,
					}
				)

				return {
					year: date.getUTCFullYear(),
					month: date.getUTCMonth() + 1,
					date: date.toISOString().split('T')[0],
					...monthSummary,
				}
			})

			return {
				startTime: startTime.toISOString(),
				endTime: endTime.toISOString(),
				months,
				totals: months.reduce(
					(acc, curr) => ({
						tokenUsed: acc.tokenUsed + curr.tokenUsed,
						chatsStarted: acc.chatsStarted + curr.chatsStarted,
						messagesSent: acc.messagesSent + curr.messagesSent,
						messagesFromBot: acc.messagesFromBot + curr.messagesFromBot,
						messagesFromUser: acc.messagesFromUser + curr.messagesFromUser,
						requestsCount: acc.requestsCount + curr.requestsCount,
					}),
					{
						tokenUsed: 0,
						chatsStarted: 0,
						messagesSent: 0,
						messagesFromBot: 0,
						messagesFromUser: 0,
						requestsCount: 0,
					}
				),
			}
		} catch (error) {
			console.error('Failed to get last 12 months statistics:', error)
			throw error
		}
	}
}
