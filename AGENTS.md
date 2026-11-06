# AGENTS.md — VoltBridge-Console 工程规范

> 适用范围：本文件默认适用于整个 `VoltBridge-Console` 仓库；如果某个更深层目录存在自己的 `AGENTS.md`，则该目录优先遵守更近的规范。
>
> 项目定位：VoltBridge-Console 是 VoltBridge 后端的轻量运营 / 运维控制台，不是车主 C 端充电应用，不是完整 SaaS 管理平台，也不是若依替代品。

---

## 1. 当前仓库的第一优先级任务

任何 Agent / Codex 第一次进入本仓库时，先检查现有代码，再继续开发。

如果当前仓库还没有符合本规范，必须先完成一次 **代码清理与规范化**：

1. 所有面向用户的页面文案改为 **简体中文**。
2. 补齐或修复代码格式化工具链：
   - Prettier 是代码格式化的唯一标准；
   - ESLint 负责代码质量、错误检查和 Vue / TypeScript 规范；
   - ESLint 中与 Prettier 冲突的格式规则必须关闭。
3. 对 **整个仓库** 做一次统一格式化，而不是只格式化新修改的文件。
4. 先自动修复 ESLint 能安全修复的问题。
5. 对自动格式化后仍然明显拥挤、难读的 Vue SFC 进行人工整理。
6. 必须运行：
   - `npm run format`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:run`
   - `npm run build`
7. 上述检查未通过前，不要继续新增业务功能；除非失败原因是明确的外部阻塞，并且已经记录。

不要为了“统一风格”而重写已经正常工作的业务逻辑。

---

## 2. 页面语言：默认使用简体中文

所有运营人员可见的界面内容必须使用简体中文。

包括但不限于：

- 侧边栏菜单
- 页面标题
- 按钮
- 表格列名
- 表单标签
- 输入框占位符
- 表单校验提示
- 加载提示
- 空状态提示
- 错误提示
- 确认弹窗
- Message / Notification 提示
- 状态标签
- 帮助文字
- Dialog / Drawer 标题

推荐统一文案：

| 内部含义 / 操作 | 页面显示 |
| --------------- | -------- |
| Dashboard       | 仪表盘   |
| Devices         | 设备     |
| Transactions    | 充电交易 |
| Billing         | 账单     |
| Tariffs         | 资费     |
| Start Charging  | 启动充电 |
| Stop Charging   | 停止充电 |
| Time Sync       | 时间同步 |
| Reset           | 设备复位 |
| Search          | 查询     |
| Refresh         | 刷新     |
| Retry           | 重试     |
| Loading         | 加载中   |
| No Data         | 暂无数据 |

后端枚举值、协议标识、API 字段名不能改。

例如后端状态：

```text
CREATED
SENT
ACKED
EXECUTING
SUCCEEDED
FAILED
TIMEOUT
```

代码中仍然保留原值，只在展示层映射为中文。

推荐集中维护状态映射：

```ts
export const commandStatusLabels = {
  CREATED: '已创建',
  SENT: '已发送',
  ACKED: '已确认',
  EXECUTING: '执行中',
  SUCCEEDED: '已成功',
  FAILED: '失败',
  TIMEOUT: '超时',
} as const

export const transactionStatusLabels = {
  STARTING: '启动中',
  CHARGING: '充电中',
  ENDING: '结束中',
  COMPLETED: '已完成',
  START_FAILED: '启动失败',
  ABORTED: '已中止',
} as const
```

不要在多个页面重复写相同中文映射。

统一放在：

```text
src/constants/
```

或：

```text
src/utils/
```

当前项目只有中文界面时，不要为了“可能未来多语言”而提前引入完整 `vue-i18n`。

### Element Plus 中文化

Element Plus 自带组件也必须使用中文，例如：

- Pagination
- DatePicker
- TimePicker
- Empty
- Dialog
- Select

在应用根节点统一设置官方 `zh-cn` locale。

---

## 3. 源代码标识符继续使用英文

中文用于 UI 展示，不用于源码变量名。

以下内容继续使用英文：

- 变量名
- 函数名
- 组件名
- composable 名
- 文件名
- 路由名
- API 模块
- TypeScript 类型
- CSS class

推荐：

```ts
const transactionStatus = computed(...)
const submitStartCharging = async () => {}
```

不要这样写：

```ts
const 交易状态 = computed(...)
const 启动充电 = async () => {}
```

代码注释可以写中文或英文，但应解释“为什么这样做”，不要重复代码本身已经表达的内容。

---

## 4. Vue 3 组件规范

统一使用 Vue 3 Composition API。

默认 Vue SFC 结构：

```vue
<script setup lang="ts"></script>

<template></template>

