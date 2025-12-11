<!-- src/components/ZoomModal.vue -->
<template>
  <Teleport to="body">
    <div v-if="open" class="modal" @keydown.esc.prevent="emitClose" ref="root">
      <div class="modal__backdrop" @click="emitClose" />
      <div
          class="modal__dialog"
          role="dialog"
          aria-modal="true"
          :aria-label="label || 'Screenshot preview'"
          tabindex="-1"
          ref="dialog"
      >
        <header class="modal__header">
          <div class="modal__title" v-text="label || 'Preview'" />
          <div class="modal__actions">
            <button class="mode-btn" @click="emitClose" aria-label="Close">Close</button>
          </div>
        </header>

        <div
            class="modal__body"
            ref="viewport"
            @wheel="onWheel"
            @mousedown="startPan"
            @mousemove="onPan"
            @mouseup="endPan"
            @mouseleave="endPan"
            @touchstart.passive="startPan"
            @touchmove.passive="onPan"
            @touchend.passive="endPan"
            @dblclick.prevent="toggleFit"
        >
          <!-- We size the IMG via width/height to create scrollable area -->
          <img
              :src="src"
              :alt="label || 'Screenshot'"
              class="modal__img"
              ref="img"
              :style="imgStyle"
              @load="onLoaded"
              draggable="false"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  open:         { type: Boolean, default: false },
  src:          { type: String,  required: true },
  label:        { type: String,  default: '' },
  initialScale: { type: Number,  default: 1 },
  maxScale:     { type: Number,  default: 4 },
  // Hard minimum for manual zoom (fit can go below this!)
  minScale:     { type: Number,  default: 0.25 },
})
const emit = defineEmits(['close'])

const img       = ref(null)
const dialog    = ref(null)
const viewport  = ref(null)

const imgNatural = ref({ w: 0, h: 0 })
const fitScale   = ref(1)      // can be < minScale; represents "fit to viewport"
const scale      = ref(1)      // current zoom (can be == fitScale even if < minScale)
const hardMinScale = computed(() => props.minScale)

// panning via scroll
let panning = false
let panStart = { x: 0, y: 0 }
let scrollStart = { x: 0, y: 0 }

function emitClose(){ emit('close') }

function computeFitScale () {
  const vp = viewport.value
  const n  = imgNatural.value
  if (!vp || !n.w || !n.h) return 1
  const s = Math.min(vp.clientWidth / n.w, vp.clientHeight / n.h)
  // IMPORTANT: do NOT clamp to minScale here — fit must be allowed below 1
  return Math.min(s, props.maxScale)
}

function applyScaleKeepingPivot (next, pivotPx) {
  const vp = viewport.value
  if (!vp) { scale.value = next; return }
  // Keep the pixel under the cursor in place:
  // newScroll = (oldScroll + pivot) * k - pivot
  const k = next / scale.value
  const newLeft = (vp.scrollLeft + (pivotPx?.x ?? vp.clientWidth/2)) * k - (pivotPx?.x ?? vp.clientWidth/2)
  const newTop  = (vp.scrollTop  + (pivotPx?.y ?? vp.clientHeight/2)) * k - (pivotPx?.y ?? vp.clientHeight/2)
  scale.value = next
  // apply after next tick-ish so width/height reflect new scale
  requestAnimationFrame(() => {
    vp.scrollLeft = newLeft
    vp.scrollTop  = newTop
  })
}

function onLoaded () {
  if (!img.value) return
  imgNatural.value = { w: img.value.naturalWidth, h: img.value.naturalHeight }
  fitScale.value = computeFitScale()
  // start at max(initial, fit)
  scale.value = Math.max(props.initialScale, fitScale.value)
  requestAnimationFrame(() => positionImage('top'))
}

function onResize () {
  if (!props.open) return
  const wasAtFit = Math.abs(scale.value - fitScale.value) < 0.001
  fitScale.value = computeFitScale()
  if (wasAtFit) {
    scale.value = fitScale.value
    positionImage('top')
  }
}

function zoomIn ()  { setScale(scale.value + 0.25) }
function zoomOut () { setScale(scale.value - 0.25) }
function reset ()   { scale.value = fitScale.value; positionImage('center') }

function toggleFit(){
  if (Math.abs(scale.value - fitScale.value) < 0.01) {
    // jump to a reasonable zoom above fit
    const target = Math.min(Math.max(fitScale.value * 2, props.minScale), props.maxScale)
    setScale(target)
  } else {
    scale.value = fitScale.value
    centerImage()
  }
}

function setScale (next, pivot) {
  // Manual zoom is clamped to [minScale, maxScale], but we will allow fit (< minScale) via reset/toggle
  const lower = Math.min(props.minScale, fitScale.value) // allow going down to fit
  const clamped = Math.max(lower, Math.min(props.maxScale, next))
  // Find pivot relative to viewport for stable zooming
  let pivotPx
  if (pivot && viewport.value) {
    const rect = viewport.value.getBoundingClientRect()
    pivotPx = { x: pivot.x - rect.left, y: pivot.y - rect.top }
  }
  applyScaleKeepingPivot(clamped, pivotPx)
}

