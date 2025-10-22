// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

// ===== Views =====
// Auth
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
// User
import UserHome from '@/views/UserHome.vue'
// Admin
import AdminDashboard from '@/views/AdminDashboard.vue'
import AdminActivities from '@/views/AdminActivities.vue'
import AdminActivityNew from '@/views/AdminActivityNew.vue'
import AdminMaterials from '@/views/AdminMaterials.vue'
import EmailSender from '@/views/EmailSender.vue'
import AdminBulkEmail from '@/views/AdminBulkEmail.vue'

// Firebase (check admin via Firestore users collection only)
import { auth, db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'

const NotFound = { template: '<div class="container mt-5"><h1>404 Not Found</h1></div>' }

const _adminCache = new Map()
async function isAdminFromUsers(user) {
  if (!user) return false
  const { uid } = user

  const cached = _adminCache.get(uid)
  const now = Date.now()
  if (cached && now - cached.t < 60_000) return cached.v

  try {
    const snap = await getDoc(doc(db, 'users', uid))
    const data = snap.data() || {}
    const role = String(data.role || '').toLowerCase()
    const isAdmin = data.isAdmin === true || role === 'admin'
    _adminCache.set(uid, { v: isAdmin, t: now })
    return isAdmin
  } catch (e) {
    console.warn('read users doc failed:', e)
    return false
  }
}

let _authReadyPromise = null
function waitForAuthInit() {
  if (auth.currentUser !== null) return Promise.resolve()
  if (_authReadyPromise) return _authReadyPromise
  _authReadyPromise = new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, () => {
      stop()
      resolve()
    })
  })
  return _authReadyPromise
}

const routes = [
  { path: '/', name: 'Login', component: LoginView, meta: { guestOnly: true } },
  { path: '/register', name: 'Register', component: RegisterView, meta: { guestOnly: true } },

  { path: '/user', name: 'UserHome', component: UserHome, meta: { requiresAuth: true } },
  {
    path: '/user/all',
    name: 'UserAllActivities',
    component: () => import('@/views/UserAllActivities.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/user/upcoming',
    name: 'UpcomingActivities',
    component: () => import('@/views/UpcomingActivities.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/user/completed',
    name: 'CompletedActivities',
    component: () => import('@/views/CompletedActivities.vue'),
    meta: { requiresAuth: true },
  },

  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/activities',
    name: 'AdminActivities',
    component: AdminActivities,
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/activities/new',
    name: 'AdminActivityNew',
    component: AdminActivityNew,
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/materials',
    name: 'AdminMaterials',
    component: AdminMaterials,
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/bulk-email',
    name: 'AdminBulkEmail',
    component: AdminBulkEmail,
    meta: { requiresAdmin: true },
  },

  { path: '/contact', name: 'EmailSender', component: EmailSender, meta: { requiresAuth: true } },

  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to, from, next) => {
  await waitForAuthInit()

  if (to.query.logout === '1') {
    try { await signOut(auth) } catch {}
    const { logout, ...rest } = to.query
    return next({ name: 'Login', query: rest })
  }

  const user = auth.currentUser

  if (to.meta.guestOnly && to.query.forceLogin === '1') {
    return next()
  }

  if (to.meta.guestOnly) {
    if (!user) return next()
    const isAdmin = await isAdminFromUsers(user)
    return next({ name: isAdmin ? 'AdminDashboard' : 'UserHome' })
  }

  if (to.meta.requiresAuth || to.meta.requiresAdmin) {
    if (!user) {
      return next({ name: 'Login', query: { redirect: to.fullPath } })
    }
  }

  if (to.meta.requiresAdmin) {
    const isAdmin = await isAdminFromUsers(user)
    if (!isAdmin) return next({ name: 'UserHome' })
  }

  return next()
})

export default router
