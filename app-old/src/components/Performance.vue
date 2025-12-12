<script setup>
import { computed } from 'vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  performance: { type: Object, default: null }
})

/* -------- helpers (scoped to this component) -------- */
function pctClass(p){
  const n = Math.max(0, Math.min(100, Number(p) || 0))
  if (n >= 90) return 'meter--great'
  if (n >= 50) return 'meter--warn'
  return 'meter--bad'
}
function fmtScore(v) {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n <= 1 ? n * 100 : n); // Lighthouse(0..1) or PSI(0..100)
}
function scoreDeltaBadge(d) {
  if (d == null || !Number.isFinite(d)) return { text: '', cls: '' };
  const arrow = d > 0 ? '▲' : '▼';
  const cls   = d > 0 ? 'up' : 'down';
  return { text: `${arrow} ${d>0?'+':''}${Math.round(d)}`, cls };
}
const ms = v => (v==null ? '—' : `${Math.round(v)} ms`)
const fmtCLS = v => (v==null ? '—' : Number(v).toFixed(3))

function prettyMs(v){
  if(v==null) return '—'
  const n = Number(v)
  return n < 1000 ? `${Math.round(n)} ms` : `${(n/1000).toFixed(1)} s`
}
function prettyBytes(b){
  if(b==null) return '—'
  const units = ['B','KB','MB','GB']
  let n = Number(b), i = 0
  while(n >= 1024 && i < units.length - 1){ n /= 1024; i++ }
  return `${n.toFixed(1)} ${units[i]}`
}

const metricDefs = [
  { key:'ttfb', label:'Time to First Byte', abbr:'TTFB' },
  { key:'fcp',  label:'First Contentful Paint', abbr:'FCP' },
  { key:'lcp',  label:'Largest Contentful Paint', abbr:'LCP' },
  { key:'si',   label:'Speed Index', abbr:'SI' },
  { key:'tbt',  label:'Total Blocking Time', abbr:'TBT' },
  { key:'tti',  label:'Time to Interactive', abbr:'TTI' },
  { key:'cls',  label:'Cumulative Layout Shift', abbr:'CLS', isCls:true },
]

/* -------- data extraction from props.performance -------- */
const psi    = computed(() => props.performance?.psi || null)
const psiOld = computed(() => psi.value?.old ?? null)
const psiNew = computed(() => psi.value?.new ?? null)

const lhOld = computed(() => props.performance?.lighthouse?.old || {})
const lhNew = computed(() => props.performance?.lighthouse?.new || {})

const vitalsOld = computed(() => ({
  ...(psi.value?.metrics?.old || {}),
  ...(lhOld.value.metrics || {}),
  fcp:  (psi.value?.metrics?.old?.fcp  ?? lhOld.value.metrics?.fcp  ?? lhOld.value.fcp  ?? null),
  lcp:  (psi.value?.metrics?.old?.lcp  ?? lhOld.value.metrics?.lcp  ?? lhOld.value.lcp  ?? null),
  inp:  (psi.value?.metrics?.old?.inp  ?? lhOld.value.metrics?.inp  ?? lhOld.value.inp  ?? null),
  ttfb: (psi.value?.metrics?.old?.ttfb ?? lhOld.value.metrics?.ttfb ?? lhOld.value.ttfb ?? null),
  cls:  (psi.value?.metrics?.old?.cls  ?? lhOld.value.metrics?.cls  ?? lhOld.value.cls  ?? null),
  si:   (psi.value?.metrics?.old?.si   ?? lhOld.value.metrics?.si   ?? lhOld.value.si   ?? null),
  tbt:  (psi.value?.metrics?.old?.tbt  ?? lhOld.value.metrics?.tbt  ?? lhOld.value.tbt  ?? null),
  tti:  (psi.value?.metrics?.old?.tti  ?? lhOld.value.metrics?.tti  ?? lhOld.value.tti  ?? null),
}))
const vitalsNew = computed(() => ({
  ...(psi.value?.metrics?.new || {}),
  ...(lhNew.value.metrics || {}),
  fcp:  (psi.value?.metrics?.new?.fcp  ?? lhNew.value.metrics?.fcp  ?? lhNew.value.fcp  ?? null),
  lcp:  (psi.value?.metrics?.new?.lcp  ?? lhNew.value.metrics?.lcp  ?? lhNew.value.lcp  ?? null),
  inp:  (psi.value?.metrics?.new?.inp  ?? lhNew.value.metrics?.inp  ?? lhNew.value.inp  ?? null),
  ttfb: (psi.value?.metrics?.new?.ttfb ?? lhNew.value.metrics?.ttfb ?? lhNew.value.ttfb ?? null),
  cls:  (psi.value?.metrics?.new?.cls  ?? lhNew.value.metrics?.cls  ?? lhNew.value.cls  ?? null),
  si:   (psi.value?.metrics?.new?.si   ?? lhNew.value.metrics?.si   ?? lhNew.value.si   ?? null),
  tbt:  (psi.value?.metrics?.new?.tbt  ?? lhNew.value.metrics?.tbt  ?? lhNew.value.tbt  ?? null),
  tti:  (psi.value?.metrics?.new?.tti  ?? lhNew.value.metrics?.tti  ?? lhNew.value.tti  ?? null),
}))

const hasOldPerf = computed(() => {
  const m = lhOld.value?.metrics;
  return !!m && Object.values(m).some(v => v != null);
})

const perfScoreOldPct = computed(() => {
  const s = fmtScore(psiOld.value ?? lhOld.value?.score);
  return Number.isFinite(s) ? s : 0;
})
const perfScoreNewPct = computed(() => {
  const s = fmtScore(psiNew.value ?? lhNew.value?.score);
  return Number.isFinite(s) ? s : 0;
})

