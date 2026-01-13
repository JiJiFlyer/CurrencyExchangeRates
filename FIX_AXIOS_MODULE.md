# 修复说明 - axios 模块找不到问题

## 🐛 问题描述

安装插件后，VS Code 报错：

```
Activating extension 'kaifeishen.currency-exchange-rates' failed: Cannot find module 'axios'
```

## 🔍 问题原因

`.vscodeignore` 文件中配置了 `node_modules`，导致打包时**所有依赖都被排除**，包括运行时必需的 `axios` 模块。

VS Code 扩展打包时：
- ❌ **错误做法**：排除整个 `node_modules` 目录
- ✅ **正确做法**：只排除开发依赖，保留运行时依赖

## ✅ 解决方案

已修改 `.vscodeignore` 文件，现在会：

1. **排除开发依赖**：
   - `@types/*` - TypeScript 类型定义
   - `@vscode/*` - VS Code 开发工具
   - `typescript` - TypeScript 编译器

2. **保留运行时依赖**：
   - `axios` - HTTP 客户端（必需）
   - `follow-redirects` - axios 的依赖
   - `form-data` - axios 的依赖
   - `proxy-from-env` - axios 的依赖

## 📦 重新打包步骤

请按以下步骤重新打包插件：

```bash
# 1. 确保依赖已安装
npm install

# 2. 清理旧的编译文件
rm -rf out

# 3. 重新编译
npm run compile

# 4. 删除旧的 VSIX 文件
rm -f *.vsix

# 5. 重新打包
npm run package
```

**Windows 用户：**

```cmd
# 1. 确保依赖已安装
npm install

# 2. 清理旧的编译文件
rmdir /s /q out

# 3. 重新编译
npm run compile

# 4. 删除旧的 VSIX 文件
del *.vsix

# 5. 重新打包
npm run package
```

## 🔍 验证打包结果

打包完成后，可以验证 VSIX 文件是否包含了 axios：

```bash
# 解压 VSIX 文件（VSIX 本质上是 ZIP 文件）
unzip -l currency-exchange-rates-1.0.0.vsix | grep axios
```

应该能看到类似输出：

```
extension/node_modules/axios/
extension/node_modules/axios/package.json
extension/node_modules/axios/index.js
...
```

## 🚀 重新安装插件

1. **卸载旧版本**：
   - 在 VS Code 扩展列表中找到 "Currency Exchange Rates"
   - 点击"卸载"
   - 重启 VS Code

2. **安装新版本**：
   ```bash
   code --install-extension currency-exchange-rates-1.0.0.vsix
   ```

3. **验证安装**：
   - 重启 VS Code
   - 检查状态栏是否显示汇率
   - 打开开发者工具（`Ctrl+Shift+I`）查看是否还有错误

## 📊 打包文件大小对比

- **修复前**：约 50 KB（缺少依赖）
- **修复后**：约 500 KB - 1 MB（包含 axios 及其依赖）

文件变大是正常的，因为现在包含了必要的运行时依赖。

## 💡 为什么会出现这个问题？

VS Code 扩展有两种依赖：

1. **开发依赖（devDependencies）**：
   - 只在开发时需要
   - 如：TypeScript、类型定义、打包工具
   - ✅ 应该被排除

2. **运行时依赖（dependencies）**：
   - 插件运行时需要
   - 如：axios、其他第三方库
   - ❌ 不能被排除

默认的 `.vscodeignore` 模板会排除整个 `node_modules`，这对于没有运行时依赖的插件是可以的，但对于使用了第三方库的插件就会出问题。

## 🎯 最佳实践

对于使用了运行时依赖的 VS Code 扩展：

1. **方法一：精确排除**（推荐）
   ```
   # 只排除开发依赖
   node_modules/@types/**
   node_modules/@vscode/**
   node_modules/typescript/**
   
   # 保留运行时依赖
   !node_modules/axios/**
   ```

2. **方法二：使用 webpack 打包**
   - 将所有代码和依赖打包成单个文件
   - 完全不需要 `node_modules` 目录
   - 但配置较复杂

3. **方法三：不排除 node_modules**
   - 最简单但文件会很大
   - 包含了所有开发依赖

## ✅ 验证修复

修复后，你应该能看到：

1. ✅ 插件成功激活，无错误信息
2. ✅ 状态栏显示汇率信息
3. ✅ 侧边栏能正常显示汇率列表
4. ✅ 所有功能正常工作

## 📝 相关文件

- `.vscodeignore` - 控制哪些文件被包含在 VSIX 中
- `package.json` - 定义依赖关系
- `node_modules/` - 依赖安装目录

---

**修复日期：** 2026-01-12  
**问题状态：** ✅ 已解决
