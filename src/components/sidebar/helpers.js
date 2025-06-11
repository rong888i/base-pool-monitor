// 格式化数字
export const formatNumber = (num) => {
    if (num >= 1000000) {
        return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
        return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
};

// 格式化地址
export const formatAddress = (address) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const getRpcUrl = (chainId) => {
    const rpcUrls = {
        'bsc': 'https://bsc-dataseed.binance.org/',
        'ethereum': 'https://eth.llamarpc.com',
        'arbitrum': 'https://arbitrum.llamarpc.com',
        'polygon': 'https://polygon.llamarpc.com',
        'avalanche': 'https://api.avax.network/ext/bc/C/rpc',
        'optimism': 'https://mainnet.optimism.io',
        'base': 'https://mainnet.base.org',
    };
    return rpcUrls[chainId.toLowerCase()];
};

// 获取DEX名称和版本
export const getDexInfo = (pool) => {
    let dexName = '未知';
    let version = null;

    // 处理已知的DEX
    if (pool.dexId) {
        switch (pool.dexId.toLowerCase()) {
            case 'pancakeswap':
                dexName = 'PancakeSwap';
                break;
            case 'uniswap':
                dexName = 'Uniswap';
                break;
            case 'squadswap':
                dexName = 'SquadSwap';
                break;
            default:
                dexName = 'Unknown DEX';
        }
    }

    // 获取版本信息
    if (pool.labels && pool.labels.length > 0) {
        version = pool.labels[0];
    }

    return { dexName, version };
}; 