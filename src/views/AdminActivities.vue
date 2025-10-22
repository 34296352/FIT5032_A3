<!-- src/views/AdminActivities.vue -->
<template>
  <div class="container py-4">
    <h3 class="mb-3">Activity List / Export</h3>

    <div class="mb-3 d-flex gap-2">
      <router-link to="/admin/activities/new" class="btn btn-primary">Create Activity</router-link>
      <button class="btn btn-outline-primary" @click="exportCSV" :disabled="!rows.length">Export CSV</button>
      <router-link to="/admin" class="btn btn-link">Back to Dashboard</router-link>
    </div>

    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th>Title</th>
            <th>Date</th>
            <th>Created At</th>
            <th>Created By</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.title }}</td>
            <td>{{ r.dateText }}</td>
            <td>{{ r.createdAtText }}</td>
            <td>{{ r.createdBy }}</td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="4" class="text-muted">No activities available</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db } from '@/firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'

const rows = ref([])

onMounted(async () => {
  const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  rows.value = snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      title: data.title,
      createdBy: data.createdBy || '',
      dateText: data.date?.toDate?.().toISOString().slice(0,10) || '',
      createdAtText: data.createdAt?.toDate?.().toLocaleString() || ''
    }
  })
})

const exportCSV = () => {
  if (!rows.value.length) return
  const headers = ['Title','Date','CreatedAt','CreatedBy']
  const csv = [
    headers.join(','),
    ...rows.value.map(r => [escape(r.title), r.dateText, escape(r.createdAtText), escape(r.createdBy)].join(','))
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `activities-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
