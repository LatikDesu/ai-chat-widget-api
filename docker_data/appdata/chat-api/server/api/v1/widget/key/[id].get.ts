import { createError, defineEventHandler } from '#imports'
import { prisma } from '~/lib/prisma'

interface WidgetKeyResponse {
	apiKey: {
		id: string
		isActive: boolean
		icon: string
		iconType: string
	}
	bot: {
		id: string
	} | null
	customization: {
		greeting: string | null
		headerTitle: string | null
		headerColor: string | null
		headerTextColor: string | null
		backgroundColor: string | null
		userColor: string | null
		userBorderColor: string | null
		userTextColor: string | null
		botColor: string | null
		botBorderColor: string | null
		botTextColor: string | null
	} | null
}

export default defineEventHandler(async event => {
	try {
		const id = event.context.params?.id
		if (!id) {
			throw createError({
				statusCode: 400,
				message: 'API key ID is required',
			})
		}

		const apiKey = await prisma.apiKey.findUnique({
			where: { id },
			include: {
				bot: {
					include: {
						customization: true,
					},
				},
			},
		})

		if (!apiKey) {
			throw createError({
				statusCode: 404,
				message: 'API key not found',
			})
		}

		return {
			apiKey: {
				id: apiKey.id,
				isActive: apiKey.isActive,
				icon: apiKey.bot?.customization?.icon || '/widget-button.png',
				iconType: apiKey.bot?.customization?.iconMimeType || 'image/png',
			},
			bot: apiKey.bot
				? {
						id: apiKey.bot.id,
				  }
				: null,
			customization: apiKey.bot?.customization || null,
		}
	} catch (error: any) {
		throw createError({
			statusCode: error.statusCode || 500,
			message: error.message || 'Failed to fetch API key',
		})
	}
})
