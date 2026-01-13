"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencySidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
class CurrencySidebarProvider {
    constructor(_extensionUri, service) {
        this._extensionUri = _extensionUri;
        this.service = service;
    }
    /**
     * 设置国际化服务
     */
    setI18nService(i18n) {
        this.i18n = i18n;
    }
    /**
     * 获取翻译文本的辅助方法
     */
    t(key) {
        return this.i18n ? this.i18n.t(key) : key;
    }
    resolveWebviewView(webviewView, context, _token) {
        const initMsg = this.t('sidebar.loading');
        console.log(`=== ${initMsg} ===`);
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        console.log('✅ Sidebar Webview configured');
        // 先显示加载状态
        webviewView.webview.html = this.getLoadingHtml();
        console.log('✅ Loading state displayed');
        // 异步加载数据
        console.log('⏳ Starting to load exchange rate data...');
        // 从配置中读取基准货币
        const config = vscode.workspace.getConfiguration('currencyExchange');
        const baseCurrency = config.get('baseCurrency', 'USD');
        this.updateView(baseCurrency).catch(error => {
            console.error('❌ Failed to initialize sidebar:', error);
            console.error('Error stack:', error.stack);
            if (this._view) {
                this._view.webview.html = this.getErrorHtml(error instanceof Error ? error.message : this.t('messages.networkError'));
            }
        });
        // 处理来自webview的消息
        webviewView.webview.onDidReceiveMessage(async (data) => {
            let config;
            switch (data.command) {
                case 'refresh':
                    this.service.clearCache();
                    await this.updateView();
                    break;
                case 'calculate':
                    // 在侧边栏内部处理计算
                    const calcResult = await this.calculateExchange(data.amount, data.fromCurrency, data.toCurrency);
                    if (this._view) {
                        this._view.webview.postMessage({
                            command: 'calculationResult',
                            result: calcResult
                        });
                    }
                    break;
                case 'viewHistory':
                    // 查看货币历史汇率
                    vscode.commands.executeCommand('currencyExchange.viewHistory', data.currencyPair);
                    break;
                case 'openDetailedRates':
                    vscode.commands.executeCommand('currencyExchange.showRates');
                    break;
                case 'changeBaseCurrency':
                    // 更新基准货币配置并刷新视图
                    config = vscode.workspace.getConfiguration('currencyExchange');
                    await config.update('baseCurrency', data.baseCurrency, vscode.ConfigurationTarget.Global);
                    await this.updateView(data.baseCurrency);
                    break;
                case 'updateStatusBar':
                    config = vscode.workspace.getConfiguration('currencyExchange');
                    const currencyPair = `${data.fromCurrency}/${data.toCurrency}`;
                    await config.update('statusBarCurrency', currencyPair, vscode.ConfigurationTarget.Global);
                    // 立即更新状态栏显示
                    vscode.commands.executeCommand('currencyExchange.reloadStatusBar');
                    vscode.window.showInformationMessage(`状态栏已更新为: ${currencyPair}`);
                    break;
                case 'updateRefreshInterval':
                    const intervalConfig = vscode.workspace.getConfiguration('currencyExchange');
                    await intervalConfig.update('refreshInterval', data.interval, vscode.ConfigurationTarget.Global);
                    vscode.window.showInformationMessage(`刷新间隔已更新为: ${data.interval}秒`);
                    break;
                case 'toggleChangeIndicator':
                    const indicatorConfig = vscode.workspace.getConfiguration('currencyExchange');
                    await indicatorConfig.update('showChangeIndicator', data.enabled, vscode.ConfigurationTarget.Global);
                    // 立即更新状态栏显示
                    await vscode.commands.executeCommand('currencyExchange.reloadStatusBar');
                    vscode.window.showInformationMessage(data.enabled ? '已开启涨跌指示器' : '已关闭涨跌指示器');
                    break;
                case 'changeLanguage':
                    vscode.commands.executeCommand('currencyExchange.changeLanguage');
                    break;
            }
        });
    }
    /**
     * 计算汇率转换
     */
    async calculateExchange(amount, from, to) {
        try {
            const rate = await this.service.getExchangeRate(from, to);
            const result = amount * rate.rate;
            return {
                success: true,
                amount: amount,
                from: from,
                to: to,
                rate: rate.rate,
                result: result,
                formattedRate: this.service.formatRate(rate.rate),
                formattedResult: this.service.formatRate(result)
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '计算失败'
            };
        }
    }
    async updateView(baseCurrency = 'USD') {
        console.log('=== updateView 方法被调用 ===');
        console.log('基准货币:', baseCurrency);
        if (!this._view) {
            console.error('❌ _view 未初始化');
            return;
        }
        console.log('✅ _view 已初始化，开始获取汇率数据');
        try {
            console.log(`调用 fetchExchangeRates(${baseCurrency})...`);
            const rates = await this.service.fetchExchangeRates(baseCurrency);
            console.log('✅ 成功获取汇率数据:', rates);
            const config = vscode.workspace.getConfiguration('currencyExchange');
            const currentStatusBarCurrency = config.get('statusBarCurrency', 'USD/CNY');
            const refreshInterval = config.get('refreshInterval', 300);
            const showChangeIndicator = config.get('showChangeIndicator', true);
            console.log('配置信息:', { currentStatusBarCurrency, refreshInterval, showChangeIndicator });
            console.log('开始生成 HTML...');
            this._view.webview.html = this.getHtmlForWebview(rates, currentStatusBarCurrency, refreshInterval, showChangeIndicator);
            console.log('✅ HTML 已设置到 webview');
        }
        catch (error) {
            console.error('❌ 侧边栏更新失败:', error);
            console.error('错误类型:', error instanceof Error ? error.constructor.name : typeof error);
            console.error('错误消息:', error instanceof Error ? error.message : String(error));
            console.error('错误堆栈:', error instanceof Error ? error.stack : 'N/A');
            this._view.webview.html = this.getErrorHtml(error instanceof Error ? error.message : '未知错误');
        }
    }
    getHtmlForWebview(rates, currentStatusBarCurrency, refreshInterval, showChangeIndicator) {
        const baseCurrency = rates.base;
        // 显示主要货币
        const majorCurrencies = ['USD', 'CNY', 'EUR', 'GBP', 'JPY', 'HKD', 'KRW', 'AUD', 'CAD']
            .filter(c => c !== baseCurrency); // 排除基准货币本身
        const time = new Date(rates.timestamp).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        // 生成基准货币选项
        const allCurrencies = this.service.getMajorCurrencies();
        const baseCurrencyOptions = allCurrencies.map(currency => {
            const selected = currency === baseCurrency ? 'selected' : '';
            const name = this.service.getCurrencyName(currency);
            return `<option value="${currency}" ${selected}>${currency} - ${name}</option>`;
        }).join('');
        // 生成主要汇率卡片
        const rateCards = majorCurrencies.map(currency => {
            const rate = rates.rates[currency];
            if (!rate) {
                return '';
            }
            const name = this.service.getCurrencyName(currency);
            const formattedRate = this.service.formatRate(rate);
            const currencyPair = `${baseCurrency}/${currency}`;
            return `
                <div class="rate-card" onclick="viewHistory('${currencyPair}')">
                    <div class="currency-header">
                        <span class="currency-code">${currency}</span>
                        <span class="currency-flag">${this.getCurrencyFlag(currency)}</span>
                    </div>
                    <div class="currency-name">${name}</div>
                    <div class="rate-value">${formattedRate}</div>
                    <div class="rate-label">1 ${baseCurrency} = ${formattedRate} ${currency}</div>
                </div>
            `;
        }).join('');
        // 生成货币选项（用于状态栏货币对选择）
        const [currentFrom, currentTo] = currentStatusBarCurrency.split('/');
        const currencyOptions = allCurrencies.map(currency => {
            const name = this.service.getCurrencyName(currency);
            return `<option value="${currency}">${currency} - ${name}</option>`;
        }).join('');
        const fromCurrencyOptions = allCurrencies.map(currency => {
            const selected = currency === currentFrom ? 'selected' : '';
            const name = this.service.getCurrencyName(currency);
            return `<option value="${currency}" ${selected}>${currency} - ${name}</option>`;
        }).join('');
        const toCurrencyOptions = allCurrencies.map(currency => {
            const selected = currency === currentTo ? 'selected' : '';
            const name = this.service.getCurrencyName(currency);
            return `<option value="${currency}" ${selected}>${currency} - ${name}</option>`;
        }).join('');
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 12px;
            font-size: 13px;
        }

