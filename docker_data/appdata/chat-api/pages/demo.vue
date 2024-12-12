<script setup lang="ts">
const config = useRuntimeConfig()
const apiKey = ref(config.public.demoApiKey)
const customApiKey = ref('')
const isWidgetVisible = ref(true)
const currentApiKey = ref<{
	id: string
	isActive: boolean
	icon: string
	iconType: string
} | null>(null)
const currentBot = ref<{
	id: string
} | null>(null)
const currentChat = ref<string | null>(null)
const chatConfig = ref(null)
const isAnimating = ref(false)
const error = ref('')

async function fetchKeyInfo(key: string) {
	try {
		error.value = ''
		const response = await fetch(`/api/v1/widget/key/${key}`)
		if (response.ok) {
			const data = await response.json()
			const keyData = {
				id: data.apiKey.id,
				isActive: data.apiKey.isActive,
				icon: data.apiKey.icon,
				iconType: data.apiKey.iconType,
			}
			currentApiKey.value = keyData
			localStorage.setItem('currentApiKey', JSON.stringify(keyData))

			currentBot.value = {
				id: data.bot.id,
			}
			chatConfig.value = data.customization
			currentChat.value = localStorage.getItem(`chat_${key}`)
			apiKey.value = key
		} else {
			error.value = 'Invalid API key'
		}
	} catch (e) {
		console.error('Error fetching key info:', e)
		error.value = 'Error fetching key info'
	}
}

onMounted(() => {
	const savedKeyData = localStorage.getItem('currentApiKey')
	if (savedKeyData) {
		currentApiKey.value = JSON.parse(savedKeyData)
	}

	if (apiKey.value && !currentApiKey.value) {
		fetchKeyInfo(apiKey.value)
	}

	window.addEventListener('message', event => {
		if (event.data === 'closeWidget') {
			handleCloseWidget()
		}
	})
})

function handleCloseWidget() {
	isWidgetVisible.value = !isWidgetVisible.value
}

function handleBeforeLeave() {
	isAnimating.value = true
}

function handleAfterLeave() {
	isAnimating.value = false
}

async function updateApiKey() {
	if (!customApiKey.value) {
		error.value = 'Please enter an API key'
		return
	}
	await fetchKeyInfo(customApiKey.value)
	customApiKey.value = ''
}
</script>

<template>
	<div
		class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8"
	>
		<div class="max-w-7xl mx-auto">
			<div class="text-center mb-12">
				<h1 class="text-4xl font-bold text-white mb-4">Демонстрация виджета</h1>
				<p class="text-blue-200 text-lg max-w-3xl mx-auto">
					Попробуйте виджет в действии. Используйте демо-ключ или введите свой,
					чтобы увидеть, как виджет будет работать на вашем сайте.
				</p>
			</div>

			<div class="flex flex-col items-center mb-8">
				<div
					class="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10 w-full max-w-3xl mb-6"
				>
					<h2 class="text-xl font-semibold text-white mb-4">
						Введите свой API ключ
					</h2>
					<div class="flex gap-4">
						<input
							v-model="customApiKey"
							type="text"
							placeholder="Введите API ключ"
							class="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
							@keyup.enter="updateApiKey"
						/>
						<button
							@click="updateApiKey"
							class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all transform hover:scale-105 active:scale-95"
						>
							Обновить
						</button>
					</div>
					<p v-if="error" class="mt-2 text-red-400 text-sm">{{ error }}</p>
				</div>

				<div
					v-if="currentApiKey"
					class="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10 w-full max-w-3xl mb-6"
				>
					<h2 class="text-xl font-semibold text-white mb-4">
						Информация о подключении
					</h2>
					<div class="space-y-3">
						<div class="flex items-center">
							<span class="text-gray-300 w-32">API Ключ:</span>
							<span class="text-white font-mono">{{ currentApiKey.id }}</span>
							<span
								class="ml-2 px-2 py-1 rounded text-xs"
								:class="
									currentApiKey.isActive
										? 'bg-green-500/20 text-green-300'
										: 'bg-red-500/20 text-red-300'
								"
							>
								{{ currentApiKey.isActive ? 'Активен' : 'Неактивен' }}
							</span>
						</div>
						<div v-if="currentBot" class="flex items-center">
							<span class="text-gray-300 w-32">ID Бота:</span>
							<span class="text-white font-mono">{{ currentBot.id }}</span>
						</div>
						<div v-if="currentChat" class="flex items-center">
							<span class="text-gray-300 w-32">ID Чата:</span>
							<span class="text-white font-mono">{{ currentChat }}</span>
						</div>
					</div>
				</div>

				<div
					class="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10 w-full max-w-3xl"
				>
					<h2 class="text-xl font-semibold text-white mb-4">
						Инструкция по установке
					</h2>
					<div class="space-y-4">
						<p class="text-blue-200">Добавьте эти строки на ваш сайт:</p>
						<div class="bg-gray-900/50 rounded-lg p-4 font-mono text-sm">
							<pre><code class="text-blue-400">&lt;script</code> <code class="text-green-400">src=</code><code class="text-yellow-300">"https://chat-api.esoraine.online/widget.js"</code><code class="text-blue-400">&gt;&lt;/script&gt;</code></pre>
							<pre><code class="text-blue-400">&lt;script&gt;</code>
<code class="text-purple-400">ChatWidget</code><code class="text-gray-300">.</code><code class="text-blue-400">init</code><code class="text-gray-300">({</code>
    <code class="text-green-400">apiKey:</code> <code class="text-yellow-300">'your-api-key'</code>
<code class="text-gray-300">});</code>
<code class="text-blue-400">&lt;/script&gt;</code></pre>
						</div>
					</div>
				</div>
			</div>
		</div>

		<Transition
			enter-active-class="transition-all duration-300 ease-out"
			enter-from-class="opacity-0 scale-0 origin-[calc(100%-32px)_calc(100%-32px)]"
			enter-to-class="opacity-100 scale-100 origin-[calc(100%-32px)_calc(100%-32px)]"
			leave-active-class="transition-all duration-300 ease-in"
			leave-from-class="opacity-100 scale-100 origin-[calc(100%-32px)_calc(100%-32px)]"
			leave-to-class="opacity-0 scale-0 origin-[calc(100%-32px)_calc(100%-32px)]"
			@before-leave="handleBeforeLeave"
			@after-leave="handleAfterLeave"
			appear
		>
			<div
				v-if="isWidgetVisible"
				class="fixed bottom-6 right-6 w-[430px] h-[630px] shadow-lg rounded-2xl overflow-hidden"
			>
				<iframe
					:src="`/widget?apiKey=${apiKey}`"
					class="w-full h-full border-0"
				/>
			</div>
		</Transition>

		<Transition
			enter-active-class="transition-all duration-300 ease-out"
			enter-from-class="opacity-0 scale-0"
			enter-to-class="opacity-100 scale-100"
		>
			<button
				v-show="!isWidgetVisible && !isAnimating"
				@click="handleCloseWidget"
				class="fixed bottom-6 right-6 w-16 h-16 rounded-full overflow-hidden hover:scale-105 transition-transform shadow-lg"
			>
				<img
					:src="currentApiKey?.icon"
					:type="currentApiKey?.iconType"
					alt="Открыть чат"
					class="w-full h-full object-cover"
				/>
			</button>
		</Transition>
	</div>
</template>

<style>
.backdrop-blur-lg {
	backdrop-filter: blur(20px);
}
</style>
` `
