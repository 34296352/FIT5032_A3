<template>
  <div class="container my-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="mb-0">All Activities</h3>
      <div class="btn-group">
        <router-link class="btn btn-outline-secondary" to="/user/all">All</router-link>
        <router-link class="btn btn-outline-secondary" to="/user/upcoming">Upcoming</router-link>
        <router-link class="btn btn-outline-secondary" to="/user/completed">Completed</router-link>
      </div>
    </div>

    <div class="card mb-3">
      <div class="card-body">
        <input v-model.trim="keyword" class="form-control" placeholder="Search by title, time, description, or status..." />
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
            <th>Status</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in paged" :key="a.__id" :class="rowClass(a)">
            <td>
              <button class="btn btn-link p-0 text-decoration-none" :disabled="isPast(a)" @click="openModal(a)">
                {{ a.title }}
              </button>
            </td>
            <td>{{ formatDateTime(a.startAtMs) }}</td>
            <td><span :class="badgeClass(a)">{{ badgeText(a) }}</span></td>
            <td>{{ a.description || '' }}</td>
          </tr>
          <tr v-if="!paged.length">
            <td colspan="4" class="text-center text-muted py-4">No activities</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="d-flex align-items-center gap-2">
      <small class="text-muted">Items {{ startIdx + 1 }} - {{ endIdx }} of {{ filtered.length }}</small>
      <div class="ms-auto btn-group">
        <button class="btn btn-outline-secondary btn-sm" :disabled="page===1" @click="page--">«</button>
        <span class="btn btn-sm btn-outline-secondary disabled">{{ page }}</span>
        <button class="btn btn-outline-secondary btn-sm" :disabled="endIdx>=filtered.length" @click="page++">»</button>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-header d-flex align-items-center justify-content-between">
        <span>My Schedule Calendar</span>
        <small class="text-muted">Shows activities you've registered for; conflicts are checked when registering</small>
      </div>
      <div class="card-body">
        <div ref="calendarEl" class="fc-wrap"></div>
        <div class="small text-muted mt-2">
          <template v-if="myEvents.length">Total {{ myEvents.length }} registered activities.</template>
          <template v-else>No registered activities.</template>
        </div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-header d-flex align-items-center justify-content-between">
        <span>Nearby Activities Map</span>
        <small class="text-muted">Only activities with location are shown</small>
      </div>
      <div class="card-body">
        <div ref="mapEl" class="gm-map rounded"></div>
        <div class="small text-muted mt-2">
          <template v-if="mapStats.total > 0">
            {{ mapStats.total }} activities with location have been marked on the map.
          </template>
          <template v-else>
            No activities with location.
          </template>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="actModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content" v-if="current">
        <div class="modal-header">
          <h5 class="modal-title">{{ current.title }}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" />
        </div>
        <div class="modal-body">
          <div class="mb-2"><strong>Time:</strong> {{ formatDateTime(current.startAtMs) }}</div>
          <div class="mb-2"><strong>Description:</strong> {{ current.description || '(None)' }}</div>
          <div class="mb-2">
            <strong>Current status:</strong>
            <span :class="badgeClass(current)">{{ badgeText(current) }}</span>
          </div>

          <div v-if="msg" class="alert" :class="ok? 'alert-success':'alert-danger'">{{ msg }}</div>
        </div>
        <div class="modal-footer">
          <button
            class="btn btn-primary"
            :disabled="doing || isPast(current) || isRegistered(current.__id)"
            @click="register(current.__id)"
          >
            <span v-if="doing" class="spinner-border spinner-border-sm me-1"></span>Register
          </button>
          <button
            class="btn btn-outline-danger"
            :disabled="doing || !isRegistered(current.__id)"
            @click="cancel(current.__id)"
          >
            <span v-if="doing" class="spinner-border spinner-border-sm me-1"></span>Cancel registration
          </button>
          <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as bootstrap from 'bootstrap'
