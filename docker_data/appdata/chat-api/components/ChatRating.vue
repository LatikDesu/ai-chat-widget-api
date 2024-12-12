<script setup lang="ts">
interface Props {
	config?: {
		headerColor?: string
		headerTextColor?: string
		backgroundColor?: string
	}
}

const props = defineProps<Props>()
const emit = defineEmits<{
	close: []
}>()

const ratings = [
	{ value: 1, emoji: '😠' },
	{ value: 2, emoji: '🙁' },
	{ value: 3, emoji: '😐' },
	{ value: 4, emoji: '🙂' },
	{ value: 5, emoji: '😊' },
]

const showThanks = ref(false)

async function handleRate(rating: number) {
	try {
		// Здесь можно добавить API запрос для сохранения оценки
		showThanks.value = true

		// Закрываем окно через 2 секунды после оценки
		setTimeout(() => {
			emit('close')
		}, 2000)
	} catch (error) {
		console.error('Error saving rating:', error)
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
		<div
			class="p-4 border-b"
			:style="{
				backgroundColor: config?.headerColor || '#f3f4f6',
				borderColor: `${config?.headerColor || '#e5e7eb'}40`,
			}"
		>
			<h2
				class="text-lg font-semibold"
				:style="{
					color: config?.headerTextColor || '#000000',
				}"
			>
				Оценка чата
			</h2>
		</div>

		<div class="flex-1 flex flex-col items-center justify-center p-8">
			<template v-if="!showThanks">
				<h3 class="text-xl text-center mb-8">
					Пожалуйста, оцените качество обслуживания
				</h3>
				<div class="flex gap-4">
					<button
						v-for="rating in ratings"
						:key="rating.value"
						class="text-4xl transition-transform hover:scale-125"
						@click="handleRate(rating.value)"
					>
						{{ rating.emoji }}
					</button>
				</div>
			</template>
			<template v-else>
				<div class="text-center">
					<div class="text-4xl mb-4">🙏</div>
					<p class="text-xl">Спасибо за вашу оценку!</p>
				</div>
			</template>
		</div>
	</div>
</template>
