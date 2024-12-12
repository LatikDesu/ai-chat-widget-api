import { createError, defineEventHandler, setCookie } from 'h3'

export default defineEventHandler(async event => {
	try {
		// Проверяем авторизацию
		const { user } = event.context
		if (!user) {
			throw createError({
				statusCode: 401,
				message: 'Authentication required',
			})
		}

		// Очищаем refresh token из куки
		setCookie(event, 'refreshToken', '', {
			maxAge: 0,
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
		})

		return {
			success: true,
			message: 'Successfully logged out',
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to logout',
		})
	}
})
