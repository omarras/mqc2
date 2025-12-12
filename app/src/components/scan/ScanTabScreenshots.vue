<script setup>
const props = defineProps({ scan: Object });

function desktopAem(scan) {
  return (
      scan.screenshots?.desktop?.aem?.imagePath ||
      scan.visualComparisonDesktop?.aem?.imagePath ||
      null
  );
}

function desktopCs(scan) {
  return (
      scan.screenshots?.desktop?.contentstack?.imagePath ||
      scan.visualComparisonDesktop?.contentstack?.imagePath ||
      null
  );
}

function mobileCs(scan) {
  return (
      scan.screenshots?.mobile?.contentstackMobile?.imagePath ||
      scan.screenshotMobile?.contentstackMobile?.imagePath ||
      null
  );
}
</script>

<template>
  <div>
    <h3>Screenshots</h3>

    <!-- Desktop comparison -->
    <div v-if="desktopAem(scan) || desktopCs(scan)">
      <h4>Desktop Comparison</h4>
      <div style="display:flex; gap:20px; align-items:flex-start;">
        <div>
          <p><strong>AEM</strong></p>
          <img v-if="desktopAem(scan)" :src="desktopAem(scan)" width="300" />
          <p v-else>No AEM screenshot</p>
        </div>

        <div>
          <p><strong>Contentstack</strong></p>
          <img v-if="desktopCs(scan)" :src="desktopCs(scan)" width="300" />
          <p v-else>No CS screenshot</p>
        </div>
      </div>
    </div>

    <!-- Mobile screenshot -->
    <div v-if="mobileCs(scan)" style="margin-top:30px;">
      <h4>Mobile</h4>
      <img :src="mobileCs(scan)" width="300" />
    </div>

    <div v-if="!desktopAem(scan) && !desktopCs(scan) && !mobileCs(scan)">
      No screenshots available.
    </div>
  </div>
</template>
