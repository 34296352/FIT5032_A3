<template>
  <div class="container mt-5" style="max-width: 480px">
    <h1 class="text-center mb-4">Login</h1>

    <!-- Successful login prompt-->
    <div v-if="showSuccess" class="alert alert-success text-center" role="alert">
      Login successful!
    </div>

    <!-- Login Form -->
    <form @submit.prevent="goToLogin" novalidate>
      <!-- Email -->
      <div class="mb-3">
        <label for="email" class="form-label">Email:</label>
        <input
          type="email"
          class="form-control"
          :class="{ 'is-invalid': emailError }"
          id="email"
          name="email"
          v-model="email"
          @blur="validateEmail"
          @input="validateEmail"
          required
        />
        <div class="invalid-feedback">{{ emailError }}</div>
      </div>

      <!-- Password -->
      <div class="mb-3">
        <label for="password" class="form-label">Password:</label>
        <input
          type="password"
          class="form-control"
          :class="{ 'is-invalid': passwordError }"
          id="password"
          name="password"
          v-model="password"
          @blur="validatePassword"
          @input="validatePassword"
          required
        />
        <div class="invalid-feedback">{{ passwordError }}</div>
      </div>

      <!-- Login Button -->
      <div class="d-grid gap-2 mb-3">
        <button type="submit" class="btn btn-primary">Login</button>
      </div>

      <!-- Firebase backend error messages -->
      <p v-if="firebaseError" class="text-danger text-center mt-2">
        {{ firebaseError }}
      </p>
    </form>

    <!-- Registration and Forgot Password -->
    <div class="d-flex flex-column flex-md-row justify-content-center align-items-center gap-3 mt-3">
      <div class="text-center">
        <p class="mb-1">Don't have an account?</p>
        <router-link to="/register" class="btn btn-outline-secondary">Register here</router-link>
      </div>
      <div class="text-center">
        <p class="mb-1">Forgot password?</p>
        <button class="btn btn-outline-danger" disabled>Coming soon</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase' 

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const firebaseError = ref('')
const showSuccess = ref(false)

// Verify Email Format
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

// Verify password format
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

// Login Logic (Connecting to Firebase)
const goToLogin = async () => {
  validateEmail()
  validatePassword()
  firebaseError.value = ''

  if (!emailError.value && !passwordError.value) {
    try {
      await signInWithEmailAndPassword(auth, email.value, password.value)
      showSuccess.value = true

      //Redirect after successful login
      // router.push('/home')

      setTimeout(() => {
        showSuccess.value = false
      }, 3000)
    } catch (err) {
      firebaseError.value = err.message
    }
  } else {
    showSuccess.value = false
  }
}
</script>

<style scoped>

</style>