function startPan (e) {
  if (!viewport.value) return
  // Only start panning when zoomed beyond fit (otherwise default scroll is fine)
  if (scale.value <= fitScale.value) return
  panning = true
  const pt = getPoint(e)
  panStart = { x: pt.x, y: pt.y }
  scrollStart = { x: viewport.value.scrollLeft, y: viewport.value.scrollTop }
}

function onPan (e) {
  if (!panning || !viewport.value) return
  const pt = getPoint(e)
  const dx = pt.x - panStart.x
  const dy = pt.y - panStart.y
  viewport.value.scrollLeft = scrollStart.x - dx
  viewport.value.scrollTop  = scrollStart.y - dy
}

function endPan () { panning = false }

function onWheel (e) {
  if (!viewport.value) return
  const metaZoom = e.ctrlKey || e.metaKey
  if (metaZoom) {
    e.preventDefault()
    setScale(scale.value + (e.deltaY > 0 ? -0.15 : 0.15), { x: e.clientX, y: e.clientY })
    return
  }
  // Otherwise let the viewport scroll naturally; if at fit, it likely won't scroll anyway
  // We do not preventDefault so trackpads/mice scroll the content.
}

function getPoint (e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
  return { x: e.clientX, y: e.clientY }
}

const imgStyle = computed(() => {
  // We size the image intrinsically; the viewport will show scrollbars if needed
  const w = imgNatural.value.w * scale.value
  const h = imgNatural.value.h * scale.value
  return {
    width: w ? `${w}px` : null,
    height: h ? `${h}px` : null,
  }
})

const atTopLeft = computed(() => {
  const vp = viewport.value
  if (!vp) return true
  return vp.scrollLeft === 0 && vp.scrollTop === 0
})

function centerImage(){
  const vp = viewport.value
  if (!vp) return
  const w = imgNatural.value.w * scale.value
  const h = imgNatural.value.h * scale.value
  // Center by scrolling so the image is centered in the viewport when smaller or larger
  const targetLeft = Math.max(0, (w - vp.clientWidth) / 2)
  const targetTop  = Math.max(0, (h - vp.clientHeight) / 2)
  vp.scrollLeft = targetLeft
  vp.scrollTop  = targetTop
}

watch(() => props.open, (o) => {
  if (o) {
    requestAnimationFrame(() => dialog.value?.focus())
    window.addEventListener('resize', onResize)
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  } else {
    window.removeEventListener('resize', onResize)
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
  }
})

onMounted(() => { if (props.open) window.addEventListener('resize', onResize) })
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
})

function positionImage(mode = 'top') {
  const vp = viewport.value
  if (!vp) return
  const w = imgNatural.value.w * scale.value
  const h = imgNatural.value.h * scale.value

  if (mode === 'center') {
    vp.scrollLeft = Math.max(0, (w - vp.clientWidth) / 2)
    vp.scrollTop  = Math.max(0, (h - vp.clientHeight) / 2)
  } else if (mode === 'top-left') {
    vp.scrollLeft = 0
    vp.scrollTop  = 0
  } else if (mode === 'top') {
    // horizontally center, vertically top
    vp.scrollLeft = Math.max(0, (w - vp.clientWidth) / 2)
    vp.scrollTop  = 0
  }
}
</script>

<style scoped>
.modal{
  position: fixed; inset: 0; z-index: 9999;
}
.modal__backdrop{
  position: absolute; inset: 0; background: rgba(0,0,0,.7); backdrop-filter: blur(2px);
}
.modal__dialog{
  position: relative;
  z-index: 1;
  margin: 4vh auto 0;
  width: min(96vw, 1400px);
  max-height: 92vh;
  background: var(--card, #111218);
  border: 1px solid var(--border, #1f2430);
  border-radius: 16px;
  box-shadow: 0 20px 80px rgba(0,0,0,.6);
  display: grid;
  grid-template-rows: auto 1fr;
  outline: none;
}
.modal__header{
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border, #1f2430);
}
.modal__title{ font-weight: 700; letter-spacing: .01em; }
.modal__actions{ display: inline-flex; align-items: center; gap: 8px; }
.modal__scale{ width: 48px; text-align: center; font-variant-numeric: tabular-nums; opacity: .9; }

/* KEY: allow scrolling inside the viewport */
.modal__body{
  position: relative;
  overflow: auto;                /* scrollbars appear when zoomed */
  background: #0a0c12;
  border-radius: 0 0 16px 16px;
  height: 100%;
  touch-action: none;            /* enables smooth touch panning via our handlers */
  cursor: grab;
}
.modal__body:active{ cursor: grabbing; }

/* Image sizes are controlled via width/height (NOT transform) so it can scroll responsively */
.modal__img{
  display: block;
  max-width: none;
  image-rendering: auto;
  user-select: none;
  pointer-events: none;          /* we drag the container instead */
  margin: 0;                     /* no extra margins */
}
</style>
