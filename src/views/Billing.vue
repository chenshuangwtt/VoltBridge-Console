<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { api, unwrap } from '../api/client'
import type { components } from '../api/generated/voltbridge-schema'
import { ApiError } from '../api/client'
import BillingDetails from '../components/BillingDetails.vue'

const id = ref('')
const kind = ref('record')
const submitted = ref(false)
const router = useRouter()
const q = useQuery({
  queryKey: ['billing', kind, id],
  enabled: submitted,
  retry: false,
  queryFn: async () =>
    unwrap<components['schemas']['BillingRecordView']>(
      kind.value === 'record'
        ? await api.GET('/api/billing-records/{billingRecordId}', {
            params: { path: { billingRecordId: id.value } },
          })
        : await api.GET('/api/billing-records/by-transaction/{transactionId}', {
            params: { path: { transactionId: id.value } },
          }),
    ),
})
const billingNotFound = computed(
  () => q.error.value instanceof ApiError && q.error.value.code === 'BILLING_RECORD_NOT_FOUND',
)
function search() {
  id.value = id.value.trim()
  if (!id.value) return
  submitted.value = true
  q.refetch()
}
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">运营中心 / 账单</span>
        <h1>账单</h1>
        <p class="page-lede">通过账单记录 ID 或交易 ID 检索计费结果。当前接口不提供账单列表。</p>
      </div>
    </div>

    <div class="lookup-layout billing-layout">
      <el-card class="billing-search-card">
        <div class="section-label search-card-heading">
          <div>
            <h2>查找账单</h2>
            <p>请输入后端已返回或记录的标识符</p>
          </div>
        </div>
        <el-form class="billing-form" @submit.prevent="search">
          <el-form-item label="查询方式">
            <el-select v-model="kind">
              <el-option label="账单记录 ID" value="record" />
              <el-option label="交易 ID" value="transaction" />
            </el-select>
          </el-form-item>
          <el-form-item label="标识符" required>
            <el-input v-model="id" required autocomplete="off" placeholder="输入对应 ID" />
          </el-form-item>
          <el-button
            type="primary"
            :disabled="!id.trim()"
            :loading="q.isFetching.value"
            @click="search"
            >查询账单</el-button
          >
        </el-form>
      </el-card>
      <aside class="lookup-note billing-note">
        <div class="note-kicker">查询路径</div>
        <div class="billing-path"><span>账单 ID</span><span>或</span><span>交易 ID</span></div>
        <p>查询交易账单时，使用创建该账单的交易 ID。进行中的交易尚未生成账单。</p>
      </aside>
    </div>

    <section v-if="submitted" class="billing-result">
      <div class="section-label">
        <div>
          <h2>查询结果</h2>
          <p>已生成的账单会显示在这里</p>
        </div>
      </div>
      <el-card>
        <el-alert
          v-if="q.isError.value && billingNotFound"
          type="info"
          title="暂未找到对应账单。若交易仍在充电，结束后才会生成账单。"
          :closable="false"
        >
          <el-button
            v-if="kind === 'transaction'"
            link
            type="primary"
            @click="router.push(`/transactions/${encodeURIComponent(id)}`)"
            >查看交易状态与计费</el-button
          >
        </el-alert>
        <el-alert
          v-else-if="q.isError.value"
          type="error"
          :title="q.error.value?.message || '账单查询失败'"
          :closable="false"
        />
        <el-skeleton v-else-if="q.isFetching.value" :rows="3" animated />
        <BillingDetails v-else-if="q.data.value" :bill="q.data.value" />
        <el-empty v-else description="未找到可展示的账单记录。" />
      </el-card>
    </section>
  </div>
</template>
