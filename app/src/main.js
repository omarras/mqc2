import { createApp } from "vue";
import App from "./App.vue";
import "./styles/base.css";
import "./styles/components/index.css";
import "./styles/views/index.css";

import router from "./router";
import { createPinia } from "pinia";

createApp(App)
    .use(router)
    .use(createPinia())
    .mount("#app");
