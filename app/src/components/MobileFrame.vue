<!--src/components/MobileFrame.vue-->

<template>
    <div class="device-wrapper"
         @click="$emit('open')"
         title="Open mobile preview">

      <div id="iphone-x">
        <div class="device device-iphone-x">
          <div class="device-frame">
            <div class="device-content">

              <!-- Placeholder (same logic + same styling as desktop) -->
              <div v-if="showMobilePlaceholder" class="shot shot--placeholder-mobile">
                <div class="loader"></div>
                <div class="tiny muted" style="margin-top:6px;">Generating screenshot…</div>
              </div>

              <img
                v-else-if="src"
                :src="src"
                class="phone__img"
                alt="Mobile screenshot"
              />

              <div v-else class="phone__placeholder">
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
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  src: { type: String, default: '' },
  loading: { type: Boolean, default: false }
});
defineEmits(['open']);
const showMobilePlaceholder = computed(() => props.loading && !props.src)
</script>

<style scoped>
.device-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: transform .2s ease;
  margin-bottom: 20px;
}

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

/* The main phone frame */
.device-iphone-x .device-frame {
  background: #222;
  border-radius: 50px;
  box-shadow: inset 0 0 2px 0 #c8cacb, inset 0 0 0 3px #e2e3e4;
  height: 525px;    /* 700 * 0.75 */
  width: 265px;     /* 354 * 0.75 */
  padding: 9px;
  position: relative;
}

/* Scrollable screenshot area */
.device .device-content {
  background-color: #111218;
  border-radius: 40px;
  height: 100%;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.phone__img {
  width: 100%;
  height: auto !important;
  display: block;
}

/* Placeholder */
.phone__placeholder {
  color: #777;
  text-align: center;
  padding: 40px;
  font-size: 14px;
}

/* Decorative elements from CodePen */
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
  margin-left: -90px;
  position: absolute;
  top: 5px;
  width: 180px;
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
.device-wrapper.disabled {
  cursor: default;
  opacity: .6;
  pointer-events: none;
}

.phone__placeholder {
  width: 100%;
  padding: 30px 0;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.loader.small {
  width: 28px;
  height: 28px;
  margin: 0 auto 10px auto;
  border: 3px solid #ccc;
  border-top-color: #666;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
