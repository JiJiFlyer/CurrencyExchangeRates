# 故障排除指南

## 🔍 TLS 连接错误问题

### 问题描述

如果你看到以下错误：
```
Client network socket disconnected before secure TLS connection was established
```

这是因为 VS Code 扩展环境中的网络请求与浏览器不同，可能遇到 SSL/TLS 证书验证问题。

### 解决方案

#### 方案一：重新编译和安装（推荐）

最新版本已经修复了这个问题，请按以下步骤操作：

```bash
# 1. 进入项目目录
cd /path/to/currency-exchange-rates

# 2. 清理旧的编译文件
rm -rf out node_modules

# 3. 重新安装依赖
npm install

# 4. 编译代码
npm run compile

# 5. 打包插件
npm run package

# 6. 卸载旧版本
# 在 VS Code 中：扩展 -> Currency Exchange Rates -> 卸载 -> 重启

# 7. 安装新版本
code --install-extension currency-exchange-rates-1.0.0.vsix
```

#### 方案二：配置网络代理

如果你的网络环境需要代理，请配置：

**Windows:**
```cmd
set HTTP_PROXY=http://your-proxy:port
set HTTPS_PROXY=http://your-proxy:port
```

**Mac/Linux:**
```bash
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
```

然后重启 VS Code。

#### 方案三：检查防火墙设置

确保防火墙允许 VS Code 访问以下域名：
- `api.exchangerate-api.com`
- `api.frankfurter.app`
- `open.er-api.com`

**Windows 防火墙：**
1. 打开"Windows Defender 防火墙"
2. 点击"允许应用通过防火墙"
3. 找到"Visual Studio Code"并确保勾选"专用"和"公用"
4. 如果没有，点击"允许其他应用"添加 VS Code

**Mac 防火墙：**
1. 系统偏好设置 -> 安全性与隐私 -> 防火墙
2. 点击"防火墙选项"
3. 确保 VS Code 被允许接收传入连接

#### 方案四：使用开发者工具调试

1. 在 VS Code 中按 `F1` 或 `Ctrl+Shift+P`
2. 输入 `Developer: Toggle Developer Tools`
3. 打开开发者工具后，切换到"Console"标签
4. 点击侧边栏的货币汇率图标
5. 查看控制台输出的详细错误信息

你应该能看到类似这样的日志：
```
尝试使用 ExchangeRate-API 获取汇率数据...
✅ 成功从 ExchangeRate-API 获取汇率数据，包含 162 种货币
```

或者错误信息：
```
❌ ExchangeRate-API 失败 [ECONNRESET]: Client network socket disconnected...
```

## 🐛 常见问题

### Q1: 侧边栏一直显示加载动画

**原因：** API 请求失败或超时

**解决方案：**
1. 打开开发者工具查看具体错误
2. 检查网络连接
3. 尝试手动刷新：`Ctrl+Shift+P` -> "刷新汇率数据"
4. 重启 VS Code

### Q2: 状态栏显示"汇率获取失败"

**原因：** 所有 API 数据源都不可用

**解决方案：**
1. 检查是否能访问 https://api.exchangerate-api.com/v4/latest/USD
2. 如果浏览器能访问但插件不能，可能是代理或防火墙问题
3. 尝试配置代理（见方案二）
4. 检查 VS Code 的网络设置

### Q3: 数据显示但不更新

**原因：** 缓存机制导致

**解决方案：**
1. 手动刷新：`Ctrl+Shift+P` -> "刷新汇率数据"
2. 调整刷新间隔：设置 -> 搜索 "currency exchange" -> Refresh Interval

### Q4: 编译时出错

**错误：** `Cannot find module 'https'`

**解决方案：**
```bash
npm install --save-dev @types/node
npm run compile
```

### Q5: 打包时警告缺少 icon.png

**解决方案：**
参考 `resources/ICON_README.md` 获取图标文件。

## 📊 测试 API 可用性

你可以在浏览器中测试这些 API 是否可用：

1. **ExchangeRate-API:**
   ```
   https://api.exchangerate-api.com/v4/latest/USD
   ```

2. **Frankfurter:**
   ```
   https://api.frankfurter.app/latest?from=USD
   ```

3. **Open-ER-API:**
   ```
   https://open.er-api.com/v6/latest/USD
   ```

如果浏览器能正常访问但插件不能，说明是 VS Code 的网络环境问题。

## 🔧 高级调试

### 启用详细日志

修改 `src/exchangeRateService.ts`，在 `fetchExchangeRates` 方法开头添加：

```typescript
console.log('=== 开始获取汇率数据 ===');
console.log('基准货币:', baseCurrency);
console.log('缓存状态:', cached ? '有缓存' : '无缓存');
```

### 测试单个 API

在开发者工具的 Console 中运行：

```javascript
const axios = require('axios');
axios.get('https://api.exchangerate-api.com/v4/latest/USD')
  .then(res => console.log('成功:', res.data))
  .catch(err => console.error('失败:', err.message));
```

### 检查 Node.js 版本

```bash
node --version
```

确保版本 >= 18.0.0

## 📞 获取帮助

如果以上方法都无法解决问题，请提供以下信息：

1. **操作系统：** Windows / Mac / Linux
2. **VS Code 版本：** 帮助 -> 关于
3. **Node.js 版本：** `node --version`
4. **网络环境：** 是否使用代理、VPN
5. **错误日志：** 开发者工具中的完整错误信息
6. **API 测试结果：** 浏览器能否访问上述 API

## ✅ 验证修复

修复后，你应该能看到：

1. **侧边栏：** 显示汇率列表，而不是加载动画
2. **状态栏：** 显示具体汇率，如 `💱 USD/CNY: 7.2345`
3. **控制台：** 显示成功日志，如 `✅ 成功从 ExchangeRate-API 获取汇率数据`

---

**最后更新：** 2026-01-12
