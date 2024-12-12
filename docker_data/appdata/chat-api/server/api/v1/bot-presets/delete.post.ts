import { createError, defineEventHandler, readBody } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		const { user } = event.context

		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 403,
				message: 'Access denied. Only administrators can delete presets.',
			})
		}

		const body = await readBody(event)
		const { id } = body

		if (!id) {
			throw createError({
				statusCode: 400,
				message: 'Preset ID is required',
			})
		}

		await prisma.botPreset.delete({
			where: { id },
		})

		return {
			success: true,
			message: 'Preset deleted successfully',
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to delete preset',
		})
	}
})