<style scoped></style>
```

新代码优先使用：

```vue
<script setup lang="ts">
```

除非某个明确的第三方库兼容问题要求，否则不要新写 Options API。

### 组件命名

- Vue 组件名必须使用多词命名；
- `.vue` 文件使用 `PascalCase`；
- composable 使用 `useXxx.ts`；
- 普通 TS 模块使用 `camelCase.ts`；
- View 页面命名要表达真实职责。

推荐：

```text
CommandStatusPanel.vue
TransactionDetailView.vue
DeviceLookupView.vue
useCommandPolling.ts
formatMoney.ts
```

避免：

```text
Item.vue
Data.vue
Common.vue
Utils.vue
```

除非该名字确实准确。

---

## 5. 组件职责和拆分

组件必须保持职责清晰。

不要为了满足某个“行数限制”机械拆文件，但如果一个 Vue 文件同时承担多个独立职责，应拆分。

适合提取的内容包括：

- 公共状态标签
- 命令状态面板
- 公共错误提示
- 日期 / 金额格式化
- 独立表单 Dialog
- 可复用查询逻辑
- 可复用 mutation 逻辑

避免一个页面同时塞入：

- API 实现
- 数据转换
- 命令轮询
- 大型表单
- 表格
- 大量无关 CSS

后端状态逻辑优先放到 API 层 / composable / Vue Query 中，而不是全部写在页面组件内。

---

## 6. TypeScript 规范

TypeScript 是强制要求。

原则：

- 尽量保持严格类型；
- 避免 `any`；
- 不要通过 `as any` 逃避类型问题；
- 避免无意义的非空断言 `!`；
- 优先使用 OpenAPI 自动生成的后端类型；
- OpenAPI 已有 DTO 时，不要再手写一套重复接口；
- `unknown` 必须显式缩小范围后再使用；
- 服务端状态优先明确建模，不要使用松散对象；
- `type` / `interface` 遵循当前项目已有风格，不要无意义来回改；
- UI 组件不要直接依赖大量生成代码细节，优先通过 API 模块封装。

OpenAPI 自动生成文件属于生成产物：

**禁止手工修改。**

---

## 7. OpenAPI / API 契约规范

VoltBridge 后端 OpenAPI 是前端接口契约的唯一权威来源。

推荐流程：

```text
VoltBridge 后端
  -> /v3/api-docs
  -> openapi/voltbridge-openapi.json
  -> openapi-typescript
  -> src/api/generated/*
  -> openapi-fetch
  -> API 模块 / Vue Query
```

禁止：

- 猜测后端字段；
- 为了页面好看虚构 API 字段；
- 手写和 OpenAPI 重复的 DTO。

如果前端发现后端接口缺失：

1. 前端页面保持真实，不造假；
2. 记录缺失接口；
3. 不允许在本前端仓库任务里直接修改兄弟目录中的 VoltBridge 后端。

---

## 8. 环境配置：禁止硬编码后端地址

所有与机器、环境相关的地址都必须放到 `.env*`。

禁止在业务代码里写死：

```ts
'http://localhost:8080'
```

推荐开发环境：

```env
VITE_API_BASE_URL=
DEV_PROXY_TARGET=http://localhost:8080
DEV_PORT=5173
OPENAPI_URL=http://localhost:8080/v3/api-docs
VITE_DEFAULT_TENANT_ID=
```

`vite.config.ts` 只读取环境变量，不应因为后端端口变化而频繁修改。

浏览器开发环境请求应优先使用相对路径：

```text
/api/...
/actuator/...
```

通过 Vite proxy 转发到：

```text
DEV_PROXY_TARGET
```

不要通过在组件里反复改 URL 来解决跨域。

不要从前端项目去修改后端为全开放 CORS。

`.env.local` 属于本机配置：

**禁止提交 Git。**

---

## 9. 服务端状态统一使用 TanStack Vue Query

后端数据状态统一使用：

```text
@tanstack/vue-query
```

负责：

- loading
- error
- cache
- refetch
- polling
- mutation
- invalidate

不要为了服务端数据再建一套 Pinia store。

当前项目没有明确全局客户端状态需求时，不引入 Pinia。

统一 query key，例如：

```ts
;['health'][('device', deviceCode)][('command', commandId)][('transactions', filters)][
  ('transaction', transactionId)
][('billing', billingRecordId)][('billing-by-transaction', transactionId)][('tariffs', tenantId)][
  ('tariff', tariffPlanId)
]
```

mutation 成功后只失效相关 query，不要全局 refetch。

---

## 10. 异步命令语义

设备命令都是异步命令。

HTTP `200` 或创建 command 成功：

**不代表设备业务已经执行完成。**

正确流程：

```text
提交命令
-> 获取 commandId
-> 查询命令状态
-> CREATED / SENT / ACKED / EXECUTING
-> SUCCEEDED / FAILED / TIMEOUT
```

页面提示：

提交成功后：

```text
命令已提交
```

只有状态为：

```text
SUCCEEDED
```

才显示：

```text
命令执行成功
```

特别注意：

```text
ACKED != SUCCEEDED
```

如果后端提供失败码 / 失败原因，并且适合运营人员查看，应展示。

命令轮询：

- 使用 TanStack Vue Query；
- 有最大轮询时长；
- 终态后停止；
- 不允许手写无限 `setInterval`。

---

## 11. 代码格式化：Prettier 是唯一格式标准

代码排版统一使用 Prettier。

Prettier 应覆盖：

- `.vue`
- `.ts`
- `.js`
- `.mjs`
- `.json`
- `.css`
- `.scss`
- `.md`
- `.yaml`
- `.yml`

不要依赖人工空格对齐。

不要出现 ESLint 和 Prettier 互相打架。

### 依赖要求

先检查当前 ESLint / create-vue 配置。

如果缺失 Prettier 集成，使用兼容当前 Vue 3 / TypeScript / ESLint 的方案：

- `prettier`
- `@vue/eslint-config-prettier`

如果当前 ESLint 配置不适合上述方案，再使用：

- `eslint-config-prettier`

优先使用 Vue 官方生态兼容方案。

除非有明确理由，不要安装：

```text
eslint-plugin-prettier
```

不要把 Prettier 当成 ESLint 规则执行。

### 推荐 Prettier 配置

根目录新增：

```text
.prettierrc.json
```

推荐：

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Prettier 决定最终换行与排版，不要为了个人喜好手工对齐后又被 Prettier 重写。

### `.prettierignore`

至少忽略：

```text
node_modules
dist
coverage
```

OpenAPI 自动生成类型，如果每次生成都会覆盖格式，可以加入 ignore。

普通业务源码不能大面积忽略。

---

## 12. ESLint 规范

ESLint 负责：

- 代码错误
- Vue 专项规则
- TypeScript 问题
- 可维护性问题

必须使用当前 Vue 3 + TypeScript 推荐配置。

优先使用：

- `eslint-plugin-vue`
- 与当前项目兼容的 Vue TypeScript ESLint 配置

重要原则：

- 不允许未使用变量；
- 不允许未使用 import；
- 避免隐式 `any`；
- 不允许错误 Vue 指令；
- 不允许明显不安全模板写法；
- 不要通过关闭 lint 掩盖结构问题。

禁止随便写：

```ts
/* eslint-disable */
```

如果必须禁用某条规则，只能局部禁用，并写简短原因。

和 Prettier 冲突的纯格式规则由 Prettier compatibility config 统一关闭。

---

## 13. npm scripts 规范

必须保留或补齐以下职责：

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "typecheck": "...",
    "lint": "...",
    "lint:fix": "...",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "...",
    "test:run": "..."
  }
}
```

