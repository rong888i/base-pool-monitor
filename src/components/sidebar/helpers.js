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
    // 获取用户配置的RPC URL
    const settings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');

    const rpcUrls = {
        'base': settings.rpcUrl || 'https://base-mainnet.blastapi.io/fe9c30fc-3bc5-4064-91e2-6ab5887f8f4d',
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
            case 'aerodrome':
                dexName = 'Aerodrome';
                break;
            case 'baseswap':
                dexName = 'BaseSwap';
                break;
            default:
                dexName = pool.dexId; // 显示原始DEX ID
        }
    }

    // 获取版本信息
    if (pool.labels && pool.labels.length > 0) {
        version = pool.labels[0];
    }

    return { dexName, version };
}; 