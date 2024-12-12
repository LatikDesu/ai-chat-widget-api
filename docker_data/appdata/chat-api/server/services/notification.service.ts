import type { Orders } from '@prisma/client'
import nodemailer from 'nodemailer'
import { Telegraf } from 'telegraf'
import { getNewOrderEmailTemplate } from '../templates/email/new-order'
import { getNewOrderTelegramTemplate } from '../templates/telegram/new-order'

// Сервис для отправки уведомлений
export class NotificationService {
	private emailTransporter
	private telegramBot

	// Инициализация почтового клиента и телеграм бота
	constructor() {
		this.emailTransporter = nodemailer.createTransport({
			service: 'Yandex',
			auth: {
				user: process.env.SMTP_USER + '@yandex.ru',
				pass: process.env.SMTP_PASS,
			},
		})

		if (process.env.TELEGRAM_BOT_TOKEN) {
			this.telegramBot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN)
		}
	}

	// Отправка email о новой заявке
	async sendNewOrderEmail(order: Orders) {
		const emailHtml = getNewOrderEmailTemplate(order)

		try {
			const info = await this.emailTransporter.sendMail({
				from: process.env.SMTP_FROM,
				to: process.env.ADMIN_EMAIL,
				subject: `Новая заявка от ${order.companyName}`,
				html: emailHtml,
			})
			return info
		} catch (error) {
			throw error
		}
	}

	// Отправка уведомления в телеграм о новой заявке
	async sendTelegramNotification(order: Orders) {
		if (!this.telegramBot || !process.env.TELEGRAM_CHAT_ID) {
			return
		}

		const message = getNewOrderTelegramTemplate(order)

		try {
			await this.telegramBot.telegram.sendMessage(
				process.env.TELEGRAM_CHAT_ID,
				message,
				{ parse_mode: 'HTML' }
			)
		} catch (error) {
			throw error
		}
	}

	// Отправка email для регистрации
	async sendRegistrationEmail(to: string, html: string, subject: string) {
		try {
			const info = await this.emailTransporter.sendMail({
				from: process.env.SMTP_FROM,
				to,
				subject,
				html,
			})
			return info
		} catch (error) {
			throw error
		}
	}

	// Отправка email для сброса пароля
	async sendResetPasswordEmail(to: string, html: string) {
		try {
			await this.emailTransporter.sendMail({
				from: process.env.SMTP_FROM,
				to,
				subject: 'Сброс пароля',
				html,
			})
		} catch (error) {
			throw error
		}
	}
}
