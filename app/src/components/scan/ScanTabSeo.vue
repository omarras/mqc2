<script setup>
import ReportDefectButton from "../ReportDefectButton.vue";

const props = defineProps({
  scan: Object
});
</script>

<template>
  <div>
    <div class="card-header">
      <div class="card-header__left"></div>

      <h2 class="card-header__title">
        SEO
      </h2>

      <div class="card-header__right">
        <ReportDefectButton :scan="scan" />
      </div>
    </div>

    <div v-if="!scan.seo">No SEO results yet.</div>

    <div v-else>
      <p><strong>Global Score:</strong> {{ scan.seo.summary.globalScore }}</p>

      <table border="1" cellpadding="6">
        <thead>
        <tr>
          <th>Rule</th>
          <th>Old</th>
          <th>New</th>
          <th>Verdict</th>
        </tr>
        </thead>

        <tbody>
        <tr v-for="rule in scan.seo.rules" :key="rule.id">
          <td>{{ rule.label }}</td>
          <td>{{ rule.oldValue }}</td>
          <td>{{ rule.newValue }}</td>
          <td>{{ rule.verdict }}</td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
