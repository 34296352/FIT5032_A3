<template>
  <div class="container mt-5" style="max-width: 480px">
    <h1 class="text-center mb-4">Register</h1>

    <div v-if="showSuccess" class="alert alert-success text-center">
      Registration successful!
    </div>

    <div v-if="firebaseError" class="alert alert-danger text-center">
      {{ firebaseError }}
    </div>

    <form @submit.prevent="goToRegister" novalidate>
      <div class="mb-3">
        <label :for="emailId" class="form-label">Email:</label>
        <input
          :id="emailId"
          type="email"
          class="form-control"
          :class="{ 'is-invalid': emailError }"
          name="email"
          v-model.trim="email"
          @blur="validateEmail"
          @input="onEmailInput"
          autocomplete="email"
          inputmode="email"
          required
        />
        <div class="invalid-feedback">{{ emailError }}</div>
        <div v-if="checkingEmail && !emailError" class="form-text">Checking email…</div>
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
          autocomplete="new-password"
          required
          aria-describedby="pwdHelp"
        />
        <div class="invalid-feedback">{{ passwordError }}</div>
        <div id="pwdHelp" class="form-text">At least 6 characters and include a number. No spaces.</div>
      </div>

      <div class="mb-3">
        <label :for="confirmId" class="form-label">Confirm Password:</label>
        <input
          :id="confirmId"
          type="password"
          class="form-control"
          :class="{ 'is-invalid': confirmPasswordError }"
          name="confirmPassword"
          v-model="confirmPassword"
          @blur="validateConfirmPassword"
          @input="validateConfirmPassword"
          autocomplete="new-password"
          required
        />
        <div class="invalid-feedback">{{ confirmPasswordError }}</div>
      </div>

      <div class="d-grid gap-2 mb-3">
        <button
          type="submit"
          name="register"
          class="btn btn-success"
          :disabled="checkingEmail || submitting"
        >
          <span v-if="submitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Register
        </button>
      </div>

      <router-link to="/" class="btn btn-outline-primary mt-3 d-block text-center" aria-label="Back to Login">
        Back to Login
      </router-link>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useRouter } from 'vue-router'

const router = useRouter()

const uidSuffix = Math.random().toString(36).slice(2, 8)
const emailId = `reg-email-${uidSuffix}`
const passwordId = `reg-password-${uidSuffix}`
const confirmId = `reg-confirm-${uidSuffix}`

const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const firebaseError = ref('')
const showSuccess = ref(false)
const checkingEmail = ref(false)
const submitting = ref(false)

const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i

const validateEmailFormat = () => {
  if (!email.value) {
    emailError.value = 'Email is required.'
    return false
  }
  if (!emailRegex.test(email.value)) {
    emailError.value = 'Invalid email format.'
    return false
  }
  return true
}

const validateEmail = async () => {
  firebaseError.value = ''
  if (!validateEmailFormat()) return
  await checkEmailExists()
}

const onEmailInput = async () => {
  if (validateEmailFormat()) {
    emailError.value = ''
    await checkEmailExists()
  }
}

const checkEmailExists = async () => {
  checkingEmail.value = true
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email.value)
    if (methods.length > 0) {
      emailError.value = 'This email is already registered.'
    } else if (emailError.value === 'This email is already registered.') {
      emailError.value = ''
    }
  } catch (e) {
    console.warn('checkEmailExists error:', e)
  } finally {
    checkingEmail.value = false
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

const validateConfirmPassword = () => {
  if (!confirmPassword.value) {
    confirmPasswordError.value = 'Please confirm your password.'
  } else if (confirmPassword.value !== password.value) {
    confirmPasswordError.value = 'Passwords do not match.'
  } else {
    confirmPasswordError.value = ''
  }
}

const goToRegister = async () => {
  firebaseError.value = ''
  validatePassword()
  validateConfirmPassword()

  if (!validateEmailFormat()) return
  await checkEmailExists()
  if (emailError.value || passwordError.value || confirmPasswordError.value) return

  try {
    submitting.value = true
    const cred = await createUserWithEmailAndPassword(auth, email.value, password.value)
    const uid = cred.user.uid

    await setDoc(doc(db, 'users', uid), {
      uid,
      email: email.value,
      role: 'user',
      createdAt: serverTimestamp(),
    })

    showSuccess.value = true
    email.value = ''
    password.value = ''
    confirmPassword.value = ''

    setTimeout(() => router.replace('/user'), 800)
  } catch (err) {
    const code = err.code || ''
    if (code === 'auth/email-already-in-use') {
      emailError.value = 'This email is already registered.'
      firebaseError.value = 'This email is already registered. Try logging in or reset your password.'
    } else {
      firebaseError.value = `Registration failed: ${err.message || code}`
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
</style>
