import { createRouter, createWebHistory } from 'vue-router'
export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('../views/Dashboard.vue') },
    { path: '/devices', component: () => import('../views/Devices.vue') },
    { path: '/devices/:deviceCode', component: () => import('../views/DeviceDetail.vue') },
    { path: '/transactions', component: () => import('../views/Transactions.vue') },
    { path: '/transactions/:id', component: () => import('../views/TransactionDetail.vue') },
    { path: '/billing', component: () => import('../views/Billing.vue') },
    { path: '/tariffs', component: () => import('../views/Tariffs.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('../views/NotFound.vue') },
  ],
})
