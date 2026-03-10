# Generation 相关逻辑分析

## 一、整体流程

```
首页勾选客户 → 点击「Generate N ELs」→ POST /api/generate { client_ids }
    → 对每个 client_id：查 client + client_entities
    → buildTemplateData(client, entities) 得到模板数据
    → INSERT generation_log (快照) + UPDATE clients.status = 'generated'
    → 返回 success + results，前端提示「N ELs marked as Generated」
```

**结论**：当前「生成」只做三件事：**算模板数据、写 generation_log、把客户标成 generated**。**没有生成或下载 .docx 文件**，也没有把 `templateData` 交给 docx 引擎。

---

## 二、入口与 API

### 1. 前端（`app/page.tsx`）

- **触发**：勾选若干客户后点 **「Generate N ELs」**，调用 `handleGenerate()`。
- **请求**：`POST /api/generate`，body：`{ client_ids: number[] }`。
- **结果**：仅用 `data.success` 和 `data.results.length` 做提示（如「3 ELs marked as Generated」），并刷新列表、清空勾选；**不使用** `results[].data`（即 templateData）。

### 2. 后端（`app/api/generate/route.ts`）

对每个 `client_id` 顺序执行：

1. **查 client**：`SELECT * FROM clients WHERE id = ${clientId}`，不存在则跳过。
2. **查 entities**：`SELECT * FROM client_entities WHERE client_id = ${clientId}`。
3. **算模板数据**：`buildTemplateData(client, entities)` → `TemplateData`。
4. **写日志**：`INSERT INTO generation_log (client_id, snapshot) VALUES (${clientId}, ${JSON.stringify(templateData)})`。
5. **改状态**：`UPDATE clients SET status = 'generated', updated_at = NOW() WHERE id = ${clientId}`。
6. 把 `{ client_id, client_code, group_name, data: templateData }` 放进返回的 `results`。

无事务包裹：若中间某条失败，前面已写的 `generation_log` 和已改的 `clients.status` 不会回滚。

---

## 三、模板数据：`buildTemplateData`（`lib/template-builder.ts`）

### 输入

- **client**：`Client`（含费用、联系人、letter_date 等）。
- **entities**：`ClientEntity[]`（entity_type + entity_name）。

### 输出：`TemplateData`（给 docxtemplater 用，当前未接 docx）

| 字段 | 来源/计算 |
|------|-----------|
| **letter_date** | `client.letter_date` 格式化为 en-AU 长日期，缺省用今天 |
| **client_name** | `client.contact_name \|\| client.client_name` |
| **client_email** | `client.client_email \|\| ''` |
| **salutation** | `client.salutation \|\| client.contact_name \|\| ''` |
| **client_group** | `client.client_group` |
| **individuals / trusts / companies / smsfs / foundations / partnerships** | 按 `entity_type` 从 entities 筛出，各取 `entity_name` 数组 |
| **oxygen_items** | 10 个 Oxygen 费用项里金额 > 0 的，每项 `{ name: 标签, amount: 格式化为 $ 的金额 }` |
| **oxygen_subtotal / oxygen_gst / oxygen_total** | 小计、10% GST、合计（金额为 cents，展示时 formatCents） |
| **lumiere_items** | 3 个 Lumiere 费用项里金额 > 0 的，结构同 oxygen_items |
| **lumiere_subtotal / lumiere_gst / lumiere_total** | 同上，Lumiere 小计 + 10% GST + 合计 |
| **grand_total** | oxygen_total + lumiere_total（均为加 GST 后） |
| **has_oxygen / has_lumiere / has_smsf / has_foundation** | 是否有对应费用或 entities |

**费用计算**：

- Oxygen：10 项（tax_and_compliance_fee, quarterly_activity_fee, asic_fee, bookkeeping_fee, foundation_annual_comp_fee, fbt_fee, family_office_fee, annual_tax_planning_fee, adhoc_advice_fee, financial_reports_fee）按 **cents** 相加 → 小计 → `round(小计 * 0.1)` 为 GST → 小计 + GST = oxygen_total。
- Lumiere：3 项（smsf_tax_compliance_fee, smsf_bas_fee, smsf_asic_fee）同样小计 + 10% GST。
- 所有金额在 DB 里是 cents，展示用 `formatCents`（如 `$219`）。

---

## 四、数据库

### 1. `generation_log`（`scripts/migrate.sql`）

| 列 | 类型 | 说明 |
|----|------|------|
| id | SERIAL | 主键 |
| client_id | INTEGER | FK → clients(id) ON DELETE CASCADE |
| generated_at | TIMESTAMPTZ | 默认 NOW() |
| snapshot | JSONB | 当次 `buildTemplateData` 的完整结果 |
| filename | TEXT | 当前未使用 |
| is_stale | BOOLEAN | 默认 false，当前未使用 |

每次「Generate」会为每个客户插入一条记录；reseed 全量替换客户时会 `DELETE FROM generation_log`。

### 2. `clients.status`

- Generate 后：`status = 'generated'`，并更新 `updated_at`。
- 统计/筛选里「Generated」即 `status = 'generated'`（见 `app/api/clients/route.ts`、`stats-bar`、`status-badge`）。

---

## 五、当前缺口与可扩展点

1. **无文档输出**：`TemplateData` 已按 docxtemplater 形状设计，但没有任何逻辑把 `templateData` 填进 .docx 模板或生成/下载文件。
2. **无重试/事务**：批量生成时一条失败不会回滚已写入的 log 和 status。
3. **generation_log 未参与 UI**：没有「查看某客户某次生成快照」或「用某次快照再导出」的界面。
4. **filename / is_stale**：表里有字段但未使用，可用来存「导出文件名」或「客户数据变更后标记快照过期」。

若要接上真实「出 docx」流程，需要：选用 docxtemplater（或类似） + 模板文件，在 `/api/generate` 或单独接口里用 `templateData` 渲染 docx，并返回文件流或下载链接。