具体命令可以按现有项目实现。

完整校验：

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
```

代码整理时：

```bash
npm run format
npm run lint:fix
npm run typecheck
npm run test:run
npm run build
```

不要让 `npm run dev` 每次启动都执行耗时的完整 lint/typecheck。

---

## 14. EditorConfig

根目录没有 `.editorconfig` 时必须新增：

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

IDE 设置不能成为格式规范唯一来源。

仓库内：

- Prettier
- ESLint
- EditorConfig

才是统一标准。

---

## 15. import 规范

import 保持整洁。

推荐顺序：

1. Vue / 第三方依赖
2. 项目别名 `@/...`
3. 相对路径
4. type-only import

纯类型必须优先：

```ts
import type { SomeType } from './types'
```

删除未使用 import。

已经配置 `@` alias 时，避免大量：

```text
../../../..
```

不要为了缩短路径大量创建 barrel file，防止循环依赖。

---

## 16. Vue template 规范

模板必须可读。

原则：

- 一个逻辑区域对应一个清晰块；
- 不在模板里写复杂转换；
- 复杂条件提取到 computed / function；
- `v-for` 必须有稳定 `:key`；
- 避免同一个元素同时使用 `v-if` 和 `v-for`；
- 避免多层嵌套三元表达式；
- 避免超长内联事件；
- Element Plus 使用保持一致。

不推荐：

```vue
<el-tag
  :type="
    row.status === 'SUCCEEDED'
      ? 'success'
      : row.status === 'FAILED'
        ? 'danger'
        : row.status === 'TIMEOUT'
          ? 'warning'
          : 'info'
  "
>
  {{ row.status === 'SUCCEEDED' ? '成功' : row.status === 'FAILED' ? '失败' : row.status }}
