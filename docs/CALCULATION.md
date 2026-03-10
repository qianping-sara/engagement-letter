# 费用计算逻辑 (Total / Oxygen / Lumiere)

## 数据来源

- **CSV 列**：`Total Tax & Compliance 2026`（Oxygen）、`Total SMSF 2026`（Lumiere）、以及各项明细费用。
- 表中金额以**分 (cents)** 存储，避免浮点误差。

## 当前逻辑

### 1. Oxygen（Total Tax & Compliance 2026）

- **优先**：若 CSV 中有 `Total Tax & Compliance 2026`，直接使用该值（转为 cents 存入），**不再加 10% GST**。
- **否则**：用 10 项明细之和作为 Oxygen 小计（ex-GST）：
  - Tax and Compliance, ASIC 2026, Quarterly Activity, Bookkeeping/Administrative,
  - Foundation Annual Comp, FBT, Family Office, Annual Tax Planning, Adhoc Advice,
  - Prep of Financial Reports and Trust & Company minutes

### 2. Lumiere（Total SMSF 2026）

- **优先**：若 CSV 中有 `Total SMSF 2026`，直接使用该值（转为 cents 存入），**不再加 10% GST**。
- **否则**：用 3 项 SMSF 明细之和：
  - SMSF Tax & Compliance 2026, SMSF ASIC 2026, SMSF BAS 2026

### 3. Total Fees

- **公式**：`total_fees = total_oxygen_fee + total_lumiere_fee`
- 不做额外 GST；DB 中存的是与 CSV 一致的合计（ex-GST）。

### 4. 信函展示（template-builder）

- 生成 Engagement Letter 时，按**明细项**重新算小计，再 **+10% GST** 显示在信里。
- 即：DB 存源数据与合计；展示层再算 GST。

## 与 Excel Status 的区分

- **excel_status**：存 CSV 的 “Status” 列原文（如 "No SA", "Sent to client", "DBM to give to client" 等）。
- **status**（应用工作流）：仅限 `pending | updated | edited | generated | sent | no_sa`，与 Excel 列独立；只有 “No SA” 会映射为 `no_sa`，其余不混用。
