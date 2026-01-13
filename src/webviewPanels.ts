import * as vscode from 'vscode';
import { ExchangeRateService, CurrencyRates } from './exchangeRateService';
import { I18nService } from './i18nService';

export class RatesViewPanel {
    private panel: vscode.WebviewPanel | undefined;
    private service: ExchangeRateService;
    private i18n?: I18nService;

    constructor(service: ExchangeRateService) {
        this.service = service;
    }

    /**
     * 设置国际化服务
     */
    setI18nService(i18n: I18nService): void {
        this.i18n = i18n;
    }

    /**
     * 获取翻译文本的辅助方法
     */
    private t(key: string): string {
        return this.i18n ? this.i18n.t(key) : key;
    }

    /**
     * 显示汇率查看面板
     */
    async showRates(baseCurrency: string = 'USD'): Promise<void> {
        if (this.panel) {
            this.panel.reveal();
            await this.updateRatesView(baseCurrency);
            return;
        }

        const title = this.i18n ? this.i18n.t('ratesView.title') : '实时汇率';
        this.panel = vscode.window.createWebviewPanel(
            'currencyRates',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        await this.updateRatesView(baseCurrency);

        // 处理来自webview的消息
        this.panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'refresh') {
                this.service.clearCache();
                await this.updateRatesView(message.baseCurrency || 'USD');
            } else if (message.command === 'changeBaseCurrency') {
                // 更新基准货币配置并刷新视图
                const config = vscode.workspace.getConfiguration('currencyExchange');
                await config.update('baseCurrency', message.baseCurrency, vscode.ConfigurationTarget.Global);
                await this.updateRatesView(message.baseCurrency);
            } else if (message.command === 'changeLanguage') {
                // 切换语言
                vscode.commands.executeCommand('currencyExchange.changeLanguage');
            } else if (message.command === 'viewHistory') {
                // 查看历史汇率
                vscode.commands.executeCommand('currencyExchange.viewHistory', message.currencyPair);
            }
        });
    }

    /**
     * 更新汇率视图
     */
    private async updateRatesView(baseCurrency: string = 'USD'): Promise<void> {
        if (!this.panel) {
            return;
        }

        try {
            const rates = await this.service.fetchExchangeRates(baseCurrency);
            const dataSource = this.service.getCurrentDataSource();
            this.panel.webview.html = this.getRatesHtml(rates, dataSource);
        } catch (error) {
            const errorMsg = this.i18n ? this.i18n.t('messages.refreshFailed') : '获取汇率数据失败';
            vscode.window.showErrorMessage(errorMsg + ': ' + (error instanceof Error ? error.message : '未知错误'));
        }
    }

    /**
     * 生成汇率显示HTML
     */
    private getRatesHtml(rates: CurrencyRates, dataSource: string): string {
        const majorCurrencies = this.service.getMajorCurrencies().filter(c => c !== rates.base);
        const time = new Date(rates.timestamp).toLocaleString('zh-CN');

        // 生成基准货币选项
        const allCurrencies = this.service.getMajorCurrencies();
        const baseCurrencyOptions = allCurrencies.map(currency => {
            const selected = currency === rates.base ? 'selected' : '';
            const name = this.service.getCurrencyName(currency);
            return `<option value="${currency}" ${selected}>${currency} - ${name}</option>`;
        }).join('');

        const rateRows = majorCurrencies.map(currency => {
            const rate = rates.rates[currency];
            if (!rate) {
                return '';
            }
            const name = this.service.getCurrencyName(currency);
            const formattedRate = this.service.formatRate(rate);
            const inverseRate = this.service.formatRate(1 / rate);
            const currencyPair = `${rates.base}/${currency}`;

            return `
                <tr onclick="viewHistory('${currencyPair}')" style="cursor: pointer;">
                    <td class="currency-code">${currency}</td>
                    <td class="currency-name">${name}</td>
                    <td class="rate">1 ${rates.base} = ${formattedRate} ${currency}</td>
                    <td class="rate">1 ${currency} = ${inverseRate} ${rates.base}</td>
                </tr>
            `;
        }).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        margin: 0;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    h1 {
                        margin: 0;
                        font-size: 24px;
                        font-weight: 600;
                    }
                    .update-time {
                        color: var(--vscode-descriptionForeground);
                        font-size: 12px;
                    }
                    .refresh-btn {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        cursor: pointer;
                        border-radius: 2px;
                        font-size: 13px;
                    }
                    .refresh-btn:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    th {
                        text-align: left;
                        padding: 12px;
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        font-weight: 600;
                        border-bottom: 2px solid var(--vscode-panel-border);
                    }
                    td {
                        padding: 10px 12px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    tbody tr {
                        cursor: pointer;
                    }
                    tbody tr:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                    .currency-code {
                        font-weight: 600;
                        color: var(--vscode-symbolIcon-variableForeground);
                    }
                    .currency-name {
                        color: var(--vscode-descriptionForeground);
                    }
                    .rate {
                        font-family: 'Consolas', 'Courier New', monospace;
                        font-size: 13px;
                    }
                    .info-box {
                        background-color: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid var(--vscode-textBlockQuote-border);
                        padding: 12px;
                        margin-bottom: 20px;
                        font-size: 13px;
                    }
                    .base-currency-selector {
                        margin-bottom: 20px;
                        padding: 15px;
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 6px;
                    }
                    .base-currency-selector label {
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 600;
                        font-size: 13px;
                    }
                    .base-currency-selector select {
                        width: 100%;
                        padding: 8px 10px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        font-size: 13px;
                        cursor: pointer;
                    }
                    .data-source-badge {
                        display: inline-block;
                        padding: 4px 10px;
                        background-color: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 600;
                        margin-left: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>💱 ${this.t('ratesView.title')}
                            <span class="data-source-badge">📡 ${dataSource}</span>
                        </h1>
                        <div class="update-time">${this.t('ratesView.lastUpdate')}: ${time}</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="refresh-btn" onclick="changeLanguage()">🌐 ${this.t('commands.changeLanguage')}</button>
                        <button class="refresh-btn" onclick="refresh()">🔄 ${this.t('ratesView.refresh')}</button>
                    </div>
                </div>

                <div class="base-currency-selector">
                    <label for="baseCurrency">🎯 ${this.t('ratesView.baseCurrency')}</label>
                    <select id="baseCurrency" onchange="changeBaseCurrency()">
                        ${baseCurrencyOptions}
                    </select>
                </div>

                <div class="info-box">
                    ${this.t('ratesView.baseCurrency')}: <strong>${rates.base} (${this.service.getCurrencyName(rates.base)})</strong>
                    <br>
                    ${this.t('ratesView.dataSource')}: <strong>${dataSource}</strong>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>${this.t('ratesView.currency')}</th>
                            <th>${this.t('sidebar.targetCurrency')}</th>
                            <th>${this.t('ratesView.rate')} (${rates.base} → ${this.t('sidebar.targetCurrency')})</th>
                            <th>${this.t('ratesView.rate')} (${this.t('sidebar.targetCurrency')} → ${rates.base})</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rateRows}
                    </tbody>
                </table>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function refresh() {
                        const baseCurrency = document.getElementById('baseCurrency').value;
                        vscode.postMessage({ 
                            command: 'refresh',
                            baseCurrency: baseCurrency
                        });
                    }

                    function changeBaseCurrency() {
                        const baseCurrency = document.getElementById('baseCurrency').value;
                        vscode.postMessage({ 
                            command: 'changeBaseCurrency',
                            baseCurrency: baseCurrency
                        });
                    }

                    function changeLanguage() {
                        vscode.postMessage({ 
                            command: 'changeLanguage'
                        });
                    }

                    function viewHistory(currencyPair) {
                        vscode.postMessage({ 
                            command: 'viewHistory',
                            currencyPair: currencyPair
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }

    /**
     * 显示历史汇率面板
     */
    async showHistoryPanel(currencyPair: string): Promise<void> {
        let [from, to] = currencyPair.split('/');
        
        const panel = vscode.window.createWebviewPanel(
            'currencyHistory',
            `${currencyPair} 历史汇率`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // 显示加载状态
        panel.webview.html = this.getLoadingHtml('正在加载历史汇率数据...');

        try {
            // 获取历史汇率数据（最近30天）
            const historyData = await this.service.getHistoricalRates(from, to, 30);
            panel.webview.html = this.getHistoryHtml(historyData);
        } catch (error) {
            panel.webview.html = this.getErrorHtml(
                error instanceof Error ? error.message : '获取历史汇率失败'
            );
        }

        // 处理来自webview的消息
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'refresh') {
                panel.webview.html = this.getLoadingHtml('正在刷新历史汇率数据...');
                try {
                    const historyData = await this.service.getHistoricalRates(from, to, 30);
                    panel.webview.html = this.getHistoryHtml(historyData);
                } catch (error) {
                    panel.webview.html = this.getErrorHtml(
                        error instanceof Error ? error.message : '刷新失败'
                    );
                }
            } else if (message.command === 'changeDays') {
                panel.webview.html = this.getLoadingHtml('正在加载历史汇率数据...');
                try {
                    const days = parseInt(message.days) || 30;
                    const historyData = await this.service.getHistoricalRates(from, to, days);
                    panel.webview.html = this.getHistoryHtml(historyData);
                } catch (error) {
                    panel.webview.html = this.getErrorHtml(
                        error instanceof Error ? error.message : '加载失败'
                    );
                }
            } else if (message.command === 'swap') {
                // 对换货币对
                panel.webview.html = this.getLoadingHtml('正在加载历史汇率数据...');
                try {
                    // 交换from和to
                    const temp = from;
                    from = to;
                    to = temp;
                    
                    const days = parseInt(message.days) || 30;
                    const historyData = await this.service.getHistoricalRates(from, to, days);
                    panel.title = `${from}/${to} 历史汇率`;
                    panel.webview.html = this.getHistoryHtml(historyData);
                } catch (error) {
                    panel.webview.html = this.getErrorHtml(
                        error instanceof Error ? error.message : '加载失败'
                    );
                }
            }
        });
    }

    /**
     * 生成历史汇率HTML
     */
    private getHistoryHtml(data: any): string {
        const fromName = this.service.getCurrencyName(data.from);
        const toName = this.service.getCurrencyName(data.to);
        
        // 计算统计数据
        const rates = data.rates.map((r: any) => r.rate);
        const maxRate = Math.max(...rates);
        const minRate = Math.min(...rates);
        const avgRate = rates.reduce((a: number, b: number) => a + b, 0) / rates.length;
        const latestRate = rates[rates.length - 1];
        const firstRate = rates[0];
        const change = latestRate - firstRate;
        const changePercent = (change / firstRate) * 100;

        // 生成表格行
        const tableRows = data.rates.map((item: any) => {
            const formattedRate = this.service.formatRate(item.rate);
            return `
                <tr>
                    <td>${item.date}</td>
                    <td class="rate">${formattedRate}</td>
                </tr>
            `;
        }).reverse().join(''); // 最新的日期在前

        // 生成图表数据
        const chartData = data.rates.map((item: any) => ({
            date: item.date,
            rate: item.rate
        }));

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.from}/${data.to} 历史汇率</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            font-size: 13px;
        }

        .header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        .title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .subtitle {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }

        .controls {
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 20px;
        }

        .controls label {
            font-size: 12px;
            font-weight: 500;
        }

        .controls select {
            padding: 6px 10px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 12px;
        }

        .controls button {
            padding: 6px 14px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        }

        .controls button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .stat-card {
            background: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 16px;
        }

        .stat-label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .stat-value {
            font-size: 20px;
            font-weight: 600;
            font-family: 'Consolas', monospace;
        }

        .stat-change {
            font-size: 12px;
            margin-top: 4px;
        }

        .positive {
            color: #4caf50;
        }

        .negative {
            color: #f44336;
        }

        .chart-container {
            background: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
            height: 300px;
            position: relative;
        }

        .chart-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 16px;
        }

        canvas {
            width: 100% !important;
            height: 250px !important;
        }

        .table-container {
            background: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            overflow: hidden;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        thead {
            background: var(--vscode-editor-background);
            position: sticky;
            top: 0;
        }

        th {
            padding: 12px 16px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground);
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        td {
            padding: 10px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        tbody tr:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .rate {
            font-family: 'Consolas', monospace;
            font-weight: 500;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">
            <span>📈</span>
            <span>${data.from}/${data.to} 历史汇率</span>
        </div>
        <div class="subtitle">${fromName} → ${toName}</div>
        <div class="data-source" style="margin-top: 8px; font-size: 12px; color: var(--vscode-descriptionForeground);">
            📡 数据来源: <strong>Frankfurter API</strong>
        </div>
    </div>

    <div class="controls">
        <label>时间范围:</label>
        <select id="daysSelect" onchange="changeDays()">
            <option value="7">最近7天</option>
            <option value="30" selected>最近30天</option>
            <option value="90">最近90天</option>
            <option value="180">最近180天</option>
            <option value="365">最近1年</option>
        </select>
        <button onclick="swapCurrencies()" title="对换货币对">⇄ 对换</button>
        <button onclick="refresh()">🔄 刷新</button>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">当前汇率</div>
            <div class="stat-value">${this.service.formatRate(latestRate)}</div>
            <div class="stat-change ${change >= 0 ? 'positive' : 'negative'}">
                ${change >= 0 ? '↑' : '↓'} ${Math.abs(changePercent).toFixed(2)}%
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-label">最高汇率</div>
            <div class="stat-value">${this.service.formatRate(maxRate)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">最低汇率</div>
            <div class="stat-value">${this.service.formatRate(minRate)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">平均汇率</div>
            <div class="stat-value">${this.service.formatRate(avgRate)}</div>
        </div>
    </div>

    <div class="chart-container">
        <div class="chart-title">汇率走势图</div>
        <canvas id="rateChart"></canvas>
    </div>

    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>日期</th>
                    <th>汇率</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script>
        const vscode = acquireVsCodeApi();
        const chartData = ${JSON.stringify(chartData)};

        // 绘制图表
        const ctx = document.getElementById('rateChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(d => d.date),
                datasets: [{
                    label: '汇率',
                    data: chartData.map(d => d.rate),
                    borderColor: '#007acc',
                    backgroundColor: 'rgba(0, 122, 204, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            color: 'rgba(128, 128, 128, 0.1)'
                        }
                    }
                }
            }
        });

        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }

        function changeDays() {
            const days = document.getElementById('daysSelect').value;
            vscode.postMessage({ command: 'changeDays', days: days });
        }

        function swapCurrencies() {
            const days = document.getElementById('daysSelect').value;
            vscode.postMessage({ command: 'swap', days: days });
        }
    </script>
</body>
</html>`;
    }

    /**
     * 生成加载HTML
     */
    private getLoadingHtml(message: string = '加载中...'): string {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid var(--vscode-panel-border);
            border-top-color: var(--vscode-progressBar-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .message {
            margin-top: 20px;
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="spinner"></div>
    <div class="message">${message}</div>
</body>
</html>`;
    }

    /**
     * 生成错误HTML
     */
    private getErrorHtml(error: string): string {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 40px;
            text-align: center;
        }
        .error-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        .error-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .error-message {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            padding: 16px;
            margin: 20px 0;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="error-icon">⚠️</div>
    <div class="error-title">加载失败</div>
    <div class="error-message">${error}</div>
</body>
</html>`;
    }
}

export class CalculatorPanel {
    private panel: vscode.WebviewPanel | undefined;
    private service: ExchangeRateService;
    private i18n?: I18nService;

    constructor(service: ExchangeRateService) {
        this.service = service;
    }

    /**
     * 设置国际化服务
     */
    setI18nService(i18n: I18nService): void {
        this.i18n = i18n;
    }

    /**
     * 获取翻译文本的辅助方法
     */
    private t(key: string): string {
        return this.i18n ? this.i18n.t(key) : key;
    }

    /**
     * 显示计算器面板
     */
    async showCalculator(): Promise<void> {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        const title = this.t('calculator.title');
        this.panel = vscode.window.createWebviewPanel(
            'currencyCalculator',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        this.panel.webview.html = await this.getCalculatorHtml();

        // 处理来自webview的消息
        this.panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'convert') {
                try {
                    const result = await this.service.convert(
                        message.amount,
                        message.from,
                        message.to
                    );
                    this.panel?.webview.postMessage({
                        command: 'result',
                        result: result
                    });
                } catch (error) {
                    const errorMsg = this.t('messages.refreshFailed');
                    this.panel?.webview.postMessage({
                        command: 'error',
                        error: error instanceof Error ? error.message : errorMsg
                    });
                }
            } else if (message.command === 'changeLanguage') {
                // 切换语言
                vscode.commands.executeCommand('currencyExchange.changeLanguage');
            }
        });
    }

    /**
     * 生成计算器HTML
     */
    private async getCalculatorHtml(): Promise<string> {
        const currencies = this.service.getMajorCurrencies();
        const options = currencies.map(code => {
            const name = this.service.getCurrencyName(code);
            return `<option value="${code}">${code} - ${name}</option>`;
        }).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        margin: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    h1 {
                        margin: 0 0 30px 0;
                        font-size: 24px;
                        font-weight: 600;
                        text-align: center;
                    }
                    .calculator {
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    .input-group {
                        margin-bottom: 20px;
                    }
                    label {
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 500;
                        font-size: 14px;
                    }
                    input, select {
                        width: 100%;
                        padding: 10px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        font-size: 14px;
                        box-sizing: border-box;
                    }
                    input:focus, select:focus {
                        outline: 1px solid var(--vscode-focusBorder);
                    }
                    .currency-row {
                        display: flex;
                        gap: 15px;
                        align-items: center;
                    }
                    .currency-select {
                        flex: 1;
                    }
                    .swap-btn {
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        border: none;
                        padding: 10px 15px;
                        cursor: pointer;
                        border-radius: 4px;
                        font-size: 18px;
                        margin-top: 24px;
                    }
                    .swap-btn:hover {
                        background-color: var(--vscode-button-secondaryHoverBackground);
                    }
                    .convert-btn {
                        width: 100%;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 12px;
                        cursor: pointer;
                        border-radius: 4px;
                        font-size: 16px;
                        font-weight: 600;
                        margin-top: 20px;
                    }
                    .convert-btn:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .result {
                        margin-top: 25px;
                        padding: 20px;
                        background-color: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid var(--vscode-textBlockQuote-border);
                        border-radius: 4px;
                        display: none;
                    }
                    .result.show {
                        display: block;
                    }
                    .result-amount {
                        font-size: 28px;
                        font-weight: 700;
                        color: var(--vscode-symbolIcon-variableForeground);
                        margin-bottom: 10px;
                    }
                    .result-detail {
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground);
                    }
                    .error {
                        color: var(--vscode-errorForeground);
                        margin-top: 10px;
                        display: none;
                    }
                    .error.show {
                        display: block;
                    }
                    .refresh-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                        <h1 style="margin: 0;">💰 ${this.t('calculator.title')}</h1>
                        <button class="refresh-btn" onclick="changeLanguage()" style="padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                            🌐 ${this.t('commands.changeLanguage')}
                        </button>
                    </div>
                    
                    <div class="calculator">
                        <div class="input-group">
                            <label for="amount">${this.t('calculator.amount')}</label>
                            <input type="number" id="amount" value="100" step="0.01" min="0">
                        </div>

                        <div class="currency-row">
                            <div class="currency-select">
                                <label for="fromCurrency">${this.t('calculator.from')}</label>
                                <select id="fromCurrency">
                                    ${options}
                                </select>
                            </div>

                            <button class="swap-btn" onclick="swapCurrencies()">⇄</button>

                            <div class="currency-select">
                                <label for="toCurrency">${this.t('calculator.to')}</label>
                                <select id="toCurrency">
                                    ${options}
                                </select>
                            </div>
                        </div>

                        <button class="convert-btn" onclick="convert()">${this.t('calculator.convert')}</button>

                        <div id="result" class="result">
                            <div class="result-amount" id="resultAmount"></div>
                            <div class="result-detail" id="resultDetail"></div>
                        </div>

                        <div id="error" class="error"></div>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    // 设置默认货币
                    document.getElementById('fromCurrency').value = 'USD';
                    document.getElementById('toCurrency').value = 'CNY';

                    function convert() {
                        const amount = parseFloat(document.getElementById('amount').value);
                        const from = document.getElementById('fromCurrency').value;
                        const to = document.getElementById('toCurrency').value;

                        if (isNaN(amount) || amount <= 0) {
                            showError('请输入有效的金额');
                            return;
                        }

                        if (from === to) {
                            showError('请选择不同的货币');
                            return;
                        }

                        hideError();
                        hideResult();

                        vscode.postMessage({
                            command: 'convert',
                            amount: amount,
                            from: from,
                            to: to
                        });
                    }

                    function swapCurrencies() {
                        const from = document.getElementById('fromCurrency').value;
                        const to = document.getElementById('toCurrency').value;
                        document.getElementById('fromCurrency').value = to;
                        document.getElementById('toCurrency').value = from;
                    }

                    function changeLanguage() {
                        vscode.postMessage({ 
                            command: 'changeLanguage'
                        });
                    }

                    function showResult(result, amount, from, to) {
                        const resultDiv = document.getElementById('result');
                        const resultAmount = document.getElementById('resultAmount');
                        const resultDetail = document.getElementById('resultDetail');

                        resultAmount.textContent = result.toFixed(2) + ' ' + to;
                        resultDetail.textContent = amount + ' ' + from + ' = ' + result.toFixed(2) + ' ' + to;
                        
                        resultDiv.classList.add('show');
                    }

                    function hideResult() {
                        document.getElementById('result').classList.remove('show');
                    }

                    function showError(message) {
                        const errorDiv = document.getElementById('error');
                        errorDiv.textContent = message;
                        errorDiv.classList.add('show');
                    }

                    function hideError() {
                        document.getElementById('error').classList.remove('show');
                    }

                    // 监听来自扩展的消息
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'result') {
                            const amount = parseFloat(document.getElementById('amount').value);
                            const from = document.getElementById('fromCurrency').value;
                            const to = document.getElementById('toCurrency').value;
                            showResult(message.result, amount, from, to);
                        } else if (message.command === 'error') {
                            showError(message.error);
                        }
                    });

                    // 回车键触发转换
                    document.getElementById('amount').addEventListener('keypress', function(e) {
                        if (e.key === 'Enter') {
                            convert();
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
