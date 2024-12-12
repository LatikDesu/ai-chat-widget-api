import { prisma } from '~/lib/prisma'

export class NewsUserService {
	async getList(params: {
		skip?: number
		take?: number
		type?: string
		roles: string[]
		userId: string
	}) {
		const where = {
			status: 'published',
			OR: [{ publishAt: { lte: new Date() } }, { publishAt: null }],
			roles: {
				hasSome: params.roles,
			},
			...(params.type && { type: params.type }),
		}

		const [news, total, unreadCount] = await prisma.$transaction([
			prisma.news.findMany({
				skip: params.skip,
				take: params.take,
				where,
				orderBy: [{ createdAt: 'desc' }, { priority: 'desc' }],
				select: {
					id: true,
					title: true,
					content: true,
					type: true,
					createdAt: true,
					publishAt: true,
					viewedBy: true,
				},
			}),
			prisma.news.count({ where }),
			prisma.news.count({
				where: {
					...where,
					NOT: {
						viewedBy: {
							has: params.userId,
						},
					},
				},
			}),
		])

		return {
			items: news.map(item => ({
				...item,
				isRead: item.viewedBy.includes(params.userId),
				viewedBy: undefined,
			})),
			pagination: {
				total,
				page: Math.floor((params.skip || 0) / (params.take || 10)) + 1,
				pageSize: params.take || 10,
			},
			unreadCount,
		}
	}

	async getById(id: string, params: { roles: string[]; userId: string }) {
		const news = await prisma.news.findFirst({
			where: {
				id,
				status: 'published',
				publishAt: {
					lte: new Date(),
				},
				roles: {
					hasSome: params.roles,
				},
			},
			select: {
				id: true,
				title: true,
				content: true,
				type: true,
				createdAt: true,
				publishAt: true,
				viewedBy: true,
			},
		})

		if (!news) return null

		const isRead = news.viewedBy.includes(params.userId)
		if (!isRead) {
			await prisma.news.update({
				where: { id },
				data: {
					viewedBy: {
						push: params.userId,
					},
				},
			})
		}

		return {
			...news,
			isRead: true,
			viewedBy: undefined,
		}
	}
}
