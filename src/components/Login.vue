<template>
    <div class="form">
    <h1>Login Page</h1>
        <form>
            <label for="email">Email:</label><br>
            <input type="text" id="email" name="email"><br>
            
            <label for="password">Password:</label><br>
            <input type="password" id="password" name="password"><br>
            
        </form>
    </div>

    <div class ="login-box">
    <p>
      <button @click="goToLogin">login</button>
    </p>
    </div>

    <div class="register-box">
    <p>
      Haven't Email?
      <button @click="goToRegister">click to register</button>
    </p>
    </div>

    <div class="forget-password-box">
      Forget password?
      <button @click="goToFix">click to fix</button>
    </div>
</template>

