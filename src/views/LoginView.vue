<template>
  <div class="container mt-5" style="max-width: 480px">
    <h1 class="text-center mb-4">Login</h1>

    <!-- successful login display -->
    <div v-if="showSuccess" class="alert alert-success text-center" role="alert">
      Login successful!
    </div>

    <!-- login form -->
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

      <!-- login button -->
      <div class="d-grid gap-2 mb-3">
        <button type="submit" class="btn btn-primary">Login</button>
      </div>
    </form>

    <!-- register buttons -->
    <div class="d-flex flex-column flex-md-row justify-content-center align-items-center gap-3 mt-3">
      <div class="text-center">
        <p class="mb-1">Haven't Email?</p>
        <router-link to="/register" class="btn btn-outline-secondary">Click to Register</router-link>

      </div>
      <div class="text-center">
        <p class="mb-1">Forget Password?</p>
        <button class="btn btn-outline-danger">Click to Fix</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Form field
const email = ref('')
const password = ref('')

// error message
const emailError = ref('')
const passwordError = ref('')

// Show success message when login is successful
const showSuccess = ref(false)

// Validate Email
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

// Validate Password
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

// login logic
const goToLogin = () => {
  validateEmail()
  validatePassword()

  if (!emailError.value && !passwordError.value) {
    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
    }, 3000)
  } else {
    showSuccess.value = false
    console.log('Validation failed.')
  }
}
</script>

<style scoped>

</style>
