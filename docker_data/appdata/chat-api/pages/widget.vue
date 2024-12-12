<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { ErrorCode } from '~/components/ApiKeyErrorScreen.vue'

const route = useRoute()
const error = ref<ErrorCode | null>(null)
const isLoading = ref(true)
const chatConfig = ref(null)
const chatId = ref<string | null>(null)
const apiKey = ref(route.query.apiKey as string)
const showRating = ref(false)

// Функция закрытия виджета
function handleClose() {
	window.parent.postMessage('closeWidget', '*')
}

// Проверка API ключа и получение конфигурации
async function checkApiKey() {
	try {
		const response = await fetch(`/api/v1/widget/key/${apiKey.value}`)
		if (!response.ok) {
			error.value = 'INVALID_API_KEY'
			return false
		}

		const data = await response.json()
		if (!data.apiKey.isActive) {
			error.value = 'INACTIVE_API_KEY'
			return false
		}

		chatConfig.value = data.customization
		return true
	} catch (e) {
		error.value = 'API_ERROR'
		console.error('Error checking API key:', e)
		return false
	}
}

// Проверяем сущеующий чат
function getExistingChatId(): string | null {
	return localStorage.getItem(`chat_${apiKey.value}`)
}

// Добавляем функции после существующих импортов
function getDeviceInfo() {
	const ua = navigator.userAgent

	// Определяем ОС
	let os = 'Unknown OS'
	if (ua.includes('Windows')) os = 'Windows'
	if (ua.includes('Mac')) os = 'MacOS'
	if (ua.includes('Linux')) os = 'Linux'
	if (ua.includes('Android')) os = 'Android'
	if (ua.includes('iOS')) os = 'iOS'

	// Определяем браузер
	let browser = 'Unknown Browser'
	if (ua.includes('Chrome')) browser = 'Chrome'
	if (ua.includes('Firefox')) browser = 'Firefox'
	if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
	if (ua.includes('Edge')) browser = 'Edge'
	if (ua.includes('Opera')) browser = 'Opera'

	return { browser, os }
}

// Получаем город по IP
async function getLocation() {
	try {
		const response = await fetch('https://ipapi.co/json/')
		const data = await response.json()
		return data.city || null
	} catch {
		return null
	}
}

onMounted(async () => {
	if (!apiKey.value) {
		error.value = 'NO_API_KEY'
		isLoading.value = false
		return
	}

	const isValidKey = await checkApiKey()
	if (!isValidKey) {
		isLoading.value = false
		return
	}

	const existingChatId = getExistingChatId()
	if (existingChatId) {
		try {
			const response = await fetch(`/api/v1/chats/${existingChatId}/messages`)
			if (!response.ok) {
				localStorage.removeItem(`chat_${apiKey.value}`)
			} else {
				const { data } = await response.json()
				if (data.isClosed) {
					localStorage.removeItem(`chat_${apiKey.value}`)
					chatId.value = null
					return
				}
				chatId.value = existingChatId
			}
		} catch (e) {
			console.error('Error loading chat:', e)
			localStorage.removeItem(`chat_${apiKey.value}`)
		}
	}

	isLoading.value = false
})

// Обновляем функцию handleStartChat
async function handleStartChat(data: { title: string; userName: string }) {
	try {
		isLoading.value = true
		const { browser, os } = getDeviceInfo()
		const city = await getLocation()

		const chatTitle = [data.userName, browser, os, city]
			.filter(Boolean)
			.join(', ')

		const response = await fetch('/api/v1/chats/create', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				apiKeyId: apiKey.value,
				title: chatTitle,
				userName: data.userName,
			}),
		})

		if (!response.ok) {
			error.value = 'CHAT_CREATE_ERROR'
			return
		}

		const { data: responseData } = await response.json()
		chatId.value = responseData.id
		localStorage.setItem(`chat_${apiKey.value}`, responseData.id)
	} catch (e) {
		error.value = 'CHAT_CREATE_ERROR'
		console.error('Error creating chat:', e)
	} finally {
		isLoading.value = false
	}
}

function handleChatClose() {
	showRating.value = true
}

function handleRatingClose() {
	showRating.value = false
	localStorage.removeItem(`chat_${apiKey.value}`)
	chatId.value = null
	handleClose()
}
</script>

<template>
	<div class="h-screen bg-gray-100">
		<template v-if="isLoading">
			<div class="flex justify-center items-center h-full">
				<div class="loading loading-spinner loading-lg"></div>
			</div>
		</template>

		<template v-else>
			<template v-if="error">
				<ApiKeyErrorScreen :error-code="error" @close="handleClose" />
			</template>

			<template v-else-if="chatId">
				<template v-if="showRating">
					<ChatRating :config="chatConfig || {}" @close="handleRatingClose" />
				</template>
				<template v-else>
					<ChatBox
						:chat-id="chatId"
						:config="chatConfig"
						@close="handleClose"
						@chat-closed="handleChatClose"
					/>
				</template>
			</template>

			<template v-else>
				<ChatWelcome
					@start="handleStartChat"
					@close="handleClose"
					:config="chatConfig"
				/>
			</template>
		</template>
	</div>
</template>