/* -------- opportunities & layout -------- */
function impactBadge(ms){
  const v = Number(ms)||0
  if (v >= 20000) return { label: 'Critical', cls:'sev--critical' }
  if (v >=  5000) return { label: 'High',     cls:'sev--high' }
  if (v >=  1000) return { label: 'Medium',   cls:'sev--medium' }
  if (v >      0) return { label: 'Low',      cls:'sev--low' }
  return { label: 'Info', cls:'sev--info' }
}

const perfOpps = computed(() => {
  const list = props.performance?.opportunities?.new || []
  return [...list]
      .map(o => ({
        ...o,
        savingsMs: Number.isFinite(o.overallSavingsMs) ? o.overallSavingsMs : 0,
        savingsBytes: Number.isFinite(o.overallSavingsBytes) ? o.overallSavingsBytes : null,
      }))
      .filter(o => o.savingsMs > 0)
      .sort((a,b) => b.savingsMs - a.savingsMs)
})

const oppBuckets = computed(() => {
  const buckets = { critical:[], high:[], medium:[], low:[], info:[] };
  for (const o of perfOpps.value) {
    const sev = impactBadge(o.savingsMs).label.toLowerCase();
    const key = sev.startsWith('crit') ? 'critical'
        : sev.startsWith('high') ? 'high'
            : sev.startsWith('med')  ? 'medium'
                : sev.startsWith('low')  ? 'low'
                    : 'info';
    buckets[key].push(o);
  }
  return buckets;
})
const oppColumnOrder = ['critical','high','medium','low'];
const oppColumns = computed(() => oppColumnOrder.filter(k => oppBuckets.value[k].length > 0));
const oppGridCols = computed(() => `repeat(${Math.max(oppColumns.value.length, 1)}, minmax(260px, 1fr))`);
function colTitle(k){
  return k === 'critical' ? 'Critical'
      : k === 'high'     ? 'High'
          : k === 'medium'   ? 'Medium'
              : k === 'low'      ? 'Low'
                  : 'Info';
}

/* deltas per metric */
function deltaFor(k, newM, oldM){
  const n = newM?.[k], o = oldM?.[k]
  if(n==null || o==null) return null
  const d = n - o
  const arrow = d > 0 ? '▲' : '▼'
  const cls = d > 0 ? 'down' : 'up'
  const text = (k==='cls')
      ? `${d>0?'+':''}${d.toFixed(3)}`
      : `${d>0?'+':''}${Math.round(d)} ms`
  return { arrow, text, cls }
}
</script>

<template>
  <div class="card">
    <h2>Performance</h2>

    <div v-if="loading" class="shot--placeholder" style="height:180px;">
      <div class="loader"></div><div class="tiny muted" style="margin-top:6px;">Loading Lighthouse data…</div>
    </div>

    <template v-else>
      <div class="grid grid-2 summary">
        <!-- AEM -->
        <div class="sum-card">
          <div class="sum-card__label">Performance (AEM)</div>
          <div class="sum-card__num">{{ fmtScore(psiOld ?? lhOld?.score) ?? '—' }}</div>
          <div class="meter" :class="pctClass(perfScoreOldPct)">
            <div class="meter__bar" :style="{ width: perfScoreOldPct + '%' }"></div>
          </div>
          <table class="perf-mini">
            <thead><tr><th>Metric</th><th class="num">AEM</th></tr></thead>
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
            {{ fmtScore(psiNew ?? lhNew?.score) ?? '—' }}
            <span v-if="performance?.summary?.scoreDelta!=null"
                  :class="['tiny', scoreDeltaBadge(performance.summary.scoreDelta).cls]"
                  style="margin-left:6px;">
              {{ scoreDeltaBadge(performance.summary.scoreDelta).text }}
            </span>
          </div>
          <div class="meter" :class="pctClass(perfScoreNewPct)">
            <div class="meter__bar" :style="{ width: perfScoreNewPct + '%' }"></div>
          </div>
          <table class="perf-mini">
            <thead><tr><th>Metric</th><th class="num">Contentstack</th><th class="num" v-if="hasOldPerf">Delta</th></tr></thead>
            <tbody>
            <tr v-for="m in metricDefs" :key="'new-'+m.key">
              <td class="metric-cell muted">{{ m.label }} ({{ m.abbr }})</td>
              <td class="mono right">{{ m.isCls ? fmtCLS(vitalsNew[m.key]) : ms(vitalsNew[m.key]) || '—' }}</td>
              <td class="mono right" v-if="hasOldPerf">
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

      <!-- Performance Attention Points -->
      <div class="subcard">
        <h4 style="margin: 12px 0;">Attention Points <span class="muted attention-points">(Contentstack)</span></h4>
        <div v-if="!perfOpps.length" class="muted">No attention points reported. 🎉</div>
        <div v-else class="opps-grid" :style="{ gridTemplateColumns: oppGridCols }">
          <div v-for="col in oppColumns" :key="col" class="opp-col">
            <div class="opp-col__title">
              <span class="sev" :class="`sev--${col}`">{{ colTitle(col) }}</span>
            </div>
            <ul class="opps">
              <li v-for="o in oppBuckets[col]" :key="o.id" class="opp">
                <div class="opp__head"><span class="opp__title">{{ o.title }}</span></div>
                <p class="opp__desc">{{ o.description }}</p>
                <div class="tiny muted">
                  Est. savings: <b>{{ prettyMs(o.overallSavingsMs) }}</b>
                  <span v-if="o.overallSavingsBytes != null"> • <b>{{ prettyBytes(o.overallSavingsBytes) }}</b></span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
