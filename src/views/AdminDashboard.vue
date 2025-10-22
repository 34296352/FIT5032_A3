<!-- src/views/AdminDashboard.vue -->
<template>
  <div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="h3 mb-0">Admin Dashboard</h1>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary" @click="exportActivitiesCsv">Export Activities CSV</button>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-12 col-md-12">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="text-muted small">Total Registered Users</div>
                <div class="fs-4 fw-semibold">{{ totalUsers }}</div>
              </div>
              <i class="bi bi-person-check fs-3 text-secondary"></i>
            </div>
            <div class="text-muted small mt-2">Data source: firebase</div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4 mb-4">
      <div class="col-12 col-lg-8">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>Activity Management</span>
            <button class="btn btn-sm btn-primary" @click="showAddModal">Add Activity</button>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table align-middle">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Start Time</th>
                    <th>Created By</th>
                    <th>Participants</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="act in activities" :key="act.__id">
                    <td>{{ act.title }}</td>
                    <td>{{ formatStartAt(act) }}</td>
                    <td>{{ act.createdByName || 'Admin' }}</td>
                    <td>{{ participantsCountMap[act.__id] ?? act.reservedCount ?? 0 }}</td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-danger" @click="onDelete(act)">Delete</button>
                        <button class="btn btn-outline-primary" @click="openRatingsChart(act.__id, act.title)">Ratings Chart</button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!activities.length">
                    <td colspan="5" class="text-center text-muted py-4">No activities</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted">Total {{ activities.length }} records</small>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-4">
        <div class="card h-100">
          <div class="card-header">File Upload</div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">Choose File</label>
              <input type="file" class="form-control" @change="onFileChange" />
            </div>
            <button class="btn btn-success w-100" :disabled="!file || uploading" @click="onUpload">
              {{ uploading ? 'Uploading…' : 'Upload' }}
            </button>
            <div v-if="uploadHint" class="text-muted small mt-2">{{ uploadHint }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-12 col-lg-6">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>Send Single Email</span>
          </div>

          <form ref="singleFormEl" @submit.prevent="sendSingleForm">
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label">Select Recipient (from users)</label>
                <select v-model="single.to" class="form-select" required>
                  <option value="" disabled>Please select a normal user</option>
                  <option v-for="u in usersFiltered" :key="u.id" :value="u.email">
                    {{ u.email }}
                  </option>
                </select>
                <small class="text-muted">Loaded {{ usersFiltered.length }} normal users</small>
              </div>

              <div class="mb-3">
                <label class="form-label">Subject</label>
                <input name="subject" v-model.trim="single.subject" type="text" class="form-control" placeholder="Email subject" required />
              </div>

              <div class="mb-3">
                <label class="form-label">Message</label>
                <textarea name="message" v-model.trim="single.message" rows="5" class="form-control" placeholder="Email content" required />
              </div>

              <div class="mb-3">
                <label class="form-label">Attachments (multiple)</label>
                <input class="form-control" name="attachments" type="file" multiple @change="onSingleFilesChange" />
                <div v-if="pickedSingleFiles.length" class="form-text">
                  Selected {{ pickedSingleFiles.length }} files:
                  <span v-for="f in pickedSingleFiles" :key="f.name" class="d-inline-block me-2">{{ f.name }}</span>
                </div>
                <div v-if="singleSizeWarn" class="text-danger small mt-1">{{ singleSizeWarn }}</div>
              </div>

              <input type="hidden" name="to_email" :value="single.to" />
              <input type="hidden" name="reply_to" :value="replyTo" />

              <div class="small mt-2" :class="single.feedback.startsWith('Sent') ? 'text-success' : 'text-danger'">
                {{ single.feedback }}
              </div>
              <div class="small text-danger mt-1" v-if="emailJsMissing">{{ emailJsMissing }}</div>
            </div>

            <div class="card-footer d-flex gap-2">
              <button class="btn btn-primary" type="submit" :disabled="single.sending">
                <span v-if="single.sending" class="spinner-border spinner-border-sm me-1" />
                {{ single.sending ? 'Sending…' : 'Send' }}
              </button>
              <button class="btn btn-outline-secondary" type="button" @click="resetSingleForm" :disabled="single.sending">Reset</button>
            </div>
          </form>
        </div>
      </div>

      <div class="col-12 col-lg-6">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <span>Bulk Email</span>
            </div>
            <div class="d-flex align-items-center gap-2">
              <input
                v-model.trim="userFilterKey"
                class="form-control form-control-sm"
                style="width:220px"
                placeholder="Search user email"
              />
              <button class="btn btn-sm btn-outline-secondary" @click="toggleSelectAll">
                {{ allFilteredSelected ? 'Unselect all' : 'Select all (current list)' }}
              </button>
            </div>
          </div>

          <form ref="bulkFormEl" @submit.prevent="sendBulkForm">
            <div class="card-body">
              <div class="mb-3">
                <div class="user-pills">
                  <label
                    v-for="u in usersFiltered"
                    :key="u.id"
                    class="form-check form-check-inline user-pill"
                  >
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :value="u.id"
                      v-model="selectedUserIds"
                    />
                    <span class="form-check-label">{{ u.email }}</span>
                  </label>
                </div>
                <small class="text-muted d-block mt-1">
                  Selected {{ selectedEmails.length }} / Max {{ MAX_BULK }}
                </small>
              </div>

              <div class="mb-2">
                <textarea
                  v-model="bulk.recipientsManual"
                  rows="3"
                  class="form-control"
                  placeholder="a@gmail.com, b@gmail.com (must be registered normal users)"
                ></textarea>
              </div>

              <div class="mb-2">
                <label class="form-label">Subject</label>
                <input name="subject" v-model="bulk.subject" type="text" class="form-control" placeholder="Bulk subject" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Message</label>
                <textarea name="message" v-model="bulk.message" rows="5" class="form-control" placeholder="Bulk message" required></textarea>
              </div>

              <div class="mb-3">
                <label class="form-label">Attachments (multiple)</label>
                <input name="attachments" type="file" class="form-control" multiple @change="onBulkFilesChange" />
                <small class="text-muted" v-if="pickedBulkFiles.length">Selected {{ pickedBulkFiles.length }} files</small>
                <div v-if="bulkSizeWarn" class="text-danger small mt-1">{{ bulkSizeWarn }}</div>
              </div>

              <input type="hidden" name="to_email" v-model="bulk.toEmailHidden" ref="toHiddenRef" />
              <input type="hidden" name="reply_to" :value="replyTo" />

              <button class="btn btn-primary px-4" :disabled="sending" @click="sendBulk">
                <span v-if="sending" class="spinner-border spinner-border-sm me-2"></span>
                Start Bulk Send
              </button>
              <div class="small mt-2" :class="bulkFeedbackClass">{{ bulk.feedback }}</div>
              <div class="small text-danger mt-1" v-if="emailJsMissing">{{ emailJsMissing }}</div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="row g-4 mt-4">
      <div class="col-12 col-lg-6">
        <ActivitiesTable :activities="activities" :ratings-agg="ratingsAgg" @view-ratings="openRatingsModal" />
      </div>
      <div class="col-12 col-lg-6">
        <UsersTable :users="allUsers" />
      </div>
    </div>
  </div>

  <div class="modal fade" id="addActivityModal" tabindex="-1" aria-labelledby="addActivityLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content">
        <form @submit.prevent="onCreate">
          <div class="modal-header">
            <h5 class="modal-title" id="addActivityLabel">Add Activity</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-12 col-lg-6">
                <div class="mb-3">
                  <label class="form-label">Title</label>
                  <input v-model.trim="form.title" type="text" class="form-control" required />
                </div>
                <div class="mb-3">
                  <label class="form-label">Start Time</label>
                  <input v-model="form.startAtLocal" type="datetime-local" class="form-control" required />
                </div>
                <div class="mb-3">
                  <label class="form-label">Description</label>
                  <textarea v-model.trim="form.description" rows="6" class="form-control"></textarea>
                </div>
                <div v-if="createError" class="alert alert-danger py-2">{{ createError }}</div>
              </div>

              <div class="col-12 col-lg-6">
                <div class="mb-2 d-flex align-items-center justify-content-between">
                  <label class="form-label mb-0">Location</label>
                  <small class="text-muted">Search or pick on map</small>
                </div>
                <input
                  ref="placeInputRef"
                  v-model="location.address"
                  type="text"
                  class="form-control mb-2"
                  placeholder="Enter keywords (autocomplete supported)"
                />
                <div ref="mapRef" class="gm-map rounded" />
                <div class="row g-2 mt-2">
                  <div class="col-12">
                    <div class="small text-muted">
                      <span class="me-2">PlaceID: {{ location.placeId || '—' }}</span>
                      <span>Lat/Lng: {{ location.lat?.toFixed(6) || '—' }}, {{ location.lng?.toFixed(6) || '—' }}</span>
                    </div>
                  </div>
                </div>
                <div class="d-flex gap-2 mt-2">
                  <button class="btn btn-outline-secondary btn-sm" type="button" @click="locateMe" :disabled="!mapsReady">Use my location</button>
                  <button class="btn btn-outline-secondary btn-sm" type="button" @click="clearLocation">Clear</button>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Creating…' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div class="modal fade" id="ratingsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Ratings Details</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="ratingsLoading" class="text-muted">Loading…</div>
          <div v-else>
            <div class="mb-2">
              Average: <strong>{{ ratingsAvg.toFixed(2) }}</strong>,
              Count: <strong>{{ ratingsList.length }}</strong>
            </div>
            <div class="table-responsive">
              <table class="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Score</th>
                    <th>Comment</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in ratingsList" :key="r.__id">
                    <td>{{ r.userEmail || r.userId }}</td>
                    <td>{{ r.rating ?? r.score }}</td>
                    <td>{{ r.comment }}</td>
                    <td>{{ formatYMDHMS(r.createdAt) }}</td>
                  </tr>
                  <tr v-if="!ratingsList.length">
                    <td colspan="4" class="text-center text-muted py-3">No ratings</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" id="ratingsChartModal" tabindex="-1" aria-hidden="true" ref="ratingsChartModalRef">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            Ratings Distribution
            <small v-if="chartContext.title" class="text-muted ms-2">({{ chartContext.title }})</small>
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" />
        </div>
        <div class="modal-body">
          <div v-if="chartContext.loading" class="text-muted">Loading chart…</div>
          <div v-else>
            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="small text-muted">
                Total {{ chartContext.total }} ratings
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-secondary btn-sm" @click="rebuildChart">Refresh</button>
                <button class="btn btn-outline-primary btn-sm" :disabled="!chartContext.total" @click="exportPiePdf">
                  Export PDF
                </button>
              </div>
            </div>
            <div class="ratio ratio-1x1">
              <canvas ref="pieCanvasRef"></canvas>
            </div>
            <div v-if="!chartContext.total" class="text-center text-muted mt-3">No rating data</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as bootstrap from 'bootstrap'
import emailjs from '@emailjs/browser'
import ActivitiesTable from '@/components/ActivitiesTable.vue'
import UsersTable from '@/components/UsersTable.vue'
import { db, auth } from '@/firebase'
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp, deleteDoc, doc, getDocs, Timestamp, where } from 'firebase/firestore'

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const emailJsMissing = ref(!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY ? 'EmailJS env variables are not fully configured (VITE_EMAILJS_*). Sending will fail.' : '')

