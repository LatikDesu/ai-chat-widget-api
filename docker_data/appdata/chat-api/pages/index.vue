<template>
	<div
		class="min-h-screen bg-gradient-to-b from-blue-950 to-black flex flex-col items-center justify-center p-4"
	>
		<div class="w-24 h-24 mb-8 animate-pulse">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="w-full h-full text-blue-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
				/>
			</svg>
		</div>

		<div class="text-center mb-12">
			<h1
				class="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text"
			>
				Chat Widget
			</h1>
			<p class="text-lg text-gray-300 max-w-xl mx-auto">
				Добавьте чат с искусственным интеллектом на ваш сайт всего одной
				строчкой кода. Настройте своего бота и начните общение с клиентами прямо
				сейчас.
			</p>
		</div>

		<div
			class="bg-gray-900 rounded-xl p-6 mb-12 max-w-2xl w-full font-mono text-sm shadow-2xl"
		>
			<div class="flex items-center justify-between mb-4">
				<div class="flex gap-2">
					<div class="w-3 h-3 rounded-full bg-red-500"></div>
					<div class="w-3 h-3 rounded-full bg-yellow-500"></div>
					<div class="w-3 h-3 rounded-full bg-green-500"></div>
				</div>
				<span class="text-gray-500">widget.js</span>
			</div>
			<div class="space-y-2 text-gray-300">
				<pre><code class="text-blue-400">&lt;script</code> <code class="text-green-400">src=</code><code class="text-yellow-300">"https://chat-api.esoraine.online/widget.js"</code><code class="text-blue-400">&gt;&lt;/script&gt;</code></pre>
				<pre><code class="text-blue-400">&lt;script&gt;</code>
				<code class="text-purple-400">ChatWidget</code><code class="text-gray-300">.</code><code class="text-blue-400">init</code><code class="text-gray-300">({</code>
					<code class="text-green-400">apiKey:</code> <code class="text-yellow-300">'your-api-key'</code>
				<code class="text-gray-300">});</code>
				<code class="text-blue-400">&lt;/script&gt;</code></pre>
			</div>
		</div>

		<div class="flex gap-6">
			<a
				href="https://ai-chat-api.apidocumentation.com"
				class="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/50"
			>
				Документация
			</a>
			<a
				href="/demo"
				class="px-8 py-3 bg-gray-900 text-blue-400 rounded-lg hover:bg-gray-800 transition-all transform hover:scale-105 shadow-lg border border-blue-500/30"
			>
				Демо виджета
			</a>
		</div>

		<div class="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
			<div class="text-center p-6">
				<div class="text-blue-400 text-2xl mb-4">🚀</div>
				<h3 class="text-white font-bold mb-2">Быстрая интеграция</h3>
				<p class="text-gray-400">Добавьте чат на сайт за считанные минуты</p>
			</div>
			<div class="text-center p-6">
				<div class="text-blue-400 text-2xl mb-4">⚙️</div>
				<h3 class="text-white font-bold mb-2">Гибкая настройка</h3>
				<p class="text-gray-400">Настройте бота под ваши задачи</p>
			</div>
			<div class="text-center p-6">
				<div class="text-blue-400 text-2xl mb-4">📊</div>
				<h3 class="text-white font-bold mb-2">Аналитика</h3>
				<p class="text-gray-400">Отслеживайте эффективность общения</p>
			</div>
		</div>
	</div>
</template>

<style>
.animate-pulse {
	animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}
</style>
