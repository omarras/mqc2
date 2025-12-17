<script setup>
import { ref, computed } from "vue";
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

/* -------------------------------------------------------------------------
   TRANSLATION: translate all ops textOld/textNew → English
------------------------------------------------------------------------- */
async function runTranslation() {
  if (translating.value) return;

  translating.value = true;
  showTranslation.value = false; // keep showing original while we work

  const out = [];

  for (const op of props.ops) {
    const newOp = { ...op };

    newOp.textOld = await translateToEnglish(op.textOld || "");
    newOp.textNew = await translateToEnglish(op.textNew || "");

    out.push(newOp);
  }

  translated.value = out;         // assign once, when complete
  translating.value = false;
  showTranslation.value = true;   // now you can switch to English
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

const hasTranslation = computed(
    () => Array.isArray(translated.value) && translated.value.length > 0
);

const rowsToUse = computed(() =>
    showTranslation.value && hasTranslation.value ? translated.value : props.ops
);

const normalizedRows = computed(() => normalizeOps(rowsToUse.value));

const visibleRows = computed(() =>
    showAllLines.value ? normalizedRows.value : normalizedRows.value.filter(r => r.op !== "equal")
);
</script>

<template>
  <div v-if="loading" class="shot--placeholder" style="height:160px;">
    <div class="loader"></div>
    <div class="tiny muted">Loading diff…</div>
  </div>

  <template v-else>
    <div class="controls-row"
         style="display:flex; gap:12px; align-items:center; justify-content:space-between; margin-bottom:8px;">
      <label v-if="showToggle" class="tgl" title="Show all content">
        <input type="checkbox" checked="" v-model="showAllLines">
        <span class="tgl__ui">
            <span class="tgl__switch" aria-hidden="true">
              <span class="tgl__track"></span>
              <span class="tgl__thumb"></span>
            </span><span class="tgl__text">Show all content</span>
          </span>
      </label>

      <button
          v-if="!hasTranslation"
          @click="runTranslation"
          class="translation_button"
          :disabled="translating"

      >
        {{ translating ? "Translating…" : "Translate to English" }}
      </button>

      <button
          v-if="hasTranslation && !translating"
          class="translation_button"
          @click="showTranslation = !showTranslation"
      >
        {{ showTranslation ? "Show Original" : "Show English" }}
      </button>

    </div>

    <div class="diff-table-wrapper">
      <table class="diff-table">
        <colgroup>
          <col class="col-ln" /><col class="col-cell" />
          <col class="col-ln" /><col class="col-cell" />
        </colgroup>

        <thead>
        <tr>
          <th class="muted">#</th><th>AEM content</th>
          <th class="muted">#</th><th>Contentstack content</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="(r, i) in visibleRows" :key="'row' + i">

          <!-- LEFT SIDE -->
          <td class="diff__ln mono">{{ r.oldLn }}</td>
          <td class="diff__cell">
            <div :class="['seg', 'seg--' + r.old.cls]">
              <template v-if="r.op === 'similar' && r.old.fine">
                <span>{{ r.old.fine.aLeft }}</span>
                <span class="diff-missing">{{ r.old.fine.aDiff }}</span>
                <span>{{ r.old.fine.aRight }}</span>
              </template>

              <template v-else-if="r.op === 'similar'">
                <span>{{ r.old.text }}</span>
                <span v-if="r.missingWords" class="sim-missing"> (missing: {{ r.missingWords }})</span>
              </template>

              <template v-else>
                {{ r.old.text || ' ' }}
              </template>
            </div>
          </td>

          <!-- RIGHT SIDE -->
          <td class="diff__ln mono">{{ r.newLn }}</td>
          <td class="diff__cell">
            <div :class="['seg', 'seg--' + r.new.cls]">
              <template v-if="r.op === 'similar' && r.new.fine">
                <span>{{ r.new.fine.bLeft }}</span>
                <span class="diff-added">{{ r.new.fine.bDiff }}</span>
                <span>{{ r.new.fine.bRight }}</span>
              </template>

              <template v-else-if="r.op === 'similar'">
                <span>{{ r.new.text }}</span>
                <span v-if="r.addedWords" class="sim-added">(added: {{ r.addedWords }})</span>
              </template>

              <template v-else>
                {{ r.new.text || ' ' }}
              </template>
            </div>
          </td>

        </tr>
        </tbody>
      </table>
    </div>

    <!-- LEGEND -->
    <div class="legend-row">
      <div class="legend-item">
        <span class="legend-color legend-missing"></span>
        Missing (not migrated from AEM)
      </div>
      <div class="legend-item">
        <span class="legend-color legend-added"></span>
        Added (new content in CS)
      </div>
      <div class="legend-item">
        <span class="legend-color legend-similar"></span>
        Similar (>80% identical)
      </div>
    </div>


  </template>
</template>
