<template>
	<NuxtPage />
</template>

<script setup lang="ts">
// Глобальные стили и конфигурация
useHead({
	title: 'Chat App',
	meta: [{ name: 'description', content: 'Chat application with AI support' }],
	link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
})
</script>

<style>
html,
body {
	margin: 0;
	padding: 0;
}
</style>
