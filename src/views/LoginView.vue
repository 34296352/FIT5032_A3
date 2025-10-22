<template>
  <div class="container mt-5" style="max-width: 480px">
    <h1 class="text-center mb-4">Login</h1>

    <div
      v-if="alreadyLoggedIn && forceLogin"
      class="alert alert-info d-flex justify-content-between align-items-center"
      role="alert"
    >
      <div>You're already logged in. (forceLogin=1 keeps you on this page)</div>
      <div class="btn-group">
        <button class="btn btn-outline-secondary btn-sm" @click="goHome">Go to Home</button>
        <button class="btn btn-outline-danger btn-sm" @click="logout">Sign out</button>
      </div>
    </div>

    <div v-if="showSuccess" class="alert alert-success text-center" role="alert">
      Login successful!
    </div>

    <form @submit.prevent="goToLogin" novalidate>
      <div class="mb-3">
        <label :for="emailId" class="form-label">Email:</label>
        <input
          :id="emailId"
          type="email"
          class="form-control"
          :class="{ 'is-invalid': emailError }"
          name="email"
          v-model="email"
          @blur="validateEmail"
          @input="validateEmail"
          autocomplete="email"
          inputmode="email"
          required
        />
        <div class="invalid-feedback">{{ emailError }}</div>
      </div>

      <div class="mb-3">
        <label :for="passwordId" class="form-label">Password:</label>
        <input
          :id="passwordId"
          type="password"
          class="form-control"
          :class="{ 'is-invalid': passwordError }"
          name="password"
          v-model="password"
          @blur="validatePassword"
          @input="validatePassword"
          autocomplete="current-password"
          required
        />
        <div class="invalid-feedback">{{ passwordError }}</div>
      </div>

      <div class="d-grid gap-2 mb-3">
        <button type="submit" class="btn btn-primary">Login</button>
      </div>

      <p v-if="firebaseError" class="text-danger text-center mt-2">
        {{ firebaseError }}
      </p>
    </form>

    <div class="d-flex flex-column flex-md-row justify-content-center align-items-center gap-3 mt-3">
      <div class="text-center">
        <p class="mb-1">Don't have an account?</p>
        <router-link to="/register" class="btn btn-outline-secondary">Register here</router-link>
      </div>
      <div class="text-center">
        <p class="mb-1">Forgot password?</p>
        <button class="btn btn-outline-danger" disabled>Fix now</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()

const uidSuffix = Math.random().toString(36).slice(2, 8)
const emailId = `email-${uidSuffix}`
const passwordId = `password-${uidSuffix}`

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const firebaseError = ref('')
const showSuccess = ref(false)

const forceLogin = computed(() => route.query.forceLogin === '1')
const redirectQ = computed(() => route.query.redirect)
const alreadyLoggedIn = ref(!!auth.currentUser)

let stopAuthWatch = null
onMounted(() => {
  stopAuthWatch = onAuthStateChanged(auth, (user) => {
    alreadyLoggedIn.value = !!user
  })
})
onBeforeUnmount(() => stopAuthWatch?.())

const validateEmail = () => {
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
  if (!email.value) {
    emailError.value = 'Email is required.'
  } else if (!emailRegex.test(email.value)) {
    emailError.value = 'Invalid email format.'
  } else {
    emailError.value = ''
  }
}

const validatePassword = () => {
  const hasNumber = /\d/
  const hasWhitespace = /\s/
  if (!password.value) {
    passwordError.value = 'Password is required.'
  } else if (hasWhitespace.test(password.value)) {
    passwordError.value = 'Password cannot contain spaces.'
  } else if (password.value.length < 6) {
    passwordError.value = 'Password must be at least 6 characters.'
  } else if (!hasNumber.test(password.value)) {
    passwordError.value = 'Password must contain at least one number.'
  } else {
    passwordError.value = ''
  }
}

const goToLogin = async () => {
  validateEmail()
  validatePassword()
  firebaseError.value = ''

  if (!emailError.value && !passwordError.value) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.value, password.value)
      const uid = cred.user.uid
      const snap = await getDoc(doc(db, 'users', uid))
      const role = snap.exists() ? (snap.data().role || 'user') : 'user'
      showSuccess.value = true
      setTimeout(() => (showSuccess.value = false), 1500)
      if (redirectQ.value) {
        router.replace(String(redirectQ.value))
      } else {
        router.replace(role === 'admin' ? '/admin' : '/user')
      }
    } catch (err) {
      firebaseError.value = err?.message || String(err)
    }
  }
}

const logout = async () => {
  try { await signOut(auth) } catch {}
  router.replace({ name: 'Login', query: { forceLogin: '1' } })
}

const goHome = () => {
  router.replace('/user')
}
</script>

<style scoped>
</style>
