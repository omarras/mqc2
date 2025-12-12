<!--src/components/FetchInputs.vue-->

<script setup>
import { ref, onMounted, watch } from "vue";

const props = defineProps({
  country: { type: String, default: "" },
  bu: { type: String, default: "" },
  runName: { type: String, default: "" }
});

const emit = defineEmits(["update:country", "update:bu", "update:runName"]);

const COUNTRY_KEY = "mqc_selected_country";
const BU_KEY = "mqc_selected_bu";

const countries = ref([]);
const countryOpen = ref(false);

async function loadCountries() {
  const res = await fetch("/console/ph-pse/mqc/api/locales/countries");
  const json = await res.json();
  countries.value = json.countries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({
        label: `${c.name} (${c.code})`,
        value: c.code,
      }));
}

const buOptions = [
  { label: "Personal Health (PH)", value: "PH" },
  { label: "Brand License (BL)", value: "BL" },
  { label: "Personal Health + Brand License (PH+BL)", value: "PH+BL" }
];

const buOpen = ref(false);

onMounted(() => {
  loadCountries();

  const savedCountry = localStorage.getItem(COUNTRY_KEY);
  if (savedCountry) emit("update:country", savedCountry);

  const savedBU = localStorage.getItem(BU_KEY);
  if (savedBU) emit("update:bu", savedBU);
});

watch(() => props.country, (v) => {
  if (v) localStorage.setItem(COUNTRY_KEY, v);
  else localStorage.removeItem(COUNTRY_KEY);
});

watch(() => props.bu, (v) => {
  if (v) localStorage.setItem(BU_KEY, v);
  else localStorage.removeItem(BU_KEY);
});
</script>

<template>
  <div class="grid grid-2 gap-14">

    <!-- COUNTRY -->
    <div class="field">
      <label>Country</label>

      <div class="dd-wrapper">
        <div
            class="dd-trigger"
            @click="
            countryOpen = !countryOpen;
            if (countryOpen) buOpen = false;
          "
        >
          <span v-if="country">
            {{ countries.find(c => c.value === country)?.label }}
          </span>
          <span v-else class="dd-placeholder">Select a country</span>

          <svg class="dd-chevron" :class="{ open: countryOpen }" viewBox="0 0 24 24">
            <path d="M19 9l-7 7-7-7" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <transition name="fade">
          <div v-if="countryOpen" class="dd-panel">
            <div
                v-for="c in countries"
                :key="c.value"
                class="dd-item"
                @click="
                emit('update:country', c.value);
                countryOpen = false;
              "
            >
              {{ c.label }}
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- BUSINESS UNIT -->
    <div class="field">
      <label>Business Unit</label>

      <div class="dd-wrapper">
        <div
            class="dd-trigger"
            @click="
            buOpen = !buOpen;
            if (buOpen) countryOpen = false;
          "
        >
          <span v-if="bu">
            {{ buOptions.find(b => b.value === bu)?.label }}
          </span>
          <span v-else class="dd-placeholder">Select a business unit</span>

          <svg class="dd-chevron" :class="{ open: buOpen }" viewBox="0 0 24 24">
            <path d="M19 9l-7 7-7-7" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <transition name="fade">
          <div v-if="buOpen" class="dd-panel">
            <div
                v-for="b in buOptions"
                :key="b.value"
                class="dd-item"
                @click="
                emit('update:bu', b.value);
                buOpen = false;
              "
            >
              {{ b.label }}
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- RUN NAME -->
    <div class="field col-span-2">
      <label>Run Name (optional)</label>
      <input
          class="dd-input"
          :value="runName"
          placeholder="My Fetch Run"
          @input="emit('update:runName', $event.target.value)"
      />
    </div>

  </div>
</template>

<style scoped>
.dd-wrapper {
  position: relative;
  display: inline-block;
  width: 100%; /* ensures trigger and panel share width */
}

.dd-trigger {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #0e1016;
  color: var(--ink);
  font-size: 18px;
  font-weight: 600;

  display: flex;
  align-items: center;
  justify-content: space-between;

  cursor: pointer;
  width: 100%;
}

.dd-panel {
  position: absolute;
  top: 100%;
  left: 0;

  width: 100%;                   /* <-- FIXED WIDTH */
  background: #0e1016;
  border: 1px solid var(--border);
  border-radius: 10px;

  margin-top: 6px;
  max-height: 260px;
  overflow-y: auto;

  box-shadow: 0 6px 20px rgba(0,0,0,.35);

  z-index: 50;
}

.dd-item {
  padding: 10px 12px;
  cursor: pointer;
  font-size: 16px;
}

.dd-item:hover {
  background: rgba(255,255,255,.05);
}

.dd-placeholder {
  color: var(--muted);
}

.dd-chevron {
  width: 18px;
  height: 18px;
  color: var(--muted);
  transition: transform .18s ease;
}

.dd-chevron.open {
  transform: rotate(180deg);
}

.dd-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #0e1016;
  color: var(--ink);
  font-size: 18px;
  font-weight: 600;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity .12s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
