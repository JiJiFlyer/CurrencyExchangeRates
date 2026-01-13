import axios from 'axios';
import * as https from 'https';
import { I18nService } from './i18nService';

export interface ExchangeRate {
    from: string;
    to: string;
    rate: number;
    timestamp: number;
    change?: number;
}

export interface CurrencyRates {
    base: string;
    rates: { [key: string]: number };
    timestamp: number;
}

export interface HistoricalRate {
    date: string;
    rate: number;
}

export interface HistoricalRates {
    from: string;
    to: string;
    startDate: string;
    endDate: string;
    rates: HistoricalRate[];
}

export class ExchangeRateService {
    private cache: Map<string, CurrencyRates> = new Map();
    private cacheExpiry: number = 5 * 60 * 1000; // 5分钟缓存
    private currentDataSource: string = ''; // 当前使用的数据源名称
    private i18n?: I18nService;
    
    // 创建一个自定义的 HTTPS Agent，禁用 SSL 验证（仅用于开发/测试）
    private httpsAgent = new https.Agent({
        rejectUnauthorized: false, // 允许自签名证书
        keepAlive: true,
        timeout: 10000
    });

    /**
     * 设置国际化服务
     */
    setI18nService(i18n: I18nService): void {
        this.i18n = i18n;
    }

    /**
     * 获取主要货币的实时汇率
     * 使用多个可靠的免费汇率API，按优先级尝试
     */
    async fetchExchangeRates(baseCurrency: string = 'CNY'): Promise<CurrencyRates> {
        const cacheKey = baseCurrency;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached;
        }

