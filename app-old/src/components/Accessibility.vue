<script setup>
import { computed } from 'vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  a11y: { type: Object, default: null }
})

/* ---- local helpers (self-contained) ---- */
function pctClass(p){
  const n = Math.max(0, Math.min(100, Number(p) || 0))
  if (n >= 90) return 'meter--great'
  if (n >= 50) return 'meter--warn'
  return 'meter--bad'
}
function scoreDeltaBadge(d) {
  if (d == null || !Number.isFinite(d)) return { text: '', cls: '' };
  const arrow = d > 0 ? '▲' : '▼';
  const cls   = d > 0 ? 'up' : 'down';
  return { text: `${arrow} ${d>0?'+':''}${Math.round(d)}`, cls };
}
const clampPct = v => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
};
const A11Y_SEV_ORDER = ['critical','serious','moderate','minor']
function normalizeSeverity(s){
  const k = String(s||'').toLowerCase()
  if (k.startsWith('crit')) return 'critical'
  if (k.startsWith('seri')) return 'serious'
  if (k.startsWith('mod'))  return 'moderate'
  if (k.startsWith('min'))  return 'minor'
  return 'minor'
}

/* ---- derived values ---- */
const a11yScoreOldPct = computed(() => clampPct(props.a11y?.old?.score))
const a11yScoreNewPct = computed(() => clampPct(props.a11y?.new?.score))
const a11yScoreDelta  = computed(() => {
  const o = props.a11y?.old?.score, n = props.a11y?.new?.score
  return (Number.isFinite(o) && Number.isFinite(n)) ? (n - o) : null
})

const a11yFailuresNew = computed(() => props.a11y?.new?.failures ?? [])
const a11yBuckets = computed(() => {
  const buckets = { critical:[], serious:[], moderate:[], minor:[] }
  for (const f of a11yFailuresNew.value) {
    const sev = normalizeSeverity(f.severity || f.impact)
    if (sev in buckets) buckets[sev].push(f)
  }
  return buckets
})
const a11yCols = computed(() => A11Y_SEV_ORDER.filter(k => a11yBuckets.value[k].length > 0))
const a11yGridCols = computed(() => `repeat(${Math.max(a11yCols.value.length, 1)}, minmax(260px, 1fr))`)
function a11yColTitle(k){
  return k === 'critical' ? 'Critical'
      : k === 'serious'  ? 'Serious'
          : k === 'moderate' ? 'Moderate'
              : 'Violations'
}
</script>

<template>
  <div class="card">
    <h2>Accessibility <span class="a11y">(EAA / WCAG 2.1 AA)</span></h2>

    <div v-if="loading" class="shot--placeholder" style="height:180px;">
      <div class="loader"></div><div class="tiny muted" style="margin-top:6px;">Loading Lighthouse data…</div>
    </div>

    <template v-else>
      <div class="grid grid-2 summary">
        <div class="sum-card">
          <div class="sum-card__label">Accessibility (AEM)</div>
          <div class="sum-card__num">{{ a11y?.old?.score ?? '—' }}</div>
          <div class="meter" :class="pctClass(a11yScoreOldPct)">
            <div class="meter__bar" :style="{ width: a11yScoreOldPct + '%' }"></div>
          </div>
          <table class="perf-mini" style="margin-top:8px;">
            <thead><tr><th>Violations</th><th class="num">Findings</th></tr></thead>
            <tbody>
            <tr>
              <td class="metric-cell">Findings</td>
              <td class="mono right">{{ a11y?.old?.counts?.unknown ?? 0 }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div class="sum-card">
          <div class="sum-card__label">Accessibility (Contentstack)</div>
          <div class="sum-card__num">
            {{ a11y?.new?.score ?? '—' }}
            <span v-if="a11yScoreDelta!=null" :class="['tiny', scoreDeltaBadge(a11yScoreDelta).cls]" style="margin-left:6px;">
              {{ scoreDeltaBadge(a11yScoreDelta).text }}
            </span>
          </div>
          <div class="meter" :class="pctClass(a11yScoreNewPct)">
            <div class="meter__bar" :style="{ width: a11yScoreNewPct + '%' }"></div>
          </div>
          <table class="perf-mini" style="margin-top:8px;">
            <thead><tr><th>Violations</th><th class="num">Findings</th></tr></thead>
            <tbody>
            <tr>
              <td class="metric-cell">Findings</td>
              <td class="mono right">{{ a11y?.new?.counts?.unknown ?? 0 }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="subcard">
        <h4 style="margin: 12px 0;">Attention Points <span class="muted attention-points">(Contentstack)</span></h4>
        <div v-if="!a11yCols.length" class="muted">No attention points reported. 🎉</div>
        <div v-else class="opps-grid" :style="{ gridTemplateColumns: a11yGridCols }">
          <div v-for="col in a11yCols" :key="col" class="opp-col">
            <div class="opp-col__title">
              <span class="sev" :class="`sev--${col}`">{{ a11yColTitle(col) }}</span>
            </div>
            <ul class="opps">
              <li v-for="(f,i) in a11yBuckets[col]" :key="f.id || i" class="opp">
                <div class="opp__head"><span class="opp__title">{{ f.title }}</span></div>
                <p class="opp__desc">{{ f.description }}</p>
                <div class="tiny muted" v-if="Array.isArray(f.nodes) && f.nodes.length">
                  Example: <span class="tiny mono">{{ f.nodes[0].selector }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div class="tiny muted" style="margin-top:8px;">
          Based on automated axe-core checks for WCAG 2.1 A/AA (EAA-aligned).
        </div>
      </div>
    </template>
  </div>
</template>
