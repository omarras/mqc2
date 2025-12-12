<script setup>
import { ref, computed } from "vue";
import RemarksBar from "./RemarksBar.vue";
import { translateToEnglish } from "../utils/translate.js";

const props = defineProps({
  loading: Boolean,
  ops: { type: Array, default: () => [] },
  showToggle: { type: Boolean, default: true },
  pair: { type: Object, default: null }
});

const showAllLines = ref(false);

// New
const translated = ref(null);
const translating = ref(false);
const showTranslation = ref(false);

const translateButtonLabel = computed(() => {
  if (translating.value) return "Translating…";
  if (!translated.value) return "Translate to English";
  return showTranslation.value ? "Show Original" : "Show English";
});

/* -------------------------------------------------------------------------
   TRANSLATION: translate all ops textOld/textNew → English
------------------------------------------------------------------------- */
async function handleTranslateToggle() {
  // Case 1: user has not translated yet → run translation
  if (!translated.value) {
    translating.value = true;
    translated.value = [];

    for (const op of props.ops) {
      const tOld = await translateToEnglish(op.textOld || "");
      const tNew = await translateToEnglish(op.textNew || "");

      translated.value.push({
        ...op,
        textOld: tOld,
        textNew: tNew
      });
    }

    translating.value = false;
    showTranslation.value = true; // immediately switch to English
    return;
  }

  // Case 2: translation already exists → toggle
  showTranslation.value = !showTranslation.value;
}

/* -------------------------------------------------------------------------
   CHARACTER DIFF HELPERS (unchanged)
------------------------------------------------------------------------- */
function charDiff(oldText, newText) {
  const diffs = [];
  let i = 0, j = 0;

  while (i < oldText.length || j < newText.length) {
    if (oldText[i] === newText[j]) {
      diffs.push({ type: "equal", charOld: oldText[i], charNew: newText[j] });
      i++, j++;
      continue;
    }
    if (i < oldText.length && (oldText[i] !== newText[j] || j >= newText.length)) {
      diffs.push({ type: "delete", charOld: oldText[i], charNew: "" });
      i++;
      continue;
    }
    if (j < newText.length && (newText[j] !== oldText[i] || i >= oldText.length)) {
      diffs.push({ type: "insert", charOld: "", charNew: newText[j] });
      j++;
      continue;
    }
  }
  return diffs;
}

function collapseCharDiff(diffs) {
  const first = diffs.findIndex(d => d.type !== "equal");
  if (first === -1) return null;

  const last = diffs.length - 1 - [...diffs].reverse().findIndex(d => d.type !== "equal");
  const oldChars = diffs.map(d => d.charOld || "");
  const newChars = diffs.map(d => d.charNew || "");

  return {
    aLeft: oldChars.slice(0, first).join(""),
    aDiff: oldChars.slice(first, last + 1).join("") || "␣",
    aRight: oldChars.slice(last + 1).join(""),

    bLeft: newChars.slice(0, first).join(""),
    bDiff: newChars.slice(first, last + 1).join("") || "␣",
    bRight: newChars.slice(last + 1).join("")
  };
}

/* -------------------------------------------------------------------------
   NORMALIZE OPS (works for both raw + translated ops)
------------------------------------------------------------------------- */
function normalizeOps(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  const rows = [];

  for (const op of raw) {
    const leftText = op.textOld || "";
    const rightText = op.textNew || "";

    switch (op.op) {
      case "equal":
        rows.push({
          op: "equal",
          oldLn: op.oldIndex ?? null,
          newLn: op.newIndex ?? null,
          old: { text: leftText, cls: "eq" },
          new: { text: rightText, cls: "eq" }
        });
        break;

      case "delete":
        rows.push({
          op: "delete",
          oldLn: op.oldIndex ?? null,
          newLn: "",
          old: { text: leftText, cls: "del" },
          new: { text: "", cls: "eq" }
        });
        break;

      case "insert":
        rows.push({
          op: "insert",
          oldLn: "",
          newLn: op.newIndex ?? null,
          old: { text: "", cls: "eq" },
          new: { text: rightText, cls: "ins" }
        });
        break;

      case "similar": {
        let fine = null;
        if (!op.missingWords && !op.addedWords && leftText !== rightText) {
          fine = collapseCharDiff(charDiff(leftText, rightText));
        }
        rows.push({
          op: "similar",
          oldLn: op.oldIndex ?? null,
          newLn: op.newIndex ?? null,
          old: { text: leftText, cls: "sim", fine },
          new: { text: rightText, cls: "sim", fine },
          similarity: op.similarity,
          missingWords: op.missingWords,
          addedWords: op.addedWords
        });
        break;
      }
    }
  }

  return rows;
}

const rowsToUse = computed(() =>
    showTranslation.value && translated.value ? translated.value : props.ops
);

const normalizedRows = computed(() => normalizeOps(rowsToUse.value));

const visibleRows = computed(() =>
    showAllLines.value ? normalizedRows.value : normalizedRows.value.filter(r => r.op !== "equal")
);
</script>

<template>
  <div class="card">
    <h2>Text Comparison</h2>
    <RemarksBar v-if="pair" :pair="pair" />

    <div v-if="loading" class="shot--placeholder" style="height:160px;">
      <div class="loader"></div>
      <div class="tiny muted">Loading diff…</div>
    </div>

    <template v-else>
      <div class="controls-row">
        <div v-if="showToggle">
          <label>
            <input type="checkbox" v-model="showAllLines" /> Show all content
          </label>
        </div>

        <button @click="handleTranslateToggle" :disabled="translating">
          {{ translateButtonLabel }}
        </button>
      </div>

      <div class="diff-table-wrapper">
        <table class="diff-table">
          <thead>
          <tr>
            <th>#</th><th>AEM content</th>
            <th>#</th><th>Contentstack content</th>
          </tr>
          </thead>

          <tbody>
          <tr v-for="(r, i) in visibleRows" :key="'row' + i">
            <td>{{ r.oldLn }}</td>
            <td>
              <div :class="'seg seg--' + r.old.cls">
                <template v-if="r.op === 'similar' && r.old.fine">
                  <span>{{ r.old.fine.aLeft }}</span>
                  <span class="diff-missing">{{ r.old.fine.aDiff }}</span>
                  <span>{{ r.old.fine.aRight }}</span>
                </template>
                <template v-else>{{ r.old.text }}</template>
              </div>
            </td>

            <td>{{ r.newLn }}</td>
            <td>
              <div :class="'seg seg--' + r.new.cls">
                <template v-if="r.op === 'similar' && r.new.fine">
                  <span>{{ r.new.fine.bLeft }}</span>
                  <span class="diff-added">{{ r.new.fine.bDiff }}</span>
                  <span>{{ r.new.fine.bRight }}</span>
                </template>
                <template v-else>{{ r.new.text }}</template>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.diff-missing { background: rgba(255,120,120,0.35); padding: 2px; }
.diff-added { background: rgba(120,180,255,0.35); padding: 2px; }
.seg--eq {}
.seg--del { background: #ffd7d7; }
.seg--ins { background: #d7f4ff; }
.seg--sim { background: #fff6d5; }
</style>