        .header {
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .update-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .refresh-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            transition: background 0.2s;
        }

        .refresh-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .section {
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--vscode-foreground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .rate-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 16px;
        }

        .rate-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .rate-card:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-focusBorder);
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .currency-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
        }

        .currency-code {
            font-weight: 700;
            font-size: 14px;
            color: var(--vscode-symbolIcon-variableForeground);
        }

        .currency-flag {
            font-size: 18px;
        }

        .currency-name {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 6px;
        }

        .rate-value {
            font-size: 15px;
            font-weight: 600;
            font-family: 'Consolas', monospace;
            color: var(--vscode-foreground);
        }

        .rate-label {
            font-size: 9px;
            color: var(--vscode-descriptionForeground);
            margin-top: 2px;
        }

        .settings-panel {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px;
        }

        .setting-item {
            margin-bottom: 14px;
        }

        .setting-item:last-child {
            margin-bottom: 0;
        }

        .setting-label {
            display: block;
            font-size: 11px;
            font-weight: 500;
            margin-bottom: 6px;
            color: var(--vscode-foreground);
        }

        select, input[type="number"] {
            width: 100%;
            padding: 6px 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-size: 12px;
            font-family: var(--vscode-font-family);
        }

        .base-currency-select {
            width: 100%;
            padding: 8px 10px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
        }

        select:focus, input:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }

        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }

        .action-btn {
            width: 100%;
            padding: 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            margin-top: 12px;
            transition: background 0.2s;
        }

        .action-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .info-box {
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            padding: 8px 10px;
            margin-top: 12px;
            font-size: 11px;
            border-radius: 3px;
        }

        .divider {
            height: 1px;
            background: var(--vscode-panel-border);
            margin: 16px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">
            <span>💱</span>
            <span>${this.t('sidebar.title')}</span>
        </div>
        <div class="update-info">
            <span>${this.t('sidebar.lastUpdate')}: ${time}</span>
            <div style="display: flex; gap: 4px;">
                <button class="refresh-btn" onclick="changeLanguage()">🌐</button>
                <button class="refresh-btn" onclick="refresh()">🔄</button>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">🎯 ${this.t('sidebar.baseCurrency')}</div>
        <select id="baseCurrency" class="base-currency-select" onchange="changeBaseCurrency()">
            ${baseCurrencyOptions}
        </select>
        <button class="action-btn" onclick="openDetailedRates()" style="margin-top: 8px;">
            📊 ${this.t('sidebar.viewDetails')}
        </button>
    </div>

    <div class="divider"></div>

    <div class="section">
        <div class="section-title">📊 ${this.t('ratesView.title')} (${this.t('sidebar.baseCurrency')}: ${baseCurrency})</div>
        <div class="rate-grid">
            ${rateCards}
        </div>
    </div>

    <div class="divider"></div>

    <div class="section">
        <div class="section-title">⚙️ ${this.t('config.statusBarCurrency')}</div>
        <div class="settings-panel">
            <div class="setting-item">
                <label class="setting-label">${this.t('config.statusBarCurrency')}</label>
                <div style="display: grid; grid-template-columns: 1fr auto 1fr auto; gap: 8px; align-items: center;">
                    <select id="statusBarFromCurrency" onchange="updateStatusBar()">
                        ${fromCurrencyOptions}
                    </select>
                    <span style="font-weight: bold; color: var(--vscode-descriptionForeground);">/</span>
                    <select id="statusBarToCurrency" onchange="updateStatusBar()">
                        ${toCurrencyOptions}
                    </select>
                    <button onclick="swapCurrencies()" style="padding: 6px 10px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 3px; cursor: pointer; font-size: 12px;" title="交换货币对">⇄</button>
                </div>
            </div>

            <div class="setting-item">
                <label class="setting-label">${this.t('sidebar.refreshInterval')} (${this.t('sidebar.seconds')})</label>
                <input type="number" id="refreshInterval" value="${refreshInterval}" 
                       min="60" max="3600" step="60" onchange="updateRefreshInterval()">
            </div>


        </div>
    </div>

    <div class="divider"></div>

    <div class="section">
        <div class="section-title">🧮 ${this.t('calculator.title')}</div>
        <div class="settings-panel">
            <div class="setting-item">
                <label class="setting-label">${this.t('calculator.amount')}</label>
                <input type="number" id="calcAmount" value="100" min="0" step="0.01" 
                       placeholder="${this.t('calculator.enterAmount')}">
            </div>

            <div class="setting-item">
                <label class="setting-label">${this.t('calculator.from')}</label>
                <select id="calcFromCurrency">
                    ${currencyOptions}
                </select>
            </div>

            <div class="setting-item">
                <label class="setting-label">${this.t('calculator.to')}</label>
                <select id="calcToCurrency">
                    ${currencyOptions}
                </select>
            </div>

            <button class="action-btn" onclick="calculate()">
                ${this.t('calculator.calculate')}
            </button>

            <div id="calcResult" style="display: none; margin-top: 12px; padding: 12px; background: var(--vscode-textBlockQuote-background); border-radius: 4px; border-left: 3px solid var(--vscode-textBlockQuote-border);">
                <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 4px;">
                    ${this.t('calculator.result')}:
                </div>
                <div id="calcResultText" style="font-size: 16px; font-weight: 600; font-family: 'Consolas', monospace;"></div>
                <div id="calcRateText" style="font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 4px;"></div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }

        function changeLanguage() {
            vscode.postMessage({ command: 'changeLanguage' });
        }

        function changeBaseCurrency() {
            const baseCurrency = document.getElementById('baseCurrency').value;
            vscode.postMessage({ 
                command: 'changeBaseCurrency', 
                baseCurrency: baseCurrency 
            });
        }

        function openDetailedRates() {
            vscode.postMessage({ command: 'openDetailedRates' });
        }

        function viewHistory(currencyPair) {
            vscode.postMessage({ 
                command: 'viewHistory', 
                currencyPair: currencyPair 
            });
        }

        function updateStatusBar() {
            const fromCurrency = document.getElementById('statusBarFromCurrency').value;
            const toCurrency = document.getElementById('statusBarToCurrency').value;
            vscode.postMessage({ 
                command: 'updateStatusBar', 
                fromCurrency: fromCurrency,
                toCurrency: toCurrency
            });
        }

        function updateRefreshInterval() {
            const interval = parseInt(document.getElementById('refreshInterval').value);
            if (interval >= 60 && interval <= 3600) {
                vscode.postMessage({ 
                    command: 'updateRefreshInterval', 
                    interval: interval 
                });
            }
        }

        function toggleChangeIndicator() {
            const enabled = document.getElementById('showChangeIndicator').checked;
            vscode.postMessage({ 
                command: 'toggleChangeIndicator', 
                enabled: enabled 
            });
        }

        function swapCurrencies() {
            const fromSelect = document.getElementById('statusBarFromCurrency');
            const toSelect = document.getElementById('statusBarToCurrency');
            const temp = fromSelect.value;
            fromSelect.value = toSelect.value;
            toSelect.value = temp;
            updateStatusBar();
        }

        function calculate() {
            const amount = parseFloat(document.getElementById('calcAmount').value);
            const fromCurrency = document.getElementById('calcFromCurrency').value;
            const toCurrency = document.getElementById('calcToCurrency').value;

            if (isNaN(amount) || amount <= 0) {
                alert('请输入有效的金额');
                return;
            }

            vscode.postMessage({ 
                command: 'calculate',
                amount: amount,
                fromCurrency: fromCurrency,
                toCurrency: toCurrency
            });
        }

        // 监听来自扩展的消息
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'calculationResult') {
                const result = message.result;
                const resultDiv = document.getElementById('calcResult');
                const resultText = document.getElementById('calcResultText');
                const rateText = document.getElementById('calcRateText');

                if (result.success) {
                    resultText.textContent = result.amount + ' ' + result.from + ' = ' + result.formattedResult + ' ' + result.to;
                    rateText.textContent = '汇率: 1 ' + result.from + ' = ' + result.formattedRate + ' ' + result.to;
                    resultDiv.style.display = 'block';
                } else {
                    resultText.textContent = '计算失败: ' + result.error;
                    rateText.textContent = '';
                    resultDiv.style.display = 'block';
                }
            }
        });
    </script>
