<!-- src/views/UserCompletedActivities.vue -->
<template>
  <div class="container my-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="mb-0">Completed</h3>
      <div class="btn-group">
        <router-link class="btn btn-outline-secondary" to="/user/all">All</router-link>
        <router-link class="btn btn-outline-secondary" to="/user/upcoming">Upcoming</router-link>
        <router-link class="btn btn-outline-secondary" to="/user/completed">Completed</router-link>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-body">
        <input v-model.trim="keyword" class="form-control" placeholder="Search title, time, description..." />
      </div>
    </div>

    <div class="table-responsive">
      <table class="table align-middle">
        <thead>
          <tr>
            <th @click="toggleSort('title')" style="cursor:pointer">
              Title <i class="bi" :class="sortIcon('title')"></i>
            </th>
            <th @click="toggleSort('startAtMs')" style="cursor:pointer">
              Time <i class="bi" :class="sortIcon('startAtMs')"></i>
            </th>
            <th @click="toggleSort('avgRating')" style="cursor:pointer">
              Rating <i class="bi" :class="sortIcon('avgRating')"></i>
            </th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in paged" :key="a.__id">
            <td>{{ a.title }}</td>
            <td>{{ formatDateTime(a.startAtMs) }}</td>
            <td>
              <span v-if="(a.reviewCount ?? 0) > 0">
                {{ (a.avgRating ?? 0).toFixed(1) }} / 5 ({{ a.reviewCount }} people)
              </span>
              <span v-else class="text-muted">N/A</span>
            </td>
            <td>{{ a.description || '' }}</td>
            <td>
              <button class="btn btn-outline-primary btn-sm" @click="openReviewModal(a)">
                Review
              </button>
            </td>
          </tr>
          <tr v-if="!paged.length">
            <td colspan="5" class="text-center text-muted py-4">No records</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="d-flex align-items-center gap-2">
      <small class="text-muted">Showing {{ startIdx + 1 }} - {{ endIdx }} of {{ filtered.length }}</small>
      <div class="ms-auto btn-group">
        <button class="btn btn-outline-secondary btn-sm" :disabled="page===1" @click="page--">«</button>
        <span class="btn btn-sm btn-outline-secondary disabled">{{ page }}</span>
        <button class="btn btn-outline-secondary btn-sm" :disabled="endIdx>=filtered.length" @click="page++">»</button>
      </div>
    </div>
  </div>

  <div class="modal fade" id="reviewModal" tabindex="-1" aria-hidden="true" ref="reviewModalRef">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content" v-if="currentActivity">
        <div class="modal-header">
          <h5 class="modal-title">Review: {{ currentActivity.title }}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" />
        </div>
        <div class="modal-body">
          <div class="row">
            <div class="col-md-5 border-end">
              <h5>My Review</h5>
              <div v-if="msg" class="alert small" :class="ok ? 'alert-success' : 'alert-danger'">
                {{ msg }}
              </div>

              <div class="mb-2">
                <strong>Rating:</strong>
                <div class="btn-group btn-group-sm">
                  <button
                    v-for="n in 5"
                    :key="n"
                    class="btn"
                    :class="n <= myRating ? 'btn-warning' : 'btn-outline-secondary'"
                    @click="myRating = n"
                  >
                    ★
                  </button>
                </div>
              </div>

              <div class="mb-2">
                <label for="myComment" class="form-label"><strong>Comment:</strong></label>
                <textarea
                  v-model.trim="myComment"
                  id="myComment"
                  class="form-control"
                  rows="4"
                  placeholder="Write your comment..."
                ></textarea>
              </div>

              <div class="d-flex gap-2">
                <button class="btn btn-primary" :disabled="doing || !myRating" @click="submitReview">
                  <span v-if="doing" class="spinner-border spinner-border-sm me-1"></span>
                  {{ myReview ? 'Update' : 'Submit' }}
                </button>
                <button class="btn btn-outline-danger" v-if="myReview" :disabled="doing" @click="deleteReview">
                  <span v-if="doing" class="spinner-border spinner-border-sm me-1"></span>
                  Delete
                </button>
              </div>
            </div>

            <div class="col-md-7" style="max-height: 400px; overflow-y: auto;">
              <h5>
                All Reviews ({{ activityReviews.length }})
                <span v-if="averageRating" class="badge bg-warning text-dark ms-2">
                  Avg {{ averageRating }} / 5
                </span>
              </h5>
              <ul class="list-group list-group-flush" v-if="activityReviews.length">
                <li v-for="r in activityReviews" :key="r.id" class="list-group-item px-0">
                  <div class="d-flex w-100 justify-content-between">
                    <small class="text-muted">{{ r.userEmail || 'Anonymous' }}</small>
                    <small class="text-warning">
                      {{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5 - r.rating) }}
                    </small>
                  </div>
                  <p class="mb-1">{{ r.comment || '(No comment)' }}</p>
                  <small class="text-muted">{{ formatDateTime(r.createdAtMs) }}</small>
                </li>
              </ul>
              <p v-else class="text-muted text-center mt-3">No reviews</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import * as bootstrap from 'bootstrap'
