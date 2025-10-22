<!-- src/views/GenericPage.vue -->
<template>
  <div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h4 mb-0">{{ title }}</h1>
      <router-link to="/user" class="btn btn-outline-secondary btn-sm">Back to user</router-link>
    </div>
    <div class="alert alert-info">
       <strong>{{ title }}</strong> 
    </div>
    <p class="text-muted small mb-0"></p>
  </div>
</template>

<script setup>
defineProps({ title: { type: String, default: 'Page' } })
</script>
