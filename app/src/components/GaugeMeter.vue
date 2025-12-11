<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  label:     { type: String, required: true },
  value:     { type: Number,  default: 0 },
  size:      { type: Number,  default: 160 },
  subtitle:  { type: String,  default: '' },
  thickness: { type: Number,  default: 8 },   // ring width
})

// Geometry
const vb = 120
const r  = 52
const cx = 60, cy = 60
const C  = 2 * Math.PI * r

// Value
const clamped    = computed(() => Math.max(0, Math.min(100, Math.round(props.value ?? 0))))
const dashOffset = computed(() => C * (1 - clamped.value / 100))

// Traffic-light zones
const toneKey = computed(() => (clamped.value >= 90 ? 'ok' : clamped.value >= 50 ? 'warn' : 'bad'))

// Unique ids so multiple components don’t share gradients
const uid = `g-${Math.random().toString(36).slice(2, 8)}`
const gradId = computed(() => `${uid}-${toneKey.value}`)

const aria = computed(() => `${props.label}: ${clamped.value}`)
</script>

<template>
  <div class="gauge" :style="{ width: size + 'px', height: size + 'px' }" :aria-label="aria" role="img">
    <svg :viewBox="`0 0 ${vb} ${vb}`" class="gauge__svg">
      <defs>
        <!-- Anchor the gradient to the circle, not the bbox -->
        <!-- 0% at (cx, cy - r) = top of the ring; 100% at bottom -->
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

      <!-- rotate so 0 starts at 12 o’clock -->
      <g :transform="`rotate(-90 ${cx} ${cy})`">
        <!-- Grey track -->
        <circle
            :cx="cx" :cy="cy" :r="r"
            class="gauge__track"
            :stroke-width="thickness"
            fill="none"
        />
        <!-- Gradient progress -->
        <circle
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
      <div class="gauge__value">{{ clamped }}</div>
      <div class="gauge__label">{{ label }}</div>
      <div v-if="subtitle" class="gauge__sub">{{ subtitle }}</div>
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

/* optional: tint the number slightly by tone */
.tone-ok   { color:#34d399; }
.tone-warn { color:#f59e0b; }
.tone-bad  { color:#ef4444; }
</style>
