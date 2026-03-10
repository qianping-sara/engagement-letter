# EL Manager — Engagement Letter Automation

基于 2026 Master Control Sheet 的 Engagement Letter（参与函）管理应用：从 Excel/CSV 同步客户数据，按状态筛选与批量生成/标记发送。

---

## 功能概览

- **数据同步**：上传 Master Control Sheet（.xlsx / .csv）做增量同步（新增/更新客户，锁定字段冲突提示）。
- **全量替换**：上传 **.csv** 时可用「Replace all from CSV」清空客户相关数据并按 CSV 完整重新导入，保证与表格一致。
- **首页列表**：展示 Code、Client、Group、**Status**（应用工作流）、**Excel Status**（表格原始状态）、Total Fees、Oxygen、Lumiere、Synced；支持按状态筛选、搜索、排序、分页。
- **批量操作**：勾选客户后「Generate ELs」生成参与函并标记为 generated，「Mark Sent」标记为已发送。
- **状态说明**：**No SA** = 无签署的销售协议（不参与发信流程）；应用内 **Status** 与表格 **Excel Status** 分开，不混用。

---

## 技术栈

- **前端**：Next.js 16、React 19、Tailwind CSS、Radix UI、Lucide
- **后端**：Next.js App Router、Server Actions
- **数据库**：Neon (PostgreSQL)，`@neondatabase/serverless`
- **表格解析**：xlsx（Excel）、内置 CSV 解析（`lib/csv-master-parser.ts`）

---

## 环境与运行

### 1. 环境变量

在项目根目录创建 `.env.local`（或使用现有 `.env`），例如：

```bash
DATABASE_URL=postgresql://...   # Neon 连接串
```

### 2. 数据库初始化

- **新库**：执行 `scripts/migrate.sql` 创建表结构（已包含 CSV 全部列）。
- **已有库**：若之前未加 CSV 扩展列，执行一次 `scripts/migrate-add-csv-columns.sql`（可重复执行）。

在 Neon 控制台或任意 PostgreSQL 客户端执行对应 SQL 即可。

### 3. 安装与启动

```bash
pnpm install
pnpm dev
```

浏览器访问 `http://localhost:3000`。

---

## 数据与状态说明

### 数据源

- 主数据源：**2026 Master Control Sheet - v2.csv**（或同结构 .xlsx）。
- 表结构与 CSV 列一一对应，包含：客户信息、费用明细、**Excel Status**、以及 Total Tax & Compliance 2026 / Total SMSF 2026 等合计列。

### 两套状态列

| 列名 | 含义 | 取值示例 |
|------|------|----------|
| **Status** | 应用内工作流状态 | `pending` \| `updated` \| `edited` \| `generated` \| `sent` \| `no_sa` |
| **Excel Status** | 表格「Status」列原文 | `No SA`、`Sent to client`、`DBM to give to client` 等 |

- 仅当 Excel Status 含 **No SA** 时，会映射为应用状态 `no_sa`；其余导入行均为 `pending`，之后由应用内操作变更。
- 详见 [docs/CALCULATION.md](docs/CALCULATION.md)（含费用计算逻辑及与 Excel Status 的区分）。

### 费用计算（Total / Oxygen / Lumiere）

- **Oxygen**：优先使用 CSV「Total Tax & Compliance 2026」，否则为 10 项 Oxygen 明细之和（导入不加 10% GST）。
- **Lumiere**：优先使用 CSV「Total SMSF 2026」，否则为 3 项 SMSF 明细之和。
- **Total Fees**：`total_oxygen_fee + total_lumiere_fee`，与 CSV 一致。
- 生成信函时由 `template-builder` 按明细再算小计并 +10% GST 展示。

---

## 主要 API

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/clients` | GET | 客户列表（分页、状态筛选、搜索）、统计、最近一次同步信息 |
| `/api/clients/[id]` | GET / PATCH | 单客户详情与更新 |
| `/api/sync` | POST | 增量同步（formData: file） |
| `/api/admin/reseed-from-csv` | POST | 清空客户相关数据并按上传 CSV 全量重新导入（formData: file） |
| `/api/generate` | POST | 批量生成 EL（body: `{ client_ids: number[] }`） |

---

## 项目结构（要点）

```
├── app/
│   ├── page.tsx                 # 首页（客户列表、筛选、Sync 弹窗）
│   ├── api/
│   │   ├── clients/             # 列表与单客户
│   │   ├── sync/                # 增量同步
│   │   ├── admin/reseed-from-csv/  # 全量替换
│   │   └── generate/            # 生成 EL
├── components/
│   ├── dashboard/               # 统计栏、客户表、状态徽章
│   ├── upload/sync-dialog.tsx   # 同步弹窗（含 Replace all from CSV）
│   └── review/edit-panel.tsx    # 客户编辑
├── lib/
│   ├── db.ts                    # Neon SQL 客户端
│   ├── types.ts                 # Client、ExcelRow、Sync 等类型
│   ├── excel-parser.ts          # Excel 解析与列映射
│   ├── csv-master-parser.ts     # 2026 Master Control Sheet CSV 解析
│   └── template-builder.ts      # Engagement Letter 模板数据
├── scripts/
│   ├── migrate.sql              # 完整建表（含 CSV 列）
│   └── migrate-add-csv-columns.sql  # 已有库增加 CSV 列
└── docs/
    └── CALCULATION.md           # 费用计算与状态区分说明
```

---

## 常用流程

1. **首次或重建数据**：执行 `migrate.sql` 或先执行 `migrate-add-csv-columns.sql`（若表已存在）→ 在 Sync 弹窗上传 **2026 Master Control Sheet - v2.csv** → 点击「Replace all from CSV」。
2. **日常增量**：上传最新 .xlsx/.csv → 点击「Sync Data」；同步结果会显示新增/更新的客户列表。
3. **发信流程**：按状态筛选 → 勾选客户 → 「Generate ELs」或「Mark Sent」；首页可同时查看 **Status** 与 **Excel Status**。

---

## 脚本

```bash
pnpm dev      # 开发
pnpm build    # 构建
pnpm start    # 生产
pnpm lint     # 代码检查
```
