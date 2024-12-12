<script setup lang="ts">
import CloseButton from '~/components/ui/CloseButton.vue'

const emit = defineEmits(['close'])

export type ErrorCode =
	| 'NO_API_KEY'
	| 'INVALID_API_KEY'
	| 'INACTIVE_API_KEY'
	| 'API_ERROR'
	| 'CHAT_CREATE_ERROR'

const props = defineProps<{
	errorCode: ErrorCode
}>()

// Тонкие цветовые подсказки для разработчиков
const errorColors: Record<ErrorCode, string> = {
	NO_API_KEY: 'from-orange-100/20 to-orange-200/20',
	INVALID_API_KEY: 'from-red-100/20 to-red-200/20',
	INACTIVE_API_KEY: 'from-yellow-100/20 to-yellow-200/20',
	API_ERROR: 'from-purple-100/20 to-purple-200/20',
	CHAT_CREATE_ERROR: 'from-blue-100/20 to-blue-200/20',
}

const gradientClass = computed(
	() => errorColors[props.errorCode] || 'from-zinc-100/20 to-zinc-200/20'
)
</script>

<template>
	<div
		class="relative min-h-screen bg-zinc-50 flex items-center justify-center p-4 overflow-hidden"
	>
		<CloseButton :onClick="() => emit('close')" />

		<div
			class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#FF6CAB] to-[#7366FF] rounded-full filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2"
		/>
		<div
			class="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-[#FF6CAB] to-[#7366FF] rounded-full filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"
		/>

		<div
			class="relative max-w-md w-full backdrop-blur-sm shadow-lg rounded-2xl p-8 text-center"
			:class="`bg-gradient-to-b ${gradientClass}`"
		>
			<div class="w-24 h-24 mx-auto mb-6">
				<img src="/onium-logo.svg" alt="Onium Logo" class="w-full h-full" />
			</div>

			<h2 class="text-2xl font-bold mb-4 text-zinc-900">
				Упс! Что-то пошло не так
			</h2>

			<p class="text-zinc-600">
				В данный момент сервис недоступен. Пожалуйста, попробуйте позже.
			</p>
		</div>
	</div>
</template>
