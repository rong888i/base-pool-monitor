import { ethers } from 'ethers';

// PancakeSwap V3 Swap 事件 ABI
const PANCAKESWAP_V3_SWAP_ABI = [
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint128 protocolFeesToken0, uint128 protocolFeesToken1)"
];

// Uniswap V3 Swap 事件 ABI
const UNISWAP_V3_SWAP_ABI = [
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
];

// 创建接口实例 - 兼容ethers v6
const pancakeswapInterface = new ethers.Interface(PANCAKESWAP_V3_SWAP_ABI);
const uniswapInterface = new ethers.Interface(UNISWAP_V3_SWAP_ABI);

/**
 * 解析PancakeSwap V3 Swap事件
 * @param {string} data - 事件数据
 * @param {Array} topics - 事件主题
 * @returns {Object|null} 解析后的事件数据
 */
export const decodePancakeSwapSwap = (data, topics) => {
    try {
        // 使用ethers.js解析事件
        const decoded = pancakeswapInterface.parseLog({
            data,
            topics
        });

        if (decoded && decoded.args) {
            return {
                sender: decoded.args.sender,
                recipient: decoded.args.recipient,
                amount0: decoded.args.amount0.toString(),
                amount1: decoded.args.amount1.toString(),
                sqrtPriceX96: decoded.args.sqrtPriceX96.toString(),
                liquidity: decoded.args.liquidity.toString(),
                tick: decoded.args.tick.toString(),
                protocolFeesToken0: decoded.args.protocolFeesToken0.toString(),
                protocolFeesToken1: decoded.args.protocolFeesToken1.toString()
            };
        }
        return null;
    } catch (error) {
        console.error('解析PancakeSwap事件失败:', error);
        return null;
    }
};

/**
 * 解析Uniswap V3 Swap事件
 * @param {string} data - 事件数据
 * @param {Array} topics - 事件主题
 * @returns {Object|null} 解析后的事件数据
 */
export const decodeUniswapSwap = (data, topics) => {
    try {
        // 使用ethers.js解析事件
        const decoded = uniswapInterface.parseLog({
            data,
            topics
        });

        if (decoded && decoded.args) {
            return {
                sender: decoded.args.sender,
                recipient: decoded.args.recipient,
                amount0: decoded.args.amount0.toString(),
                amount1: decoded.args.amount1.toString(),
                sqrtPriceX96: decoded.args.sqrtPriceX96.toString(),
                liquidity: decoded.args.liquidity.toString(),
                tick: decoded.args.tick.toString()
            };
        }
        return null;
    } catch (error) {
        console.error('解析Uniswap事件失败:', error);
        return null;
    }
};

/**
 * 计算交易量（简化版本）
 * @param {string} amount0 - token0数量
 * @param {string} amount1 - token1数量
 * @returns {number} 交易量
 */
export const calculateVolume = (amount0, amount1) => {
    try {
        const absAmount0 = Math.abs(parseFloat(amount0));
        const absAmount1 = Math.abs(parseFloat(amount1));
        return absAmount0 + absAmount1;
    } catch (error) {
        console.error('计算交易量失败:', error);
        return 0;
    }
};

/**
 * 格式化交易量显示
 * @param {number} volume - 交易量
 * @returns {string} 格式化后的交易量
 */
export const formatVolume = (volume) => {
    if (volume === 0) return '0';

    const num = parseFloat(volume);
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    } else {
        return num.toFixed(2);
    }
};

/**
 * 格式化地址显示
 * @param {string} address - 地址
 * @returns {string} 格式化后的地址
 */
export const formatAddress = (address) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * 获取协议显示名称
 * @param {string} protocol - 协议名称
 * @returns {string} 显示名称
 */
export const getProtocolDisplayName = (protocol) => {
    switch (protocol) {
        case 'PancakeSwap V3':
            return 'PancakeSwap V3';
        case 'Uniswap V3':
            return 'Uniswap V3';
        default:
            return protocol;
    }
};

/**
 * 获取费用显示名称
 * @param {string} fee - 费用
 * @returns {string} 显示名称
 */
export const getFeeDisplayName = (fee) => {
    switch (fee) {
        case '0.01%':
            return '0.01%';
        case '0.05%':
            return '0.05%';
        case '0.25%':
            return '0.25%';
        case '0.3%':
            return '0.3%';
        case '1%':
            return '1%';
        default:
            return fee || '0.05%';
    }
};

/**
 * 获取时间窗口显示名称
 * @param {string} timeWindow - 时间窗口
 * @returns {string} 显示名称
 */
export const getTimeWindowDisplayName = (timeWindow) => {
    switch (timeWindow) {
        case '5m':
            return '5分钟';
        case '15m':
            return '15分钟';
        case '1h':
            return '1小时';
        default:
            return timeWindow;
    }
}; 