<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'

const route = useRoute()
const nav = [
  { label: '仪表盘', path: '/', index: '01' },
  { label: '设备', path: '/devices', index: '02' },
  { label: '充电交易', path: '/transactions', index: '03' },
  { label: '账单', path: '/billing', index: '04' },
  { label: '资费', path: '/tariffs', index: '05' },
]
const section = computed(
  () =>
    nav.find(
      (item) =>
        item.path === route.path || (item.path !== '/' && route.path.startsWith(`${item.path}/`)),
    )?.label ?? '运营管理',
)
const health = useQuery({
  queryKey: ['health'],
  queryFn: async () => {
    const response = await fetch('/actuator/health')
    return response.ok ? 'UP' : 'DOWN'
  },
  retry: false,
})
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <RouterLink class="brand" to="/" aria-label="VoltBridge 运营控制台首页">
        <span class="brand-mark" aria-hidden="true">VB</span>
        <span class="brand-copy"><strong>VoltBridge</strong><small>运营控制台</small></span>
      </RouterLink>

      <div class="sidebar-label">工作区</div>
      <nav class="primary-nav" aria-label="主导航">
        <RouterLink
          v-for="item in nav"
          :key="item.path"
          :to="item.path"
          :exact-active-class="item.path === '/' ? 'is-active' : ''"
          active-class="is-active"
        >
          <span class="nav-index">{{ item.index }}</span>
          <span>{{ item.label }}</span>
          <span class="nav-arrow" aria-hidden="true">↗</span>
        </RouterLink>
      </nav>

      <div class="sidebar-bottom">
        <div class="sidebar-caption">运行环境</div>
        <div class="connection-card">
          <span class="connection-label">后端连接</span>
          <strong>{{
            health.data.value === 'UP'
              ? '运行正常'
              : health.data.value === 'DOWN'
                ? '暂不可用'
                : '状态未知'
          }}</strong>
          <span class="connection-code">{{ health.data.value ?? 'UNKNOWN' }}</span>
        </div>
        <div class="sidebar-version">VoltBridge API <span>·</span> v0.1</div>
      </div>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div class="topbar-context">
          <span class="topbar-kicker">运营中心</span>
          <span class="topbar-divider">/</span>
          <span>{{ section }}</span>
        </div>
        <div class="topbar-meta">
          <span>VoltBridge Console</span><span class="meta-separator">·</span
          ><span>数据来自后端</span>
        </div>
      </header>
      <RouterView />
      <footer class="workspace-footer">
        <span>VoltBridge Console</span><span>轻量运营与运维工作台</span>
      </footer>
    </main>
  </div>
</template>
