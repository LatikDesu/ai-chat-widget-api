<script lang="ts" setup>
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import ChatActions from '~/components/ui/ChatActions.vue'
import ChatHeader from '~/components/ui/ChatHeader.vue'
import ChatInput from '~/components/ui/ChatInput.vue'

// Типизация props
interface Config {
	headerColor?: string
	headerTextColor?: string
	backgroundColor?: string
	userColor?: string
	userBorderColor?: string
	userTextColor?: string
	botColor?: string
	botBorderColor?: string
	botTextColor?: string
}
interface Props {
	chatId: string
	config: Config | null
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'chat-closed'])

const input = ref('')

const isBackgroundDark = computed(() => {
	const bgColor = props.config?.backgroundColor || '#ffffff'
	const hex = bgColor.replace('#', '')
	const r = parseInt(hex.slice(0, 2), 16)
	const g = parseInt(hex.slice(2, 4), 16)
	const b = parseInt(hex.slice(4, 6), 16)

	return (r * 299 + g * 587 + b * 114) / 1000 < 128
})

// Функция получения сообщений
async function fetchMessages(chatId: string) {
	const response = await fetch(`/api/v1/chats/${chatId}/messages`)
	if (!response.ok) throw new Error('Failed to fetch messages')
	const { data } = await response.json()
	return data
}

// Функция отравки сообщения
async function createMessage(data: {
	chatId: string
	content: string
	role: string
}) {
	const response = await fetch(`/api/v1/chats/${data.chatId}/messages/create`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ content: data.content, role: data.role }),
	})
	if (!response.ok) throw new Error('Failed to send message')
	return response.json()
}

// Функция для запроса к GPT
async function getGPTResponse(data: { chatId: string; message: string }) {
	const response = await fetch(`/api/v1/chats/${data.chatId}/completion`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			chatId: data.chatId,
			message: data.message,
		}),
	})
	if (!response.ok) throw new Error('Failed to get GPT response')
	return response.json()
}

// Хук для получения сообщений
const { data: messages, isLoading } = useQuery({
	queryKey: ['messages', props.chatId],
	queryFn: () => fetchMessages(props.chatId),
	refetchInterval: 3000,
})

// Хук для отправки сообщений
const queryClient = useQueryClient()
const { mutate: sendMessage, isPending: isSending } = useMutation({
	mutationFn: createMessage,
	onSuccess: () => {
		// Инвалидируем кеш сообщений после успешной отправки
		queryClient.invalidateQueries({ queryKey: ['messages', props.chatId] })
	},
})

function formatTime(date: Date): string {
	return new Date(date).toLocaleTimeString('ru-RU', {
		hour: '2-digit',
		minute: '2-digit',
	})
}

// Добавляем состояние ожидания
const isWaitingGPTResponse = ref(false)

// Обновляем обработчик отправки
async function handleSend() {
	if (!input.value.trim() || isSending.value) return

	const content = input.value
	input.value = ''

	try {
		// 1. Сначала отправляем сообщение пользователя
		await sendMessage({
			chatId: props.chatId,
			content,
			role: 'user',
		})

		// 2. Принудительно обновляем кеш сообщений, чтобы показать сообщение пользователя
		await queryClient.invalidateQueries(['messages', props.chatId])

		// Добавляем задержку в 500мс для плавности
		await new Promise(resolve => setTimeout(resolve, 500))

		// 3. Только после этого делаем запрос к GPT
		if (messages.value?.mode === 'bot') {
			isWaitingGPTResponse.value = true
			try {
				await getGPTResponse({
					chatId: props.chatId,
					message: content,
				})
			} finally {
				isWaitingGPTResponse.value = false
			}
		}
	} catch (e) {
		console.error('Error:', e)
		input.value = content
		isWaitingGPTResponse.value = false
	}
}

const messagesContainer = ref<HTMLElement | null>(null)

// Функция для скролла вниз
function scrollToBottom() {
	if (messagesContainer.value) {
		messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
	}
}

// Следим за изменениями сообщений
watch(
	() => messages.value,
	newMessages => {
		nextTick(() => {
			scrollToBottom()
		})
	},
	{ deep: true }
)

// Скроллим при монтировании
onMounted(() => {
	scrollToBottom()
})

// Функция для безопасного рендеринга markdown
function renderMarkdown(content: string) {
	const html = marked.parse(content, {
		breaks: true,
		gfm: true,
	})
	return DOMPurify.sanitize(html as string)
}

async function handleCallManager() {
	try {
		const response = await fetch(`/api/v1/chats/update`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				id: props.chatId,
				mode: 'human',
			}),
		})

		if (!response.ok) {
			throw new Error('Failed to update chat mode')
		}

		// Обновляем данные чата
		queryClient.invalidateQueries({ queryKey: ['messages', props.chatId] })
	} catch (error) {
		console.error('Error updating chat mode:', error)
	}
}

