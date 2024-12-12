import { createError, defineEventHandler, getHeader, H3Event } from 'h3'
import { prisma } from '~/lib/prisma'
import { JWTService } from '../services/jwt.service'

export default defineEventHandler(async (event: H3Event) => {
	try {
		if (isPublicRoute(event.path)) {
			return
		}

		const token = getTokenFromHeader(event)

		if (!token) {
			throw createError({
				statusCode: 401,
				message: 'No token provided',
			})
		}

		let payload
		try {
			payload = JWTService.verifyAccessToken(token)
		} catch (error) {
			throw createError({
				statusCode: 401,
				message: 'Invalid or expired token',
			})
		}

		const user = await prisma.users.findUnique({
			where: { id: payload.userId },
			select: {
				id: true,
				email: true,
				role: true,
				isActive: true,
			},
		})

		if (!user) {
			throw createError({
				statusCode: 401,
				message: 'User not found',
			})
		}

		if (!user.isActive) {
			throw createError({
				statusCode: 403,
				message:
					'Account is not activated. Please check your email for activation link.',
			})
		}

		event.context.user = user
	} catch (error: any) {
		throw error
	}
})

function isPublicRoute(path: string): boolean {
	if (path.startsWith('/docs')) {
		return true
	}

	const basePath = path.split('?')[0]

	const staticRoutes = [
		'/',
		'/demo',
		'/widget',
		'/widget.js',
		'/api/v1/orders/create',
		'/api/v1/auth/login',
		'/api/v1/auth/register',
		'/api/v1/auth/refresh',
		'/api/v1/auth/registration',
		'/api/v1/users/activation',
		'/api/v1/users/resend-activation',
		'/api/v1/users/forgot-password',
		'/api/v1/users/reset-password',
	]

	const dynamicRoutes = [
		/^\/api\/v1\/widget\/key\/[^/]+$/,
		/^\/api\/v1\/chats\/[^/]+\/messages$/,
		/^\/api\/v1\/chats\/[^/]+\/completion$/,

		/^\/api\/v1\/chats\/create$/,
		/^\/api\/v1\/chats\/update$/,
		/^\/api\/v1\/chats\/[^/]+\/messages\/create$/,
	]

	return (
		staticRoutes.includes(basePath) ||
		dynamicRoutes.some(pattern => pattern.test(basePath))
	)
}

function getTokenFromHeader(event: H3Event): string | null {
	const authHeader = getHeader(event, 'Authorization')
	if (!authHeader?.startsWith('Bearer ')) {
		return null
	}
	return authHeader.split(' ')[1]
}