const totalUsers = computed(() => allUsers.value.length)

const activities = ref([])
let unsubActivities = null
onMounted(() => {
  const qActs = query(collection(db, 'activities'), orderBy('createdAt', 'desc'))
  unsubActivities = onSnapshot(qActs, (snap) => {
    activities.value = snap.docs.map(d => ({ __id: d.id, ...d.data() }))
  }, (err) => console.error('listen activities error:', err))
})
onBeforeUnmount(() => { if (unsubActivities) unsubActivities() })

const participantsCountMap = reactive({})
const regUnsubs = new Map()
function stopAllRegUnsubs(){
  for (const fn of regUnsubs.values()) { try{ fn() }catch{} }
  regUnsubs.clear()
}
function ensureParticipantsListenerFor(aid){
  if (regUnsubs.has(aid)) return
  const regsRef = collection(db, 'registrations')
  const qRegs = query(regsRef, where('activityId','==', aid))
  const unsub = onSnapshot(qRegs, snap => {
    let count = 0
    snap.forEach(docSnap => {
      const s = (docSnap.data().status || '').toLowerCase()
      if (['registered','confirmed','approved'].includes(s)) count++
    })
    participantsCountMap[aid] = count
  }, e => {
    console.warn('listen registrations failed:', e)
    participantsCountMap[aid] = 0
  })
  regUnsubs.set(aid, unsub)
}
function rebuildParticipantsListeners(){
  const ids = new Set(activities.value.map(a=>a.__id))
  for (const [aid, fn] of regUnsubs.entries()){
    if (!ids.has(aid)) { try{ fn() }catch{}; regUnsubs.delete(aid); delete participantsCountMap[aid] }
  }
  for (const aid of ids) ensureParticipantsListenerFor(aid)
}
watch(activities, rebuildParticipantsListeners, { deep: false })
onMounted(rebuildParticipantsListeners)
onBeforeUnmount(stopAllRegUnsubs)

