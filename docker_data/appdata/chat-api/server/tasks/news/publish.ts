import { NewsSchedulerService } from '~/server/services/news/scheduler.service'

export default defineTask({
	meta: {
		name: 'news:publish',
		description: 'Publish scheduled news',
	},
	async run() {
		try {
			const newsService = new NewsSchedulerService()
			const publishedCount = await newsService.publishScheduled()

			if (publishedCount > 0) {
				console.log(`Published ${publishedCount} scheduled news`)
			}

			return { result: { publishedCount } }
		} catch (error) {
			console.error('Task failed:', error)
			throw error
		}
	},
})
