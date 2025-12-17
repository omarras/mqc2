<!--src/components/FloatingButton.vue-->

<template>
  <div class="fab-container" ref="fabRef">
    <!-- Main Help Button (Question mark) -->
    <button class="fab" @click="toggle">
      <svg  style="margin-left: 6px; margin-top: 4px;" fill="#FFFFFF" width="40px" height="40px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.998.046A6.954 6.954 0 1 1 4.099 13.32l-3.466.627a.5.5 0 0 1-.556-.668l.994-2.646A6.954 6.954 0 0 1 6.998.046m-.379 4.399A.995.995 0 1 1 7 6.36a.625.625 0 0 0-.625.625v1.08a.625.625 0 1 0 1.25 0V7.52a2.245 2.245 0 1 0-2.87-2.157a.625.625 0 0 0 1.25 0a.995.995 0 0 1 .614-.919ZM7 11.39a.895.895 0 0 1 .002-1.79h.002a.895.895 0 0 1-.002 1.79z"/>
      </svg>
    </button>

    <!-- Sub Buttons -->
    <transition-group name="fab" tag="div" class="fab-options">
      <div
          class="fab-item"
          v-for="(item, index) in itemsToRender"
          :key="item.id"
          v-show="isOpen"
          :style="{ '--i': index }"
          @click="handleClick(item)"
      >
        <span class="fab-label">{{ item.label }}</span>
        <button class="fab-sub">
          <component :is="item.icon" class="sub-icon" />
        </button>

      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, h, defineComponent } from "vue";

const BugIcon = defineComponent({
  name: "BugIcon",
  render() {
    return h(
        "svg",
        { viewBox: "0 0 22 22", width: "28", height: "28" },
        [
          h("path", {
            d: "m15.3 14.89l2.77 2.77a1 1 0 0 1 0 1.41a1 1 0 0 1-1.41 0l-2.59-2.58A5.99 5.99 0 0 1 11 18V9.04a1 1 0 0 0-2 0V18a5.98 5.98 0 0 1-3.07-1.51l-2.59 2.58a1 1 0 0 1-1.41 0a1 1 0 0 1 0-1.41l2.77-2.77A5.95 5.95 0 0 1 4.07 13H1a1 1 0 1 1 0-2h3V8.41L.93 5.34a1 1 0 0 1 0-1.41a1 1 0 0 1 1.41 0l2.1 2.1h11.12l2.1-2.1a1 1 0 0 1 1.41 0a1 1 0 0 1 0 1.41L16 8.41V11h3a1 1 0 1 1 0 2h-3.07c-.1.67-.32 1.31-.63 1.89zM15 5H5a5 5 0 1 1 10 0z"
          })
        ]
    );
  }
});

const DocsIcon = defineComponent({
  name: "DocsIcon",
  render() {
    return h(
        "svg",
        { viewBox: "0 0 24 24", width: "28", height: "28" },
        [
          h("path", {
            d: "M18.5 7.076V7A6 6 0 0 0 6.841 5H12a2 2 0 0 1 2 2v1.022A6.47 6.47 0 0 1 17.5 7q.51 0 1 .076M13 23a4 4 0 0 1-4-4h3a2 2 0 0 0 2-2v-1.874A4.002 4.002 0 0 1 13 23m1-8.9a5 5 0 0 1 4 4.878a5.5 5.5 0 1 0-4-9.72zM1 17V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1m5.719-8.47c.87-.109 1.856.068 2.487.249l-.412 1.442c-.535-.153-1.3-.276-1.888-.202c-.293.037-.463.113-.547.182c-.052.043-.109.107-.109.299c0 .07.018.166.239.326c.242.177.591.33 1.048.518l.07.03c.399.164.887.366 1.272.632c.426.294.871.767.871 1.494c0 .685-.24 1.256-.741 1.626c-.455.337-1.015.424-1.49.436c-.489.012-1.003-.054-1.45-.126q-.291-.047-.528-.09a13 13 0 0 0-.634-.102l.186-1.488c.221.027.496.075.768.123c.153.027.305.053.446.076c.427.069.83.116 1.174.108c.358-.01.548-.078.635-.142c.041-.03.134-.106.134-.421v-.002c0-.026.001-.103-.223-.257c-.248-.172-.6-.319-1.064-.51l-.01-.005c-.417-.173-.938-.388-1.348-.687c-.436-.318-.855-.81-.855-1.54c0-.607.234-1.11.657-1.457c.39-.32.876-.456 1.312-.511Z"
          })
        ]
    );
  }
});

