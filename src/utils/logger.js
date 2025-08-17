// 日志管理工具
// 在开发环境中正常显示日志，在生产环境中自动屏蔽
// 支持用户手动控制是否启用日志

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// 从localStorage获取用户设置
const getUserLogSetting = () => {
    if (typeof window === 'undefined') return null;
    try {
        const settings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
        return settings.enableLogs;
    } catch (e) {
        return null;
    }
};

// 保存原始的console方法
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
};

// 生产环境下的空函数
const noop = () => { };

// 根据环境和用户设置配置console方法
const configureConsole = () => {
    const userSetting = getUserLogSetting();

    if (isProduction && userSetting !== true) {
        // 生产环境且用户未明确启用：屏蔽所有console方法
        console.log = noop;
        console.warn = noop;
        console.info = noop;
        console.debug = noop;
        // 保留error，因为错误日志在生产环境中仍然重要
        // console.error = noop;
    } else if (isDevelopment || userSetting === true) {
        // 开发环境或用户明确启用：保持原始功能
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
        console.info = originalConsole.info;
        console.debug = originalConsole.debug;
    }
};

// 初始化时配置console
configureConsole();

// 导出一个统一的日志接口
export const logger = {
    log: (...args) => {
        if (isDevelopment || getUserLogSetting() === true) {
            originalConsole.log(...args);
        }
    },
    warn: (...args) => {
        if (isDevelopment || getUserLogSetting() === true) {
            originalConsole.warn(...args);
        }
    },
    error: (...args) => {
        // 错误日志在所有环境中都显示
        originalConsole.error(...args);
    },
    info: (...args) => {
        if (isDevelopment || getUserLogSetting() === true) {
            originalConsole.info(...args);
        }
    },
    debug: (...args) => {
        if (isDevelopment || getUserLogSetting() === true) {
            originalConsole.debug(...args);
        }
    }
};

// 导出环境检测函数
export const isDev = () => isDevelopment;
export const isProd = () => isProduction;

// 导出原始console方法（如果需要的话）
export const originalConsoleMethods = originalConsole;

// 导出重新配置函数（当用户设置改变时调用）
export const reconfigureLogger = () => {
    configureConsole();
};

// 监听设置变化
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'poolMonitorSettings') {
            reconfigureLogger();
        }
    });
} 