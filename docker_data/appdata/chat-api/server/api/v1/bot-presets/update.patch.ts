import { createError, defineEventHandler, readBody } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		const { user } = event.context

		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 403,
				message: 'Access denied. Only administrators can update presets.',
			})
		}

		const body = await readBody(event)
		const { id, ...updateData } = body

		if (!id) {
			throw createError({
				statusCode: 400,
				message: 'Preset ID is required',
			})
		}

		const preset = await prisma.botPreset.update({
			where: { id },
			data: updateData,
		})

		return {
			success: true,
			data: preset,
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to update preset',
		})
	}
})
