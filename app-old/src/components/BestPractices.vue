<script setup>
import { computed } from 'vue'
import GaugeMeter from './GaugeMeter.vue'

const props = defineProps({
  loading: { type: Boolean, default: false },   // kept for compatibility, not gating render
  data: { type: Object, default: null },
  toggles: { type: Object, default: () => ({ 'best-practices': true }) },
  hideInfo: { type: Boolean, default: false },
})

/* -------- normalize incoming payload -------- */
const bpPayload = computed(() => {
  const d = props.data
  if (!d) return null

  // Direct shape: { aem, contentstack, summary }
  if (d.aem && d.contentstack) return d

  // Wrapped like { check, status, data }
  if (d.data && (d.data.aem || d.data.contentstack)) return d.data

  // Report slice variants
  const k = d['best-practices'] || d.bestPractices || d.bestpractices
  if (!k) return null
  if (k.aem || k.contentstack) return k
  if (k.data && (k.data.aem || k.data.contentstack)) return k.data
  return null
})

const aem = computed(() => bpPayload.value?.aem || null)
const cs  = computed(()  => bpPayload.value?.contentstack || null)
const summary = computed(() => bpPayload.value?.summary || null)

/* ---- Ready when data exists (don't rely on parent loading flag) ---- */
const bPLoaded = computed(() => Boolean(aem.value && cs.value))

/* ---- Scores & meters ---- */
const bPScoreOldPct = computed(() => {
  const s = aem.value?.score
  return typeof s === 'number' ? (s <= 1 ? Math.round(s * 100) : Math.round(s)) : 0
})
const bPScoreNewPct = computed(() => {
  const s = cs.value?.score
  return typeof s === 'number' ? (s <= 1 ? Math.round(s * 100) : Math.round(s)) : 0
})

function fmtScore(s){
  if (s == null) return '—'
  const n = (s <= 1 ? s * 100 : s)
  return Math.round(n)
}

function pctClass(p){
  const n = Math.max(0, Math.min(100, Number(p) || 0))
  if (n >= 90) return 'meter--great'
  if (n >= 50) return 'meter--warn'
  return 'meter--bad'
}

/* ---- Counts table (as “metrics”) ---- */
const metricDefs = computed(() => [
  { key:'totalAudited', label:'Total audited', abbr:'TA',   isCls:false },
  { key:'passed',       label:'Passed',         abbr:'PAS',  isCls:false },
  { key:'failed',       label:'Failed',         abbr:'FAIL', isCls:false },
  { key:'notApplicable',label:'Not applicable', abbr:'NA',   isCls:false },
  { key:'informative',  label:'Informative',    abbr:'INFO', isCls:false },
])
const vitalsOld = computed(() => aem.value?.counts || {})
const vitalsNew = computed(() => cs.value?.counts  || {})
const hasOldbP  = computed(() => !!aem.value?.counts)

/* ---- Score delta badge (CS − AEM) ---- */
const scoreDelta = computed(() => {
  const d = summary.value?.scoreDelta
  if (typeof d === 'number') return d
  if (typeof cs.value?.score === 'number' && typeof aem.value?.score === 'number'){
    return cs.value.score - aem.value.score
  }
  return null
})
function scoreDeltaBadge(d) {
  if (d == null || !Number.isFinite(d)) return { text: '', cls: '' };
  const arrow = d > 0 ? '▲' : '▼';
  const cls   = d > 0 ? 'up' : 'down';
  return { text: `${arrow} ${d>0?'+':''}${Math.round(d)}`, cls };
}

/* ---- Helpers (tolerant of Refs) ---- */
function fmtCLS(v){ return v == null ? '—' : v }
function ms(v){ return v == null ? '—' : v }
function unrefMaybe(obj){ return obj && typeof obj === 'object' && 'value' in obj ? obj.value : obj }
function semanticDir(key, diff) {
  if (diff === 0 || diff == null) return 'neutral'
  switch (key) {
    case 'passed':        // more passed = better
      return diff > 0 ? 'up' : 'down'
    case 'failed':        // more failed = worse
      return diff > 0 ? 'down' : 'up'
    case 'notApplicable': // neutral buckets
    case 'informative':
    case 'totalAudited':
      return 'neutral'
    default:              // fallback: sign-based
      return diff > 0 ? 'up' : 'down'
  }
}

function deltaFor(key, newObj, oldObj){
  const n = unrefMaybe(newObj), o = unrefMaybe(oldObj)
  const nv = n?.[key], ov = o?.[key]
  if (nv == null || ov == null) return null

  const diff = nv - ov
  if (diff === 0) return null // keep your existing "—" for zero

  const dir = semanticDir(key, diff)
  const arrow = dir === 'neutral' ? '' : (diff > 0 ? '▲' : '▼')
  return {
    // 'delta' is added in the template; here we add meaning + gray via 'muted' when neutral
    cls: dir === 'neutral' ? 'neutral muted' : dir,
    arrow,
    text: `${diff > 0 ? '+' : ''}${diff}`
  }
}

/* ---- Attention Points (failed audits from Contentstack) ---- */
const bPOpps = computed(() => Array.isArray(cs.value?.failures) ? cs.value.failures : [])

function sevBucket(weight){
  if (weight >= 8) return 'critical'
  if (weight >= 5) return 'high'
  if (weight >= 3) return 'medium'
  if (weight >= 1) return 'low'
  return 'info'
}

