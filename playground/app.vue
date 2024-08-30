<template>
	<div>
		Nuxt csrf module playground! {{ { csrf } }}
	</div>
	<button @click="execute()">
		fetch
	</button>

	<span>Response: {{ data }}</span>
</template>

<script lang="ts" setup>
const { csrf } = useCsrf()
const { data, execute } = await useFetch('/api/test', { immediate: false })
</script>
