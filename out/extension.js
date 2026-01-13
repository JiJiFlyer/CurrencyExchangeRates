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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const exchangeRateService_1 = require("./exchangeRateService");
const statusBarManager_1 = require("./statusBarManager");
const webviewPanels_1 = require("./webviewPanels");
const sidebarProvider_1 = require("./sidebarProvider");
const i18nService_1 = require("./i18nService");
let statusBarManager;
let ratesViewPanel;
let calculatorPanel;
let exchangeRateService;
let i18nService;
let sidebarProvider;
function activate(context) {
    console.log('=== Currency Exchange Rates Extension Activating ===');
    // 初始化国际化服务
    i18nService = i18nService_1.I18nService.getInstance(context.extensionPath);
    console.log('✅ I18nService initialized');
    // 初始化服务
    exchangeRateService = new exchangeRateService_1.ExchangeRateService();
    exchangeRateService.setI18nService(i18nService);
    console.log('✅ ExchangeRateService initialized');
    statusBarManager = new statusBarManager_1.StatusBarManager(exchangeRateService);
    console.log('✅ StatusBarManager initialized');
    ratesViewPanel = new webviewPanels_1.RatesViewPanel(exchangeRateService);
    ratesViewPanel.setI18nService(i18nService);
    console.log('✅ RatesViewPanel initialized');
    calculatorPanel = new webviewPanels_1.CalculatorPanel(exchangeRateService);
    calculatorPanel.setI18nService(i18nService);
    console.log('✅ CalculatorPanel initialized');
    // 注册侧边栏视图
    console.log('Registering sidebar view...');
    sidebarProvider = new sidebarProvider_1.CurrencySidebarProvider(context.extensionUri, exchangeRateService);
    sidebarProvider.setI18nService(i18nService);
    console.log('✅ CurrencySidebarProvider created');
    const sidebarDisposable = vscode.window.registerWebviewViewProvider(sidebarProvider_1.CurrencySidebarProvider.viewType, sidebarProvider);
    console.log('✅ Sidebar view registered, viewType:', sidebarProvider_1.CurrencySidebarProvider.viewType);
    context.subscriptions.push(sidebarDisposable);
    console.log('✅ Sidebar disposable added to subscriptions');
    // 启动状态栏
    statusBarManager.start();
    // 注册命令：查看实时汇率
    const showRatesCommand = vscode.commands.registerCommand('currencyExchange.showRates', async (baseCurrency) => {
        // 如果没有指定基准货币，从配置中读取
        if (!baseCurrency) {
            const config = vscode.workspace.getConfiguration('currencyExchange');
            baseCurrency = config.get('baseCurrency', 'USD');
        }
        await ratesViewPanel.showRates(baseCurrency);
    });
    // 注册命令：汇率计算器
    const calculatorCommand = vscode.commands.registerCommand('currencyExchange.calculate', async () => {
        await calculatorPanel.showCalculator();
    });
    // 注册命令：刷新汇率
    const refreshCommand = vscode.commands.registerCommand('currencyExchange.refresh', async () => {
        await statusBarManager.refresh();
    });
    // 注册命令：重新加载状态栏
    const reloadStatusBarCommand = vscode.commands.registerCommand('currencyExchange.reloadStatusBar', async () => {
        await statusBarManager.reloadConfig();
    });
    // 注册命令：查看货币历史汇率
    const viewHistoryCommand = vscode.commands.registerCommand('currencyExchange.viewHistory', async (currencyPair) => {
        if (!currencyPair) {
            vscode.window.showErrorMessage('未指定货币对');
            return;
        }
        try {
            await ratesViewPanel.showHistoryPanel(currencyPair);
        }
        catch (error) {
            vscode.window.showErrorMessage(`查看历史汇率失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    });
    // 注册命令：切换语言
    const changeLanguageCommand = vscode.commands.registerCommand('currencyExchange.changeLanguage', async () => {
        const languages = i18nService.getSupportedLanguages();
        const items = languages.map(lang => ({
            label: lang.name,
            description: lang.code,
            code: lang.code
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: i18nService.t('commands.changeLanguage')
        });
        if (selected) {
            await i18nService.setLanguage(selected.code);
            const msg = i18nService.t('messages.languageChanged');
            vscode.window.showInformationMessage(msg);
            // 重新加载所有组件
            await statusBarManager.reloadConfig();
            // 自动刷新侧边栏
            if (sidebarProvider) {
                await sidebarProvider.updateView();
            }
        }
    });
    // 监听配置变化
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('currencyExchange')) {
            // 如果语言配置变化，重新加载国际化服务
            if (e.affectsConfiguration('currencyExchange.language')) {
                i18nService.reload();
            }
            await statusBarManager.reloadConfig();
        }
    });
    // 添加到订阅列表
    context.subscriptions.push(showRatesCommand, calculatorCommand, refreshCommand, reloadStatusBarCommand, viewHistoryCommand, changeLanguageCommand, configChangeListener, statusBarManager);
    // 显示欢迎消息
    const welcomeMsg = i18nService.t('extension.welcomeMessage');
    const viewRatesBtn = i18nService.t('extension.viewRates');
    const openCalcBtn = i18nService.t('extension.openCalculator');
    vscode.window.showInformationMessage(welcomeMsg, viewRatesBtn, openCalcBtn).then(selection => {
        if (selection === viewRatesBtn) {
            vscode.commands.executeCommand('currencyExchange.showRates');
        }
        else if (selection === openCalcBtn) {
            vscode.commands.executeCommand('currencyExchange.calculate');
        }
    });
}
function deactivate() {
    console.log('Currency Exchange Rates extension deactivated');
}
//# sourceMappingURL=extension.js.map