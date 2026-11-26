<template>
  <div>
    basic
    <span id="csrf">{{ csrf }}</span>
    <span id="data">{{ data }}</span>
  </div>
</template>

<script setup>
const { csrf } = useCsrf()
const { data } = await useFetch('/api/test')
</script>
