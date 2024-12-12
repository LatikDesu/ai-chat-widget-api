// Роли пользователей
export enum UserRole {
	administrator = 'administrator',
	business = 'business',
	manager = 'manager',
}

// Статусы заявок
export enum OrderStatus {
	new = 'new',
	processing = 'processing',
	completed = 'completed',
}

// Режимы чата
export enum ChatMode {
	bot = 'bot',
	human = 'human',
}

// Роли в сообщениях
export enum MessageRole {
	user = 'user',
	assistant = 'assistant',
	human = 'human',
}

// Периоды статистики
export enum StatisticsPeriod {
	daily = 'daily',
	weekly = 'weekly',
	monthly = 'monthly',
	all = 'all',
}
