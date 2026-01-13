# 国际化功能说明

## ✨ 新增功能

Currency Exchange Rates 插件现已支持多语言！

### 支持的语言

- **English (en)** - 英语（默认）
- **简体中文 (zh-CN)** - 中文

## 🌍 如何切换语言

### 方法一：通过命令面板

1. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac) 打开命令面板
2. 输入 `Change Language` 或 `切换语言`
3. 选择你想要的语言
4. 插件会自动刷新并应用新语言

### 方法二：通过设置

1. 打开 VS Code 设置 (`Ctrl+,` 或 `Cmd+,`)
2. 搜索 `Currency Exchange`
3. 找到 `Language` 设置项
4. 从下拉菜单中选择语言：
   - `en` - English
   - `zh-CN` - 简体中文

## 📝 国际化覆盖范围

所有界面文本都已国际化，包括：

### 1. 侧边栏
- 标题和按钮
- 基准货币选择器
- 汇率卡片
- 设置面板
- 加载和错误提示

### 2. 实时汇率面板
- 面板标题
- 基准货币选择
- 表格标题
- 刷新按钮
- 数据来源显示

### 3. 汇率计算器
- 面板标题
- 输入标签（金额、从、到）
- 转换按钮
- 结果显示

### 4. 状态栏
- 汇率显示
- 错误提示
- 工具提示

### 5. 命令
- 查看实时汇率
- 汇率计算器
- 刷新汇率数据
- 切换语言

### 6. 配置项
- 所有配置项的描述都支持双语

### 7. 货币名称
- 所有18种支持的货币名称都有英文和中文翻译

## 🔧 技术实现

### 架构

```
src/
├── i18n/
│   ├── en.json          # 英文翻译
│   └── zh-CN.json       # 中文翻译
├── i18nService.ts       # 国际化服务
├── exchangeRateService.ts
├── webviewPanels.ts
├── sidebarProvider.ts
└── extension.ts
```

### 翻译文件结构

翻译文件使用 JSON 格式，采用嵌套结构：

```json
{
  "extension": {
    "name": "Currency Exchange Rates",
    "welcomeMessage": "💱 Currency Exchange Rates extension started!"
  },
  "commands": {
    "showRates": "View Real-time Exchange Rates",
    "calculate": "Currency Calculator"
  },
  "currencies": {
    "USD": "US Dollar",
    "EUR": "Euro",
    "CNY": "Chinese Yuan"
  }
}
```

### 使用方法

在代码中使用翻译：

```typescript
// 获取翻译文本
const text = i18nService.t('extension.welcomeMessage');

// 获取货币名称
const currencyName = i18nService.getCurrencyName('USD');

// 带参数的翻译（如果需要）
const text = i18nService.t('messages.error', { code: '404' });
```

## 🎯 默认语言

- **默认语言：** English (en)
- 首次安装时，插件会使用英语
- 用户可以随时切换到中文或其他支持的语言

## 🔄 语言切换效果

切换语言后，以下内容会立即更新：

1. ✅ 状态栏显示
2. ✅ 侧边栏界面
3. ✅ 实时汇率面板
4. ✅ 汇率计算器
5. ✅ 所有提示消息
6. ✅ 货币名称

## 📦 打包说明

语言文件会自动包含在插件包中：

```bash
# 编译时，语言文件会被复制到 out/i18n/ 目录
npm run compile

# 打包时，语言文件会包含在 .vsix 文件中
npm run package
```

## 🌐 添加新语言

如果需要添加新语言支持：

1. 在 `src/i18n/` 目录下创建新的语言文件，如 `fr.json`
2. 复制 `en.json` 的内容并翻译
3. 在 `i18nService.ts` 中添加新语言到 `SupportedLanguage` 类型
4. 在 `getSupportedLanguages()` 方法中添加新语言
5. 在 `package.json` 的语言配置中添加新选项

## 💡 最佳实践

1. **保持一致性**：所有新增的文本都应该添加到翻译文件中
2. **使用语义化的键名**：如 `sidebar.title` 而不是 `text1`
3. **避免硬编码文本**：始终使用 `i18nService.t()` 获取翻译
4. **测试所有语言**：切换语言后测试所有功能

## 🐛 故障排除

### 问题：切换语言后没有生效

**解决方案：**
1. 重启 VS Code
2. 检查配置是否正确保存
3. 查看开发者工具控制台是否有错误

### 问题：某些文本没有翻译

**解决方案：**
1. 检查翻译文件中是否包含该键
2. 确保使用了正确的键名
3. 重新编译插件

### 问题：语言文件加载失败

**解决方案：**
1. 确保语言文件在 `out/i18n/` 目录中
2. 检查文件格式是否正确（有效的 JSON）
3. 查看控制台错误日志

## 📚 相关文件

- `/src/i18n/en.json` - 英文翻译
- `/src/i18n/zh-CN.json` - 中文翻译
- `/src/i18nService.ts` - 国际化服务
- `/package.json` - 语言配置

## 🎉 总结

国际化功能让 Currency Exchange Rates 插件能够服务更广泛的用户群体。默认使用英语确保了国际化，同时支持中文满足了中文用户的需求。

---

**版本：** 1.0.0  
**更新日期：** 2026-01-12
