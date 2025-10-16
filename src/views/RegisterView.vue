<template>
  <div class="container mt-5" style="max-width: 480px">
    <h1 class="text-center mb-4">Register</h1>

    <!-- Register form -->
    <form @submit.prevent="goToRegister" novalidate>
      <!-- Email -->
      <div class="mb-3">
        <label for="email" class="form-label">Email:</label>
        <input
          type="email"
          class="form-control"
          :class="{ 'is-invalid': emailError }"
          id="email"
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
          v-model="password"
          @blur="validatePassword"
          @input="validatePassword"
          required
        />
        <div class="invalid-feedback">{{ passwordError }}</div>
      </div>

      <!-- Confirm Password -->
      <div class="mb-3">
        <label for="confirmPassword" class="form-label">Confirm Password:</label>
        <input
          type="password"
          class="form-control"
          :class="{ 'is-invalid': confirmPasswordError }"
          id="confirmPassword"
          v-model="confirmPassword"
          @blur="validateConfirmPassword"
          @input="validateConfirmPassword"
          required
        />
        <div class="invalid-feedback">{{ confirmPasswordError }}</div>
      </div>

      <!-- Register button -->
      <div class="d-grid gap-2 mb-3">
        <button type="submit" class="btn btn-success">Register</button>
      </div>

      <router-link to="/" class="btn btn-outline-primary mt-3 d-block text-center">Back to Login</router-link>


      <!-- Success Alert -->
      <div v-if="showSuccess" class="alert alert-success text-center">
        Registration successful!
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// form fields
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

// error messages
const emailError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const showSuccess = ref(false)

// validations
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
    passwordError.value = 'Password cannot contain illegal characters (e.g., spaces).'
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

// register handler
const goToRegister = () => {
  validateEmail()
  validatePassword()
  validateConfirmPassword()

  if (!emailError.value && !passwordError.value && !confirmPasswordError.value) {
    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
    }, 3000)
  }
}
</script>

<style scoped>

</style>