</el-tag>
```

推荐：

```vue
<StatusTag :status="row.status" :label="commandStatusLabels[row.status] ?? row.status" />
```

---

## 17. CSS 规范

优先使用：

- Element Plus token / CSS variable
- 少量全局样式
- scoped CSS

避免：

- 大量内联 `style=""`
- 到处重复写硬编码颜色
- 滥用 `!important`
- 全局选择器误伤 Element Plus
- 一个页面写几百行混乱 CSS

不要引入 Tailwind 或第二套 CSS/UI 框架，除非后续明确要求。

---

## 18. 日期、数字、金额格式

禁止每个页面自己随手格式化。

统一创建工具函数或展示组件。

优先使用浏览器：

```text
Intl
```

统一要求：

- locale：`zh-CN`
- 日期时间格式统一
- 金额根据后端 `currency` 显示
- 能量统一使用 `kWh`

后端返回的 currency 不是 CNY 时，不允许偷偷按人民币格式显示。

---

## 19. Loading / Empty / Error

所有数据页面必须明确覆盖：

- 加载中
- 正常成功
- 空数据
- API 业务错误
- 网络 / 未知异常

不能出现空白页面。

运营人员可见文案必须中文。

例如：

```text
正在加载交易数据…
暂无符合条件的交易
加载失败：设备不存在
```

禁止直接展示 raw stack trace。

---

## 20. Element Plus 使用规范

统一使用 Element Plus。

推荐：

- `ElTable`：列表
- `ElDescriptions`：详情
- `ElForm`：操作表单
- `ElDialog` / `ElDrawer`：操作和状态
- `ElTag`：状态
- `ElAlert`：错误 / 提示
- `ElSkeleton`：需要时使用

同一种交互不要同时出现多套不同风格。

禁止再引入第二套 UI 组件库。

---

## 21. 测试规范

使用：

```text
Vitest
@vue/test-utils
```

重点测试：

- API envelope 处理
- 命令轮询
- 终态 / 非终态
- 表单校验
- mutation
- error state
- 核心页面渲染

不要测试 Element Plus 内部实现。

避免大面积 snapshot test。

单元测试不依赖真实后端。

测试 fixture 可以使用英文后端 enum，但页面渲染断言应优先检查中文展示。

---

## 22. 生成文件与构建产物

禁止提交：

```text
node_modules/
dist/
coverage/
.env
*.log
```

OpenAPI 自动生成文件禁止人工修改。

如果自动生成文件格式化会产生大量无意义 diff，可以不参与普通格式化。

OpenAPI snapshot 必须来源明确、可重复生成。

---

## 23. Git 变更纪律

提交保持主题明确。

如果本次是代码格式整理：

1. 先提交/修改格式化配置；
2. 全仓统一 format；
3. 尽量不要混进无关业务功能。

禁止未经要求重写 Git 历史。

推荐 commit：

```text
style: standardize console formatting and Chinese UI
```

或：

```text
chore: standardize frontend code style
```

---

## 24. 当前代码库必须执行的清理任务

当前 VoltBridge-Console 需要按以下清单统一整理。

### A. 页面中文化

- [ ] 左侧菜单中文
- [ ] 页面标题中文
- [ ] 按钮中文
- [ ] 表格列名中文
- [ ] 表单 label 中文
- [ ] placeholder 中文
- [ ] 空状态中文
- [ ] loading 中文
- [ ] error 中文
- [ ] Command 状态中文
- [ ] Transaction 状态中文
- [ ] Element Plus `zh-cn`
- [ ] 技术 ID / enum / protocol value 保持原值

### B. 格式化工具链

- [ ] 本地安装 Prettier
- [ ] 有 Prettier 配置
- [ ] 有 `.prettierignore`
- [ ] ESLint 与 Prettier 不冲突
- [ ] 有 `.editorconfig`
- [ ] 有 `format`
- [ ] 有 `format:check`
- [ ] 有 `lint:fix`

### C. 全仓重新整理

执行：

```bash
npm run format
npm run lint:fix
npm run typecheck
npm run test:run
npm run build
```

然后人工检查：

```text
src/App.vue
src/layouts/*
src/views/dashboard/*
src/views/devices/*
src/views/transactions/*
src/views/billing/*
src/views/tariffs/*
src/api/*
```

自动格式化后如果仍有明显难读结构，继续整理。

### D. 最终检查

执行：

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
git diff --check
git status
```

所有检查通过后才能声明本轮清理完成。

---

## 25. 完成后的报告格式

应用本 `AGENTS.md` 完成整理后，报告：

1. 新增 / 修改了哪些规范和工具文件
2. Prettier 版本及配置
3. ESLint 集成方式
4. 格式化了哪些文件 / 范围
5. 页面中文化情况
6. Element Plus 中文 locale 是否完成
7. 是否还有意外残留英文页面文案
8. `format:check` 结果
9. `lint` 结果
10. `typecheck` 结果
11. 单元测试结果
12. production build 结果
13. `git diff --check` 结果
14. 非阻塞 warning

如果源码仍明显没有格式化，或者运营人员可见页面仍有不必要英文，不允许声明完成。
