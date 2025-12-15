import { createRouter, createWebHistory } from "vue-router";

import HomeView from "../views/HomeView.vue";
import RunView from "../views/RunView.vue";
import CreateRunView from "../views/CreateRunView.vue";

export default createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", component: HomeView },
        { path: "/runs/new", component: CreateRunView },

        // Viewer (default)
        { path: "/runs/:id", component: RunView },

        // Admin variant
        { path: "/runs/:id/admin", component: RunView, props: { isAdminRoute: true } }
    ]
});