import { db, auth } from '@/firebase'
import {
  collection, onSnapshot, orderBy, query, where,
  doc, setDoc, deleteDoc, serverTimestamp, getDocs
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

const activities = ref([])
let unsubActs = null
onMounted(() => {
  const qActs = query(collection(db, 'activities'), orderBy('createdAt', 'desc'))
  unsubActs = onSnapshot(qActs, (snap) => {
    activities.value = snap.docs.map(d => {
      const data = d.data()
      const ms = data.startAt?.seconds ? data.startAt.seconds * 1000 : (data.startAtMs || 0)
      const durationMin = Number.isFinite(Number(data.durationMinutes)) ? Number(data.durationMinutes) : 60
      const endMs = Number.isFinite(Number(data.endAtMs)) ? Number(data.endAtMs) : (ms ? (ms + durationMin * 60 * 1000) : 0)
      return { __id: d.id, ...data, startAtMs: ms, endAtMs: endMs }
    })
    rebuildCalendar()
  })
})
onBeforeUnmount(() => unsubActs?.())

const regMap = reactive({})
const userUid = ref('')
let unsubAuth = null
let unsubRegs = null

function stopRegListener() {
  if (unsubRegs) { unsubRegs(); unsubRegs = null }
  Object.keys(regMap).forEach(key => delete regMap[key])
}

onMounted(() => {
  unsubAuth = onAuthStateChanged(auth, (u) => {
    userUid.value = u?.uid || ''
    stopRegListener()
    if (userUid.value) {
      const qRegs = query(collection(db, 'registrations'), where('userId', '==', userUid.value))
      unsubRegs = onSnapshot(qRegs, (snap) => {
        const newAidMap = new Map()
        snap.docs.forEach(d => {
          const data = d.data()
          const aid = data.activityId
          if (aid) newAidMap.set(aid, { status: data.status, id: d.id })
        })
        Object.keys(regMap).forEach(aid => { if (!newAidMap.has(aid)) delete regMap[aid] })
        for (const [aid, data] of newAidMap.entries()) regMap[aid] = data
        rebuildCalendar()
      })
    } else {
      rebuildCalendar()
    }
  })
})
onBeforeUnmount(() => { stopRegListener(); if (unsubAuth) unsubAuth() })

const keyword = ref('')
const sortKey = ref('startAtMs')
const sortAsc = ref(false)
const page = ref(1)
const pageSize = 10
function toggleSort(k){ if (sortKey.value===k) sortAsc.value=!sortAsc.value; else{ sortKey.value=k; sortAsc.value=true } }
function sortIcon(k){ return sortKey.value===k ? (sortAsc.value?'bi-caret-up-fill ms-1':'bi-caret-down-fill ms-1') : '' }

const nowMs = () => Date.now()
const isPast = (a) => (a.startAtMs || 0) < nowMs()
const isActive = s => s==='registered'||s==='confirmed'||s==='approved'
const isRegistered = (aid) => isActive(regMap[aid]?.status)

function badgeText(a){
  if (isRegistered(a.__id)) return isPast(a) ? 'Completed' : 'Registered'
  return isPast(a) ? 'Expired' : 'Not Registered'
}
function badgeClass(a){
  const t = badgeText(a)
  if (t === 'Registered') return 'badge bg-primary'
  if (t === 'Completed') return 'badge bg-success'
  if (t === 'Expired') return 'badge bg-secondary'
  return 'badge bg-outline-secondary text-muted border'
}
function rowClass(a){ return isPast(a) ? 'disabled-row' : '' }
const myEvents = computed(() => myRegisteredActivities());
const enriched = computed(() => activities.value)
const filtered = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  if (!k) return enriched.value
  return enriched.value.filter(a =>
    (a.title||'').toLowerCase().includes(k)
    || (a.description||'').toLowerCase().includes(k)
    || formatDateTime(a.startAtMs).toLowerCase().includes(k)
    || badgeText(a).toLowerCase().includes(k)
  )
})
const sorted = computed(() => {
  const arr=[...filtered.value]
  arr.sort((a,b)=>{
    const ka=a[sortKey.value], kb=b[sortKey.value]
    const r = ka===kb?0:(ka>kb?1:-1)
    return sortAsc.value ? r : -r
  })
  return arr
})
const startIdx=computed(()=> (page.value-1)*pageSize)
const endIdx=computed(()=> Math.min(startIdx.value+pageSize, sorted.value.length))
const paged = computed(()=> sorted.value.slice(startIdx.value, endIdx.value))

const current = ref(null)
const doing = ref(false)
const msg = ref('')
const ok = ref(false)
function openModal(a){
  current.value = a
  msg.value = ''; ok.value=false
  const el = document.getElementById('actModal')
  bootstrap.Modal.getOrCreateInstance(el).show()
}

function actInterval(a) {
  const start = Number(a.startAtMs || 0)
  let end = Number(a.endAtMs || 0)
  if (!end && start) {
    const durMin = Number.isFinite(Number(a.durationMinutes)) ? Number(a.durationMinutes) : 60
    end = start + durMin * 60 * 1000
  }
  return [start, end]
}
function overlap(a1, a2) {
  const [s1, e1] = a1, [s2, e2] = a2
  if (!s1 || !e1 || !s2 || !e2) return false
  return s1 < e2 && e1 > s2
}
function conflictsWithMyEvents(aid) {
  const target = activities.value.find(x => x.__id === aid)
  if (!target) return false
  const tInt = actInterval(target)
  const myAids = Object.keys(regMap).filter(id => isActive(regMap[id]?.status))
  for (const mid of myAids) {
    if (mid === aid) continue
    const other = activities.value.find(x => x.__id === mid)
    if (!other) continue
    const oInt = actInterval(other)
    if (overlap(tInt, oInt)) return true
  }
  return false
}

