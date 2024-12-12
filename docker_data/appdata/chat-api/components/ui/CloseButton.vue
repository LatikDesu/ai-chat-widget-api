<script setup lang="ts">
defineProps<{
	onClick: () => void
}>()
</script>

<template>
	<button
		@click="onClick"
		class="absolute top-2 right-2 p-1.5 rounded-full hover:bg-zinc-500/10 cursor-pointer transition-colors z-10"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
			class="w-4 h-4 text-zinc-400 hover:text-zinc-600"
		>
			<path
				d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
			/>
		</svg>
	</button>
</template>
