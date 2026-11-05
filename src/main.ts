import { createApp } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import router from './router'
createApp(App).use(router).use(VueQueryPlugin, { queryClient: new QueryClient() }).use(ElementPlus).mount('#app')
