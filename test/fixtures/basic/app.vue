<template>
  <div>
    basic
    <span id="csrf">{{ token }}</span>
    <span id="data">{{ data }}</span>
  </div>
</template>

<script setup>
const { token } = useCsrf()
const { data } = await useFetch('/api/test')
</script>
