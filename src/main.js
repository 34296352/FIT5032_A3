// src/main.js
import './assets/main.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css'
// import 'datatables.net-responsive-bs5/css/responsive.bootstrap5.min.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import emailjs from '@emailjs/browser'

import { authReady } from '@/firebase'

try {
  emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY)
} catch (e) {
  console.warn('emailjs init skipped:', e?.message || e)
}

;(async () => {
  try { await authReady } catch {}

  const app = createApp(App)
  app.use(router)
  app.mount('#app')
})()