async function register(aid) {
  if (!auth.currentUser) return alert('Please sign in first')
  if (!aid) return
  if (isRegistered(aid)) return

  if (conflictsWithMyEvents(aid)) {
    msg.value = 'Time conflict: you have already registered another activity during this time.'
    ok.value = false
    return
  }

  try {
    doing.value = true; msg.value = ''; ok.value = false
    const uid = auth.currentUser.uid
    const qRegs = query(collection(db, 'registrations'), where('userId', '==', uid))
    const snap = await getDocs(qRegs)
    const myRegAids = snap.docs
      .map(d => d.data())
      .filter(r => isActive((r.status || '').toLowerCase()))
      .map(r => r.activityId)
      .filter(Boolean)

    const target = activities.value.find(x => x.__id === aid)
    const tInt = actInterval(target)

    for (const mid of myRegAids) {
      if (mid === aid) { msg.value = 'You have already registered this activity'; doing.value=false; return }
      const other = activities.value.find(x => x.__id === mid)
      if (!other) continue
      if (overlap(tInt, actInterval(other))) {
        msg.value = 'Time conflict: you have already registered another activity during this time.'
        doing.value = false
        return
      }
    }

    const regId = `${uid}_${aid}`
    const regRef = doc(db, 'registrations', regId)
    await setDoc(regRef, {
      userId: uid,
      activityId: aid,
      userEmail: auth.currentUser.email || '',
      status: 'registered',
      createdAt: serverTimestamp(),
    }, { merge: true })

    regMap[aid] = { status: 'registered', id: regId }
    msg.value = 'Registered successfully'; ok.value = true
  } catch (e) {
    msg.value = 'Registration failed: ' + (e?.message || e)
    ok.value = false
  } finally {
    doing.value = false
    rebuildCalendar()
  }
}

async function cancel(aid) {
  if (!auth.currentUser) return alert('Please sign in first')
  if (!aid) return
  if (!isRegistered(aid)) return
  doing.value = true; msg.value = ''; ok.value = false

  try {
    const uid = auth.currentUser.uid
    const regId = `${uid}_${aid}`
    const regRef = doc(db, 'registrations', regId)
    await deleteDoc(regRef)
    delete regMap[aid]
    msg.value = 'Cancelled successfully'; ok.value = true
  } catch (e) {
    msg.value = 'Cancellation failed: ' + (e?.message || e)
    ok.value = false
  } finally {
    doing.value = false
    rebuildCalendar()
  }
}

const calendarEl = ref(null)
let calendar = null

function loadFullCalendar() {
  if (window.FullCalendar) return Promise.resolve()
  if (!document.getElementById('fc-style')) {
    const link = document.createElement('link')
    link.id = 'fc-style'
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.css'
    document.head.appendChild(link)
  }
  return new Promise((resolve, reject) => {
    const existed = document.getElementById('fc-script')
    if (existed) { resolve(); return }
    const s = document.createElement('script')
    s.id = 'fc-script'
    s.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js'
    s.onload = () => resolve()
    s.onerror = (e) => reject(e)
    document.head.appendChild(s)
  })
}

function myRegisteredActivities() {
  const ids = Object.keys(regMap).filter(id => isActive(regMap[id]?.status))
  return activities.value.filter(a => ids.includes(a.__id))
}

function toFcEvents(list) {
  return list
    .filter(a => a.startAtMs)
    .map(a => {
      const [start, end] = actInterval(a)
      return {
        id: a.__id,
        title: a.title || '(Untitled)',
        start: new Date(start).toISOString(),
        end: end ? new Date(end).toISOString() : null,
        allDay: false
      }
    })
}

async function ensureCalendar() {
  await loadFullCalendar()
  await nextTick()
  if (!calendar && calendarEl.value && window.FullCalendar) {
    const { Calendar } = window.FullCalendar
    calendar = new Calendar(calendarEl.value, {
      initialView: 'timeGridWeek',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridDay,timeGridWeek,dayGridMonth'
      },
      firstDay: 1,
      slotMinTime: '06:00:00',
      slotMaxTime: '23:00:00',
      height: 520,
      selectable: false,
      editable: false,
      nowIndicator: true,
      events: []
    })
    calendar.render()
  }
  rebuildCalendar()
}
function rebuildCalendar() {
  if (!calendar) return
  const events = toFcEvents(myRegisteredActivities())
  calendar.removeAllEvents()
  calendar.addEventSource(events)
}

onMounted(() => { ensureCalendar() })

const mapEl = ref(null)
const mapsReady = ref(false)
let map = null
let infoWindow = null
let markers = []
const mapStats = reactive({ total: 0 })

