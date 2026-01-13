# 安装和打包说明

## 📦 如何打包插件

### 前置要求

1. 安装 Node.js（版本 >= 18.0.0）
   - 下载地址：https://nodejs.org/
   - 验证安装：`node --version`

2. 安装 vsce（VS Code Extension Manager）
   ```bash
   npm install -g @vscode/vsce
   ```

### 打包步骤

#### 方法一：使用 npm 脚本（推荐）

```bash
# 1. 进入项目目录
cd currency-exchange-rates

# 2. 安装依赖
npm install

# 3. 编译 TypeScript 代码
npm run compile

# 4. 打包成 VSIX 文件
npm run package
```

#### 方法二：手动打包

```bash
# 1. 安装依赖
npm install

# 2. 编译代码
npx tsc -p ./

# 3. 打包
vsce package
```

打包成功后，会在项目根目录生成 `currency-exchange-rates-1.0.0.vsix` 文件。

## 🚀 如何安装插件

### 方法一：通过 VS Code 界面安装（推荐）

1. 打开 VS Code
2. 点击左侧活动栏的"扩展"图标（或按 `Ctrl+Shift+X`）
3. 点击扩展视图右上角的 `...` 菜单
4. 选择"从 VSIX 安装..."
5. 浏览并选择 `currency-exchange-rates-1.0.0.vsix` 文件
6. 等待安装完成
7. 点击"重新加载"按钮或重启 VS Code

### 方法二：通过命令面板安装

1. 打开 VS Code
2. 按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`）打开命令面板
3. 输入 `Extensions: Install from VSIX...`
4. 选择 `currency-exchange-rates-1.0.0.vsix` 文件
5. 等待安装完成并重启 VS Code

### 方法三：使用命令行安装

在终端中运行：

```bash
code --install-extension currency-exchange-rates-1.0.0.vsix
```

如果 `code` 命令不可用，需要先将 VS Code 添加到 PATH：
- Windows：安装时选择"添加到 PATH"
- Mac：在 VS Code 中按 `Cmd+Shift+P`，输入 `Shell Command: Install 'code' command in PATH`
- Linux：通常自动添加

## ✅ 验证安装

安装成功后：

1. 在 VS Code 底部状态栏右侧应该能看到汇率信息（如：`💱 USD/CNY: 7.2345`）
2. 按 `Ctrl+Shift+P` 打开命令面板，输入 `currency`，应该能看到以下命令：
   - 查看实时汇率
   - 汇率计算器
   - 刷新汇率数据
3. 在扩展列表中应该能看到"Currency Exchange Rates"插件

## 🔧 故障排除

### 问题：打包时提示缺少依赖

**解决方案：**
```bash
# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装依赖
npm install

# 再次尝试打包
npm run package
```

### 问题：编译失败

**解决方案：**
```bash
# 确保 TypeScript 已安装
npm install typescript --save-dev

# 清理输出目录
rm -rf out

# 重新编译
npm run compile
```

### 问题：安装后插件不显示

**解决方案：**
1. 完全关闭 VS Code
2. 重新打开 VS Code
3. 检查扩展是否已启用（在扩展列表中查看）
4. 查看输出面板是否有错误信息（`查看` -> `输出` -> 选择 `Currency Exchange Rates`）

### 问题：状态栏不显示汇率

**解决方案：**
1. 检查网络连接是否正常
2. 检查防火墙是否阻止了网络请求
3. 按 `Ctrl+Shift+P`，运行"刷新汇率数据"命令
4. 查看 VS Code 开发者工具（`帮助` -> `切换开发人员工具`）中的错误信息

### 问题：Windows 上无法安装

**解决方案：**
1. 以管理员身份运行 VS Code
2. 确保 VSIX 文件没有被杀毒软件阻止
3. 尝试将 VSIX 文件移动到没有特殊字符的路径

## 📝 开发模式运行

如果你想在开发模式下测试插件：

1. 用 VS Code 打开项目文件夹
2. 按 `F5` 启动调试
3. 会打开一个新的 VS Code 窗口（扩展开发主机）
4. 在新窗口中测试插件功能
5. 修改代码后，在调试工具栏点击"重新启动"按钮

## 🔄 更新插件

如果需要更新插件到新版本：

1. 卸载旧版本：
   - 在扩展列表中找到"Currency Exchange Rates"
   - 点击"卸载"按钮
   - 重启 VS Code

2. 安装新版本：
   - 按照上述安装步骤安装新的 VSIX 文件

## 📤 分发插件

如果你想分享这个插件给其他人：

1. 将打包好的 `.vsix` 文件发送给他们
2. 附上 README.md 中的安装说明
3. 或者发布到 VS Code Marketplace（需要注册发布者账号）

### 发布到 Marketplace（可选）

```bash
# 1. 创建发布者账号
# 访问：https://marketplace.visualstudio.com/manage

# 2. 获取 Personal Access Token
# 在 Azure DevOps 中创建

# 3. 登录
vsce login <publisher-name>

# 4. 发布
vsce publish
```

## 💡 提示

- 打包前确保所有代码都已编译且没有错误
- VSIX 文件可以在任何支持 VS Code 的平台上安装（Windows、Mac、Linux）
- 建议在打包前运行 `npm run compile` 确保代码是最新的
- 如果修改了 package.json，记得更新版本号

---

如有其他问题，请查看 README.md 或联系开发者。
