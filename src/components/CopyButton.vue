<script setup lang="ts">
import { CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{ value?: string | null }>()

async function copyValue() {
  if (!props.value) return
  try {
    await navigator.clipboard.writeText(props.value)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败，请检查浏览器剪贴板权限')
  }
}
</script>

<template>
  <el-tooltip content="复制" placement="top">
    <el-button
      class="copy-button"
      link
      :disabled="!value"
      aria-label="复制"
      @click.stop="copyValue"
    >
      <el-icon><CopyDocument /></el-icon>
    </el-button>
  </el-tooltip>
</template>

<style scoped>
.copy-button {
  width: 20px;
  height: 20px;
  min-height: 20px;
  padding: 3px;
  vertical-align: middle;
}

.copy-button :deep(.el-icon) {
  font-size: 14px;
}
</style>
