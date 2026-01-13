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
exports.I18nService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class I18nService {
    constructor(extensionPath) {
        this.currentLanguage = 'en';
        this.translations = new Map();
        this.extensionPath = extensionPath;
        this.loadTranslations();
        this.loadLanguageFromConfig();
    }
    static getInstance(extensionPath) {
        if (!I18nService.instance && extensionPath) {
            I18nService.instance = new I18nService(extensionPath);
        }
        return I18nService.instance;
    }
    /**
     * 加载所有语言翻译文件
     */
    loadTranslations() {
        const languages = ['en', 'zh-CN'];
        for (const lang of languages) {
            try {
                // 尝试多个可能的路径
                const possiblePaths = [
                    path.join(this.extensionPath, 'out', 'i18n', `${lang}.json`),
                    path.join(this.extensionPath, 'src', 'i18n', `${lang}.json`),
                    path.join(this.extensionPath, 'i18n', `${lang}.json`)
                ];
                let loaded = false;
                for (const filePath of possiblePaths) {
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        this.translations.set(lang, JSON.parse(content));
                        console.log(`✅ 已加载 ${lang} 语言包 from ${filePath}`);
                        loaded = true;
                        break;
                    }
                }
                if (!loaded) {
                    console.warn(`⚠️ 语言包文件不存在: ${lang}.json (尝试了 ${possiblePaths.length} 个路径)`);
                }
            }
            catch (error) {
                console.error(`❌ 加载 ${lang} 语言包失败:`, error);
            }
        }
    }
    /**
     * 从配置中加载语言设置
     */
    loadLanguageFromConfig() {
        const config = vscode.workspace.getConfiguration('currencyExchange');
        const configLang = config.get('language', 'en');
        this.currentLanguage = this.isValidLanguage(configLang) ? configLang : 'en';
        console.log(`当前语言设置: ${this.currentLanguage}`);
    }
    /**
     * 验证语言代码是否有效
     */
    isValidLanguage(lang) {
        return lang === 'en' || lang === 'zh-CN';
    }
    /**
     * 获取当前语言
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    /**
     * 设置当前语言
     */
    async setLanguage(language) {
        if (!this.isValidLanguage(language)) {
            console.error(`不支持的语言: ${language}`);
            return;
        }
        this.currentLanguage = language;
        // 保存到配置
        const config = vscode.workspace.getConfiguration('currencyExchange');
        await config.update('language', language, vscode.ConfigurationTarget.Global);
        console.log(`语言已切换为: ${language}`);
    }
    /**
     * 获取翻译文本
     * @param key 翻译键，支持点号分隔的路径，如 'extension.name'
     * @param params 可选的参数对象，用于替换占位符
     */
    t(key, params) {
        const translation = this.translations.get(this.currentLanguage);
        if (!translation) {
            console.warn(`语言包未加载: ${this.currentLanguage}`);
            return key;
        }
        // 通过点号分隔的路径获取嵌套的值
        const keys = key.split('.');
        let value = translation;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            }
            else {
                console.warn(`翻译键不存在: ${key}`);
                return key;
            }
        }
        if (typeof value !== 'string') {
            console.warn(`翻译值不是字符串: ${key}`);
            return key;
        }
        // 替换参数占位符
        if (params) {
            return this.replaceParams(value, params);
        }
        return value;
    }
    /**
     * 替换字符串中的参数占位符
     * 支持 {paramName} 格式
     */
    replaceParams(text, params) {
        return text.replace(/\{(\w+)\}/g, (match, key) => {
            return key in params ? String(params[key]) : match;
        });
    }
    /**
     * 获取货币名称（支持多语言）
     */
    getCurrencyName(code) {
        return this.t(`currencies.${code}`) || code;
    }
    /**
     * 获取所有支持的语言
     */
    getSupportedLanguages() {
        return [
            { code: 'en', name: 'English' },
            { code: 'zh-CN', name: '简体中文' }
        ];
    }
    /**
     * 重新加载语言包（用于配置变更时）
     */
    reload() {
        this.loadLanguageFromConfig();
    }
}
exports.I18nService = I18nService;
//# sourceMappingURL=i18nService.js.map