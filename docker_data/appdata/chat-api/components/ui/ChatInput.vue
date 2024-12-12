<script setup lang="ts">
interface Props {
	modelValue: string
	isBackgroundDark?: boolean
	userColor?: string
	userBorderColor?: string
	disabled?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
	'update:modelValue': [value: string]
	submit: []
}>()

function handleSubmit(e: Event) {
	e.preventDefault()
	emit('submit')
}
</script>

<template>
	<div class="p-4">
		<form @submit.prevent="handleSubmit" class="relative">
			<input
				:value="modelValue"
				type="text"
				placeholder="Введите сообщение ..."
				class="w-full px-6 py-3 pr-16 rounded-xl border focus:outline-none focus:ring-2 bg-transparent"
				:class="
					isBackgroundDark
						? 'placeholder:text-white/60'
						: 'placeholder:text-black/60'
				"
				:style="{
					'--tw-ring-color': userColor || '#4a90e2',
					color: isBackgroundDark ? '#ffffff' : '#000000',
					borderColor: `${userBorderColor || '#e5e7eb'}40`,
				}"
				:disabled="disabled"
				@input="
					emit('update:modelValue', ($event.target as HTMLInputElement).value)
				"
			/>
			<button
				type="submit"
				class="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full transition-colors"
				:class="modelValue.trim() ? 'hover:opacity-80' : ''"
				:disabled="!modelValue.trim() || disabled"
			>
				<span v-if="!disabled">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="w-7 h-7 transition-opacity"
						:class="modelValue.trim() ? 'opacity-100' : 'opacity-50'"
						:style="{
							color: userColor || '#4a90e2',
						}"
					>
						<path
							d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"
						/>
					</svg>
				</span>
				<span
					v-else
					class="loading loading-spinner loading-sm"
					:style="{
						color: userColor || '#4a90e2',
					}"
				/>
			</button>
		</form>
	</div>
</template>
