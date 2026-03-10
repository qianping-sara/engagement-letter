# TemplateData 字段与 Word 占位符说明

当前项目已配置为**双花括号** `{{ }}`，且**标签名里不要加空格**（否则会变成 undefined）。

**必须遵守：**
- 只用 `{{` 和 `}}`，**不要用** `((` 或 `))`。
- 写成 `{{letter_date}}`、`{{client_name}}`，**不要**写成 `{{ letter_date }}`（中间不要空格）。

---

## 正确标签速查（直接复制到 Word）

| 在 Word 里输入（不要改名字、不要加空格） | 含义 |
|----------------------------------------|------|
| `{{letter_date}}` | 信函日期 |
| `{{client_name}}` | 客户名称 |
| `{{client_email}}` | 客户邮箱 |
| `{{salutation}}` | 称呼 |
| `{{client_group}}` | 客户组 |
| `{{oxygen_subtotal}}` `{{oxygen_gst}}` `{{oxygen_total}}` | Oxygen 小计 / GST / 合计 |
| `{{lumiere_subtotal}}` `{{lumiere_gst}}` `{{lumiere_total}}` | Lumiere 小计 / GST / 合计 |
| `{{grand_total}}` | 总价 |
| `{{#has_oxygen}}` … `{{/has_oxygen}}` | 有 Oxygen 才显示这一段 |
| `{{#has_lumiere}}` … `{{/has_lumiere}}` | 有 Lumiere 才显示这一段 |
| `{{#oxygen_items}}{{name}}: {{amount}}{{/oxygen_items}}` | Oxygen 费用明细（一行一条） |
| `{{#lumiere_items}}{{name}}: {{amount}}{{/lumiere_items}}` | Lumiere 费用明细 |

---

## 一、TemplateData 里有什么值

### 1. 简单文本（直接替换）

| 占位符 | 含义 | 示例值 |
|--------|------|--------|
| **letter_date** | 信函日期（en-AU 长格式） | `"9 March 2026"` |
| **client_name** | 客户名称（优先 contact_name） | `"Mario Abbotto"` |
| **client_email** | 客户邮箱 | `"mario@abbottogroup.com.au"` |
| **salutation** | 称呼 | `"Mario"` 或 `"Mr Mario Abbotto"` |
| **client_group** | 客户组名 | `"Abbotto Group"` |

### 2. 金额（已格式化为带千分位，如 $21,900）

| 占位符 | 含义 |
|--------|------|
| **oxygen_subtotal** | Oxygen 小计（不含 GST） |
| **oxygen_gst** | Oxygen 10% GST |
| **oxygen_total** | Oxygen 合计（含 GST） |
| **lumiere_subtotal** | Lumiere 小计（不含 GST） |
| **lumiere_gst** | Lumiere 10% GST |
| **lumiere_total** | Lumiere 合计（含 GST） |
| **grand_total** | 总合计（Oxygen + Lumiere，均含 GST） |

### 3. 布尔（用于「是否显示某一段落」）

| 占位符 | 含义 | 为 true 时 |
|--------|------|------------|
| **has_oxygen** | 是否有 Oxygen 费用 | 显示 Oxygen 费用区块 |
| **has_lumiere** | 是否有 Lumiere 费用 | 显示 Lumiere 费用区块 |
| **has_smsf** | 是否有 SMSF 相关 | 显示 SMSF 相关段落 |
| **has_foundation** | 是否有 Foundation 相关 | 显示 Foundation 相关段落 |

### 4. 列表（实体名称，字符串数组）

| 占位符 | 含义 | 示例 |
|--------|------|------|
| **individuals** | 个人实体名 | `["John Smith", "Jane Doe"]` |
| **trusts** | 信托名 | `["Abbotto Family Trust"]` |
| **companies** | 公司名 | `["Acme Pty Ltd"]` |
| **smsfs** | SMSF 名 | `["Mario Abbotto SMSF"]` |
| **foundations** | Foundation 名 | `[]` |
| **partnerships** | 合伙名 | `[]` |

### 5. 费用明细（对象数组，用于表格/列表）

**oxygen_items**（仅包含金额 > 0 的项）  
每项：`{ name: "服务名称", amount: "$21,600" }`  
例如：Taxation and Compliance Services、ASIC Administration…、Quarterly Activity… 等。

**lumiere_items**（仅包含金额 > 0 的项）  
每项：`{ name: "服务名称", amount: "$2,000" }`  
例如：SMSF Taxation and Compliance、SMSF ASIC…、SMSF BAS… 等。

