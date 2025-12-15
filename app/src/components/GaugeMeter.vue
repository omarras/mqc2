<!--src/components/Gaugemeter.vue-->
<script setup>
import { computed } from "vue";

// Props
const props = defineProps({
  label:     { type: String, required: true },
  // ✅ allow "unknown"
  value:     { type: [Number, String, null], default: null },
  size:      { type: Number,  default: 160 },
  subtitle:  { type: String,  default: "" },
  thickness: { type: Number,  default: 8 }   // ring width
});

// Geometry
const vb = 120;
const r  = 52;
const cx = 60, cy = 60;
const C  = 2 * Math.PI * r;

// ✅ detect unknown vs known value
const hasValue = computed(() =>
    props.value !== null && props.value !== undefined && props.value !== ""
);

const numeric = computed(() => {
  if (!hasValue.value) return null;
  const n = Number(props.value);
  return Number.isFinite(n) ? n : null;
});

const clamped = computed(() => {
  if (numeric.value === null) return null;
  return Math.max(0, Math.min(100, Math.round(numeric.value)));
});

const dashOffset = computed(() => {
  // if unknown, don't draw progress
  if (clamped.value === null) return C;
  return C * (1 - clamped.value / 100);
});

// Traffic-light zones
const toneKey = computed(() => {
  if (clamped.value === null) return "warn"; // arbitrary, unused while loading
  return clamped.value >= 90 ? "ok" : clamped.value >= 50 ? "warn" : "bad";
});

// Unique ids so multiple components don’t share gradients
const uid = `g-${Math.random().toString(36).slice(2, 8)}`;
const gradId = computed(() => `${uid}-${toneKey.value}`);

const aria = computed(() =>
    clamped.value === null ? `${props.label}: loading` : `${props.label}: ${clamped.value}`
);
</script>

<template>
  <div class="gauge" :style="{ width: size + 'px', height: size + 'px' }" :aria-label="aria" role="img">
    <svg :viewBox="`0 0 ${vb} ${vb}`" class="gauge__svg">
      <defs>
        <linearGradient :id="`${uid}-ok`"
                        gradientUnits="userSpaceOnUse"
                        :x1="cx" :y1="cy - r"
                        :x2="cx" :y2="cy + r">
          <stop offset="0%"  stop-color="#34d399"/>
          <stop offset="100%" stop-color="#a7f3d0"/>
        </linearGradient>

        <linearGradient :id="`${uid}-warn`"
                        gradientUnits="userSpaceOnUse"
                        :x1="cx" :y1="cy - r"
                        :x2="cx" :y2="cy + r">
          <stop offset="0%"  stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#fde68a"/>
        </linearGradient>

        <linearGradient :id="`${uid}-bad`"
                        gradientUnits="userSpaceOnUse"
                        :x1="cx" :y1="cy - r"
                        :x2="cx" :y2="cy + r">
          <stop offset="0%"  stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#fca5a5"/>
        </linearGradient>
      </defs>

      <g :transform="`rotate(-90 ${cx} ${cy})`">
        <circle
            :cx="cx" :cy="cy" :r="r"
            class="gauge__track"
            :stroke-width="thickness"
            fill="none"
        />

        <!-- ✅ only show progress when we have a real value -->
        <circle
            v-if="clamped !== null"
            :cx="cx" :cy="cy" :r="r"
            class="gauge__progress"
            :stroke="`url(#${gradId})`"
            :stroke-width="thickness"
            stroke-linecap="round"
            :stroke-dasharray="C"
            :stroke-dashoffset="dashOffset"
            fill="none"
        />
      </g>
    </svg>

    <div class="gauge__center">
      <!-- VALUE (or loader if unknown) -->
      <div v-if="clamped === null" class="gauge__loader">
        <div class="loader"></div>
      </div>
      <div v-else class="gauge__value">{{ clamped }}</div>

      <!-- LABEL always visible -->
      <div class="gauge__label">{{ label }}</div>

      <!-- SUBTITLE only when present and value is known (optional) -->
      <div v-if="subtitle && clamped !== null" class="gauge__sub">{{ subtitle }}</div>
    </div>
  </div>
</template>

<style scoped>
.gauge{
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
  margin:auto;
}
.gauge__svg{ width:70%; height:70%; display:block; }

.gauge__track{
  stroke: rgba(255,255,255,0.08);
}
.gauge__progress{
  filter: drop-shadow(0 2px 6px rgba(0,0,0,.35));
}

/* Center labels */
.gauge__center{
  position:absolute; inset:0;
  display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  pointer-events:none; text-align:center;
}
.gauge__value{
  font-weight:900; font-size:32px; letter-spacing:-.02em; color: #ffffff;
}
.gauge__label{
  position: absolute;
  bottom:0;
  font-size:14px; color:var(--muted); text-transform:uppercase;
  font-weight: 500;
}
.gauge__sub{
  margin-top:2px; font-size:11px; color:var(--muted);
}

/* ✅ loader placement, keep your existing .loader styles */
.gauge__loader{
  display:flex;
  align-items:center;
  justify-content:center;
}
</style>
