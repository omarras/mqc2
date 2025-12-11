<script setup>
import { ref, computed } from 'vue'
import ZoomModal from './ZoomModal.vue'

const props = defineProps({
  loading:   { type: Boolean, default: false },
  oldSrc:    { type: String,  default: '' },   // screenshot AEM
  newSrc:    { type: String,  default: '' },   // screenshot CS
  oldUrl:    { type: String,  default: '' },   // already replaced with noCacheUrl by parent
  newUrl:    { type: String,  default: '' },   // already replaced with noCacheUrl by parent
  pair:      { type: Object,  default: null }  // for CS edit link
})

/* -----------------------------------------------------------------------------
   IMPORTANT:
   Parent (App.vue) *already replaces* oldUrl/newUrl with the noCache version.
   So we just use props.oldUrl / props.newUrl directly.
----------------------------------------------------------------------------- */
const canonicalOldUrl = computed(() => {
  return props.oldUrl || null;
});

const canonicalNewUrl = computed(() => {
  return props.newUrl || null;
});

/* -----------------------------------------------------------------------------
   Preview modal logic
----------------------------------------------------------------------------- */
const expanded = ref(false)
const showOldPlaceholder = computed(() => props.loading && !props.oldSrc)
const showNewPlaceholder = computed(() => props.loading && !props.newSrc)

const preview = ref({ open: false, src: '', label: '' })
function openPreview(src, label){
  if (!src) return
  preview.value = { open: true, src, label }
}
function closePreview(){ preview.value.open = false }

const compareOpen = ref(false);
const compareOld = ref(null);
const compareNew = ref(null);

function openCompare(payload) {
  compareOld.value = payload.old;
  compareNew.value = payload.new;
  compareOpen.value = true;
}

const emit = defineEmits(['compare'])

</script>

<template>
  <div class="card">
    <h2>Visual Comparison</h2>

    <div class="screenshots-wrapper" :class="{ expanded }">
      <div class="grid grid-2">

        <!-- AEM (OLD) ---------------------------------------------------------------- -->
        <div>
          <div class="shot-header">
            <div class="shot-title">From: <strong>AEM</strong></div>
            <div class="shot-actions">
              <a
                  class="open-link"
                  :href="canonicalOldUrl || undefined"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-disabled="!canonicalOldUrl"
                  :tabindex="canonicalOldUrl ? 0 : -1"
                  title="Open AEM page in a new tab"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M10 5H8.2c-1.12 0-1.68 0-2.11.218a2 2 0 0 0-.872.874C5 6.52 5 7.08 5 8.2v7.6c0 1.12 0 1.68.218 2.108.192.376.498.683.874.874C6.52 19 7.08 19 8.2 19h7.6c1.12 0 1.68 0 2.108-.218.376-.192.683-.498.874-.874C19 17.48 19 16.92 19 15.8V14M20 9V4m0 0h-5m5 0-7 7"
                        stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </a>
            </div>
          </div>

          <div v-if="showOldPlaceholder" class="shot shot--placeholder">
            <div class="loader"></div>
            <div class="tiny muted" style="margin-top:6px;">Generating screenshot…</div>
          </div>

          <div
              v-else-if="oldSrc"
              class="shot"
              :class="{ 'shot--clickable': !!oldSrc }"
              role="button"
              tabindex="0"
              @click="openPreview(oldSrc, 'AEM')"
              @keydown.enter.prevent="openPreview(oldSrc, 'AEM')"
          >
            <img :src="oldSrc" alt="AEM screenshot" style="width:100%;height:auto;display:block" />
          </div>

          <div v-else class="muted tiny">No screenshot available</div>
        </div>

        <!-- CONTENTSTACK (NEW) -------------------------------------------------------- -->
        <div>
          <div class="shot-header">
            <div class="shot-title">To: <strong>Contentstack</strong></div>
            <div class="shot-actions">

              <a
                  v-if="pair"
                  class="open-link"
                  :href="pair.contentstackEditUrl || undefined"
                  target="_blank"
                  rel="noopener"
                  :aria-disabled="!pair.contentstackEditUrl"
                  :tabindex="pair.contentstackEditUrl ? 0 : -1"
                  title="Edit in Contentstack"
              >
                <svg class="feather feather-edit-2" fill="none" height="20" stroke="currentColor"
                     stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                     viewBox="0 0 24 24" width="20"
                     xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                </svg>
              </a>

              <a
                  class="open-link"
                  :href="canonicalNewUrl || undefined"
                  target="_blank"
                  rel="noopener noreferrer"
                  :aria-disabled="!canonicalNewUrl"
                  :tabindex="canonicalNewUrl ? 0 : -1"
                  title="Open Contentstack page in a new tab"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                     viewBox="0 0 24 24" fill="none">
                  <path d="M10 5H8.2c-1.12 0-1.68 0-2.11.218a2 2 0 0 0-.872.874C5 6.52 5 7.08 5 8.2v7.6c0 1.12 0 1.68.218 2.108.192.376.498.683.874.874C6.52 19 7.08 19 8.2 19h7.6c1.12 0 1.68 0 2.108-.218.376-.192.683-.498.874-.874C19 17.48 19 16.92 19 15.8V14M20 9V4m0 0h-5m5 0-7 7"
                        stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </a>

            </div>
          </div>

          <div v-if="showNewPlaceholder" class="shot shot--placeholder">
            <div class="loader"></div>
            <div class="tiny muted" style="margin-top:6px;">Generating screenshot…</div>
          </div>

          <div
              v-else-if="newSrc"
              class="shot"
              :class="{ 'shot--clickable': !!newSrc }"
              role="button"
              tabindex="0"
              @click="openPreview(newSrc, 'Contentstack')"
              @keydown.enter.prevent="openPreview(newSrc, 'Contentstack')"
          >
            <img :src="newSrc" alt="Contentstack screenshot" style="width:100%;height:auto;display:block" />
          </div>

          <div v-else class="muted tiny">No screenshot available</div>
        </div>

      </div>
    </div>

    <div class="screenshot-toggle">
      <button
          v-if="oldSrc && newSrc"
          class="cmp-btn"
          @click="() => {
            console.log('[Screenshots] emitting compare', { old: oldSrc, new: newSrc })
            emit('compare', { old: oldSrc, new: newSrc })
          }"
      >
        Side-by-Side Comparison
      </button>
    </div>
  </div>

  <ZoomModal
      v-if="preview.open"
      :open="preview.open"
      :src="preview.src"
      :label="preview.label"
      @close="closePreview"
  />
</template>

<style scoped>
.shot--clickable { cursor: zoom-in; }
.shot[role="button"] { outline: none; }
.shot[role="button"]:focus { box-shadow: 0 0 0 2px var(--border); }
</style>
