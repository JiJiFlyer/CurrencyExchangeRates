import * as vscode from 'vscode';
import { ExchangeRateService } from './exchangeRateService';
import { StatusBarManager } from './statusBarManager';
import { RatesViewPanel, CalculatorPanel } from './webviewPanels';
import { CurrencySidebarProvider } from './sidebarProvider';
import { I18nService } from './i18nService';

let statusBarManager: StatusBarManager;
let ratesViewPanel: RatesViewPanel;
let calculatorPanel: CalculatorPanel;
let exchangeRateService: ExchangeRateService;
let i18nService: I18nService;
let sidebarProvider: CurrencySidebarProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('=== Currency Exchange Rates Extension Activating ===');

    // 初始化国际化服务
    i18nService = I18nService.getInstance(context.extensionPath);
    console.log('✅ I18nService initialized');

    // 初始化服务
    exchangeRateService = new ExchangeRateService();
    exchangeRateService.setI18nService(i18nService);
    console.log('✅ ExchangeRateService initialized');
    
    statusBarManager = new StatusBarManager(exchangeRateService);
    console.log('✅ StatusBarManager initialized');
    
    ratesViewPanel = new RatesViewPanel(exchangeRateService);
    ratesViewPanel.setI18nService(i18nService);
    console.log('✅ RatesViewPanel initialized');
    
    calculatorPanel = new CalculatorPanel(exchangeRateService);
    calculatorPanel.setI18nService(i18nService);
    console.log('✅ CalculatorPanel initialized');

    // 注册侧边栏视图
    console.log('Registering sidebar view...');
    sidebarProvider = new CurrencySidebarProvider(
        context.extensionUri,
        exchangeRateService
    );
    sidebarProvider.setI18nService(i18nService);
    console.log('✅ CurrencySidebarProvider created');
    
    const sidebarDisposable = vscode.window.registerWebviewViewProvider(
        CurrencySidebarProvider.viewType,
        sidebarProvider
    );
    console.log('✅ Sidebar view registered, viewType:', CurrencySidebarProvider.viewType);
    
    context.subscriptions.push(sidebarDisposable);
    console.log('✅ Sidebar disposable added to subscriptions');

    // 启动状态栏
    statusBarManager.start();

    // 注册命令：查看实时汇率
    const showRatesCommand = vscode.commands.registerCommand(
        'currencyExchange.showRates',
        async (baseCurrency?: string) => {
            // 如果没有指定基准货币，从配置中读取
            if (!baseCurrency) {
                const config = vscode.workspace.getConfiguration('currencyExchange');
                baseCurrency = config.get<string>('baseCurrency', 'USD');
            }
            await ratesViewPanel.showRates(baseCurrency);
        }
    );

    // 注册命令：汇率计算器
    const calculatorCommand = vscode.commands.registerCommand(
        'currencyExchange.calculate',
        async () => {
            await calculatorPanel.showCalculator();
        }
    );

    // 注册命令：刷新汇率
    const refreshCommand = vscode.commands.registerCommand(
        'currencyExchange.refresh',
        async () => {
            await statusBarManager.refresh();
        }
    );

    // 注册命令：重新加载状态栏
    const reloadStatusBarCommand = vscode.commands.registerCommand(
        'currencyExchange.reloadStatusBar',
        async () => {
            await statusBarManager.reloadConfig();
        }
    );

    // 注册命令：查看货币历史汇率
    const viewHistoryCommand = vscode.commands.registerCommand(
        'currencyExchange.viewHistory',
        async (currencyPair?: string) => {
            if (!currencyPair) {
                vscode.window.showErrorMessage('未指定货币对');
                return;
            }
            try {
                await ratesViewPanel.showHistoryPanel(currencyPair);
            } catch (error) {
                vscode.window.showErrorMessage(
                    `查看历史汇率失败: ${error instanceof Error ? error.message : '未知错误'}`
                );
            }
        }
    );

    // 注册命令：切换语言
    const changeLanguageCommand = vscode.commands.registerCommand(
        'currencyExchange.changeLanguage',
        async () => {
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
                
                // 刷新实时汇率面板（如果已打开）
                if (ratesViewPanel) {
                    await ratesViewPanel.refreshCurrentPanel();
                    // 刷新历史汇率面板（如果已打开）
                    await ratesViewPanel.refreshHistoryPanel();
                }
                
                // 刷新计算器面板（如果已打开）
                if (calculatorPanel) {
                    await calculatorPanel.refreshCurrentPanel();
                }
            }
        }
    );

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
    context.subscriptions.push(
        showRatesCommand,
        calculatorCommand,
        refreshCommand,
        reloadStatusBarCommand,
        viewHistoryCommand,
        changeLanguageCommand,
        configChangeListener,
        statusBarManager
    );

    // 显示欢迎消息
    const welcomeMsg = i18nService.t('extension.welcomeMessage');
    const viewRatesBtn = i18nService.t('extension.viewRates');
    const openCalcBtn = i18nService.t('extension.openCalculator');
    
    vscode.window.showInformationMessage(
        welcomeMsg,
        viewRatesBtn,
        openCalcBtn
    ).then(selection => {
        if (selection === viewRatesBtn) {
            vscode.commands.executeCommand('currencyExchange.showRates');
        } else if (selection === openCalcBtn) {
            vscode.commands.executeCommand('currencyExchange.calculate');
        }
    });
}

export function deactivate() {
    console.log('Currency Exchange Rates extension deactivated');
}
