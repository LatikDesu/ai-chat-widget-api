import type { Prisma } from '@prisma/client'
import { prisma } from '~/lib/prisma'

export class NewsAdminService {
	async getList(params: {
		skip?: number
		take?: number
		status?: string
		type?: string
		search?: string
		orderBy?: { [key: string]: 'asc' | 'desc' }
	}) {
		const where: Prisma.NewsWhereInput = {
			...(params.status && { status: params.status }),
			...(params.type && { type: params.type }),
			...(params.search && {
				title: {
					contains: params.search,
					mode: 'insensitive' as Prisma.QueryMode,
				},
			}),
		}

		const [news, total] = await prisma.$transaction([
			prisma.news.findMany({
				skip: params.skip,
				take: params.take,
				where,
				orderBy: params.orderBy,
				select: {
					id: true,
					title: true,
					content: true,
					type: true,
					status: true,
					priority: true,
					roles: true,
					publishAt: true,
					createdAt: true,
					updatedAt: true,
				},
			}),
			prisma.news.count({ where }),
		])

		return {
			items: news,
			pagination: {
				total,
				page: Math.floor((params.skip || 0) / (params.take || 10)) + 1,
				pageSize: params.take || 10,
			},
		}
	}

	async getById(id: string) {
		return prisma.news.findUnique({
			where: { id },
			select: {
				id: true,
				title: true,
				content: true,
				type: true,
				status: true,
				priority: true,
				roles: true,
				publishAt: true,
				createdAt: true,
				updatedAt: true,
			},
		})
	}
}