// Функция для закрытия чата
async function handleCloseChat() {
	try {
		const response = await fetch(`/api/v1/chats/update`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				id: props.chatId,
				isClosed: true,
			}),
		})

		if (!response.ok) {
			throw new Error('Failed to close chat')
		}

		// Обновляем данные чата после закрытия
		queryClient.invalidateQueries({ queryKey: ['messages', props.chatId] })

		// Эмитим событие закрытия чата
		emit('chat-closed')
	} catch (error) {
		console.error('Error closing chat:', error)
	}
}
</script>

<template>
	<div
		class="flex flex-col h-screen"
		:style="{
			backgroundColor: config?.backgroundColor || '#ffffff',
		}"
	>
		<ChatHeader :config="config" @close="$emit('close')" />

		<div
			ref="messagesContainer"
			class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
		>
			<div v-if="isLoading" class="flex justify-center">
				<span class="loading loading-spinner loading-lg"></span>
			</div>

			<template v-else-if="messages">
				<div
					v-for="message in messages.messages"
					:key="message.id"
					class="space-y-2 text-xs"
				>
					<div
						class="flex"
						:class="message.role === 'user' ? 'justify-end' : 'justify-start'"
					>
						<div
							class="max-w-[80%] rounded-2xl px-4 py-2 markdown-body"
							v-html="renderMarkdown(message.content)"
							:style="
								message.role === 'user'
									? {
											backgroundColor: config?.userColor || '#4a90e2',
											borderColor: config?.userBorderColor,
											color: config?.userTextColor || '#ffffff',
									  }
									: {
											backgroundColor: config?.botColor || '#f3f4f6',
											borderColor: config?.botBorderColor,
											color: config?.botTextColor || '#000000',
									  }
							"
						/>
					</div>
					<div
						class="text-xs text-gray-400"
						:class="message.role === 'user' ? 'text-right' : 'text-left'"
					>
						{{ formatTime(message.createdAt) }}
					</div>
				</div>

				<div v-if="isWaitingGPTResponse" class="space-y-2 text-xs">
					<div class="flex justify-start">
						<div
							class="max-w-[80%] rounded-2xl px-4 py-2"
							:style="{
								backgroundColor: config?.botColor || '#f3f4f6',
								borderColor: config?.botBorderColor,
								color: config?.botTextColor || '#000000',
							}"
						>
							<div class="flex items-center gap-1 h-6">
								<div
									class="w-1 h-1 bg-current rounded-full animate-bounce"
									style="animation-delay: 0ms"
								></div>
								<div
									class="w-1 h-1 bg-current rounded-full animate-bounce"
									style="animation-delay: 150ms"
								></div>
								<div
									class="w-1 h-1 bg-current rounded-full animate-bounce"
									style="animation-delay: 300ms"
								></div>
							</div>
						</div>
					</div>
				</div>
			</template>
		</div>

		<div class="relative">
			<ChatActions
				v-if="
					messages?.messages.length >= 5 &&
					!input &&
					!isWaitingGPTResponse &&
					!isSending
				"
				:header-color="config?.headerColor"
				:header-text-color="config?.headerTextColor"
				:mode="messages?.mode"
				:disabled="isSending"
				@call-manager="handleCallManager"
				@close-chat="handleCloseChat"
			/>
			<ChatInput
				v-model="input"
				:is-background-dark="isBackgroundDark"
				:user-color="config?.userColor"
				:user-border-color="config?.userBorderColor"
				:disabled="isSending || isWaitingGPTResponse"
				@submit="handleSend"
			/>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.custom-scrollbar {
	&::-webkit-scrollbar {
		width: 6px;
	}

	&::-webkit-scrollbar-track {
		background: transparent;
	}

	&::-webkit-scrollbar-thumb {
		background-color: rgba(0, 0, 0, 0.2);
		border-radius: 3px;

		&:hover {
			background-color: rgba(0, 0, 0, 0.3);
		}
	}
}

.markdown-body {
	p {
		margin-bottom: 0.75rem;

		&:last-child {
			margin-bottom: 0;
		}
	}

	ul,
	ol {
		padding-left: 1.5rem;
		margin-bottom: 0.5rem;
	}

	code {
		padding: 0.2em 0.4em;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 3px;
	}

	pre {
		padding: 1rem;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 6px;
		overflow-x: auto;

		code {
			padding: 0;
			background: none;
		}
	}

	a {
		color: inherit;
		text-decoration: underline;
	}
}
</style>
