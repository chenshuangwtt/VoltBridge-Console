# VoltBridge Console

A lightweight Vue operations console for the separately maintained [VoltBridge backend](https://github.com/chenshuangwtt/VoltBridge). It is a portfolio/demo interface, not a production-ready admin or driver app.

## Requirements and local use

Use Node.js 22 LTS and npm. Start the sibling backend at `http://localhost:8080`, then run `npm ci` and `npm run dev`. The console is at `http://localhost:5173`; Swagger is at `http://localhost:8080/swagger-ui.html`.

`npm run build`, `npm run lint`, `npm run typecheck`, and `npm run test:run` provide local checks. `/api` and `/actuator` are proxied to the backend. Set `VITE_API_BASE_URL` to override the API base and `VITE_DEFAULT_TENANT_ID` to prefill tariff lookup.

## Contract workflow

The authoritative OpenAPI snapshot is `openapi/voltbridge-openapi.json`; generated types live in `src/api/generated/voltbridge-schema.d.ts` and power the central `openapi-fetch` client. With the backend running use `npm run api:sync`. `OPENAPI_URL` can override the default `http://localhost:8080/v3/api-docs`. CI uses the checked-in snapshot and needs no backend.

## Pages and limits

Dashboard, device lookup, transactions, billing lookup, and tenant-scoped tariffs use backend data. Device history/inventory and billing list are unavailable in the current API; gaps are recorded in `docs/backend-api-gaps.md`. Command lifecycle polling uses the command API and does not treat ACKED as success.

This repository is independent from the Java backend. Keep backend changes in its own repository and conversation.
