import { createError, defineEventHandler, readBody } from 'h3'
import { prisma } from '~/lib/prisma'

export default defineEventHandler(async event => {
	try {
		const { user } = event.context

		if (!user || user.role !== 'administrator') {
			throw createError({
				statusCode: 403,
				message: 'Access denied. Only administrators can create presets.',
			})
		}

		const body = await readBody(event)
		const {
			title,
			description,
			isPublic,
			role,
			tasks,
			emotionalProfile,
			context,
			example,
			notes,
			categories,
			customization,
			prompts,
		} = body

		if (!title) {
			throw createError({
				statusCode: 400,
				message: 'Title is required',
			})
		}

		const preset = await prisma.botPreset.create({
			data: {
				title,
				description,
				isPublic: isPublic || false,
				role,
				tasks,
				emotionalProfile,
				context,
				example,
				notes,
				categories: categories || [],
				customization,
				prompts,
			},
		})

		return {
			success: true,
			data: preset,
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to create preset',
		})
	}
})
