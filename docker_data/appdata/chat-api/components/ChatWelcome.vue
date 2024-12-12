<script setup lang="ts">
import { ref } from 'vue'
import ChatHeader from '~/components/ui/ChatHeader.vue'

const emit = defineEmits(['start', 'close'])

defineProps<{
	config: {
		greeting?: string
		headerTitle?: string
		headerColor?: string
		headerTextColor?: string
		backgroundColor?: string
		userColor?: string
		userBorderColor?: string
		userTextColor?: string
		botColor?: string
		botBorderColor?: string
		botTextColor?: string
	} | null
}>()

const userName = ref('')

async function handleSubmit() {
	if (userName.value.trim()) {
		emit('start', {
			userName: userName.value.trim(),
		})
	}
}
</script>

<template>
	<div
		class="h-screen flex flex-col"
		:style="{
			backgroundColor: config?.backgroundColor || '#fafafa',
		}"
	>
		<ChatHeader :config="config" @close="$emit('close')" />

		<div class="flex-1 flex items-center justify-center p-8">
			<div class="max-w-sm w-full space-y-6">
				<div class="w-24 h-24 mx-auto">
					<img src="/onium-logo.svg" alt="Logo" class="w-full h-full" />
				</div>

				<p
					class="text-center"
					:style="{
						color: config?.botTextColor || '#ffffff',
					}"
				>
					{{
						config?.greeting ||
						'Здравствуйте! Представьтесь, пожалуйста, чтобы начать диалог.'
					}}
				</p>

				<form @submit.prevent="handleSubmit" class="space-y-4">
					<input
						v-model="userName"
						type="text"
						placeholder="Как к вам обращаться?"
						class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
						:style="{
							borderColor: config?.userColor || '#4a90e2',
							'--tw-ring-color': config?.userColor || '#4a90e2',
						}"
						required
					/>

					<button
						type="submit"
						class="w-full py-2 rounded-lg transition-colors"
						:style="{
							backgroundColor: config?.userColor || '#4a90e2',
							color: config?.userTextColor || '#ffffff',
						}"
					>
						Начать диалог
					</button>
				</form>
			</div>
		</div>
	</div>
</template>
