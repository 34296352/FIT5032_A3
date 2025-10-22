<!-- src/views/AdminMaterials.vue -->
<template>
  <div class="container py-4" style="max-width:720px">
    <h3 class="mb-3">Materials Upload</h3>

    <div v-if="msg" class="alert" :class="ok ? 'alert-success' : 'alert-danger'">
      {{ msg }}
    </div>

    <div class="mb-3">
      <input type="file" class="form-control" @change="onPick" :disabled="uploading" />
    </div>

    <button class="btn btn-primary" @click="upload" :disabled="!file || uploading">
      <span v-if="uploading" class="spinner-border spinner-border-sm me-2"></span>
      Upload
    </button>
    <router-link to="/admin" class="btn btn-link">Back to Dashboard</router-link>

    <div v-if="url" class="mt-3">
      <div class="text-muted small">Download URL:</div>
      <a :href="url" target="_blank">{{ url }}</a>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { storage } from '@/firebase'
import { ref as sref, uploadBytes, getDownloadURL } from 'firebase/storage'

const file = ref(null)
const uploading = ref(false)
const url = ref('')
const msg = ref('')
const ok = ref(false)

const onPick = (e) => {
  file.value = e.target.files?.[0] || null
  url.value = ''
  msg.value = ''
}

const upload = async () => {
  if (!file.value) return
  uploading.value = true
  msg.value = ''
  ok.value = false
  try {
    const now = new Date()
    const path = `materials/${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${Date.now()}-${file.value.name}`
    const fileRef = sref(storage, path)
    await uploadBytes(fileRef, file.value)
    url.value = await getDownloadURL(fileRef)
    ok.value = true
    msg.value = 'Upload successful!'
    file.value = null
  } catch (e) {
    msg.value = e.message || String(e)
  } finally {
    uploading.value = false
  }
}
</script>
