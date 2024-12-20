export default defineNuxtConfig({
	ssr: false,
	compatibilityDate: '2024-11-01',
	devtools: { enabled: true },
	modules: ['@nuxtjs/tailwindcss', '@hebilicious/vue-query-nuxt'],
  
	nitro: {
	  middleware: ['cors'],  // Убедитесь, что cors middleware первый
	  routeRules: {
		'/api/v1/**': {
		  cors: true,
		  headers: {
			'Access-Control-Allow-Methods': '*',
			'Access-Control-Allow-Headers': '*',
			'Access-Control-Max-Age': '86400',
			'Access-Control-Expose-Headers': '*'
		  },
		},
		'/widget.js': {
		  headers: {
			'Content-Type': 'application/javascript',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': '*',
			'Access-Control-Allow-Headers': '*',
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