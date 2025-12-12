<script setup>
import { useRunStore } from "../store/runStore.js";

const store = useRunStore();
store.loadRuns();
</script>

<template>
  <div>
    <h1>MQC2 Runs</h1>

    <router-link to="/runs/new">Create new run</router-link>

    <ul>
      <li v-for="run in store.runs" :key="run._id">
        <router-link :to="`/runs/${run._id}`">
          {{ run.runName || run.runNameAuto }}
          ({{ run.status }})
          {{ run.totalScans }} page(s)
        </router-link>
      </li>
    </ul>
  </div>
</template>
