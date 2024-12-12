// Допустимые роли пользователей
export const ALLOWED_ROLES = ['administrator', 'manager', 'business'] as const
export type UserRole = (typeof ALLOWED_ROLES)[number]

// Типы для создания пользователя
export interface UserCreate {
	email: string
	password?: string
	passwordConfirm?: string
	role: UserRole
	apiKeyId?: string
	companyName?: string
	name?: string
	phone?: string
	telegram?: string
	isActive?: boolean
}

// Интерфейс для регистрации пользователя
export interface UserRegistration {
	email: string
	name: string
	password: string
	passwordConfirm: string
}
// Тип API ключа в ответе
export interface ApiKeyResponse {
	id: string
	title: string
	owner: string
	tokenLimit: number
	isActive: boolean
}

// Тип ответа при создании пользователя
export interface UserResponse {
	user: {
		id: string
		email: string
		role: UserRole
		isActive: boolean
		companyName: string | null
		name: string | null
		phone: string | null
		telegram: string | null
		createdAt: Date
	}
	generatedPassword?: string
	apiKeys: ApiKeyResponse[]
}

// Тип для обновления пользователя
export interface UserUpdate {
	id: string
	companyName?: string | null
	name?: string | null
	phone?: string | null
	telegram?: string | null
	isActive?: boolean
}

// Интерфейс для параметров запроса списка пользователей
export interface UserQueryParams {
	page?: string
	limit?: string
	role?: UserRole
	isActive?: string
	search?: string
}

// Интерфейс для регистрации пользователя
export interface UserRegistration {
	email: string
	name: string
	password: string
	passwordConfirm: string
}

// Интерфейс для создания бизнес-пользователя
export interface CreateBusinessRequest {
	email: string
	name: string
	companyName?: string
	phone?: string
	telegram?: string
}

// Расширяем UserResponse для включения сгенерированного пароля
export interface CreateBusinessResponse extends UserResponse {
	generatedPassword: string
}

// Интерфейс для создания менеджера
export interface CreateManagerRequest {
	email: string
	name?: string
	phone?: string
	telegram?: string
}

// Ответ при создании менеджера
export interface CreateManagerResponse extends UserResponse {
	generatedPassword?: string
}

// Интерфейс для смены пароля
export interface ChangePasswordRequest {
	currentPassword: string
	newPassword: string
	newPasswordConfirm: string
}

// Параметры запроса для получения списка пользователей
export interface UsersQueryParams {
	page?: string
	limit?: string
	role?: UserRole
	isActive?: string
	search?: string
}

// Ответ со списком пользователей
export interface UsersResponse {
	items: UserResponse[]
	pagination: {
		total: number
		page: number
		limit: number
		pages: number
	}
}

// Интерфейс для обновления пользователя
export interface UpdateUserRequest {
	id: string
	email?: string
	name?: string
	companyName?: string
	phone?: string
	telegram?: string
	role?: UserRole
	isActive?: boolean
}

// Интерфейс для API ключа с полным набором полей
export interface UserApiKey {
	id: string
	title: string
	owner: string
	tokenLimit: number
	isActive: boolean
	userIds: string[]
}