</body>
</html>`;
    }
    getLoadingHtml() {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 200px;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--vscode-panel-border);
            border-top-color: var(--vscode-progressBar-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .loading-text {
            margin-top: 16px;
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="spinner"></div>
    <div class="loading-text">${this.t('sidebar.loading')}</div>
</body>
</html>`;
    }
    getErrorHtml(error) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 20px;
            text-align: center;
        }
        .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        .error-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
        }
        .error-message {
            color: var(--vscode-errorForeground);
            margin: 12px 0;
            padding: 12px;
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            font-size: 12px;
            text-align: left;
        }
        .error-tips {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin: 16px 0;
            text-align: left;
            line-height: 1.6;
        }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            margin: 4px;
            transition: background 0.2s;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="error-icon">⚠️</div>
    <div class="error-title">${this.t('sidebar.error')}</div>
    <div class="error-message">${error}</div>
    <div class="error-tips">
        ${this.t('messages.networkError')}
    </div>
    <button onclick="refresh()">🔄 ${this.t('sidebar.retry')}</button>
    <script>
        const vscode = acquireVsCodeApi();
        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }
    </script>
</body>
</html>`;
    }
    getCurrencyFlag(code) {
        const flags = {
            'USD': '🇺🇸',
            'EUR': '🇪🇺',
            'GBP': '🇬🇧',
            'JPY': '🇯🇵',
            'CNY': '🇨🇳',
            'HKD': '🇭🇰',
            'KRW': '🇰🇷',
            'AUD': '🇦🇺',
            'CAD': '🇨🇦',
            'SGD': '🇸🇬',
            'CHF': '🇨🇭',
            'NZD': '🇳🇿',
            'THB': '🇹🇭',
            'MYR': '🇲🇾',
            'RUB': '🇷🇺',
            'INR': '🇮🇳',
            'BRL': '🇧🇷',
            'ZAR': '🇿🇦'
        };
        return flags[code] || '💱';
    }
}
exports.CurrencySidebarProvider = CurrencySidebarProvider;
CurrencySidebarProvider.viewType = 'currencyExchange.sidebarView';
//# sourceMappingURL=sidebarProvider.js.map