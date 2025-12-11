<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  loading: { type: Boolean, default: false },
  data: { type: Object, default: null },
  toggles: { type: Object, default: () => ({ "link-checker": true }) }
});

/* -----------------------------------------------------------
   PAYLOAD SHAPE DETECTION
----------------------------------------------------------- */
const payload = computed(() => {
  const d = props.data;
  if (!d) return null;

  if (d.aem && d.contentstack) {
    return { old: d.aem, new: d.contentstack };
  }

  if (d.old && d.new) {
    return d;
  }

  const alt =
      d["link-checker"] ||
      d.linkChecker ||
      d.linkchecker ||
      d.data ||
      null;

  if (alt && alt.old && alt.new) {
    return alt;
  }

  return null;
});

/* -----------------------------------------------------------
   GET LINKS FROM BACKEND RESPONSE
----------------------------------------------------------- */
function extractLinks(obj) {
  if (!obj) return [];
  return obj.allLinks || obj.links || [];
}

/* -----------------------------------------------------------
   NORMALIZED DATA MODEL FOR UI
----------------------------------------------------------- */
const normalized = computed(() => {
  if (!payload.value) return null;

  const oldLinks = extractLinks(payload.value.old);
  const newLinks = extractLinks(payload.value.new);

  return {
    aem: {
      links: oldLinks,
      score: Math.round((payload.value.old?.score ?? 1) * 100)
    },
    contentstack: {
      links: newLinks,
      score: Math.round((payload.value.new?.score ?? 1) * 100)
    }
  };
});

const aem = computed(() => normalized.value?.aem || null);
const cs = computed(() => normalized.value?.contentstack || null);

const ready = computed(() => {
  return !!cs.value && !props.loading;
});

/* -----------------------------------------------------------
   TABLE ROWS (BACKEND DECIDES EVERYTHING NOW)
----------------------------------------------------------- */
const rows = computed(() => {
  if (!cs.value) return [];

  return cs.value.links.map((l) => ({
    url: l.url,
    type: l.type || "external",
    initialStatus: l.initialStatus,
    finalStatus: l.finalStatus,
    redirected: !!l.redirected,
    finalUrl: l.finalUrl,
    secure: l.secure,
    score: l.score,
    outcome: l.outcome
  }));
});

/* -----------------------------------------------------------
   FILTERING
----------------------------------------------------------- */
const showAll = ref(false);

const problemRows = computed(() =>
    rows.value.filter((r) => r.outcome !== "success")
);

const filteredRows = computed(() =>
    showAll.value ? rows.value : problemRows.value
);

/* -----------------------------------------------------------
   ICONS BASED ON BACKEND OUTCOME
----------------------------------------------------------- */
function outcomeIcon(row) {
  if (row.outcome === "success")
    return { icon: "✓", cls: "badge2 badge--ok" };
  if (row.outcome === "warning")
    return { icon: "!", cls: "badge2 badge--neutral" };
  return { icon: "✖", cls: "badge2 badge--bad" };
}

/* -----------------------------------------------------------
   STATUS LABEL
----------------------------------------------------------- */
function statusLabel(s) {
  if (s === 200) return "OK";
  if (s >= 300 && s < 400) return "Redirect";
  if (!s) return "Unknown";
  return s;
}

/* -----------------------------------------------------------
   METER BAR COLOR
----------------------------------------------------------- */
function pctClass(score) {
  if (score >= 90) return "meter--great";
  if (score >= 50) return "meter--warn";
  return "meter--bad";
}
</script>

<template>
  <div v-if="toggles['link-checker']" class="card">
    <h2>Page Link Checker</h2>

    <div v-if="!ready" class="shot--placeholder" style="height:160px;">
      <div class="loader"></div>
      <div class="tiny muted" style="margin-top:6px;">Loading link data…</div>
    </div>

    <template v-else>
      <!-- SUMMARY (AEM & Contentstack) -->
      <div class="grid grid-2 summary" style="margin-top:8px;">
        <div class="sum-card">
          <div class="sum-card__label">Links (AEM)</div>
          <div class="sum-card__num">{{ aem.links.length }} total</div>

          <div class="tiny muted">Link Quality Score</div>
          <div class="meter" :class="pctClass(aem.score)">
            <div class="meter__bar" :style="{ width: aem.score + '%' }"></div>
          </div>
        </div>

        <div class="sum-card">
          <div class="sum-card__label">Links (Contentstack)</div>
          <div class="sum-card__num">{{ cs.links.length }} total</div>

          <div class="tiny muted">Link Quality Score</div>
          <div class="meter" :class="pctClass(cs.score)">
            <div class="meter__bar" :style="{ width: cs.score + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Links table -->
      <div class="subcard">
        <h4 style="margin: 12px 0;">Links <span class="muted">(Contentstack)</span></h4>

        <div class="show-all" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <div class="tiny muted">
            Showing <strong>{{ filteredRows.length }}</strong> of <strong>{{ rows.length }}</strong> links
            <span v-if="!showAll">— filtering to errors & warnings</span>
          </div>

          <label style="display: flex; gap: 8px; align-items: center;">
            <input type="checkbox" v-model="showAll" />
            <span>Show all links</span>
          </label>
        </div>

        <div class="seo-table-wrapper">
          <table class="seo-table">
            <colgroup>
              <col style="width:44%;" />
              <col style="width:10%;" />
              <col style="width:14%;" />
              <col style="width:10%;" />
              <col style="width:10%;" />
            </colgroup>
            <thead>
            <tr>
              <th>URL</th>
              <th>Type</th>
              <th>Status</th>
              <th class="status">Secure</th>
              <th class="status">Success</th>
            </tr>
            </thead>

            <tbody>
            <tr v-for="(r, i) in filteredRows" :key="r.url + i">
              <td>
                <a :href="r.url" target="_blank" class="mono">{{ r.url }}</a>

                <div v-if="r.redirected" class="tiny muted mono">
                  → final URL:
                  <a :href="r.finalUrl" target="_blank">{{ r.finalUrl }}</a>
                </div>
              </td>

              <td class="mono">{{ r.type }}</td>

              <td class="mono">
                {{ r.initialStatus }} <span class="muted">({{ statusLabel(r.initialStatus) }})</span>
                <div v-if="r.redirected && r.finalUrl" class="tiny muted mono">
                  final: {{ r.finalStatus }} ({{ statusLabel(r.finalStatus) }})
                </div>
              </td>

              <td class="status-cell">
                  <span :class="['badge', r.secure ? 'badge--ok' : 'badge--bad']">
                    {{ r.secure ? "✓" : "✖" }}
                  </span>
              </td>

              <td class="status-cell">
                  <span :class="['badge', outcomeIcon(r).cls]">
                    {{ outcomeIcon(r).icon }}
                  </span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
