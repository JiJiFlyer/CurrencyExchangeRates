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
exports.StatusBarManager = void 0;
const vscode = __importStar(require("vscode"));
class StatusBarManager {
    constructor(service) {
        this.service = service;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'currencyExchange.showRates';
        this.statusBarItem.show();
    }
    /**
     * 启动状态栏更新
     */
    async start() {
        await this.updateStatusBar();
        this.startAutoRefresh();
    }
    /**
     * 更新状态栏显示
     */
    async updateStatusBar() {
        try {
            const config = vscode.workspace.getConfiguration('currencyExchange');
            const currencyPair = config.get('statusBarCurrency', 'USD/CNY');
            const showChange = config.get('showChangeIndicator', true);
            const [from, to] = currencyPair.split('/');
            const rate = await this.service.getExchangeRate(from, to);
            let text = `$(symbol-currency) ${from}/${to}: ${this.service.formatRate(rate.rate)}`;
            // 显示涨跌指示
            if (showChange && this.previousRate !== undefined) {
                const change = rate.rate - this.previousRate;
                if (change > 0) {
                    text += ' $(arrow-up)';
                    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                }
                else if (change < 0) {
                    text += ' $(arrow-down)';
                    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                }
                else {
                    this.statusBarItem.backgroundColor = undefined;
                }
            }
            else {
                this.statusBarItem.backgroundColor = undefined;
            }
            this.previousRate = rate.rate;
            this.statusBarItem.text = text;
            this.statusBarItem.tooltip = this.createTooltip(rate);
        }
        catch (error) {
            this.statusBarItem.text = '$(warning) 汇率获取失败';
            this.statusBarItem.tooltip = error instanceof Error ? error.message : '未知错误';
            console.error('更新状态栏失败:', error);
        }
    }
    /**
     * 创建提示信息
     */
    createTooltip(rate) {
        const fromName = this.service.getCurrencyName(rate.from);
        const toName = this.service.getCurrencyName(rate.to);
        const time = new Date(rate.timestamp).toLocaleString('zh-CN');
        return `${fromName} → ${toName}\n汇率: ${this.service.formatRate(rate.rate)}\n更新时间: ${time}\n\n点击查看更多汇率`;
    }
    /**
     * 启动自动刷新
     */
    startAutoRefresh() {
        this.stopAutoRefresh();
        const config = vscode.workspace.getConfiguration('currencyExchange');
        const interval = config.get('refreshInterval', 300) * 1000;
        this.refreshTimer = setInterval(() => {
            this.updateStatusBar();
        }, interval);
    }
    /**
     * 停止自动刷新
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
        }
    }
    /**
     * 重新加载配置
     */
    async reloadConfig() {
        this.previousRate = undefined;
        await this.updateStatusBar();
        this.startAutoRefresh();
    }
    /**
     * 手动刷新
     */
    async refresh() {
        this.service.clearCache();
        this.previousRate = undefined;
        await this.updateStatusBar();
        vscode.window.showInformationMessage('汇率数据已刷新');
    }
    /**
     * 释放资源
     */
    dispose() {
        this.stopAutoRefresh();
        this.statusBarItem.dispose();
    }
}
exports.StatusBarManager = StatusBarManager;
//# sourceMappingURL=statusBarManager.js.map