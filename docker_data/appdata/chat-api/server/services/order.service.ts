import { prisma } from '~/lib/prisma'

export class OrderService {
	// Форматирование телефона
	formatPhone(phone: string): string {
		// Убираем все кроме цифр
		const digits = phone.replace(/\D/g, '')

		// Форматируем как +7 (XXX) XXX-XX-XX
		if (digits.length === 11) {
			return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(
				7,
				9
			)}-${digits.slice(9)}`
		}

		return phone
	}

	// Валидация email
	validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		return emailRegex.test(email)
	}

	// Валидация telegram username
	validateTelegram(telegram: string): boolean {
		// Должен начинаться с @ и содержать только буквы, цифры и _
		const telegramRegex = /^@[a-zA-Z0-9_]{5,32}$/
		return telegramRegex.test(telegram)
	}

	// Проверка на дубликаты
	async checkDuplicate(email: string, companyName: string): Promise<boolean> {
		const threeDaysAgo = new Date()
		threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

		const existingOrder = await prisma.orders.findFirst({
			where: {
				AND: [{ email }, { companyName }, { createdAt: { gte: threeDaysAgo } }],
			},
		})

		return !!existingOrder
	}

	// Очистка и форматирование данных заявки
	sanitizeOrderData(data: any) {
		return {
			companyName: data.companyName?.trim(),
			email: data.email?.trim().toLowerCase(),
			name: data.name?.trim(),
			phone: data.phone ? this.formatPhone(data.phone) : null,
			telegram: data.telegram ? data.telegram.trim() : null,
			notes: data.notes?.trim() || null,
		}
	}
}
