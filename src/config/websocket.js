// WebSocket节点配置
export const WEBSOCKET_CONFIG = {
    // BSC (Binance Smart Chain)
    BSC: {
        // 公共节点（免费，可能有连接限制）
        PUBLIC: [
            'wss://bsc.mesol.live',
        ],

        // 默认使用公共节点
        DEFAULT: 'wss://bsc.mesol.live'
    },
};

// 获取WebSocket URL
export const getWebSocketUrl = (network = 'BSC', type = 'DEFAULT') => {
    const config = WEBSOCKET_CONFIG[network];
    if (!config) {
        console.warn(`未找到网络配置: ${network}`);
        return config?.DEFAULT || 'wss://bsc-ws-node.nariox.org:443';
    }

    return config[type] || config.DEFAULT;
};

// 重连配置
export const RECONNECT_CONFIG = {
    MAX_ATTEMPTS: 5,
    INITIAL_DELAY: 1000, // 1秒
    MAX_DELAY: 30000,    // 30秒
    BACKOFF_MULTIPLIER: 2
}; 