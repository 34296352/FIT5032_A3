<template>
  <div class="card h-100">
    <div class="card-header d-flex justify-content-between align-items-center">
      <span>User List (sortable / paginated)</span>
    </div>

    <div class="card-body">
      <div class="mb-2">
        <input
          v-model="searchTerm"
          class="form-control"
          placeholder="Search by email, role or registration date..."
        />
      </div>

      <table ref="tbl" class="table table-striped table-hover w-100">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Registration Time</th>
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
  users: { type: Array, default: () => [] }
})

const tbl = ref(null)
let dt = null
const searchTerm = ref('')

function toMillis(val) {
  if (!val) return 0
  if (typeof val === 'object' && ('seconds' in val || 'nanoseconds' in val)) {
    return Number(val.seconds || 0) * 1000 + Math.round(Number(val.nanoseconds || 0) / 1e6)
  }
  if (typeof val === 'number') return val
  const t = new Date(val).getTime()
  return Number.isFinite(t) ? t : 0
}
function formatMillis(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const z = n => String(n).padStart(2, '0')
  return `${z(d.getDate())}/${z(d.getMonth() + 1)}/${d.getFullYear()} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`
}

function asRows(list) {
  return (list || []).map(u => {
    const ms = toMillis(u.createdAt)
    return [
      u.email || '',
      u.role || 'user',
      { _ms: ms, _display: formatMillis(ms) }
    ]
  })
}

async function initDT() {
  await nextTick()

  if (dt) {
    dt.rows().clear().rows.add(asRows(props.users)).draw(false)
    dt.search(searchTerm.value || '').draw(false)
    return
  }

  dt = $(tbl.value).DataTable({
    data: asRows(props.users),
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
      { title: 'Email' },
      { title: 'Role' },
      {
        title: 'Registration Time',
        render(data, type) {
          if (type === 'sort' || type === 'type') return data._ms
          return data._display
        }
      }
    ]
  })

  dt.search(searchTerm.value || '').draw(false)
}

watch(searchTerm, (val) => {
  if (dt) dt.search(val || '').draw()
})

watch(
  () => props.users,
  () => { initDT() },
  { deep: true, immediate: true }
)

onMounted(initDT)
onBeforeUnmount(() => { if (dt) dt.destroy(true) })
</script>

<style scoped>
</style>
