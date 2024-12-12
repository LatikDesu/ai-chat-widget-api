import { prisma } from '~/lib/prisma'

export class ApiKeySchedulerService {
	// Деактивация истекших ключей
	async deactivateExpiredKeys() {
		try {
			// Находим и деактивируем все ключи, у которых истек срок действия
			const result = await prisma.apiKey.updateMany({
				where: {
					isActive: true,
					expiredAt: {
						lt: new Date(), // Ключи, у которых expiredAt меньше текущей даты
					},
				},
				data: {
					isActive: false,
					lastUsedAt: new Date(), // Обновляем время последнего использования
				},
			})

			return result.count
		} catch (error) {
			console.error('Failed to deactivate expired keys:', error)
			throw error
		}
	}
}
