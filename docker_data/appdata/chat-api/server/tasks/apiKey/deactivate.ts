import { ApiKeySchedulerService } from '~/server/services/apiKey/scheduler.service'

export default defineTask({
	meta: {
		name: 'apikey:deactivate',
		description: 'Deactivate expired API keys',
	},
	async run() {
		try {
			const service = new ApiKeySchedulerService()
			const deactivatedCount = await service.deactivateExpiredKeys()

			if (deactivatedCount > 0) {
				console.log(`Deactivated ${deactivatedCount} expired API keys`)
			}

			return { result: { deactivatedCount } }
		} catch (error) {
			console.error('Task failed:', error)
			throw error
		}
	},
})
