# Backend API gaps

Based on the checked-in OpenAPI snapshot (`openapi/voltbridge-openapi.json`):

| Priority | Use case                                   | Current limitation                                                            | Smallest suggested API                                                                                                                                    |
| -------- | ------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Device inventory and truthful device count | Only `GET /api/devices/{deviceCode}` exists; lookup cannot produce inventory. | `GET /api/devices?status=&protocol=&page=&size=` returning a page of `deviceCode`, `protocol`, `status`, `online`, `lastSeenAt`, and connector summaries. |
| P1       | Billing operations table                   | Billing supports lookup by record or transaction ID, with no list endpoint.   | `GET /api/billing-records?status=&transactionId=&page=&size=` returning record ID, transaction ID, status, currency, total, and finalized time.           |

No dashboard summary is requested yet: transaction status filtering can provide real counts after querying statuses. No gateway or tenant-discovery endpoint is assumed by this console.
