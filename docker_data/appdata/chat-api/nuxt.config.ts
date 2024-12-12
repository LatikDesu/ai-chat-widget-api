export default defineNuxtConfig({
	ssr: false,
	compatibilityDate: '2024-11-01',
	devtools: { enabled: true },
	modules: ['@nuxtjs/tailwindcss', '@hebilicious/vue-query-nuxt'],

	nitro: {
		routeRules: {
			'/api/**': {
				cors: true,
				headers: {
					'Access-Control-Allow-Methods':
						'GET, POST, PUT, DELETE, PATCH, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'application/json',
				},
			},
			'/widget.js': {
				headers: {
					'Content-Type': 'application/javascript',
					'Access-Control-Allow-Origin': '*',
				},
			},
		},
		handlers: [
			{
				route: '/api/**',
				handler: '~/server/middleware/auth',
			},
		],
		scheduledTasks: {
			'0 * * * *': ['apiKey:deactivate'],
			'*/5 * * * *': ['news:publish'],
		},
		experimental: {
			tasks: true,
		},
	},

	runtimeConfig: {
		public: {
			demoApiKey: process.env.DEMO_API_KEY,
		},
	},
})
