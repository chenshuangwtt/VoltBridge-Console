# VoltBridge Console

VoltBridge 的轻量运营与技术控制台，用于查看设备状态、提交远程充电与运维命令、查询交易和账单，以及管理版本化资费。业务数据与最终计价均由 [VoltBridge 后端](https://github.com/chenshuangwtt/VoltBridge)提供；本仓库只包含前端。

## 功能

- **仪表盘**：展示后端返回的交易概况与最近交易。
- **设备**：按设备编码查询业务状态、在线状态与派生运行状态；根据后端协议能力提供启动充电、停止充电、时间同步和设备复位。命令提交后跟踪异步执行状态。
- **充电交易**：筛选交易并查看状态、设备、连接器和生命周期详情。
- **账单**：按账单 ID 或交易 ID 查询后端计费结果，展示固定费率与分时费率的分项明细、资费来源及计价快照。
- **资费**：查看和修订系统默认 FALLBACK 固定费率；创建、激活、退役和删除 SCHEDULED 资费草稿，支持 FIXED、TIME_OF_USE、业务版本和有效期重叠提示。

没有 SCHEDULED 资费命中交易开始时间时，后端自动使用 FALLBACK 计费。控制台不会自行决定最终金额。

## 技术栈

Vue 3、TypeScript、Vite、Vue Router、Element Plus、TanStack Vue Query、openapi-typescript、openapi-fetch、Vitest、Vue Test Utils、ESLint 和 Prettier。

## 本地运行

要求 Node.js **22 LTS**（`package.json` 限定 `>=22 <23`）及 npm。先启动 VoltBridge 后端，默认地址为 `http://localhost:8080`；OpenAPI 与 Swagger 分别位于 `/v3/api-docs` 和 `/swagger-ui.html`。

```bash
npm install
npm run dev
```

开发服务器默认位于 `http://localhost:5173`，监听 `0.0.0.0`。可将 `.env.example` 复制为不提交的 `.env.local`，按需设置：

| 变量                     | 用途                                       |
| ------------------------ | ------------------------------------------ |
| `VITE_API_BASE_URL`      | 浏览器 API 基址；开发时留空，使用相对路径  |
| `DEV_PROXY_TARGET`       | Vite 对 `/api`、`/actuator` 的后端代理目标 |
| `DEV_PORT`               | Vite 开发端口                              |
| `OPENAPI_URL`            | 仅供 OpenAPI 同步脚本使用                  |
| `VITE_DEFAULT_TENANT_ID` | 可选的资费页默认租户 ID                    |

开发请求经“浏览器 → Vite proxy → 后端”转发。当前后端提供单设备查询，不提供设备库存列表或账单列表；详见 [接口缺口](docs/backend-api-gaps.md)。本控制台没有登录/RBAC、支付、退款或 WebSocket 推送，实时变化主要通过 REST 查询与轮询获取。

## OpenAPI 契约

后端运行后执行：

```bash
npm run api:sync
```

该命令依次执行 `api:pull` 与 `api:generate`，更新 `openapi/voltbridge-openapi.json` 和 `src/api/generated/voltbridge-schema.d.ts`。两者均纳入版本控制，CI 与单元测试无需连接实时后端。不要手工修改生成类型。

## 质量检查

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
```

源码位于 `src/`：`api/` 封装契约和请求，`components/` 存放复用组件，`views/` 是页面，`router/` 定义路由，`utils/` 存放展示和业务派生函数。

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