        // API优先级列表（从最可靠到备用）
        const apis = [
            // 1. ExchangeRate-API - 免费，支持多种货币，稳定性好
            {
                name: 'ExchangeRate-API',
                url: `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
                parser: (response: any) => ({
                    base: response.data.base,
                    rates: response.data.rates,
                    timestamp: Date.now()
                })
            },
            // 2. Frankfurter - 开源免费，基于欧洲央行数据
            {
                name: 'Frankfurter',
                url: `https://api.frankfurter.app/latest?from=${baseCurrency}`,
                parser: (response: any) => ({
                    base: response.data.base,
                    rates: response.data.rates,
                    timestamp: Date.now()
                })
            },
            // 3. Open Exchange Rates - 备用方案
            {
                name: 'Open-ER-API',
                url: `https://open.er-api.com/v6/latest/${baseCurrency}`,
                parser: (response: any) => ({
                    base: response.data.base_code,
                    rates: response.data.rates,
                    timestamp: Date.now()
                })
            },
            // 4. 使用 HTTP 协议的备用 API（避免 TLS 问题）
            {
                name: 'ExchangeRate-API-HTTP',
                url: `http://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
                parser: (response: any) => ({
                    base: response.data.base,
                    rates: response.data.rates,
                    timestamp: Date.now()
                })
            }
        ];

        // 依次尝试每个API
        for (const api of apis) {
            try {
                console.log(`尝试使用 ${api.name} 获取汇率数据...`);
                const response = await axios.get(api.url, { 
                    timeout: 15000, // 增加超时时间到15秒
                    httpsAgent: this.httpsAgent, // 使用自定义的 HTTPS Agent
                    headers: {
                        'User-Agent': 'VSCode-Currency-Exchange-Extension/1.0',
                        'Accept': 'application/json',
                        'Accept-Encoding': 'gzip, deflate'
                    },
                    validateStatus: (status) => status >= 200 && status < 300,
                    maxRedirects: 5
                });

                const data: CurrencyRates = api.parser(response);
                
                // 验证数据有效性
                if (data.rates && Object.keys(data.rates).length > 0) {
                    console.log(`✅ 成功从 ${api.name} 获取汇率数据，包含 ${Object.keys(data.rates).length} 种货币`);
                    this.currentDataSource = api.name; // 记录当前数据源
                    this.cache.set(cacheKey, data);
                    return data;
                } else {
                    console.warn(`⚠️ ${api.name} 返回的数据无效或为空`);
                }
            } catch (error: any) {
                const errorMsg = error.message || '未知错误';
                const errorCode = error.code || 'UNKNOWN';
                console.error(`❌ ${api.name} 失败 [${errorCode}]: ${errorMsg}`);
                
                // 记录更详细的错误信息
                if (error.response) {
                    console.error(`   HTTP状态: ${error.response.status}`);
                } else if (error.request) {
                    console.error(`   请求已发送但未收到响应`);
                } else {
                    console.error(`   请求配置错误: ${errorMsg}`);
                }
                
                continue; // 尝试下一个API
            }
        }

        // 所有API都失败，返回缓存数据或抛出错误
        if (cached) {
            console.warn('⚠️ 所有API失败，使用缓存数据（可能已过期）');
            return cached;
        }

        const errorMessage = '❌ 无法获取汇率数据：\n' +
            '• 所有数据源均不可用\n' +
            '• 可能的原因：网络连接问题、防火墙阻止、或代理设置\n' +
            '• 建议：检查网络设置或稍后重试';
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    /**
     * 获取特定货币对的汇率
     */
    async getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
        const rates = await this.fetchExchangeRates(from);
        
        if (!rates.rates[to]) {
            throw new Error(`不支持的货币: ${to}`);
        }

        return {
            from,
            to,
            rate: rates.rates[to],
            timestamp: rates.timestamp
        };
    }

    /**
     * 计算货币转换
     */
    async convert(amount: number, from: string, to: string): Promise<number> {
        const rate = await this.getExchangeRate(from, to);
        return amount * rate.rate;
    }

    /**
     * 获取主要货币列表
     */
    getMajorCurrencies(): string[] {
        return [
            'USD', // 美元
            'EUR', // 欧元
            'GBP', // 英镑
            'JPY', // 日元
            'CNY', // 人民币
            'HKD', // 港币
            'KRW', // 韩元
            'AUD', // 澳元
            'CAD', // 加元
            'SGD', // 新加坡元
            'CHF', // 瑞士法郎
            'NZD', // 新西兰元
            'THB', // 泰铢
            'MYR', // 马来西亚林吉特
            'RUB', // 俄罗斯卢布
            'INR', // 印度卢比
            'BRL', // 巴西雷亚尔
            'ZAR'  // 南非兰特
        ];
    }

    /**
     * 获取货币名称（支持国际化）
     */
    getCurrencyName(code: string): string {
        // 如果有国际化服务，使用国际化名称
        if (this.i18n) {
            return this.i18n.getCurrencyName(code);
        }
        
        // 否则使用默认的中文名称
        const names: { [key: string]: string } = {
            'USD': '美元',
            'EUR': '欧元',
            'GBP': '英镑',
            'JPY': '日元',
            'CNY': '人民币',
            'HKD': '港币',
            'KRW': '韩元',
            'AUD': '澳元',
            'CAD': '加元',
            'SGD': '新加坡元',
            'CHF': '瑞士法郎',
            'NZD': '新西兰元',
            'THB': '泰铢',
            'MYR': '马来西亚林吉特',
            'RUB': '俄罗斯卢布',
            'INR': '印度卢比',
            'BRL': '巴西雷亚尔',
            'ZAR': '南非兰特'
        };
        return names[code] || code;
    }

    /**
     * 格式化汇率显示
     */
    formatRate(rate: number, precision: number = 4): string {
        if (rate >= 100) {
            return rate.toFixed(2);
        } else if (rate >= 1) {
            return rate.toFixed(4);
        } else {
            return rate.toFixed(6);
        }
    }

    /**
     * 清除缓存
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * 获取当前数据源名称
     */
    getCurrentDataSource(): string {
        return this.currentDataSource || '未知';
    }

    /**
     * 获取历史汇率数据（使用Frankfurter API）
     * @param from 基准货币
     * @param to 目标货币
     * @param days 获取最近多少天的数据（默认30天）
     */
    async getHistoricalRates(from: string, to: string, days: number = 30): Promise<HistoricalRates> {
        try {
            // 计算日期范围
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // 使用Frankfurter API获取历史汇率
            // API格式: https://api.frankfurter.app/{start_date}..{end_date}?from={from}&to={to}
            const url = `https://api.frankfurter.app/${startDateStr}..${endDateStr}?from=${from}&to=${to}`;
            
            console.log(`获取历史汇率: ${url}`);
            
            const response = await axios.get(url, {
                timeout: 15000,
                httpsAgent: this.httpsAgent,
                headers: {
                    'User-Agent': 'VSCode-Currency-Exchange-Extension/1.0',
                    'Accept': 'application/json'
                }
            });

            // 解析响应数据
            const data = response.data;
            const rates: HistoricalRate[] = [];

            // Frankfurter返回格式: { amount: 1, base: "USD", start_date: "2024-01-01", end_date: "2024-01-31", rates: { "2024-01-01": { "CNY": 7.1234 }, ... } }
            if (data.rates) {
                for (const [date, rateObj] of Object.entries(data.rates)) {
                    const rateValue = (rateObj as any)[to];
                    if (rateValue) {
                        rates.push({
                            date: date,
                            rate: rateValue
                        });
                    }
                }
            }

            // 按日期排序
            rates.sort((a, b) => a.date.localeCompare(b.date));

            console.log(`✅ 成功获取 ${rates.length} 天的历史汇率数据`);

            return {
                from,
                to,
                startDate: startDateStr,
                endDate: endDateStr,
                rates
            };
        } catch (error: any) {
            console.error('获取历史汇率失败:', error);
            throw new Error(`无法获取历史汇率数据: ${error.message || '未知错误'}`);
        }
    }
}