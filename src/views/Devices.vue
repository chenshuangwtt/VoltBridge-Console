<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const code = ref(''),
  recent = ref<string[]>(JSON.parse(localStorage.getItem('voltbridge.recentDevices') || '[]')),
  router = useRouter()
function go() {
  const c = code.value.trim()
  if (!c) return
  recent.value = [c, ...recent.value.filter((x) => x !== c)].slice(0, 8)
  localStorage.setItem('voltbridge.recentDevices', JSON.stringify(recent.value))
  router.push(`/devices/${encodeURIComponent(c)}`)
}
</script>
<template>
  <div class="page">
    <div class="page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">设备管理 / 查询</span>
        <h1>设备</h1>
        <p class="page-lede">
          输入设备编码查看设备状态并提交远程操作。当前后端提供单设备查询，不提供设备库存列表。
        </p>
      </div>
    </div>

    <div class="lookup-layout">
      <el-card class="lookup-card">
        <div class="lookup-symbol" aria-hidden="true">⌕</div>
        <span class="eyebrow">设备档案</span>
        <h2>按编码查询设备</h2>
        <p class="muted">使用设备的唯一编码打开设备信息与操作页面。</p>
        <el-form class="lookup-form" @submit.prevent="go">
          <el-form-item label="设备编码" required>
            <el-input
              v-model="code"
              placeholder="请输入设备编码"
              autocomplete="off"
              @keyup.enter="go"
            />
          </el-form-item>
          <el-button type="primary" @click="go">查询设备</el-button>
        </el-form>
      </el-card>

      <aside class="lookup-note">
        <div class="note-kicker">接口能力</div>
        <h2>设备详情按需读取</h2>
        <p>设备信息会在提交编码后从后端查询。这里不会展示未由接口返回的设备清单。</p>
        <div class="note-rule"></div>
        <div class="note-label">查询方式</div>
        <div class="note-value">设备编码 → 设备详情</div>
      </aside>
    </div>

    <section v-if="recent.length" class="recent-section">
      <div class="section-label">
        <div>
          <h2>最近查询</h2>
          <p>仅保存在此浏览器中的本地记录</p>
        </div>
      </div>
      <div class="recent-list">
        <el-button
          v-for="item in recent"
          :key="item"
          class="recent-item"
          @click="router.push(`/devices/${encodeURIComponent(item)}`)"
        >
          <span class="recent-code">{{ item }}</span
          ><span aria-hidden="true">↗</span>
        </el-button>
      </div>
    </section>
  </div>
</template>
