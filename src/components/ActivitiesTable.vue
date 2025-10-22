<template>
  <div class="card h-100">
    <div class="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
      <span>Activities (sortable / paging / ratings)</span>
    </div>

    <div class="card-body">
      <div class="mb-2">
        <input
          v-model="searchTerm"
          class="form-control"
          placeholder="Search by title, start date, creator, or description..."
        />
      </div>

      <table ref="tbl" class="table table-striped table-hover w-100">
        <thead>
          <tr>
            <th>Title</th>
            <th>Start Date</th>
            <th>Creator</th>
            <th>Description</th>
            <th>Ratings</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import $ from 'jquery'
import 'datatables.net-bs5'
import 'datatables.net-responsive-bs5'

const props = defineProps({
  activities: { type: Array, default: () => [] },
  ratingsAgg: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['view-ratings'])

const tbl = ref(null)
let dt = null
const searchTerm = ref('')

function toMs(v) {
  if (!v) return 0
  if (typeof v === 'object' && ('seconds' in v || 'nanoseconds' in v)) {
    return Number(v.seconds || 0) * 1000 + Math.round(Number(v.nanoseconds || 0) / 1e6)
  }
  if (typeof v === 'number') return v
  const t = Date.parse(v)
  return Number.isFinite(t) ? t : 0
}
function ymd(ms) {
  if (!ms) return ''
  const d = new Date(ms), z = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

function renderStars(avg = 0) {
  const full = Math.floor(avg)
  const half = avg - full >= 0.5
  let out = '★★★★★'.slice(0, full)
  if (half) out += '☆'
  out = out.padEnd(5, '☆')
  return out
}

function asRows(list) {
  return (list || []).map(a => {
    const ms = toMs(a.startAt) || toMs(a.startDate) || toMs(a.date)
    const agg = props.ratingsAgg[a.__id] || { avg: 0, count: 0 }
    return [
      a.title || '',
      { _ms: ms, _display: ymd(ms) },
      a.createdByName || '',
      a.description || '',
      { _avg: agg.avg || 0, _count: agg.count || 0, _aid: a.__id }
    ]
  })
}

async function initDT() {
  if (!props.activities || props.activities.length === 0) return
  await nextTick()

  if (dt) {
    dt.rows().clear().rows.add(asRows(props.activities)).draw(false)
    dt.search(searchTerm.value || '').draw(false)
    return
  }

  dt = $(tbl.value).DataTable({
    data: asRows(props.activities),
    responsive: true,
    deferRender: true,
    paging: true,
    pageLength: 10,
    lengthChange: false,
    searching: true,
    ordering: true,
    order: [],
    language: {
      paginate: { previous: 'Previous', next: 'Next' },
      info: 'Items _START_ - _END_ of _TOTAL_',
      zeroRecords: 'No matching records'
    },
    dom: 'rtip',
    columns: [
      { title: 'Title' },
      {
        title: 'Start Date',
        render(d, t) { return (t === 'sort' || t === 'type') ? (d?._ms || 0) : (d?._display || '') }
      },
      { title: 'Creator' },
      {
        title: 'Description',
        render(text) {
          const safe = String(text || '')
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          return `<span class="desc-ellipsis" title="${safe}">${safe}</span>`
        }
      },
      {
        title: 'Ratings',
        render(d, t) {
          const avg = Number(d?._avg || 0)
          const cnt = Number(d?._count || 0)
          const aid = String(d?._aid || '')
          if (t === 'sort' || t === 'type') return avg
          const stars = renderStars(avg)
          return `
            <div class="rating-cell" title="Average: ${avg.toFixed(2)}; Reviews: ${cnt}">
              <div class="rating-stars">${stars}</div>
              <div class="rating-meta"><small>(${avg.toFixed(1)}/${cnt})</small></div>
              <div class="mt-1">
                <a href="#" class="view-ratings-link" data-aid="${aid}">View ratings</a>
              </div>
            </div>
          `
        }
      }
    ],
    columnDefs: [
      { targets: 0, responsivePriority: 1 },
      { targets: 1, responsivePriority: 2 },
      { targets: 2, responsivePriority: 3 },
      { targets: 3, responsivePriority: 10000 },
      { targets: 4, responsivePriority: 1 }
    ]
  })

  $(tbl.value).on('click', 'a.view-ratings-link', (e) => {
    e.preventDefault()
    const aid = $(e.currentTarget).data('aid')
    emit('view-ratings', String(aid || ''))
  })

  dt.search(searchTerm.value || '').draw(false)
}

let timer = null
watch(searchTerm, (v) => {
  clearTimeout(timer)
  timer = setTimeout(() => dt?.search(v || '').draw(), 160)
})
watch([() => props.activities, () => props.ratingsAgg], () => initDT(), { deep: true, immediate: true })

onMounted(initDT)
onBeforeUnmount(() => { if (dt) dt.destroy(true) })
</script>

<style scoped>
.desc-ellipsis {
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: bottom;
}
.rating-cell .rating-stars { font-size: 14px; line-height: 1; }
.rating-cell .rating-meta { line-height: 1; }
</style>
