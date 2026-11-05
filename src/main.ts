import { createApp } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
createApp(App).use(VueQueryPlugin, { queryClient: new QueryClient() }).use(ElementPlus).mount('#app')