const pad = n => String(n).padStart(2, '0')
function toMillis(val) {
  if (!val) return 0
  if (typeof val === 'object' && ('seconds' in val || 'nanoseconds' in val)) {
    return Number(val.seconds || 0) * 1000 + Math.round(Number(val.nanoseconds || 0) / 1e6)
  }
  if (typeof val === 'number') return val
  const t = Date.parse(val)
  return Number.isFinite(t) ? t : 0
}
function fmtDateTime(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function formatStartAt(a) {
  const ms = toMillis(a.startAt) || toMillis(a.startAtMs) || toMillis(a.startDate) || toMillis(a.date)
  return fmtDateTime(ms)
}

const form = ref({ title: '', startAtLocal: '', description: '' })
const submitting = ref(false)
const createError = ref('')

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const placeInputRef = ref(null)
const mapRef = ref(null)

const mapsReady = ref(false)
let map = null
let marker = null
let autocomplete = null
let geocoder = null

const location = reactive({
  address: '',
  placeId: '',
  lat: null,
  lng: null,
  viewport: null
})

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

async function initMapIfNeeded() {
  await loadGoogleMaps()
  if (!mapsReady.value) return
  await nextTick()
  if (!map && mapRef.value) {
    const center = { lat: -37.8136, lng: 144.9631 }
    map = new window.google.maps.Map(mapRef.value, {
      center,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    })
    marker = new window.google.maps.Marker({ map, position: center, draggable: true })
    geocoder = new window.google.maps.Geocoder()
    map.addListener('click', (e) => { setLatLng(e.latLng.lat(), e.latLng.lng(), true) })
    marker.addListener('dragend', (e) => { setLatLng(e.latLng.lat(), e.latLng.lng(), true) })
  }
  if (!autocomplete && placeInputRef.value) {
    autocomplete = new window.google.maps.places.Autocomplete(placeInputRef.value, {
      fields: ['place_id', 'geometry', 'formatted_address', 'name'],
    })
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (!place || !place.geometry) return
      const loc = place.geometry.location
      const vp = place.geometry.viewport
      const position = { lat: loc.lat(), lng: loc.lng() }
      map.fitBounds(vp || new window.google.maps.LatLngBounds(position, position))
      marker.setPosition(position)
      location.lat = position.lat
      location.lng = position.lng
      location.placeId = place.place_id || ''
      location.address = place.formatted_address || place.name || location.address
      if (vp) {
        location.viewport = {
          north: vp.getNorthEast().lat(),
          east: vp.getNorthEast().lng(),
          south: vp.getSouthWest().lat(),
          west: vp.getSouthWest().lng()
        }
      } else {
        location.viewport = null
      }
    })
  }
}
function setLatLng(lat, lng, doReverse = false) {
  if (!map || !marker) return
  const pos = { lat, lng }
  marker.setPosition(pos)
  map.panTo(pos)
  location.lat = lat
  location.lng = lng
  location.placeId = ''
  if (doReverse && geocoder) {
    geocoder.geocode({ location: pos }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        location.address = results[0].formatted_address || location.address
        location.placeId = results[0].place_id || location.placeId
      }
    })
  }
}
function locateMe() {
  if (!navigator.geolocation || !mapsReady.value) return
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords
      setLatLng(latitude, longitude, true)
    },
    (err) => console.warn('geolocation error', err),
    { enableHighAccuracy: true, timeout: 8000 }
  )
}
function clearLocation() {
  location.address = ''
  location.placeId = ''
  location.lat = null
  location.lng = null
  location.viewport = null
  if (marker && map) {
    const center = map.getCenter()
    marker.setPosition(center)
  }
}
function showAddModal() {
  const el = document.getElementById('addActivityModal')
  if (!el) return
  bootstrap.Modal.getOrCreateInstance(el).show()
  el.addEventListener('shown.bs.modal', onAddShownOnce, { once: true })
}
async function onAddShownOnce() {
  await initMapIfNeeded()
  if (map && !location.lat && !location.lng) {
    map.setCenter({ lat: -37.8136, lng: 144.9631 })
    map.setZoom(12)
  }
}

