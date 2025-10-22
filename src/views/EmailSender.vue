<template>
  <div class="container py-4" style="max-width:520px">
    <h1 class="h4 mb-3">Send Email</h1>
    <form @submit.prevent="sendMail" class="vstack gap-2">
      <input v-model="form.name" class="form-control" placeholder="Your name" required />
      <input v-model="form.email" type="email" class="form-control" placeholder="Your email" required />
      <input v-model="form.subject" class="form-control" placeholder="Subject" required />
      <textarea v-model="form.message" class="form-control" rows="5" placeholder="Message" required />
      <button class="btn btn-primary" :disabled="sending">Send</button>
      <div class="text-success" v-if="ok">{{ ok }}</div>
      <div class="text-danger" v-if="err">{{ err }}</div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import emailjs from '@emailjs/browser'

const SERVICE_ID  = 'service_xxx'
const TEMPLATE_ID = 'template_xxx'
const PUBLIC_KEY  = 'x_xxx'

const form = ref({ name:'', email:'', subject:'', message:'' })
const sending = ref(false)
const ok = ref(''); const err = ref('')

const sendMail = async () => {
  sending.value = true; ok.value=''; err.value=''
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        name: form.value.name,
        email: form.value.email,
        subject: form.value.subject,
        message: form.value.message
      },
      { publicKey: PUBLIC_KEY }
    )
    ok.value = 'Sent successfully! Please check your inbox.'
  } catch (e) {
    err.value = e?.text || e?.message || String(e)
  } finally {
    sending.value = false
  }
}
</script>
