<script setup>
import { computed } from "vue";

const props = defineProps({
  scan: Object
});

// Helpers
const oldLinks = computed(() => props.scan.links?.old?.allLinks || []);
const newLinks = computed(() => props.scan.links?.new?.allLinks || []);

const oldErrors = computed(() => props.scan.links?.old?.errors || []);
const newErrors = computed(() => props.scan.links?.new?.errors || []);

const summary = computed(() => props.scan.links?.summary || null);

function cls(outcome) {
  if (!outcome) return "";
  if (outcome === "success") return "color: green;";
  if (outcome === "warning") return "color: orange;";
  if (outcome === "error") return "color: red;";
  return "";
}
</script>

<template>
  <div>
    <h3>Link Checker</h3>

    <!-- Summary -->
    <div v-if="summary" style="margin-bottom: 20px;">
      <p><strong>Old Score:</strong> {{ summary.oldScore.toFixed(2) }}</p>
      <p><strong>New Score:</strong> {{ summary.newScore.toFixed(2) }}</p>
      <p><strong>Delta:</strong> {{ summary.delta.toFixed(2) }}</p>
      <p><strong>Verdict:</strong> {{ summary.verdict }}</p>
    </div>

    <!-- OLD PAGE LINKS -->
    <h4>Old Page Links ({{ oldLinks.length }})</h4>

    <table border="1" cellpadding="6" v-if="oldLinks.length">
      <thead>
      <tr>
        <th>URL</th>
        <th>Initial</th>
        <th>Final</th>
        <th>Secure</th>
        <th>Outcome</th>
        <th>Redirects</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="l in oldLinks" :key="l.url">
        <td>{{ l.url }}</td>
        <td>{{ l.initialStatus }}</td>
        <td>{{ l.finalStatus }}</td>
        <td>{{ l.secure ? 'HTTPS' : 'HTTP' }}</td>
        <td :style="cls(l.outcome)">{{ l.outcome }}</td>
        <td>
          <div v-if="l.redirected">
            <div v-for="r in l.redirectChain" :key="r.location">
              {{ r.status }} → {{ r.location }}
            </div>
          </div>
          <span v-else>-</span>
        </td>
      </tr>
      </tbody>
    </table>

    <p v-else>No links found on the old page.</p>

    <!-- NEW PAGE LINKS -->
    <h4 style="margin-top: 30px;">New Page Links ({{ newLinks.length }})</h4>

    <table border="1" cellpadding="6" v-if="newLinks.length">
      <thead>
      <tr>
        <th>URL</th>
        <th>Initial</th>
        <th>Final</th>
        <th>Secure</th>
        <th>Outcome</th>
        <th>Redirects</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="l in newLinks" :key="l.url">
        <td>{{ l.url }}</td>
        <td>{{ l.initialStatus }}</td>
        <td>{{ l.finalStatus }}</td>
        <td>{{ l.secure ? 'HTTPS' : 'HTTP' }}</td>
        <td :style="cls(l.outcome)">{{ l.outcome }}</td>
        <td>
          <div v-if="l.redirected">
            <div v-for="r in l.redirectChain" :key="r.location">
              {{ r.status }} → {{ r.location }}
            </div>
          </div>
          <span v-else>-</span>
        </td>
      </tr>
      </tbody>
    </table>

    <p v-else>No links found on the new page.</p>

    <!-- Errors section -->
    <h4 style="margin-top: 30px;">Errors & Warnings</h4>

    <div v-if="oldErrors.length">
      <p><strong>Old page issues:</strong></p>
      <ul>
        <li
            v-for="e in oldErrors"
            :key="e.url"
            :style="cls(e.outcome)"
        >
          {{ e.url }} ({{ e.finalStatus }}) – {{ e.outcome }}
        </li>
      </ul>
    </div>

    <div v-if="newErrors.length">
      <p><strong>New page issues:</strong></p>
      <ul>
        <li
            v-for="e in newErrors"
            :key="e.url"
            :style="cls(e.outcome)"
        >
          {{ e.url }} ({{ e.finalStatus }}) – {{ e.outcome }}
        </li>
      </ul>
    </div>

    <p v-if="!oldErrors.length && !newErrors.length">No link issues found.</p>
  </div>
</template>