const onCreate = async () => {
  createError.value = ''
  if (!form.value.title || !form.value.startAtLocal) {
    createError.value = 'Please complete all fields'
    return
  }
  try {
    submitting.value = true
    const user = auth.currentUser
    const createdBy = user ? user.uid : 'anonymous'
    const createdByName = (user && user.email) ? user.email : 'Admin'
    const dt = new Date(form.value.startAtLocal)
    const startAt = Timestamp.fromDate(dt)

    const locPayload = location.lat != null && location.lng != null ? {
      address: location.address || '',
      placeId: location.placeId || '',
      lat: Number(location.lat),
      lng: Number(location.lng),
      ...(location.viewport ? { viewport: { ...location.viewport } } : {})
    } : null

    await addDoc(collection(db, 'activities'), {
      title: form.value.title,
      description: form.value.description ?? '',
      startAt,
      startAtMs: dt.getTime(),
      createdBy, createdByName,
      createdAt: serverTimestamp(),
      ...(locPayload ? { location: locPayload } : {})
    })

    form.value = { title: '', startAtLocal: '', description: '' }
    clearLocation()
    const el = document.getElementById('addActivityModal')
    if (el) bootstrap.Modal.getOrCreateInstance(el).hide()
  } catch (e) {
    console.error(e); createError.value = e?.message || 'Create failed'
  } finally {
    submitting.value = false
  }
}
const onDelete = async (row) => {
  if (!confirm(`Delete activity: ${row.title}?`)) return
  try { await deleteDoc(doc(db, 'activities', row.__id)) }
  catch (e) { alert(`Delete failed: ${e?.message || e}`) }
}
const onEdit = (row) => { console.log('edit ->', row) }