const oppBuckets = computed(() => {
  const buckets = { critical:[], high:[], medium:[], low:[], info:[] }
  for (const f of bPOpps.value){
    const bucket = sevBucket(f.weight ?? 0)
    if (props.hideInfo && bucket === 'info') continue
    buckets[bucket].push({
      id: f.id, title: f.title, description: f.description,
      overallSavingsMs: null, overallSavingsBytes: null
    })
  }
  if (props.hideInfo) delete buckets.info
  for (const k of Object.keys(buckets)) {
    if (!buckets[k].length) delete buckets[k]
  }
  return buckets
})

const oppColumns = computed(() => Object.keys(oppBuckets.value))
const oppGridCols = computed(() => `repeat(${Math.max(oppColumns.value.length,1)}, minmax(0, 1fr))`)
function colTitle(k){
  return ({
    critical:'Critical',
    high:'High',
    medium:'Medium',
    low:'Low',
    info:'Info',
    minor:'Minor'
  })[k] || k
}
function prettyMs(v){ return v == null ? '—' : `${Math.round(v)} ms` }
function prettyBytes(v){
  if (v == null) return null
  const units = ['B','KB','MB','GB']
  let n = v, i=0
  while (n >= 1024 && i < units.length-1){ n/=1024; i++ }
  return `${n.toFixed(1)} ${units[i]}`
}

/* ---- Keep existing template refs working ---- */
const report = computed(() => ({
  bestpractices: {
    lighthouse: {
      old: { score: aem.value?.score ?? null },
      new: { score: cs.value?.score ?? null }
    },
    summary: { scoreDelta: scoreDelta.value }
  }
}))
const toggles = computed(() => props.toggles || { 'best-practices': true })
const psiNew  = computed(() => cs.value?.score ?? null)
</script>

<template>
  <!-- Best Practices -->
  <div v-if="toggles['best-practices']" class="card">
  <h2>Best Practices</h2>

  <div v-if="!bPLoaded" class="shot--placeholder" style="height:180px;">
    <div class="loader"></div><div class="tiny muted" style="margin-top:6px;">Loading Lighthouse data…</div>
  </div>

  <template v-else>
    <div class="grid grid-2 summary">
      <!-- AEM -->
      <div class="sum-card">
        <div class="sum-card__label">Best Practices (AEM)</div>
        <div class="sum-card__num">{{ fmtScore(aem?.score) }}</div>
        <div class="meter" :class="pctClass(bPScoreOldPct)">
          <div class="meter__bar" :style="{ width: bPScoreOldPct + '%' }"></div>
        </div>
        <table class="perf-mini">
          <thead><tr><th>Type</th><th class="num">AEM</th></tr></thead>
          <tbody>
          <tr v-for="m in metricDefs" :key="'old-'+m.key">
            <td class="metric-cell muted">{{ m.label }} ({{ m.abbr }})</td>
            <td class="mono right">{{ m.isCls ? fmtCLS(vitalsOld[m.key]) : ms(vitalsOld[m.key]) || '—' }}</td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- Contentstack -->
      <div class="sum-card">
        <div class="sum-card__label">Performance (Contentstack)</div>
        <div class="sum-card__num">
          {{ fmtScore(psiNew ?? report.bestpractices?.lighthouse?.new?.score) ?? '—' }}
          <span v-if="report.bestpractices?.summary?.scoreDelta!=null"
                :class="['tiny', scoreDeltaBadge(report.bestpractices.summary.scoreDelta).cls]"
                style="margin-left:6px;">
                    {{ scoreDeltaBadge(report.bestpractices.summary.scoreDelta).text }}
                  </span>
        </div>
        <div class="meter" :class="pctClass(bPScoreNewPct)">
          <div class="meter__bar" :style="{ width: bPScoreNewPct + '%' }"></div>
        </div>
        <table class="perf-mini">
          <thead><tr><th>Type</th><th class="num">Contentstack</th><th class="num" v-if="hasOldbP">Delta</th></tr></thead>
          <tbody>
          <tr v-for="m in metricDefs" :key="'new-'+m.key">
            <td class="metric-cell muted">{{ m.label }} ({{ m.abbr }})</td>
            <td class="mono right">{{ m.isCls ? fmtCLS(vitalsNew[m.key]) : ms(vitalsNew[m.key]) || '—' }}</td>
            <td class="mono right" v-if="hasOldbP">
                      <span v-if="deltaFor(m.key, vitalsNew, vitalsOld)" :class="['delta', deltaFor(m.key, vitalsNew, vitalsOld).cls]">
                        {{ deltaFor(m.key, vitalsNew, vitalsOld).arrow }} {{ deltaFor(m.key, vitalsNew, vitalsOld).text }}
                      </span>
              <span v-else class="muted">—</span>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Best Practices Attention Points -->
    <div class="subcard">
      <h4 style="margin: 12px 0;">Attention Points <span class="muted attention-points">(Contentstack)</span></h4>
      <div v-if="!bPOpps.length" class="muted">No attention points reported. 🎉</div>
      <div v-else class="opps-grid" :style="{ gridTemplateColumns: oppGridCols }">
        <div v-for="col in oppColumns" :key="col" class="opp-col">
          <div class="opp-col__title">
            <span class="sev" :class="`sev--${col}`">{{ colTitle(col) }}</span>
          </div>
          <ul class="opps">
            <li v-for="o in oppBuckets[col]" :key="o.id" class="opp">
              <div class="opp__head"><span class="opp__title">{{ o.title }}</span></div>
              <p class="opp__desc">{{ o.description }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </template>
  </div>
</template>