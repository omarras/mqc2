<!--src/components/MobileModal.vue-->

<template>
  <Teleport to="body">
    <div v-if="open" class="mm" @keydown.esc.prevent="emitClose">
      <div class="mm__backdrop" @click="emitClose" />

      <div class="mm__dialog" tabindex="-1" ref="dialog">
        <header class="mm__header">
          <div class="title">Mobile Preview (Contentstack)</div>
          <button class="close" @click="emitClose">Close</button>
        </header>

        <div class="mm__body">
          <!-- SAME iPhone X FRAME AS THE SMALL VERSION -->
          <div class="iphone-modal-container">
            <div id="iphone-x">
              <div class="device device-iphone-x">
                <div class="device-frame">
                  <div class="device-content">
                    <div v-if="loading" class="shot shot--placeholder" style="padding:40px 0;">
                      <div class="loader"></div>
                      <div class="tiny muted" style="margin-top:6px;">Generating screenshot…</div>
                    </div>

                    <img
                        v-else-if="src"
                        :src="src"
                        class="modal-img"
                    />

                    <div v-else class="tiny muted" style="padding:40px 0;">
                      No mobile screenshot
                    </div>
                  </div>

                  <div class="device-stripe"></div>
                  <div class="device-header"></div>
                  <div class="device-sensors"></div>
                  <div class="device-btns"></div>
                  <div class="device-power"></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  src: { type: String, default: null },
  loading: { type: Boolean, default: false }
})
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
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    }
);
</script>

<style scoped>
/* Modal container */
.mm {
  position: fixed;
  inset: 0;
  z-index: 9999;
}
.mm__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.7);
  backdrop-filter: blur(2px);
}
.mm__dialog {
  position: relative;
  background: #000;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  z-index: 1;
  color: white;
}
.mm__header {
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,0.12);
}
.close {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.3);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}
.mm__body {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
}

/* Container that centers the big phone */
.iphone-modal-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 90vw;
  height: 90vh;
}

/* COPY OF YOUR FRAME STYLES (same as MobileFrame.vue) */

.device-wrapper,
.device,
.device *,
.device:after,
.device :after,
.device:before,
.device :before {
  box-sizing: border-box;
  display: block;
}

.device {
  position: relative;
  text-align: center;
}

/* Phone frame */
.device-iphone-x .device-frame {
  aspect-ratio: 354 / 700; /** KEEP REAL PHONE PROPORTIONS **/
  height: 90vh;            /** Scale based on viewport height **/
  max-height: 90vh;
  max-width: 90vw;
  width: auto;             /** Width recalculates automatically **/

  background: #222;
  border-radius: 50px;
  box-shadow: inset 0 0 2px 0 #c8cacb,
  inset 0 0 0 3px #e2e3e4;
  padding: 9px;
  position: relative;
}

.modal-img {
  width: 100%;
  height: auto;
  object-fit: contain;  /* ensures no overflow */
  display: block;
}

/* Scrollable content */
.device .device-content {
  background-color: #111218;
  border-radius: 40px;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  width: 100%;
}
.phone__img {
  width: 100%;
  height: auto !important;
  display: block;
}
.phone__placeholder {
  color: #777;
  text-align: center;
  padding: 40px;
}

/* Decorative details */
.device-iphone-x .device-stripe:after,
.device-iphone-x .device-stripe:before {
  border: solid rgba(51, 51, 51, .25);
  border-width: 0 7px;
  content: "";
  height: 7px;
  left: 0;
  position: absolute;
  width: 100%;
  z-index: 9;
}
.device-iphone-x .device-stripe:after { top: 85px; }
.device-iphone-x .device-stripe:before { bottom: 85px; }

.device-iphone-x .device-header {
  background: #222;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  height: 30px;
  left: 50%;
  margin-left: -102px;
  position: absolute;
  top: 5px;
  width: 204px;
}
.device-iphone-x .device-header:after,
.device-iphone-x .device-header:before {
  content: "";
  height: 10px;
  position: absolute;
  top: 0;
  width: 10px;
}
.device-iphone-x .device-header:after {
  background: radial-gradient(circle at bottom left, transparent 75%, #222 0);
  left: -10px;
}
.device-iphone-x .device-header:before {
  background: radial-gradient(circle at bottom right, transparent 75%, #222 0);
  right: -10px;
}

.device-iphone-x .device-sensors:after {
  background: #444;
  border-radius: 3px;
  content: "";
  height: 6px;
  left: 50%;
  margin-left: -25px;
  position: absolute;
  top: 16px;
  width: 50px;
}
.device-iphone-x .device-sensors:before {
  background: #444;
  border-radius: 50%;
  content: "";
  height: 14px;
  left: 50%;
  margin-left: 40px;
  position: absolute;
  top: 12px;
  width: 14px;
}

.device-iphone-x .device-btns {
  background: #c8cacb;
  height: 32px;
  left: -3px;
  position: absolute;
  top: 115px;
  width: 3px;
}
.device-iphone-x .device-btns:after,
.device-iphone-x .device-btns:before {
  background: #c8cacb;
  content: "";
  height: 62px;
  left: 0;
  position: absolute;
  width: 3px;
}
.device-iphone-x .device-btns:after { top: 60px; }
.device-iphone-x .device-btns:before { top: 140px; }

.device-iphone-x .device-power {
  background: #c8cacb;
  height: 100px;
  position: absolute;
  right: -3px;
  top: 200px;
  width: 3px;
}
</style>
