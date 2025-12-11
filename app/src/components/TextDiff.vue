<script setup>
import { ref, computed } from 'vue'
import RemarksBar from "./RemarksBar.vue";

const props = defineProps({
  loading: { type: Boolean, default: false },

  // MQC2: [{ op, oldIndex, newIndex, textOld, textNew, similarity, missingWords, addedWords }]
  // MQC1: legacy ops format
  ops: { type: Array, default: () => [] },

  showToggle: { type: Boolean, default: true },
  pair: { type: Object, default: null },
});

const showAllLines = ref(false);
const showEnglish = ref(false);

/* -------------------------------------------------------------------------
   TRANSLATION SUPPORT CHECK
------------------------------------------------------------------------- */
const supportsTranslation = computed(() =>
    props.ops.some(o =>
        typeof o.text_en === "string" ||
        typeof o.textOld_en === "string" ||
        typeof o.textNew_en === "string"
    )
);

/* -------------------------------------------------------------------------
   CHARACTER DIFF (raw output)
------------------------------------------------------------------------- */
function charDiff(oldText, newText) {
  const diffs = [];
  let i = 0, j = 0;

  while (i < oldText.length || j < newText.length) {

    if (oldText[i] === newText[j]) {
      diffs.push({ type: "equal", charOld: oldText[i], charNew: newText[j] });
      i++; j++;
      continue;
    }

    if (i < oldText.length &&
        (oldText[i] !== newText[j] || j >= newText.length)) {
      diffs.push({ type: "delete", charOld: oldText[i], charNew: "" });
      i++;
      continue;
    }

    if (j < newText.length &&
        (newText[j] !== oldText[i] || i >= oldText.length)) {
      diffs.push({ type: "insert", charOld: "", charNew: newText[j] });
      j++;
      continue;
    }
  }

  return diffs;
}

/* -------------------------------------------------------------------------
   MAKE DIFF UI-FRIENDLY → { aLeft, aDiff, aRight, bLeft, bDiff, bRight }
------------------------------------------------------------------------- */
function collapseCharDiff(diffs) {
  // find first diff position
  const first = diffs.findIndex(d => d.type !== "equal");
  if (first === -1) return null;

  // find last diff
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
   NORMALIZE OPS
------------------------------------------------------------------------- */
function normalizeOps(raw) {
  if (!raw || !Array.isArray(raw)) return [];

  const rows = [];

  for (const op of raw) {
    const type = op.op;

    const leftText =
        showEnglish.value
            ? (op.textOld_en ?? op.textOld ?? "")
            : (op.textOld ?? "");

    const rightText =
        showEnglish.value
            ? (op.textNew_en ?? op.textNew ?? "")
            : (op.textNew ?? "");

    switch (type) {
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
        const needsFine =
            !op.missingWords &&
            !op.addedWords &&
            leftText !== rightText;

        let fine = null;
        if (needsFine) {
          const rawDiff = charDiff(leftText, rightText);
          fine = collapseCharDiff(rawDiff);
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

      default:
        break;
    }
  }

  return rows;
}

/* -------------------------------------------------------------------------
   COMPUTEDS
------------------------------------------------------------------------- */
const normalizedRows = computed(() => normalizeOps(props.ops));

const visibleRows = computed(() =>
    showAllLines.value
        ? normalizedRows.value
        : normalizedRows.value.filter(r => r.op !== "equal")
);

/* Column headers */
const colHeaderA = computed(() =>
    showEnglish.value ? "AEM content (English)" : "AEM content"
);
const colHeaderB = computed(() =>
    showEnglish.value ? "Contentstack content (English)" : "Contentstack content"
);

/* Keyboard shortcut: T */
function onKey(e) {
  if (e.key.toLowerCase() === "t" && supportsTranslation.value) {
    showEnglish.value = !showEnglish.value;
  }
}
window.addEventListener("keydown", onKey);
</script>

<template>
  <div class="card">
    <h2>Text Comparison <span class="diff-title">(diff)</span></h2>

    <RemarksBar v-if="pair" :pair="pair" />

    <div v-if="loading" class="shot--placeholder" style="height:160px;">
      <div class="loader"></div>
      <div class="tiny muted" style="margin-top:6px;">Loading diff…</div>
    </div>

    <template v-else>

      <div class="controls-row"
           style="display:flex; gap:12px; align-items:center; justify-content:space-between; margin-bottom:8px;">
        <div class="show-all" v-if="showToggle">
          <label class="toggle">
            <input type="checkbox" v-model="showAllLines" />
            <span>Show all content</span>
          </label>
        </div>

        <div class="translate">
          <button
              class="open-link"
              :class="{ 'btn--secondary': !showEnglish, 'btn--primary': showEnglish }"
              :disabled="!supportsTranslation"
              @click="showEnglish = !showEnglish"
          >
            {{ showEnglish ? 'Show original language' : 'Translate to English' }}
          </button>
        </div>
      </div>

      <div class="diff-table-wrapper">
        <table class="diff-table">
          <colgroup>
            <col class="col-ln" /><col class="col-cell" />
            <col class="col-ln" /><col class="col-cell" />
          </colgroup>

          <thead>
          <tr>
            <th class="muted">#</th><th>{{ colHeaderA }}</th>
            <th class="muted">#</th><th>{{ colHeaderB }}</th>
          </tr>
          </thead>

          <tbody>
          <tr v-for="(r, i) in visibleRows" :key="'ln' + i">

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
  </div>
</template>

<style scoped>
.diff-missing {
  background: rgba(255, 120, 120, 0.35);
  padding: 0 2px;
  border-radius: 3px;
}

.diff-added {
  background: rgba(120, 180, 255, 0.35);
  padding: 0 2px;
  border-radius: 3px;
}

.legend-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  margin-top: 12px;
  font-size: 12px;
  opacity: 0.85;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.legend-color {
  display: inline-block;
  width: 14px;
  height: 10px;
  border-radius: 3px;
}

/* Match your actual highlight colors */
.legend-missing {
  background: rgb(136, 73, 110); /* red */
}

.legend-added {
  background: rgb(65, 113, 128); /* green */
}

.legend-similar {
  background: rgb(116, 119, 67); /* yellow */
}

.legend-info {
  margin-left: auto;
  opacity: 0.7;
}

</style>
