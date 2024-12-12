import type { OrderResponse } from '~/server/types/orders'

export function getNewOrderEmailTemplate(order: OrderResponse): string {
	return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Новая заявка от ${order.companyName}</h2>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px;">
        <h3 style="color: #2c3e50;">Информация о клиенте:</h3>
        <p><strong>Контактное лицо:</strong> ${order.name}</p>
        <p><strong>Email:</strong> ${order.email}</p>
        ${order.phone ? `<p><strong>Телефон:</strong> ${order.phone}</p>` : ''}
        ${
					order.telegram
						? `<p><strong>Telegram:</strong> ${order.telegram}</p>`
						: ''
				}
        
        ${
					order.notes
						? `
          <h3 style="color: #2c3e50; margin-top: 20px;">Дополнительная информация:</h3>
          <p>${order.notes}</p>
        `
						: ''
				}
        
        <p style="margin-top: 20px; color: #7f8c8d;">
          <small>Дата создания: ${order.createdAt.toLocaleString()}</small>
        </p>
      </div>
      
      <div style="margin-top: 20px; padding: 20px; background: #e9ecef; border-radius: 5px;">
        <p style="margin: 0;">
          <a href="${process.env.APP_URL}/admin/orders/${order.id}" 
             style="color: #3498db; text-decoration: none;">
            Открыть заявку в админ-панели →
          </a>
        </p>
      </div>
    </div>
  `
}
