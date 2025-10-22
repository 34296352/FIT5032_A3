<template>
  <div class="container py-4" style="max-width:760px">
    <h1 class="h4 mb-3">Bulk Email (F.1)</h1>

    <div class="mb-3">
      <label class="form-label">Recipients (comma or newline separated)</label>
      <textarea v-model="rawRecipients" class="form-control" rows="4" placeholder="a@x.com, b@x.com"></textarea>
    </div>

    <div class="mb-2">
      <input v-model="subject" class="form-control" placeholder="Subject" />
    </div>
    <div class="mb-3">
      <textarea v-model="body" class="form-control" rows="6" placeholder="Email body"></textarea>
    </div>

    <button class="btn btn-secondary" :disabled="sending" @click="sendBulk">Send Emails</button>

    <div class="mt-3 small text-muted" v-if="sending || progress.total">
      Progress: {{ progress.sent }}/{{ progress.total }} (Failed {{ progress.failed }})
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import emailjs from '@emailjs/browser'

const SERVICE_ID  = 'service_xxx'
const TEMPLATE_ID = 'template_xxx'
const PUBLIC_KEY  = 'x_xxx'

const rawRecipients = ref('')
const subject = ref('')
const body = ref('')
const sending = ref(false)
const progress = ref({ total:0, sent:0, failed:0, errors:[] })

const parseEmails = () =>
  rawRecipients.value
    .split(/[\s,;]+/)
    .map(e => e.trim())
    .filter(e => e)

const sleep = ms => new Promise(r => setTimeout(r, ms))

const sendBulk = async () => {
  const list = parseEmails()
  if (!list.length) return alert('Please enter recipients')
  if (!subject.value || !body.value) return alert('Please enter subject and message')

  sending.value = true
  progress.value = { total:list.length, sent:0, failed:0, errors:[] }

  for (const to of list) {
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        { to, subject: subject.value, message: body.value },
        { publicKey: PUBLIC_KEY }
      )
      progress.value.sent++
    } catch (e) {
      progress.value.failed++
      progress.value.errors.push({ to, err: e?.text || e?.message || String(e) })
    }
    await sleep(500)
  }

  sending.value = false
  alert(`Done: success ${progress.value.sent}, failed ${progress.value.failed}`)
}
</script>