function toCsv(rows, headers) {
  const escape = (v) => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = headers.map(h => h.label).join(',')
  const body = rows.map(r => headers.map(h => escape(r[h.key])).join(',')).join('\n')
  return `${head}\n${body}`
}
const exportActivitiesCsv = () => {
  const headers = [
    { key: 'title', label: 'Title' },
    { key: 'startAtText', label: 'Start Time' },
    { key: 'createdByName', label: 'Created By' },
    { key: 'participants', label: 'Participants' },
    { key: 'locationText', label: 'Location' },
    { key: 'description', label: 'Description' },
  ]
  const rows = activities.value.map(a => ({
    ...a,
    startAtText: formatStartAt(a),
    participants: participantsCountMap[a.__id] ?? a.reservedCount ?? 0,
    locationText: a.location?.address || (a.location?.lat != null ? `${a.location.lat},${a.location.lng}` : '')
  }))
  const csv = toCsv(rows, headers)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `activities_${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const file = ref(null)
const uploading = ref(false)
const uploadHint = ref('')
const onFileChange = (e) => {
  const files = e?.target?.files
  file.value = files && files[0] ? files[0] : null
  uploadHint.value = file.value ? `Selected: ${file.value.name}` : ''
}
const onUpload = async () => {
  if (!file.value || uploading.value) return
  uploading.value = true
  try { await new Promise(r => setTimeout(r, 600)); uploadHint.value = `Mock uploaded: ${file.value.name}` }
  finally { uploading.value = false }
}

const allUsers = ref([])
let unsubUsers = null
onMounted(() => {
  const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
  unsubUsers = onSnapshot(qUsers, (snap) => {
    allUsers.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }, (err)=>console.error('listen users error:', err))
})
onBeforeUnmount(() => { if (unsubUsers) unsubUsers() })

const userFilterKey = ref('')
const users = computed(() => {
  const adminEmail = (auth.currentUser && auth.currentUser.email)
    ? auth.currentUser.email.trim().toLowerCase()
    : ''
  return (allUsers.value || [])
    .filter(u => !!u.email)
    .filter(u => {
      const email = String(u.email).trim().toLowerCase()
      const roleIsUser = typeof u.role === 'string' ? u.role.toLowerCase() === 'user' : true
      const notAdminFlag = u.isAdmin !== true
      const notCurrentAdmin = email !== adminEmail
      return roleIsUser && notAdminFlag && notCurrentAdmin
    })
})
const usersFiltered = computed(() => {
  const key = userFilterKey.value.trim().toLowerCase()
  if (!key) return users.value
  return users.value.filter(u => String(u.email).toLowerCase().includes(key))
})
const allowedEmails = computed(() =>
  new Set(users.value.map(u => String(u.email).trim().toLowerCase()).filter(Boolean))
)

const singleFormEl = ref(null)
const single = reactive({ to:'', subject:'', message:'', sending:false, feedback:'' })
const replyTo = computed(() => (auth.currentUser && auth.currentUser.email) ? auth.currentUser.email : '')
const pickedSingleFiles = ref([])
const singleSizeWarn = ref('')
const MAX_BYTES_SINGLE = 10 * 1024 * 1024
function onSingleFilesChange(e) {
  singleSizeWarn.value = ''
  const files = e?.target?.files
  pickedSingleFiles.value = files ? Array.from(files) : []
  const total = pickedSingleFiles.value.reduce((s, f) => s + (f.size || 0), 0)
  if (total > MAX_BYTES_SINGLE) singleSizeWarn.value = `Total attachment size ${Math.round(total/1024/1024)}MB exceeds limit (10MB)`
}
function validateSingle() {
  if (!single.to) { single.feedback = 'Please choose a recipient first'; return false }
  if (!single.subject || !single.message) { single.feedback = 'Please enter subject and content'; return false }
  if (singleSizeWarn.value) { single.feedback = singleSizeWarn.value; return false }
  if (emailJsMissing.value) { single.feedback = emailJsMissing.value; return false }
  return true
}
async function sendSingleForm() {
  single.feedback = ''
  if (!validateSingle()) return
  single.sending = true
  try {
    await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, singleFormEl.value, { publicKey: PUBLIC_KEY })
    single.feedback = 'Sent'
    single.subject = ''; single.message = ''; pickedSingleFiles.value = []
    const inputEl = singleFormEl.value?.querySelector('input[name="attachments"]'); if (inputEl) inputEl.value = ''
  } catch (e) {
    single.feedback = 'Send failed: ' + (e?.text || e?.message || 'unknown')
  } finally { single.sending = false }
}
function resetSingleForm() {
  single.to=''; single.subject=''; single.message=''; single.feedback=''; pickedSingleFiles.value=[]
  const formEl = singleFormEl.value; if (formEl?.reset) formEl.reset()
}

const MAX_BULK = 10
const selectedUserIds = ref([])
const selectedEmails = computed(() =>
  selectedUserIds.value
    .map(id => users.value.find(u => u.id === id)?.email || null)
    .filter(Boolean)
    .map(e => String(e).toLowerCase())
)
const bulk = reactive({ recipientsManual:'', subject:'', message:'', sending:false, feedback:'', toEmailHidden:'' })
const bulkFormEl = ref(null)
const toHiddenRef = ref(null)
const bulkFeedbackClass = computed(() => bulk.feedback.startsWith('Successfully sent') ? 'text-success' : bulk.feedback ? 'text-danger' : '')
const allFilteredSelected = computed(() => {
  const ids = new Set(selectedUserIds.value)
  return usersFiltered.value.every(u => ids.has(u.id)) && usersFiltered.value.length > 0
})
const toggleSelectAll = () => {
  const ids = new Set(selectedUserIds.value)
  if (allFilteredSelected.value) usersFiltered.value.forEach(u => ids.delete(u.id))
  else usersFiltered.value.forEach(u => ids.add(u.id))
  selectedUserIds.value = [...ids]
}
function normalizeList(raw) {
  return String(raw || '').split(/[,;\s\n]+/).map(s => s.trim().toLowerCase()).filter(Boolean)
}
function validateAgainstWhitelist(list) {
  const allowed = allowedEmails.value
  const invalid = list.filter(e => !allowed.has(e))
  if (invalid.length) throw new Error(`Not registered as normal users: ${invalid.join(', ')}`)
  const deduped = [...new Set(list)]
  if (deduped.length > MAX_BULK) throw new Error(`At most ${MAX_BULK} recipients per batch (current ${deduped.length})`)
  return deduped
}
const pickedBulkFiles = ref([])
const bulkSizeWarn = ref('')
const MAX_BYTES_BULK = 10 * 1024 * 1024
function onBulkFilesChange(e) {
  bulkSizeWarn.value = ''
  const files = e?.target?.files
  pickedBulkFiles.value = files ? Array.from(files) : []
  const total = pickedBulkFiles.value.reduce((s, f) => s + (f.size || 0), 0)
  if (total > MAX_BYTES_BULK) bulkSizeWarn.value = `Total attachment size ${Math.round(total/1024/1024)}MB exceeds limit (10MB)`
}
async function sendBulkForm() {
  bulk.feedback = ''
  if (emailJsMissing.value) { bulk.feedback = emailJsMissing.value; return }
  if (!bulk.subject || !bulk.message) { bulk.feedback = 'Please enter subject and content'; return }
  if (bulkSizeWarn.value) { bulk.feedback = bulkSizeWarn.value; return }

  let list = [...selectedEmails.value, ...normalizeList(bulk.recipientsManual)].filter(Boolean)
  try { list = validateAgainstWhitelist(list) } catch (e) { bulk.feedback = e.message; return }
  if (!list.length) { bulk.feedback = 'Please select or input at least one recipient'; return }

  bulk.sending = true
  try {
    let ok = 0, fail = 0
    for (const to of list) {
      bulk.toEmailHidden = to
      await nextTick()
      if (toHiddenRef.value) toHiddenRef.value.value = to
      try {
        await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, bulkFormEl.value, { publicKey: PUBLIC_KEY })
        ok++
      } catch (e) {
        console.error('bulk send error ->', to, e); fail++
      }
    }
    bulk.feedback = `Successfully sent to ${ok}${fail ? `, failed ${fail}` : ''}`
    bulk.subject=''; bulk.message=''; bulk.recipientsManual=''; pickedBulkFiles.value=[]
    const inputEl = bulkFormEl.value?.querySelector('input[name="attachments"]'); if (inputEl) inputEl.value = ''
  } finally { bulk.sending = false }
}

const ratingsAgg = ref({})
let unsubRatings = null
onMounted(() => {
  const reviewsRef = collection(db, 'reviews')
  unsubRatings = onSnapshot(reviewsRef, (snap) => {
    const acc = new Map()
    snap.forEach(docSnap => {
      const r = docSnap.data()
      const aid = r.activityId
      const rating = Number(r.rating ?? r.score ?? 0)
      if (!aid || !Number.isFinite(rating)) return
      const cur = acc.get(aid) || { sum: 0, count: 0 }
      cur.sum += rating
      cur.count += 1
      acc.set(aid, cur)
    })
    const obj = {}
    acc.forEach((v, k) => { obj[k] = { avg: v.count ? v.sum / v.count : 0, count: v.count } })
    ratingsAgg.value = obj
  }, (err)=>console.error('listen reviews error:', err))
})
onBeforeUnmount(() => { if (unsubRatings) unsubRatings() })

const ratingsLoading = ref(false)
const ratingsList = ref([])
const ratingsAvg = computed(() =>
  ratingsList.value.length
    ? ratingsList.value.reduce((a, b) => a + Number(b.rating ?? b.score ?? 0), 0) / ratingsList.value.length
    : 0
)
function formatYMDHMS(ts){
  let ms = 0
  if (ts && typeof ts === 'object' && ('seconds' in ts || 'nanoseconds' in ts)) {
    ms = ts.seconds * 1000 + Math.round(ts.nanoseconds / 1e6)
  } else if (typeof ts === 'number') { ms = ts }
  else { const t = Date.parse(ts); ms = Number.isFinite(t) ? t : 0 }
  if (!ms) return ''
  const d = new Date(ms), z = n => String(n).padStart(2,'0')
  return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`
}
async function openRatingsModal(activityId){
  ratingsLoading.value = true
  ratingsList.value = []
  try {
    const qRev = query(collection(db, 'reviews'), where('activityId', '==', activityId))
    const snap = await getDocs(qRev)
    ratingsList.value = snap.docs
      .map(d => ({ __id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ams = (a.createdAt?.seconds ?? 0) * 1000
        const bms = (b.createdAt?.seconds ?? 0) * 1000
        return bms - ams
      })
  } catch (e) {
    console.error('load reviews error', e)
  } finally {
    ratingsLoading.value = false
    const el = document.getElementById('ratingsModal')
    bootstrap.Modal.getOrCreateInstance(el).show()
  }
}

const ratingsChartModalRef = ref(null)
const pieCanvasRef = ref(null)
let chartInstance = null
const chartContext = reactive({
  activityId: '',
  title: '',
  loading: false,
  total: 0,
  buckets: [0,0,0,0,0],
})

function loadScriptOnce(id, src) {
  return new Promise((resolve, reject) => {
    const existed = document.getElementById(id)
    if (existed) { resolve(); return }
    const s = document.createElement('script')
    s.id = id
    s.async = true
    s.src = src
    s.onload = () => resolve()
    s.onerror = (e) => reject(e)
    document.head.appendChild(s)
  })
}
async function ensureChartDeps() {
  await loadScriptOnce('chartjs-cdn', 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js')
  await loadScriptOnce('jspdf-cdn', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
}

function destroyChart() {
  if (chartInstance) {
    try { chartInstance.destroy() } catch {}
    chartInstance = null
  }
}

async function openRatingsChart(activityId, actTitle='') {
  chartContext.activityId = activityId
  chartContext.title = actTitle
  chartContext.loading = true
  chartContext.total = 0
  chartContext.buckets = [0,0,0,0,0]

  const el = document.getElementById('ratingsChartModal')
  bootstrap.Modal.getOrCreateInstance(el).show()

  try {
    await ensureChartDeps()
    const qRev = query(collection(db, 'reviews'), where('activityId', '==', activityId))
    const snap = await getDocs(qRev)
    const buckets = [0,0,0,0,0]
    snap.forEach(d => {
      const data = d.data()
      const v = Number(data.rating ?? data.score ?? 0)
      if (Number.isFinite(v) && v >= 1 && v <= 5) {
        buckets[Math.round(v)-1]++
      }
    })
    chartContext.buckets = buckets
    chartContext.total = buckets.reduce((a,b)=>a+b,0)
    await nextTick()
    rebuildChart()
  } catch (e) {
    console.error('openRatingsChart error:', e)
  } finally {
    chartContext.loading = false
  }
}

function rebuildChart() {
  destroyChart()
  if (!pieCanvasRef.value) return
  const data = chartContext.buckets
  const labels = ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars']
  const ds = {
    labels,
    datasets: [{
      data: data.length ? data : [1,0,0,0,0],
      backgroundColor: ['#dc3545','#fd7e14','#ffc107','#0d6efd','#198754'],
      borderWidth: 0,
    }]
  }
  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { enabled: true },
      title: {
        display: true,
        text: chartContext.total ? `Ratings Distribution (Total ${chartContext.total})` : 'No rating data'
      }
    }
  }
  chartInstance = new window.Chart(pieCanvasRef.value.getContext('2d'), {
    type: 'pie',
    data: ds,
    options
  })
}

async function exportPiePdf() {
  if (!pieCanvasRef.value) return
  await ensureChartDeps()
  const { jsPDF } = window.jspdf
  const canvas = pieCanvasRef.value
  const imgData = canvas.toDataURL('image/png', 1.0)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 36
  const usableWidth = pageWidth - margin*2
  const imgWidth = usableWidth
  const imgHeight = imgWidth
  const title = `Ratings Distribution - ${chartContext.title || chartContext.activityId}`
  pdf.setFontSize(16)
  pdf.text(title, margin, margin)
  const yTop = margin + 20
  pdf.addImage(imgData, 'PNG', margin, yTop, imgWidth, imgHeight)
  pdf.setFontSize(11)
  const counts = chartContext.buckets
  const sum = chartContext.total
  const lineY = yTop + imgHeight + 24
  pdf.text(`Total ratings: ${sum}`, margin, lineY)
  pdf.text(`1_star:${counts[0]}  2_stars:${counts[1]}  3_stars:${counts[2]}  4_stars:${counts[3]}  5_stars:${counts[4]}`, margin, lineY + 16)
  const fname = `ratings_pie_${(chartContext.title || chartContext.activityId)}.pdf`
  pdf.save(fname.replace(/\s+/g,'_'))
}
</script>

<style scoped>
.user-pills {
  max-height: 180px;
  overflow: auto;
  border: 1px dashed var(--bs-border-color, #ddd);
  border-radius: 8px;
  padding: 8px;
}
.user-pill {
  margin: 4px 8px 4px 0;
  background: var(--bs-light, #f8f9fa);
  border-radius: 999px;
  padding: 2px 10px;
}
.user-pill .form-check-input { margin-right: 6px; }
.gm-map {
  width: 100%;
  height: 320px;
  background: #e9ecef;
}
</style>
