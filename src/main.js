import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
// import './style.css' 
import 'bootstrap/dist/css/bootstrap.min.css'
import router from './router' // 路由

const app = createApp(App)

app.use(router)       // 注册路由
app.mount('#app')     // 挂载
