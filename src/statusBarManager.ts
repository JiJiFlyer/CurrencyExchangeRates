import * as vscode from 'vscode';
import { ExchangeRateService, ExchangeRate } from './exchangeRateService';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private service: ExchangeRateService;
    private refreshTimer?: NodeJS.Timeout;
    private previousRate?: number;

    constructor(service: ExchangeRateService) {
        this.service = service;
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'currencyExchange.showRates';
        this.statusBarItem.show();
    }

    /**
     * 启动状态栏更新
     */
    async start(): Promise<void> {
        await this.updateStatusBar();
        this.startAutoRefresh();
    }

    /**
     * 更新状态栏显示
     */
    async updateStatusBar(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('currencyExchange');
            const currencyPair = config.get<string>('statusBarCurrency', 'USD/CNY');
            const showChange = config.get<boolean>('showChangeIndicator', true);

            const [from, to] = currencyPair.split('/');
            const rate = await this.service.getExchangeRate(from, to);

            let text = `$(symbol-currency) ${from}/${to}: ${this.service.formatRate(rate.rate)}`;

            // 显示涨跌指示
            if (showChange && this.previousRate !== undefined) {
                const change = rate.rate - this.previousRate;
                if (change > 0) {
                    text += ' $(arrow-up)';
                    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                } else if (change < 0) {
                    text += ' $(arrow-down)';
                    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                } else {
                    this.statusBarItem.backgroundColor = undefined;
                }
            } else {
                this.statusBarItem.backgroundColor = undefined;
            }

            this.previousRate = rate.rate;
            this.statusBarItem.text = text;
            this.statusBarItem.tooltip = this.createTooltip(rate);

        } catch (error) {
            this.statusBarItem.text = '$(warning) 汇率获取失败';
            this.statusBarItem.tooltip = error instanceof Error ? error.message : '未知错误';
            console.error('更新状态栏失败:', error);
        }
    }

    /**
     * 创建提示信息
     */
    private createTooltip(rate: ExchangeRate): string {
        const fromName = this.service.getCurrencyName(rate.from);
        const toName = this.service.getCurrencyName(rate.to);
        const time = new Date(rate.timestamp).toLocaleString('zh-CN');
        
        return `${fromName} → ${toName}\n汇率: ${this.service.formatRate(rate.rate)}\n更新时间: ${time}\n\n点击查看更多汇率`;
    }

    /**
     * 启动自动刷新
     */
    private startAutoRefresh(): void {
        this.stopAutoRefresh();

        const config = vscode.workspace.getConfiguration('currencyExchange');
        const interval = config.get<number>('refreshInterval', 300) * 1000;

        this.refreshTimer = setInterval(() => {
            this.updateStatusBar();
        }, interval);
    }

    /**
     * 停止自动刷新
     */
    private stopAutoRefresh(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
        }
    }

    /**
     * 重新加载配置
     */
    async reloadConfig(): Promise<void> {
        this.previousRate = undefined;
        await this.updateStatusBar();
        this.startAutoRefresh();
    }

    /**
     * 手动刷新
     */
    async refresh(): Promise<void> {
        this.service.clearCache();
        this.previousRate = undefined;
        await this.updateStatusBar();
        vscode.window.showInformationMessage('汇率数据已刷新');
    }

    /**
     * 释放资源
     */
    dispose(): void {
        this.stopAutoRefresh();
        this.statusBarItem.dispose();
    }
}
