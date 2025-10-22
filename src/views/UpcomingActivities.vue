<template>
  <div class="container my-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="mb-0">Upcoming Activities</h3>
      <router-link to="/home" class="btn btn-outline-secondary">Back to User</router-link>
    </div>

    <div class="card mb-3">
      <div class="card-header">Activity List (Sortable / Searchable / Paged)</div>
      <div class="card-body">
        <input v-model.trim="keyword" class="form-control" placeholder="Search title, date, status or description..." />
      </div>
    </div>

    <div class="table-responsive">
      <table class="table align-middle">
        <thead>
          <tr>
            <th @click="toggleSort('title')" style="cursor:pointer">Title <i class="bi" :class="sortIcon('title')"></i></th>
            <th @click="toggleSort('startAtMs')" style="cursor:pointer">Date &amp; Time <i class="bi" :class="sortIcon('startAtMs')"></i></th>
            <th @click="toggleSort('statusText')" style="cursor:pointer">Registration Status <i class="bi" :class="sortIcon('statusText')"></i></th>
            <th @click="toggleSort('description')" style="cursor:pointer">Description <i class="bi" :class="sortIcon('description')"></i></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="act in paged" :key="act.__id">
            <td><button class="btn btn-link p-0 text-decoration-none" @click="openModal(act)">{{ act.title }}</button></td>
            <td>{{ formatDateTime(act) }}</td>
            <td><span :class="statusBadgeClass(regMap[act.__id]?.status)">{{ statusText(regMap[act.__id]?.status) }}</span></td>
            <td>{{ act.description || '' }}</td>
          </tr>
          <tr v-if="!paged.length">
            <td colspan="4" class="text-center text-muted py-4">No activities</td>
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

  <div class="modal fade" id="activityModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content" v-if="current">
        <div class="modal-header">
          <h5 class="modal-title">{{ current.title }}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" />
        </div>
        <div class="modal-body">
          <div class="mb-2"><strong>Time: </strong>{{ formatDateTime(current) }}</div>
          <div class="mb-2"><strong>Description: </strong>{{ current.description || '(No description)' }}</div>
          <div class="mb-2">
            <strong>Current Status: </strong>
            <span :class="statusBadgeClass(regMap[current.__id]?.status)">
              {{ statusText(regMap[current.__id]?.status) }}
            </span>
          </div>
          <div v-if="actionMsg" class="alert" :class="actionOk ? 'alert-success' : 'alert-danger'">
            {{ actionMsg }}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" :disabled="doing || isRegistered(current.__id)" @click="doRegister(current.__id)">
            <span v-if="doing" class="spinner-border spinner-border-sm me-1"></span>Register
          </button>
          <button class="btn btn-outline-danger" :disabled="doing || !isRegistered(current.__id)" @click="doCancel(current.__id)">
            <span v-if="doing" class="spinner-border spinner-border-sm me-1"></span>Cancel
          </button>
          <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import * as bootstrap from 'bootstrap'
