import { prisma } from '~/lib/prisma'

export class NewsSchedulerService {
	async publishScheduled() {
		try {
			const newsToPublish = await prisma.news.updateMany({
				where: {
					status: 'draft',
					publishAt: {
						lte: new Date(),
						not: null,
					},
				},
				data: {
					status: 'published',
				},
			})
			return newsToPublish.count
		} catch (error) {
			console.error('Failed to publish scheduled news:', error)
			throw error
		}
	}
}
