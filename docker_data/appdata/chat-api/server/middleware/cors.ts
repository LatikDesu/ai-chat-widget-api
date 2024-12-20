export default defineEventHandler((event) => {
	const method = getMethod(event)
	console.log('Request method:', method)
	console.log('Request URL:', event.node.req.url)
	console.log('Request headers:', getHeaders(event))
  
	const corsHeaders = {
	  'Access-Control-Allow-Methods': '*',
	  'Access-Control-Allow-Headers': '*',
	  'Access-Control-Allow-Origin': '*',
	  'Access-Control-Max-Age': '86400'
	}
  
	// Установка CORS заголовков для всех запросов
	setResponseHeaders(event, corsHeaders)
  
	// Обработка preflight запроса
	if (method === 'OPTIONS') {
	  console.log('Handling OPTIONS request')
	  return new Response(null, {
		status: 200,
		headers: corsHeaders
	  })
	}
  
	console.log('Passing through regular request')
  })