import { db, auth } from '@/firebase'
import {
  collection, onSnapshot, orderBy, query, where,
  doc, setDoc, deleteDoc, serverTimestamp, runTransaction, increment
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const activities = ref([])
let unsubActs = null
onMounted(() => {
  const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'))
  unsubActs = onSnapshot(q, (snap) => {
    activities.value = snap.docs.map(d => ({ __id: d.id, ...d.data() }))
  })
})
onBeforeUnmount(() => unsubActs?.())

const regMap = reactive({})
const userUid = ref('')
let unsubAuth = null
let unsubRegs = null

function stopRegListener() {
  if (unsubRegs) unsubRegs()
  unsubRegs = null
  Object.keys(regMap).forEach(key => delete regMap[key])
}

onMounted(()=>{
  unsubAuth = onAuthStateChanged(auth, (u)=>{
    userUid.value = u?.uid || ''
    stopRegListener()
    if (userUid.value) {
      const q = query(collection(db, 'registrations'), where('userId', '==', userUid.value))
      unsubRegs = onSnapshot(q, (snap) => {
        const newMap = {}
        snap.docs.forEach(d => {
          const data = d.data()
          if (data.activityId) {
            newMap[data.activityId] = { status: data.status, id: d.id }
          }
        })
        Object.keys(regMap).forEach(k => {
          if (!newMap[k]) delete regMap[k]
        })
        Object.assign(regMap, newMap)
      })
    }
  })
})

onBeforeUnmount(()=>{
  if (unsubActs) unsubActs()
  stopRegListener()
  if (unsubAuth) unsubAuth()
})

const keyword = ref('')
const page = ref(1), pageSize = 10
const sortKey = ref('createdAt'), sortAsc = ref(true)
function toggleSort(k){ if (sortKey.value===k) sortAsc.value=!sortAsc.value; else{ sortKey.value=k; sortAsc.value=true } }
function sortIcon(k){ if (sortKey.value!==k) return ''; return sortAsc.value?'bi-caret-up-fill ms-1':'bi-caret-down-fill ms-1' }

const nowMs = () => Date.now()
const isActive = s => s==='registered'||s==='confirmed'||s==='approved'
const isRegistered = aid => isActive(regMap[aid]?.status)

const enriched = computed(() =>
  activities.value
    .map(a => ({ ...a, startAtMs: a.startAt?.seconds ? a.startAt.seconds*1000 : (a.startAtMs||0) }))
    .filter(a => isRegistered(a.__id) && (a.startAtMs||0) >= nowMs())
)
const filtered = computed(()=>{
  const k = keyword.value.trim().toLowerCase()
  if(!k) return enriched.value
  return enriched.value.filter(a =>
    (a.title||'').toLowerCase().includes(k)
    || formatDateTime(a).toLowerCase().includes(k)
    || (a.description||'').toLowerCase().includes(k)
  )
})
const sorted = computed(()=>{
  const arr=[...filtered.value]
  arr.sort((a,b)=>{ const ka=a[sortKey.value], kb=b[sortKey.value]; if(ka===kb) return 0; const r=ka>kb?1:-1; return sortAsc.value?r:-r })
  return arr
})
const startIdx = computed(()=> (page.value-1)*pageSize)
const endIdx   = computed(()=> Math.min(startIdx.value+pageSize, sorted.value.length))
const paged    = computed(()=> sorted.value.slice(startIdx.value, endIdx.value))

const current = ref(null), actionMsg = ref(''), actionOk = ref(false), doing = ref(false)
function openModal(act){ current.value = act; actionMsg.value=''; actionOk.value=false; bootstrap.Modal.getOrCreateInstance(document.getElementById('activityModal')).show() }

async function doRegister(aid) {
  if (!auth.currentUser) {
    alert('Please sign in first');
    return;
  }

  doing.value = true;
  actionMsg.value = '';
  actionOk.value = false;

  try {
    const uid = auth.currentUser.uid;
    const regId = `${uid}_${aid}`; 
    const regRef = doc(db, 'registrations', regId);

    
    await setDoc(regRef, {
      userId: uid,
      userEmail: auth.currentUser.email || '',
      activityId: aid,
      status: 'registered',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    
    regMap[aid] = { status: 'registered', id: regId };

    actionMsg.value = 'Registration successful';
    actionOk.value = true;
  } catch (e) {
    console.error('Registration error:', e);
    delete regMap[aid];
    actionMsg.value = 'Registration failed: ' + (e?.message || e);
    actionOk.value = false;
  } finally {
    doing.value = false;
  }
}
async function doCancel(aid) {
  if (!auth.currentUser) {
    alert('Please sign in first');
    return;
  }

  doing.value = true;
  actionMsg.value = '';
  actionOk.value = false;

  try {
    const uid = auth.currentUser.uid;
    const regId = `${uid}_${aid}`;
    const regRef = doc(db, 'registrations', regId);

    
    await deleteDoc(regRef);

    
    delete regMap[aid];

    actionMsg.value = 'Unregistered successfully';
    actionOk.value = true;
  } catch (e) {
    console.error('Cancel error:', e);
    actionMsg.value = 'Cancel failed: ' + (e?.message || e);
    actionOk.value = false;
  } finally {
    doing.value = false;
  }
}


function two(n){return String(n).padStart(2,'0')}
function formatDateTime(a){
  const ms = a.startAt?.seconds ? a.startAt.seconds*1000 : (a.startAtMs||0)
  if(!ms) return ''
  const d=new Date(ms)
  return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`
}
function statusText(s){ if(isActive(s)) return 'Registered'; if(s==='cancelled') return 'Cancelled'; return 'Not Registered' }
function statusBadgeClass(s){ const t=statusText(s); if(t==='Registered') return 'badge bg-success'; if(t==='Cancelled') return 'badge bg-secondary'; return 'badge bg-outline-secondary text-muted border' }
watch([keyword, sortKey, sortAsc], ()=>{ page.value=1 })
</script>

<style scoped>
.badge.bg-outline-secondary { background-color: transparent; border: 1px solid #ced4da; }
</style>
