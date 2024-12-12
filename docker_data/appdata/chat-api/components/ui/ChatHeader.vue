<script setup lang="ts">
import CloseButton from '~/components/ui/CloseButton.vue'
interface Props {
	config: {
		headerTitle?: string
		headerColor?: string
		headerTextColor?: string
		botColor?: string
		botTextColor?: string
	} | null
}

defineProps<Props>()
defineEmits(['close'])
</script>

<template>
	<div
		class="p-4 shadow-md relative"
		:style="{
			backgroundColor: config?.headerColor || '#fafafa',
		}"
	>
		<CloseButton :onClick="() => $emit('close')" />
		<h2
			class="text-xl font-semibold text-center pb-2"
			:style="{ color: config?.headerTextColor || '#fafafa' }"
		>
			{{ config?.headerTitle || 'Начать чат' }}
		</h2>
		<p
			class="text-[10px] text-center"
			:style="{
				color: config?.headerTextColor
					? `${config.headerTextColor}99`
					: '#fafafa99',
			}"
		>
			Нейросеть
			<span
				class="px-1.5 py-0.5 rounded"
				:style="{
					backgroundColor: config?.botColor || '#4a90e2',
					color: config?.botTextColor || '#ffffff',
				}"
			>
				OneumGPT
			</span>
		</p>
	</div>
</template>
