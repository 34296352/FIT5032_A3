<template>
  <div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="h4 mb-0">User</h1>
      <router-link to="/about" class="btn btn-outline-secondary btn-sm">About / Contact us</router-link>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-12 col-md-4">
        <SectionCard title="Get Fit" icon="bi-activity" :links="[
          { text: 'Competitive Sports', to: '/user/get-fit/competitive-sports' },
          { text: 'Basketball', to: '/user/get-fit/competitive-sports/basketball' },
          { text: 'Gym', to: '/user/get-fit/gym' },
        ]" to="/user/get-fit" />
      </div>

      <div class="col-12 col-md-4">
        <SectionCard title="Training Courses" icon="bi-mortarboard" :links="[
          { text: 'Nearby Venues', to: '/user/training-courses/nearby-venues' },
          { text: 'Course Types', to: '/user/training-courses/course-types' },
        ]" to="/user/training-courses" />
      </div>

      <div class="col-12 col-md-4">
        <SectionCard title="Relax & Meet Friends" icon="bi-people" :links="[
          { text: 'Hiking', to: '/user/relax/hiking' },
          { text: 'Stargazing', to: '/user/relax/stargazing' },
          { text: 'Meditation', to: '/user/relax/meditation' },
        ]" to="/user/relax" />
      </div>
    </div>

    <div class="row g-3">
      <div class="col-12 col-md-4">
        <MiniCard title="All Activities" desc="Browse all activities (expired ones are greyed out and cannot be registered)" to="/user/all" />
      </div>
      <div class="col-12 col-md-4">
        <MiniCard title="Upcoming Activities" desc="View upcoming activities and your registration status" to="/user/upcoming" />
      </div>
      <div class="col-12 col-md-4">
        <MiniCard title="Completed Activities" desc="Review your participated activities and feedback" to="/user/completed" />
      </div>
    </div>
  </div>
</template>

<script setup>
import MiniCard from '../components/MiniCard.vue'
import SectionCard from '../components/SectionCard.vue'
</script>