const CSIcon = defineComponent({
  name: "CSIcon",
  render() {
    return h(
        "svg",
        { viewBox: "0 0 33 33", width: "28", height: "28" },
        [
          h("path", {
            d: "M29.2357 14.4976V20.4976L14.5873 22.4988L0 20.4976V14.4976L14.5873 12.4965L29.2357 14.4976ZM0 28.4988V22.4988L8.52734 26.9988L29.2357 22.4988V28.4988L8.52734 35L0 28.4988ZM29.2357 6.50118V12.5012L20.7084 8.00118L0 12.5V6.5L20.7084 0L29.2357 6.50118Z"
          })
        ]
    );
  }
});

/* ---------------- Defaults & Props ---------------- */

const defaultItems = [
  { id: "bug", label: "Report a bug", icon: BugIcon },
  { id: "docs", label: "Component Library", icon: DocsIcon },
  { id: "contentstack", label: "Contentstack", icon: CSIcon }
];

const props = defineProps({
  // Optional override: you can pass your own items if you want
  items: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["action"]);
const isOpen = ref(false);

const itemsToRender = computed(() => {
  if (props.items && props.items.length) {
    return props.items;
  }
  return defaultItems;
});

function toggle() {
  isOpen.value = !isOpen.value;
}

function handleClick(item) {
  emit("action", item);
  // optionally close after click:
  // isOpen.value = false;
}

const fabRef = ref(null);
fabRef.value = undefined;

function handleOutsideClick(e) {
  if (!fabRef.value) return;

  // If the click is NOT inside the FAB container → collapse
  if (!fabRef.value.contains(e.target)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleOutsideClick);
});

</script>

<style scoped>
.fab-container {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 9999;
}

/* Main FAB */
.fab {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: #472683;
  border: none;
  cursor: pointer;
  color: white;
  display: grid;
  justify-content: center;
  place-items: center;
  box-shadow: 0 8px 25px rgba(0,0,0,.4);
  transition: transform .25s ease, background .25s ease;
}

.fab:hover {
  transform: scale(1.08);
  background: #472683;
}

.fab-icon {
  width: 36px;
  height: 36px;
  fill: #fff;
}

/* Sub-items wrapper */
.fab-options {
  position: absolute;
  bottom: 90px;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: center;
  align-items: flex-end;
}

/* Sub-item */
.fab-item {
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
  animation: fadeIn .28s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Sub button */
.fab-sub {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: #472683;
  border: 1px solid #2e3244;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background .2s ease, border .2s ease;
}

.fab-sub:hover {
  background: #5e34ae;
  border-color: #472683;
}

.sub-icon {
  width: 28px;
  height: 28px;
  fill: #fff;
}

/* Hover Tooltip */
.fab-label {
  background: #0e1118;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 14px;
  border: 1px solid #2e3244;
  opacity: 0;
  transform: translateX(10px);
  transition: opacity .22s ease, transform .22s ease;
  pointer-events: none;
}

.fab-item:hover .fab-label {
  opacity: 1;
  transform: translateX(0);
}

/* Remove native browser blue highlight on click */
button,
button:focus,
button:active,
button:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

/* Safari, iOS, macOS blue overlay */
button {
  -webkit-tap-highlight-color: transparent;
  -webkit-focus-ring-color: rgba(0,0,0,0);
}

.fab-leave-active {
  transition: none !important;
}
.fab-leave-from,
.fab-leave-to {
  opacity: 0 !important;
  transform: translateY(0) !important;
}


</style>
