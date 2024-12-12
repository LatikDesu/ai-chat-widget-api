import type { OrderResponse } from '~/server/types/orders'

export function getNewOrderTelegramTemplate(order: OrderResponse): string {
	return `
🆕 <b>Новая заявка!</b>

🏢 <b>Компания:</b> ${order.companyName}
👤 <b>Контакт:</b> ${order.name}
📧 <b>Email:</b> ${order.email}
${order.phone ? `📞 <b>Телефон:</b> ${order.phone}\n` : ''}
${order.telegram ? `📱 <b>Telegram:</b> ${order.telegram}\n` : ''}
${order.notes ? `\n📝 <b>Примечания:</b>\n${order.notes}\n` : ''}
⏰ <b>Создано:</b> ${order.createdAt.toLocaleString()}

<a href="${process.env.APP_URL}/admin/orders/${order.id}">Открыть заявку</a>
  `.trim()
}
