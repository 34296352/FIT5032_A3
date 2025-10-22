<!-- src/views/AdminActivityNew.vue -->
<template>
  <div class="container py-4" style="max-width:720px">
    <h3 class="mb-3">Create Activity</h3>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="ok" class="alert alert-success">Activity created successfully!</div>

    <form @submit.prevent="submit">
      <div class="mb-3">
        <label class="form-label">Title</label>
        <input v-model.trim="title" class="form-control" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Date</label>
        <input v-model="date" type="date" class="form-control" required />
      </div>
      <div class="mb-3">
        <label class="form-label">Description</label>
        <textarea v-model.trim="description" class="form-control" rows="4"></textarea>
      </div>

      <button class="btn btn-primary" :disabled="submitting">
        <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
        Save
      </button>
      <router-link to="/admin" class="btn btn-link">Back to Dashboard</router-link>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { auth, db } from '@/firebase'
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore'

const title = ref('')
const date = ref('')
const description = ref('')
const submitting = ref(false)
const error = ref('')
const ok = ref(false)

const submit = async () => {
  error.value = ''
  ok.value = false
  submitting.value = true
  try {
    await addDoc(collection(db, 'activities'), {
      title: title.value,
      description: description.value || '',
      date: date.value ? Timestamp.fromDate(new Date(date.value)) : null,
      createdBy: auth.currentUser?.uid || 'system',
      createdAt: serverTimestamp()
    })
    ok.value = true
    title.value = ''
    date.value = ''
    description.value = ''
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    submitting.value = false
  }
}
</script>