import { db, auth } from '@/firebase'
import { collection, onSnapshot, orderBy, query, where, doc, setDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const activities = ref([])
const userUid = ref('')
const regAidSet = reactive(new Set())
const avgCache = reactive(new Map())

let unsubActs = null
let unsubRegs = null
let unsubAuth = null

function two(n){return String(n).padStart(2,'0')}
function formatDateTime(ms){
  if (!ms) return ''
  if (ms?.seconds) ms = ms.seconds * 1000
  const d = new Date(ms)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`
}
const nowMs = () => Date.now()
const isPast = a => (a.startAtMs || 0) < nowMs()
const isActiveStatus = s => ['registered','confirmed','approved'].includes(s)

function stopListeners() {
  if (unsubActs) unsubActs()
  if (unsubRegs) unsubRegs()
  unsubActs = unsubRegs = null
  activities.value = []
  regAidSet.clear()
  avgCache.clear()
}

onMounted(() => {
  unsubAuth = onAuthStateChanged(auth, (user) => {
    stopListeners()
    userUid.value = user?.uid || ''
    if (!userUid.value) return

    const qActs = query(collection(db, 'activities'), orderBy('createdAt', 'desc'))
    unsubActs = onSnapshot(qActs,
      (snap) => {
        activities.value = snap.docs.map(d => {
          const data = d.data()
          const ms = data.startAt?.seconds ? data.startAt.seconds * 1000 : (data.startAtMs || 0)
          return {
            __id: d.id,
            ...data,
            startAtMs: ms,
            avgRating: data.avgRating ?? null,
            reviewCount: data.reviewCount ?? null
          }
        })
      },
      (err) => console.error('activities listener error:', err)
    )

    const qRegs = query(
      collection(db, 'registrations'),
      where('userId', '==', userUid.value)
    )
    unsubRegs = onSnapshot(qRegs,
      (snap) => {
        regAidSet.clear()
        snap.forEach(docSnap => {
          const d = docSnap.data()
          if (isActiveStatus(d.status) && d.activityId) {
            regAidSet.add(d.activityId)
          }
        })
      },
      (err) => console.error('registrations listener error:', err)
    )
  })
})

onBeforeUnmount(() => {
  if (unsubAuth) unsubAuth()
  stopListeners()
})

const keyword = ref('')
const sortKey = ref('startAtMs')
const sortAsc = ref(false)
const page = ref(1)
const pageSize = 10

function toggleSort(k){ if (sortKey.value===k) sortAsc.value=!sortAsc.value; else{ sortKey.value=k; sortAsc.value=true } }
function sortIcon(k){ return sortKey.value===k ? (sortAsc.value?'bi-caret-up-fill ms-1':'bi-caret-down-fill ms-1') : '' }

const completedMine = computed(() => {
  const set = regAidSet
  return activities.value
    .filter(a => set.has(a.__id) && isPast(a))
    .map(a => {
      const cached = avgCache.get(a.__id)
      if (cached) return { ...a, ...cached }
      if ((a.avgRating == null || a.reviewCount == null) && !avgCache.has(a.__id)) {
        ensureSummary(a.__id)
      }
      return a
    })
})

const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return completedMine.value
  return completedMine.value.filter(a =>
    (a.title||'').toLowerCase().includes(k)
    || (a.description||'').toLowerCase().includes(k)
    || formatDateTime(a.startAtMs).toLowerCase().includes(k)
  )
})

const sorted = computed(() => {
  const arr = [...filtered.value]
  arr.sort((a,b)=>{
    let ka = a[sortKey.value], kb = b[sortKey.value]
    if (sortKey.value === 'avgRating') {
      ka = a.avgRating ?? 0
      kb = b.avgRating ?? 0
    }
    const r = ka===kb?0:(ka>kb?1:-1)
    return sortAsc.value ? r : -r
  })
  return arr
})

const startIdx = computed(()=> (page.value-1)*pageSize)
const endIdx = computed(()=> Math.min(startIdx.value+pageSize, sorted.value.length))
const paged = computed(()=> sorted.value.slice(startIdx.value, endIdx.value))

watch([keyword, sortKey, sortAsc], () => { page.value = 1 })

async function ensureSummary(aid){
  try {
    if (avgCache.has(aid)) return
    const qRev = query(collection(db, 'reviews'), where('activityId', '==', aid))
    const snap = await getDocs(qRev)
    let sum = 0, count = 0
    snap.forEach(docSnap => {
      const r = docSnap.data()
      if (typeof r.rating === 'number') {
        sum += r.rating
        count += 1
      }
    })
    const avg = count ? (sum / count) : 0
    avgCache.set(aid, { avgRating: avg, reviewCount: count })
  } catch (e) {
    console.error('ensureSummary error:', e)
  }
}

const reviewModalRef = ref(null)
const currentActivity = ref(null)
const activityReviews = ref([])
const myRating = ref(0)
const myComment = ref('')
const doing = ref(false)
const msg = ref('')
const ok = ref(false)

let modalInstance = null
let unsubReviews = null

onMounted(() => {
  if (reviewModalRef.value) {
    modalInstance = new bootstrap.Modal(reviewModalRef.value)
    reviewModalRef.value.addEventListener('hidden.bs.modal', () => {
      if (unsubReviews) { unsubReviews(); unsubReviews = null }
      currentActivity.value = null
      activityReviews.value = []
      msg.value = ''; ok.value = false
    })
  }
})

function openReviewModal(activity) {
  currentActivity.value = activity
  myRating.value = 0
  myComment.value = ''
  msg.value = ''; ok.value = false

  if (unsubReviews) { unsubReviews(); unsubReviews = null }

  const qReviews = query(
    collection(db, 'reviews'),
    where('activityId', '==', activity.__id),
    orderBy('createdAt', 'desc')
  )
  unsubReviews = onSnapshot(qReviews,
    (snap) => {
      activityReviews.value = snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          ...data,
          createdAtMs: data.createdAt?.seconds ? data.createdAt.seconds * 1000 : Date.now()
        }
      })
      const mine = myReview.value
      if (mine) {
        myRating.value = mine.rating
        myComment.value = mine.comment
      }
      let sum = 0
      for (const r of activityReviews.value) if (typeof r.rating === 'number') sum += r.rating
      const count = activityReviews.value.length
      avgCache.set(activity.__id, { avgRating: count ? sum / count : 0, reviewCount: count })
    },
    (err) => console.error('reviews listener error:', err)
  )

  modalInstance?.show()
}

const myReview = computed(() => {
  if (!userUid.value) return null
  return activityReviews.value.find(r => r.userId === userUid.value) || null
})

const averageRating = computed(() => {
  if (!activityReviews.value.length) return null
  const sum = activityReviews.value.reduce((acc, r) => acc + (r.rating || 0), 0)
  return (sum / activityReviews.value.length).toFixed(1)
})

async function submitReview() {
  if (!userUid.value || !currentActivity.value || !myRating.value) return
  doing.value = true; msg.value = ''; ok.value = false
  try {
    const uid = userUid.value
    const aid = currentActivity.value.__id
    const reviewId = `${uid}_${aid}`
    const reviewRef = doc(db, 'reviews', reviewId)
    await setDoc(reviewRef, {
      activityId: aid,
      userId: uid,
      userEmail: auth.currentUser?.email || '',
      rating: myRating.value,
      comment: myComment.value || '',
      createdAt: serverTimestamp()
    }, { merge: true })
    msg.value = 'Review submitted'; ok.value = true
  } catch (e) {
    msg.value = 'Submission failed: ' + (e?.message || e); ok.value = false
  } finally {
    doing.value = false
  }
}

async function deleteReview() {
  if (!userUid.value || !currentActivity.value) return
  if (!confirm('Are you sure you want to delete your review?')) return
  doing.value = true; msg.value = ''; ok.value = false
  try {
    const uid = userUid.value
    const aid = currentActivity.value.__id
    const reviewId = `${uid}_${aid}`
    const reviewRef = doc(db, 'reviews', reviewId)
    await deleteDoc(reviewRef)
    msg.value = 'Deleted successfully'; ok.value = true
    myRating.value = 0
    myComment.value = ''
  } catch (e) {
    msg.value = 'Delete failed: ' + (e?.message || e); ok.value = false
  } finally {
    doing.value = false
  }
}
</script>
