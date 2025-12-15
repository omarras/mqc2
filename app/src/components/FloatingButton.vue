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

const VivaEngageIcon = defineComponent({
  name: "VivaEngage",
  render() {
    return h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 512 512",
          width: "28",
          height: "28",
          fill: "currentColor"
        },
        [
          h("path", {
            d: "M305.652 246.304c3.437.077 6.959.058 10.364.036l1.697-.01l3.105-.031q3.731-.001 7.461-.013c6.015-.015 12.238-.031 18.371.048h3.854l1.229-3.994c2.774-8.991 4.266-17.044 4.566-24.62c1.366-34.408-11.315-63.131-37.69-85.373c-18.881-15.919-40.831-23.727-65.198-23.204c-31.698.683-57.702 13.336-77.291 37.611c-22.481 27.859-28.899 59.763-19.076 94.826c.035.126.075.232.114.339l.121.35l1.306 3.931l4.19.182c.209.011.421.029.641.021c5.719-.133 11.513-.088 17.118-.047c6.335.046 12.885.096 19.289-.109q1.899-.062 3.777-.062c16.387 0 31.593 3.481 45.254 10.368l5.623 2.987l4.343-2.292c14.086-7.65 29.853-11.336 46.832-10.944"
          }),
          h("path", {
            d: "m233.211 96.406l1.761-.507l-1.312-2.18c-.39-.63-.82-1.308-1.324-2.079c-20.318-31.204-49.189-47.53-85.814-48.526a55 55 0 0 0-2.189-.044c-5.355 0-10.571.743-15.127 1.46c-22.989 3.614-44.423 16.249-60.355 35.575c-15.943 19.34-24.186 42.737-23.211 65.885c1.288 30.59 13.196 55.746 35.393 74.771c16.645 14.269 35.829 22.482 57.02 24.414l4.571.433l-.229-.996c-.161-.942-.441-2.131-.812-3.625c-4.996-20.145-5.043-39.489-.139-57.495c12.463-45.769 42.167-74.763 88.287-86.176a99 99 0 0 0 3.48-.91"
          }),
          h("path", {
            d: "M274.43 433.141c17.346-20.418 25.593-45.973 23.187-71.965c-4.777-51.849-47.202-90.957-98.685-90.996l-55.43-.059h-.414c-33.704 0-63.343-12.423-90.654-37.979a162 162 0 0 1-9.767-10.02v122.049c0 65.538 50.812 120.499 115.674 125.143l7.933.019c14.405-.059 28.021-.693 41.617-1.568c24.962-1.606 49.214-14.227 66.539-34.624"
          }),
          h("path", {
            d: "M354.21 469.293c64.311-4.623 115.123-59.584 115.123-125.122V222.122c-3.255 3.631-6.492 6.945-9.768 10.001c-27.29 25.575-56.969 37.998-90.673 37.998h-.414l-55.431.059c-9.233.02-18.212 1.229-26.835 3.631c4.557 4.047 9.056 8.472 13.063 13.573c29.698 37.798 36.998 80.042 21.687 125.559c-6.848 20.258-18.392 37.66-34.415 51.846a85.7 85.7 0 0 0 17.523 2.976c13.634.875 27.211 1.509 40.828 1.568z"
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
  { id: "bug", label: "Report a Bug", icon: BugIcon },
  { id: "docs", label: "Component Library", icon: DocsIcon },
  { id: "questions", label: "Viva Engage", icon: VivaEngageIcon },
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
