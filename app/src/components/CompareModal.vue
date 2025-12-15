<!--src/components/CompareModal.vue-->

<template>
  <Teleport to="body">
    <div v-if="open" class="cmp" @keydown.esc.prevent="emitClose">
      <div class="cmp__backdrop" @click="emitClose" />

      <div class="cmp__dialog" role="dialog" tabindex="-1" ref="dialog">
        <header class="cmp__header">
          <div class="cmp__title">Side-by-Side Comparison</div>
          <button class="cmp__close" @click="emitClose">Close</button>
        </header>

        <div class="cmp__body">
          <!-- LEFT / OLD -->
          <div class="cmp__col">
            <div class="cmp__col-label">
              <strong>AEM</strong>
            </div>

            <div class="cmp__viewport">
              <img
                  v-if="srcOld"
                  :src="srcOld"
                  class="cmp__img"
                  alt="Old screenshot"
                  @load="loadedOld = true"
              />
              <div v-else class="cmp__placeholder">No screenshot</div>
            </div>
          </div>

          <!-- RIGHT / NEW -->
          <div class="cmp__col">
            <div class="cmp__col-label">
              <strong>Contentstack</strong>
            </div>

            <div class="cmp__viewport">
              <img
                  v-if="srcNew"
                  :src="srcNew"
                  class="cmp__img"
                  alt="New screenshot"
                  @load="loadedNew = true"
              />
              <div v-else class="cmp__placeholder">No screenshot</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  srcOld: { type: String, default: "" },
  srcNew: { type: String, default: "" }
});
const emit = defineEmits(["close"]);

const dialog = ref(null);

function emitClose() {
  emit("close");
}

watch(
    () => props.open,
    (val) => {
      if (val) {
        requestAnimationFrame(() => dialog.value?.focus());
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
      } else {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    }
);

onBeforeUnmount(() => {
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
});
</script>

<style scoped>
/* Fullscreen root container */
.cmp {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

/* Dimmed backdrop */
.cmp__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.7);
  backdrop-filter: blur(2px);
}

/* Full-bleed dialog */
.cmp__dialog {
  position: relative;
  inset: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  background: #0a0c12;
  color: white;
  display: flex;
  flex-direction: column;
  z-index: 1;
  outline: none;
  border-radius: 0;
}

/* Header */
.cmp__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.12);
  background: #111218;
}

.cmp__title {
  font-size: 18px;
  font-weight: 600;
}

.cmp__close {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.25);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

/* Two-column layout */
.cmp__body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

/* Column */
.cmp__col {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: #111218 1px solid;
}

/* labels */
.cmp__col-label {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.12);
  font-size: 14px;
  opacity: .85;
  background: #111218;
}

/* Scrollable screenshot areas */
.cmp__viewport {
  flex: 1;
  overflow: auto;
  background: #0a0c12;
  border-right: #111218 1px solid;
}

/* img inside viewport */
.cmp__img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}

/* missing screenshot */
.cmp__placeholder {
  color: #999;
  font-size: 14px;
  padding: 20px;
}
</style>
