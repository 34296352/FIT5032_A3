<template>
  <div class="card h-100">
    <div class="card-body d-flex flex-column">
      <h3 class="h6">{{ title }}</h3>
      <p class="text-muted small flex-grow-1">{{ desc }}</p>
      <router-link :to="to" class="btn btn-outline-primary btn-sm align-self-start">Open</router-link>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  desc: String,
  to: String,
})
</script>
