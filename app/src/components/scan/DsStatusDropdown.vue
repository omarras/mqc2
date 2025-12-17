<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import * as api from "../../api/runs.js";

/**
 * 🔒 GLOBAL OPEN STATE
 */
const openDropdownId = window.__dsDropdownOpenId ??= ref(null);

const props = defineProps({
  scan: { type: Object, required: true },
  runId: { type: String, required: true },
  scanId: { type: String, required: true },
  badgeClass: { type: String, required: true }
});

const buttonRef = ref(null);
const menuStyle = ref({});

const STATUSES = [
  "Ready for UAT",
  "UAT feedback provided",
  "UAT approved"
];

const current = computed(() => props.scan?.metadata?.dsStatus || "");
const isOpen = computed(() => openDropdownId.value === props.scanId);

function updatePosition() {
  if (!buttonRef.value) return;
  const r = buttonRef.value.getBoundingClientRect();

  menuStyle.value = {
    position: "absolute",
    top: `${r.bottom + window.scrollY + 6}px`,
    left: `${r.right + window.scrollX}px`,
    transform: "translateX(-100%)",
    zIndex: 9999
  };
}

function toggle(e) {
  e.stopPropagation();
  openDropdownId.value = isOpen.value ? null : props.scanId;
}

function close() {
  if (isOpen.value) openDropdownId.value = null;
}

async function selectStatus(s) {
  if (s === current.value) return;
  await api.updateDsStatus(props.runId, props.scanId, s);
  close();
}

function onClickOutside(e) {
  if (!buttonRef.value?.contains(e.target)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener("click", onClickOutside);
  window.addEventListener("scroll", updatePosition, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onClickOutside);
  window.removeEventListener("scroll", updatePosition, true);
});

watch(isOpen, (v) => {
  if (v) updatePosition();
});

/* Badge styling for options */
function optionBadgeClass(label) {
  const v = label.toLowerCase();
  if (v.includes("approved")) return "badge badge--ok";
  if (v.includes("feedback")) return "badge badge--neutral";
  if (v.includes("ready")) return "badge badge--info";
  return "badge badge--neutral";
}
</script>

<template>
  <!-- BADGE BUTTON -->
  <button
      ref="buttonRef"
      type="button"
      class="result-status badge--dropdown"
      :class="badgeClass"
      @click="toggle"
  >
    {{ current || "Set UAT status" }}
    <span class="caret">▾</span>
  </button>

  <!-- DROPDOWN (ESCAPES ACCORDION) -->
  <Teleport to="body">
    <div
        v-if="isOpen"
        class="ds-dropdown-menu"
        :style="menuStyle"
    >
      <button
          v-for="s in STATUSES"
          :key="s"
          class="ds-dropdown-item"
          :class="optionBadgeClass(s)"
          :disabled="s === current"
          @click.stop="selectStatus(s)"
      >
        {{ s }}
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.badge--dropdown {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.caret {
  font-size: 0.75em;
  opacity: 0.8;
}

.ds-dropdown-menu {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;

  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  padding: 8px;

  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
}

.ds-dropdown-item {
  width: fit-content;
  cursor: pointer;
}

.ds-dropdown-item:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>
