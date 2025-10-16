<template>
  <div class="container mt-4">
    <!-- 顶部导航栏（可选，如果有 BHeader.vue 的话可以放这里） -->
    <router-view /> <!-- 这里会根据路由加载对应的 View 页面 -->
  </div>
</template>

<script setup>
// 不需要再引入 Login 和 Register
</script>

<style scoped>
/* 你可以在这里添加全局样式，比如页面背景色等 */
</style>