function loadGoogleMaps() {
  if (window.google?.maps) { mapsReady.value = true; return Promise.resolve() }
  if (!GMAPS_KEY) { console.warn('Missing VITE_GOOGLE_MAPS_API_KEY'); return Promise.resolve() }
  return new Promise((resolve, reject) => {
    const id = 'gmaps-script'
    if (document.getElementById(id)) { resolve(); return }
    const s = document.createElement('script')
    s.id = id
    s.async = true
    s.defer = true
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GMAPS_KEY)}&libraries=places`
    s.onload = () => resolve()
    s.onerror = (e) => reject(e)
    document.head.appendChild(s)
  }).then(() => { mapsReady.value = true })
}
function createRedIcon() { return undefined }
function clearMarkers() { for (const m of markers) { try { m.marker.setMap(null) } catch(e){} } markers = [] }
function hasLatLng(a) {
  const loc = a?.location
  const lat = Number(loc?.lat), lng = Number(loc?.lng)
  return Number.isFinite(lat) && Number.isFinite(lng)
}
function activityLatLng(a) { return { lat: Number(a.location.lat), lng: Number(a.location.lng) } }
function markerHtml(a) {
  const title = a.title || '(Untitled)'
  const when = formatDateTime(a.startAtMs)
  const addr = a.location?.address || ''
  return `
    <div style="min-width:240px">
      <div style="font-weight:600;margin-bottom:4px;">${escapeHtml(title)}</div>
      <div style="font-size:12px;color:#6c757d;">${escapeHtml(when)}</div>
      ${addr ? `<div style="margin-top:6px;">${escapeHtml(addr)}</div>` : ''}
      <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
        <button id="gm_open_${a.__id}" class="btn btn-sm btn-outline-primary">View</button>
        <button id="gm_nav_${a.__id}" class="btn btn-sm btn-danger">Navigate here</button>
      </div>
    </div>
  `
}
function escapeHtml(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }
function navigateToActivity(a) {
  if (!hasLatLng(a)) return
  const dest = `${a.location.lat},${a.location.lng}`
  const travelMode = 'walking'
  if (navigator.geolocation) {
    const opt = { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {}
        const origin = (Number.isFinite(latitude) && Number.isFinite(longitude)) ? `${latitude},${longitude}` : ''
        const url = origin
          ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=${travelMode}`
          : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=${travelMode}`
        window.open(url, '_blank')
      },
      () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=${travelMode}`
        window.open(url, '_blank')
      },
      opt
    )
  } else {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=walking`
    window.open(url, '_blank')
  }
}
function rebuildMapMarkers() {
  if (!map) return
  clearMarkers()
  const withLoc = activities.value.filter(a => hasLatLng(a))
  mapStats.total = withLoc.length
  if (!withLoc.length) {
    map.setCenter({ lat: -37.8136, lng: 144.9631 })
    map.setZoom(12)
    return
  }
  const bounds = new window.google.maps.LatLngBounds()
  const icon = createRedIcon()
  for (const a of withLoc) {
    const pos = activityLatLng(a)
    const marker = new window.google.maps.Marker({
      position: pos, map, title: a.title || '', ...(icon ? { icon } : {})
    })
    marker.addListener('click', () => {
      const html = markerHtml(a)
      infoWindow.setContent(html)
      infoWindow.open({ map, anchor: marker })
      nextTick(() => {
        const btnView = document.getElementById(`gm_open_${a.__id}`)
        if (btnView) btnView.onclick = () => openModal(a)
        const btnNav = document.getElementById(`gm_nav_${a.__id}`)
        if (btnNav) btnNav.onclick = () => navigateToActivity(a)
      })
    })
    markers.push({ marker, aid: a.__id })
    bounds.extend(pos)
  }
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds)
    const listener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      if (map.getZoom() > 16) map.setZoom(16)
    })
    setTimeout(() => window.google.maps.event.removeListener(listener), 300)
  }
}
async function ensureMap() {
  await loadGoogleMaps()
  await nextTick()
  if (!map && mapEl.value && window.google?.maps) {
    map = new window.google.maps.Map(mapEl.value, {
      center: { lat: -37.8136, lng: 144.9631 },
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    })
    infoWindow = new window.google.maps.InfoWindow()
  }
  rebuildMapMarkers()
}
watch(activities, () => { if (window.google?.maps) rebuildMapMarkers() }, { deep: true })
onMounted(() => { ensureCalendar(); ensureMap() })

function two(n){return String(n).padStart(2,'0')}
function formatDateTime(ms){
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`
}
watch([keyword, sortKey, sortAsc], () => { page.value = 1 })
</script>

<style scoped>
.badge.bg-outline-secondary { background: transparent; border: 1px solid #ced4da; }
.disabled-row { opacity: .55; pointer-events: none; }
.gm-map {
  width: 100%;
  height: 380px;
  background: #e9ecef;
}
.fc-wrap {
  width: 100%;
  min-height: 520px;
}
</style>
