<template>
  <div>
    Nuxt csrf module playground! {{ { token } }}
  </div>
  <button @click="execute()">
    fetch
  </button>

  <span>Response: {{ data }}</span>
</template>

<script lang="ts" setup>
const { token } = useCsrf()
const { data, execute } = await useFetch('/api/test', { immediate: false })
</script>
