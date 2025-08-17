// 日志管理工具
// 在开发环境显示所有日志，在生产环境屏蔽日志

// 检测当前环境
const isDevelopment = process.env.NODE_ENV === 'development';
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production' || isVercel;

// 日志级别配置
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

// 获取当前日志级别
const getLogLevel = () => {
    if (isProduction) {
        // 生产环境只显示错误和警告
        return LOG_LEVELS.WARN;
    }
    // 开发环境显示所有日志
    return LOG_LEVELS.DEBUG;
};

const currentLogLevel = getLogLevel();

// 日志函数
export const logger = {
    debug: (...args) => {
        if (currentLogLevel <= LOG_LEVELS.DEBUG) {
            console.log('[DEBUG]', ...args);
        }
    },

    info: (...args) => {
        if (currentLogLevel <= LOG_LEVELS.INFO) {
            console.log('[INFO]', ...args);
        }
    },

    warn: (...args) => {
        if (currentLogLevel <= LOG_LEVELS.WARN) {
            console.warn('[WARN]', ...args);
        }
    },

    error: (...args) => {
        if (currentLogLevel <= LOG_LEVELS.ERROR) {
            console.error('[ERROR]', ...args);
        }
    },

    // 强制显示日志（不受环境限制）
    force: (...args) => {
        console.log('[FORCE]', ...args);
    },

    // 获取当前环境信息
    getEnvironment: () => ({
        isDevelopment,
        isVercel,
        isProduction,
        logLevel: currentLogLevel
    })
};

// 导出环境检测函数
export const isDev = isDevelopment;
export const isProd = isProduction;
export const isVercelEnv = isVercel;

// 导出日志级别常量
export { LOG_LEVELS }; 