---

## 二、在 Word 里怎么放（docxtemplater 语法）

### 1. 直接替换：写 `{{变量名}}`（中间无空格）

在要出现日期的位置打：

```
{{letter_date}}
```

在要出现客户名、邮箱、称呼、客户组的位置分别打：

```
{{client_name}}
{{client_email}}
{{salutation}}
{{client_group}}
```

金额同理，例如：

```
{{oxygen_subtotal}}   {{oxygen_gst}}   {{oxygen_total}}
{{lumiere_subtotal}}   {{lumiere_gst}}   {{lumiere_total}}
{{grand_total}}
```

**注意**：Word 里必须是**连续的** `{{letter_date}}`，中间不要被自动更正或空格拆开；**花括号与标签名之间不要加空格**。

---

### 2. 条件段落：有 Oxygen 才显示一整段

只在该客户有 Oxygen 费用时显示某段文字（例如整段「Oxygen 费用」）：

```
{{#has_oxygen}}
此处写 Oxygen 费用说明段落……
Oxygen Subtotal: {{oxygen_subtotal}}
GST (10%): {{oxygen_gst}}
Total: {{oxygen_total}}
{{/has_oxygen}}
```

Lumiere 同理：

```
{{#has_lumiere}}
此处写 Lumiere 费用说明段落……
Lumiere Subtotal: {{lumiere_subtotal}}
GST (10%): {{lumiere_gst}}
Total: {{lumiere_total}}
{{/has_lumiere}}
```

SMSF / Foundation 相关段落：

```
{{#has_smsf}}
（SMSF 相关条款或说明）
{{/has_smsf}}

{{#has_foundation}}
（Foundation 相关条款或说明）
{{/has_foundation}}
```

---

### 3. 循环：费用明细表格

**Oxygen 明细**（一行一个服务 + 金额）：

```
{{#oxygen_items}}
{{name}}: {{amount}}
{{/oxygen_items}}
```

若在表格里，通常是一行一个 item，例如：

| 描述 | 金额 |
|------|------|
| {{#oxygen_items}} | |
| {{name}} | {{amount}} |
| {{/oxygen_items}} | |

**Lumiere 明细**：

```
{{#lumiere_items}}
{{name}}: {{amount}}
{{/lumiere_items}}
```

---

### 4. 实体列表（个人/信托/公司等）

若需要「列出所有个人」等，可以循环：

```
{{#individuals}}
{{.}}
{{/individuals}}
```

（docxtemplater 里数组循环时 `{{.}}` 表示当前元素）

trusts、companies、smsfs、foundations、partnerships 同理，把 individuals 换成对应名字即可，如 `{{#trusts}}{{.}}{{/trusts}}`。

---

## 三、建议你在 Word 里做的具体步骤

1. **打开** `2026 SA template_1.docx`，找到要替换的固定文字（如「客户名称」「日期」等）。
2. **删掉**那串固定文字，改成对应占位符（**只用双花括号、标签名无空格**）：
   - 日期处 → `{{letter_date}}`
   - 客户名 → `{{client_name}}`
   - 邮箱 → `{{client_email}}`
   - 称呼 → `{{salutation}}`
   - 客户组 → `{{client_group}}`
3. **不要用** `((client_name))` 或 `(( client_email ))`，一律改成 `{{client_name}}`、`{{client_email}}`。
4. **Oxygen 费用区块**：整段包在 `{{#has_oxygen}}...{{/has_oxygen}}` 里，里面用 `{{oxygen_subtotal}}`、`{{oxygen_gst}}`、`{{oxygen_total}}`，明细用 `{{#oxygen_items}}{{name}}: {{amount}}{{/oxygen_items}}`。
5. **Lumiere 费用区块**：同理用 `{{#has_lumiere}}...{{/has_lumiere}}` 及 `{{lumiere_subtotal}}` 等，明细用 `{{#lumiere_items}}{{name}}: {{amount}}{{/lumiere_items}}`。
6. **总价**：写 `{{grand_total}}`。
7. **SMSF/Foundation 条款**：用 `{{#has_smsf}}...{{/has_smsf}}`、`{{#has_foundation}}...{{/has_foundation}}`。
8. **实体列表**（若有）：用 `{{#individuals}}{{.}}{{/individuals}}` 等。

保存后，把模板继续放在根目录，在应用里 Generate 即可生成带数据的 Word。
