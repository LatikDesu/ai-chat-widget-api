import { createError, defineEventHandler } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		const { user } = event.context

		if (!user) {
			throw createError({
				statusCode: 401,
				message: 'Unauthorized',
			})
		}

		const id = event.context.params?.id

		if (!id) {
			throw createError({
				statusCode: 400,
				message: 'Preset ID is required',
			})
		}

		const preset = await prisma.botPreset.findUnique({
			where: { id },
		})

		if (!preset) {
			throw createError({
				statusCode: 404,
				message: 'Preset not found',
			})
		}

		if (user.role !== 'administrator' && !preset.isPublic) {
			throw createError({
				statusCode: 403,
				message: 'Access denied. This preset is not public.',
			})
		}

		return {
			success: true,
			data: preset,
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to get preset',
		})
	}
})
