<script setup lang="ts">
interface Props {
	headerColor?: string
	headerTextColor?: string
	disabled?: boolean
	mode?: 'bot' | 'human'
}

const props = defineProps<Props>()
const emit = defineEmits<{
	callManager: []
	closeChat: []
}>()
</script>

<template>
	<Transition
		enter-active-class="transition-all duration-300 ease-out"
		enter-from-class="opacity-0 transform -translate-y-2"
		enter-to-class="opacity-100 transform translate-y-0"
		leave-active-class="transition-all duration-300 ease-in"
		leave-from-class="opacity-100 transform translate-y-0"
		leave-to-class="opacity-0 transform -translate-y-2"
		appear
	>
		<div
			class="absolute bottom-full left-0 right-0 px-4 py-1.5 flex justify-center gap-2"
			:style="{
				borderColor: `${headerColor || '#e5e7eb'}40`,
			}"
		>
			<button
				v-if="mode === 'bot'"
				class="px-2.5 py-1 text-xs rounded-xl border transition-colors flex-1"
				:class="disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'"
				:style="{
					backgroundColor: headerColor || '#f3f4f6',
					borderColor: `${headerColor || '#e5e7eb'}40`,
					color: headerTextColor || '#000000',
				}"
				:disabled="disabled"
				@click="emit('callManager')"
			>
				Позвать менеджера
			</button>
			<button
				class="px-2.5 py-1 text-xs rounded-xl border transition-colors"
				:class="[
					disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80',
					{ 'flex-1': mode === 'bot' },
				]"
				:style="{
					backgroundColor: headerColor || '#f3f4f6',
					borderColor: `${headerColor || '#e5e7eb'}40`,
					color: headerTextColor || '#000000',
				}"
				:disabled="disabled"
				@click="emit('closeChat')"
			>
				Завершить чат
			</button>
		</div>
	</Transition>
</template>
