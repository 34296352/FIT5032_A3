<!-- src/views/user/components/SectionCard.vue -->
<template>
  <div class="card h-100">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h2 class="h5 mb-0">{{ title }}</h2>
        <i :class="`bi ${icon} fs-3 text-secondary`"></i>
      </div>
      <p class="text-muted small mb-2">Explore:</p>
      <ul class="list-unstyled mb-3">
        <li v-for="l in links" :key="l.to" class="mb-1">
          <router-link :to="l.to" class="link-primary text-decoration-none">{{ l.text }}</router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  icon: { type: String, default: 'bi-grid' },
  links: { type: Array, default: () => [] },
  to: { type: String, default: '/' },
})
</script>
