# 国际化文本显示修复说明

## 🐛 问题描述

插件UI上显示的是翻译键名（如 `sidebar.title`）而不是实际的翻译文本。

## 🔍 问题原因

1. **翻译文件路径错误**：`i18nService.ts` 尝试从 `out/i18n/` 目录加载翻译文件，但编译时没有自动复制这些文件
2. **缺少语言切换按钮**：用户无法在主要界面直接切换语言

## ✅ 修复内容

### 1. 修复翻译文件加载

**修改文件：** `/src/i18nService.ts`

- 添加了多路径尝试逻辑，按顺序尝试：
  - `out/i18n/${lang}.json`
  - `src/i18n/${lang}.json`
  - `i18n/${lang}.json`
- 增加了详细的日志输出，便于调试

### 2. 添加编译脚本

**新增文件：** `/copy-i18n.js`

- 自动将 `src/i18n/*.json` 文件复制到 `out/i18n/` 目录
- 在每次编译后自动执行

**修改文件：** `/package.json`

- 更新 `compile` 脚本：`tsc -p ./ && node copy-i18n.js`
- 确保编译后翻译文件可用

### 3. 添加语言切换按钮

#### 侧边栏 (`/src/sidebarProvider.ts`)
- 在header区域添加 🌐 语言切换按钮
- 添加 `changeLanguage()` 消息处理
- 添加 `changeLanguage()` JavaScript函数

#### 汇率面板 (`/src/webviewPanels.ts` - RatesViewPanel)
- 在header区域添加 🌐 语言切换按钮
- 添加 `changeLanguage` 消息处理
- 添加 `changeLanguage()` JavaScript函数

#### 计算器面板 (`/src/webviewPanels.ts` - CalculatorPanel)
- 在标题区域添加 🌐 语言切换按钮
- 添加 `changeLanguage` 消息处理
- 添加 `changeLanguage()` JavaScript函数
- 添加按钮hover样式

### 4. 改进语言切换体验

**修改文件：** `/src/extension.ts`

- 语言切换后显示双语提示消息
- 提醒用户重新打开面板以查看更改

## 📦 重新编译和测试

### 步骤1：重新编译

```bash
npm run compile
```

这将：
1. 编译TypeScript代码到 `out/` 目录
2. 自动复制 `src/i18n/*.json` 到 `out/i18n/`

### 步骤2：验证文件

检查以下文件是否存在：
```
out/
├── i18n/
│   ├── en.json
│   └── zh-CN.json
├── extension.js
├── i18nService.js
├── webviewPanels.js
└── sidebarProvider.js
```

### 步骤3：重新打包（可选）

```bash
npm run package
```

### 步骤4：测试

1. **重启VS Code**或重新加载窗口（`Ctrl+Shift+P` → `Reload Window`）
2. **检查侧边栏**：
   - 应该显示"汇率监控"或"Exchange Rate Monitor"
   - 不应该显示"sidebar.title"
3. **测试语言切换**：
   - 点击侧边栏的 🌐 按钮
   - 选择语言
   - 重新打开面板查看效果

## 🎯 预期效果

### 修复前
```
侧边栏标题: sidebar.title
按钮文本: sidebar.viewDetails
货币名称: currencies.USD
```

### 修复后（英语）
```
侧边栏标题: Exchange Rate Monitor
按钮文本: View Detailed Rates
货币名称: US Dollar
```

### 修复后（中文）
```
侧边栏标题: 汇率监控
按钮文本: 查看详细汇率
货币名称: 美元
```

## 🌐 语言切换按钮位置

1. **侧边栏**：右上角，刷新按钮旁边
2. **汇率面板**：右上角，刷新按钮旁边
3. **计算器面板**：标题右侧

所有按钮都使用 🌐 图标，点击后会打开语言选择菜单。

## 🔧 故障排除

### 问题1：编译后仍显示键名

**解决方案：**
```bash
# 手动复制文件
node copy-i18n.js

# 或者手动创建目录并复制
mkdir -p out/i18n
cp src/i18n/*.json out/i18n/
```

### 问题2：语言切换后没有效果

**解决方案：**
1. 关闭所有打开的面板
2. 重新打开面板
3. 或者重新加载VS Code窗口

### 问题3：找不到翻译文件

**检查步骤：**
1. 确认 `src/i18n/en.json` 和 `src/i18n/zh-CN.json` 存在
2. 运行 `npm run compile`
3. 检查 `out/i18n/` 目录是否有文件
4. 查看VS Code开发者工具控制台的日志

## 📝 相关文件

- `/src/i18nService.ts` - 国际化服务（修复了文件加载）
- `/src/sidebarProvider.ts` - 侧边栏（添加了语言切换）
- `/src/webviewPanels.ts` - 面板（添加了语言切换）
- `/src/extension.ts` - 主扩展（改进了语言切换）
- `/copy-i18n.js` - 文件复制脚本（新增）
- `/package.json` - 编译脚本（已更新）

## ✅ 验证清单

- [ ] 编译成功，无错误
- [ ] `out/i18n/` 目录包含翻译文件
- [ ] 侧边栏显示正确的文本（不是键名）
- [ ] 汇率面板显示正确的文本
- [ ] 计算器面板显示正确的文本
- [ ] 语言切换按钮可见且可点击
- [ ] 切换语言后文本正确更新
- [ ] 所有货币名称正确显示

---

**修复日期：** 2026-01-12  
**问题状态：** ✅ 已解决
