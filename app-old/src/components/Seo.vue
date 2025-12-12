<!--src/components/Seo.vue-->

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  seo:     { type: Object,  default: null },   // { old: {score}, new: {score}, delta }
  rules:   { type: Array,   default: () => [] } // seo rules table rows
})

/* local UI state */
const showFullSeoRules = ref(false)
const showAllSeoRules = ref(false)

/* local helpers */
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

const hasRules = computed(() => props.rules && props.rules.length > 0)

/* === Filtering: show only failing by default (hide OK and N/A/neutral) === */
const totalRules = computed(() => props.rules.length)
const isOkOrNa = r => !!(r?.status?.ok || r?.status?.neutral)
const failingRules = computed(() => props.rules.filter(r => !isOkOrNa(r)))
const filteredRules = computed(() => showAllSeoRules.value ? props.rules : failingRules.value)
</script>

<template>
  <div class="card">
    <h2>SEO</h2>

    <!-- Summary meters -->
    <div v-if="loading" class="shot--placeholder" style="height:180px;">
      <div class="loader"></div>
      <div class="tiny muted" style="margin-top:6px;">Loading Lighthouse data…</div>
    </div>

    <template v-else>
      <div class="grid grid-2 summary" style="margin-top:8px;">
        <!-- AEM -->
        <div class="sum-card">
          <div class="sum-card__label">SEO (AEM)</div>
          <div class="sum-card__num">{{ seo?.old?.score ?? '—' }}</div>
          <div class="meter" :class="pctClass(seo?.old?.score ?? 0)">
            <div class="meter__bar" :style="{ width: (seo?.old?.score ?? 0) + '%' }"></div>
          </div>
        </div>

        <!-- Contentstack -->
        <div class="sum-card">
          <div class="sum-card__label">SEO (Contentstack)</div>
          <div class="sum-card__num">
            {{ seo?.new?.score ?? '—' }}
            <span :class="['tiny', scoreDeltaBadge(seo?.delta ?? 0).cls]" style="margin-left:6px;">
              {{ scoreDeltaBadge(seo?.delta ?? 0).text }}
            </span>
          </div>
          <div class="meter" :class="pctClass(seo?.new?.score ?? 0)">
            <div class="meter__bar" :style="{ width: (seo?.new?.score ?? 0) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Rules table -->
      <div class="seo-rules-wrapper" :class="{ expanded: showFullSeoRules }">
        <div v-if="!hasRules" class="shot--placeholder" style="height:140px;">
          <div class="loader"></div>
          <div class="tiny muted" style="margin-top:6px;">Loading SEO rules…</div>
        </div>

        <template v-else>
          <!-- Controls: show only failing by default -->
          <div style="display:flex; align-items:center; gap:12px; justify-content:space-between; margin-top:8px; margin-bottom:10px;">
            <div class="tiny muted">
              Showing <strong>{{ filteredRules.length }}</strong> of <strong>{{ totalRules }}</strong> rules
              <span v-if="!showAllSeoRules">— filtering to <strong>{{ failingRules.length }}</strong> failing</span>
            </div>
            <label style="display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
              <input
                type="checkbox"
                v-model="showAllSeoRules"
                aria-label="Show all SEO rules"
              />
              <span class="toggle">Show all rules</span>
            </label>
          </div>

          <div class="seo-table-wrapper">
            <table class="seo-table">
              <colgroup>
                <col class="col-id" />
                <col class="col-metric" />
                <col class="col-old" />
                <col class="col-new" />
                <col class="col-status" />
              </colgroup>
              <thead>
              <tr>
                <th class="id">Rule</th>
                <th>Metric</th>
                <th>AEM</th>
                <th>Contentstack</th>
                <th class="status">Status</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="(row, i) in filteredRules" :key="'rule'+(row.id ?? i)">
                <td class="mono muted id-cell">{{ row.id ?? (i + 1) }}</td>
                <td class="muted">{{ row.key }}</td>
                <td class="mono">{{ row.oldVal }}</td>
                <td class="mono">{{ row.newVal }}</td>
                <td class="status-cell">
                  <span :class="['badge',
                                row.status?.neutral ? 'badge--neutral'
                                : (row.status?.ok ? 'badge--ok' : 'badge--bad')
                              ]">
                    {{ row.status?.label || '—' }}
                  </span>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>

      <div class="screenshot-toggle">
        <button @click="showFullSeoRules = !showFullSeoRules">
          {{ showFullSeoRules ? 'Show less' : 'Show more' }}
        </button>
      </div>
    </template>
  </div>
</template>
