import { ethers } from 'ethers';


// 常用代币地址 (BASE网络)
export const COMMON_TOKENS = {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    USDE: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
};

// 代币价格缓存 (实际项目中应该从价格API获取)
const TOKEN_PRICES = {
    [COMMON_TOKENS.WETH]: 3000, // USD价格，实际应该动态获取
    [COMMON_TOKENS.USDC]: 1,    // USDC价格
    [COMMON_TOKENS.USDE]: 1,    // USDE价格
};

// 池子信息缓存
const POOL_INFO_CACHE = new Map();
const TOKEN_INFO_CACHE = new Map();

// 缓存过期时间（5分钟）
const CACHE_EXPIRY = 5 * 60 * 1000;

// 池子合约ABI (只包含我们需要的方法)
const POOL_ABI = [
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function fee() external view returns (uint24)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
];

// ERC20代币ABI
const ERC20_ABI = [
    'function name() external view returns (string)',
    'function symbol() external view returns (string)',
    'function decimals() external view returns (uint8)'
];

// 创建provider的函数
const createProvider = (rpcUrl) => {
    try {
        return new ethers.JsonRpcProvider(rpcUrl);
    } catch (error) {
        console.error('创建provider失败:', error);
        return null;
    }
};

// 默认RPC URL (作为后备)
const DEFAULT_RPC_URL = 'https://base-mainnet.blastapi.io/fe9c30fc-3bc5-4064-91e2-6ab5887f8f4d';

/**
 * 检查池子是否包含常用代币
 * @param {string} token0 - token0地址
 * @param {string} token1 - token1地址
 * @returns {Object} 检查结果
 */
export const checkCommonTokenPool = (token0, token1) => {
    const token0Lower = token0.toLowerCase();
    const token1Lower = token1.toLowerCase();

    const commonTokenAddresses = Object.values(COMMON_TOKENS).map(addr => addr.toLowerCase());

    const hasToken0 = commonTokenAddresses.includes(token0Lower);
    const hasToken1 = commonTokenAddresses.includes(token1Lower);

    if (hasToken0 || hasToken1) {
        const commonToken = hasToken0 ? token0 : token1;
        const otherToken = hasToken0 ? token1 : token0;
        const commonTokenType = Object.keys(COMMON_TOKENS).find(key =>
            COMMON_TOKENS[key].toLowerCase() === commonToken.toLowerCase()
        );

        return {
            isCommonPool: true,
            commonToken,
            commonTokenType,
            otherToken,
            commonTokenIndex: hasToken0 ? 0 : 1
        };
    }

    return {
        isCommonPool: false
    };
};

/**
 * 获取代币信息（通过合约调用）
 * @param {string} tokenAddress - 代币地址
 * @param {string} rpcUrl - RPC节点地址
 * @returns {Promise<Object>} 代币信息
 */
export const getTokenInfo = async (tokenAddress, rpcUrl = DEFAULT_RPC_URL) => {
    const tokenKey = tokenAddress.toLowerCase();

    // 检查缓存
    if (TOKEN_INFO_CACHE.has(tokenKey)) {
        const cached = TOKEN_INFO_CACHE.get(tokenKey);
        if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
            return cached.data;
        }
    }

    try {
        // 创建provider
        const provider = createProvider(rpcUrl);
        if (!provider) {
            throw new Error('无法创建provider');
        }

        // 创建代币合约实例
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

        // 并行获取代币信息
        const [name, symbol, decimals] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals()
        ]);

        const tokenInfo = {
            address: tokenAddress,
            name,
            symbol,
            decimals: parseInt(decimals),
            lastUpdated: Date.now()
        };

        // 缓存结果
        TOKEN_INFO_CACHE.set(tokenKey, {
            data: tokenInfo,
            timestamp: Date.now()
        });

        return tokenInfo;
    } catch (error) {
        console.error(`获取代币信息失败 ${tokenAddress}:`, error);

        // 如果是已知代币，返回硬编码信息
        const knownTokens = {
            [COMMON_TOKENS.WBNB.toLowerCase()]: {
                address: COMMON_TOKENS.WBNB,
                symbol: 'WBNB',
                name: 'Wrapped BNB',
                decimals: 18
            },
            [COMMON_TOKENS.USDT.toLowerCase()]: {
                address: COMMON_TOKENS.USDT,
                symbol: 'USDT',
                name: 'Tether USD',
                decimals: 18
            },
            [COMMON_TOKENS.USDC.toLowerCase()]: {
                address: COMMON_TOKENS.USDC,
                symbol: 'USDC',
                name: 'USD Coin',
                decimals: 18
            },
            [COMMON_TOKENS.BUSD.toLowerCase()]: {
                address: COMMON_TOKENS.BUSD,
                symbol: 'BUSD',
                name: 'Binance USD',
                decimals: 18
            }
        };

        if (knownTokens[tokenKey]) {
            return knownTokens[tokenKey];
        }

        // 返回默认信息
        const defaultInfo = {
            address: tokenAddress,
            symbol: 'UNKNOWN',
            name: 'Unknown Token',
            decimals: 18,
            lastUpdated: Date.now()
        };

        return defaultInfo;
    }
};

/**
 * 格式化费用
 * @param {number} fee - 费用（以百万分之一为单位）
 * @returns {string} 格式化后的费用
 */
const formatFee = (fee) => {
    const feeNum = parseInt(fee);

    let result;
    switch (feeNum) {
        case 100:
            result = '0.01%';
            break;
        case 500:
            result = '0.05%';
            break;
        case 2500:
            result = '0.25%';
            break;
        case 3000:
            result = '0.3%';
            break;
        case 10000:
            result = '1%';
            break;
        default:
            result = `${(feeNum / 10000).toFixed(2)}%`;
            break;
    }

    return result;
};

/**
 * 获取池子基本信息（通过合约调用）
 * @param {string} poolAddress - 池子地址
 * @param {string} rpcUrl - RPC节点地址
 * @returns {Promise<Object>} 池子信息
 */
export const getPoolBasicInfo = async (poolAddress, rpcUrl = DEFAULT_RPC_URL) => {
    const poolKey = poolAddress.toLowerCase();

    // 检查缓存
    if (POOL_INFO_CACHE.has(poolKey)) {
        const cached = POOL_INFO_CACHE.get(poolKey);
        if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
            return cached.data;
        }
    }

    try {
        // 创建provider
        const provider = createProvider(rpcUrl);
        if (!provider) {
            throw new Error('无法创建provider');
        }

        // 创建池子合约实例
        const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);

        // 并行获取池子信息
        const [token0, token1, fee] = await Promise.all([
            poolContract.token0(),
            poolContract.token1(),
            poolContract.fee()
        ]);

        console.log(`池子合约调用结果: token0=${token0}, token1=${token1}, fee=${fee} (类型: ${typeof fee})`);

        // 检查是否包含常用代币
        const poolCheck = checkCommonTokenPool(token0, token1);

        if (!poolCheck.isCommonPool) {

            return null;
        }

        const formattedFee = formatFee(fee);


        const poolInfo = {
            address: poolAddress,
            token0,
            token1,
            fee: formattedFee,
            protocol: 'Unknown', // 稍后根据事件类型确定
            isCommonPool: true,
            commonToken: poolCheck.commonToken,
            commonTokenType: poolCheck.commonTokenType,
            otherToken: poolCheck.otherToken,
            commonTokenIndex: poolCheck.commonTokenIndex,
            lastUpdated: Date.now()
        };

        // 缓存结果
        POOL_INFO_CACHE.set(poolKey, {
            data: poolInfo,
            timestamp: Date.now()
        });

        return poolInfo;
    } catch (error) {
        console.error(`获取池子信息失败 ${poolAddress}:`, error);

        // 如果合约调用失败，可能是无效地址或网络问题
        return null;
    }
};



/**
 * 获取完整的池子信息（包括代币详情）
 * @param {string} poolAddress - 池子地址
 * @param {string} rpcUrl - RPC节点地址
 * @returns {Promise<Object>} 完整池子信息
 */
export const getFullPoolInfo = async (poolAddress, rpcUrl = DEFAULT_RPC_URL) => {
    try {
        // 获取池子基本信息
        const poolInfo = await getPoolBasicInfo(poolAddress, rpcUrl);

        // 如果不包含常用代币，直接返回
        if (!poolInfo || !poolInfo.isCommonPool) {
            return poolInfo;
        }

        // 获取代币信息
        const [token0Info, token1Info] = await Promise.all([
            getTokenInfo(poolInfo.token0, rpcUrl),
            getTokenInfo(poolInfo.token1, rpcUrl)
        ]);

        return {
            ...poolInfo,
            token0Info,
            token1Info,
            displayName: `${token0Info.symbol}/${token1Info.symbol}`,
            fullName: `${token0Info.name}/${token1Info.name}`
        };
    } catch (error) {
        console.error(`获取完整池子信息失败 ${poolAddress}:`, error);
        return null;
    }
};

/**
 * 清理过期缓存
 */
export const clearExpiredCache = () => {
    const now = Date.now();

    // 清理池子信息缓存
    for (const [key, value] of POOL_INFO_CACHE.entries()) {
        if (now - value.timestamp > CACHE_EXPIRY) {
            POOL_INFO_CACHE.delete(key);
        }
    }

    // 清理代币信息缓存
    for (const [key, value] of TOKEN_INFO_CACHE.entries()) {
        if (now - value.timestamp > CACHE_EXPIRY) {
            TOKEN_INFO_CACHE.delete(key);
        }
    }
};

/**
 * 获取缓存统计信息
 * @returns {Object} 缓存统计
 */
export const getCacheStats = () => {
    return {
        poolCacheSize: POOL_INFO_CACHE.size,
        tokenCacheSize: TOKEN_INFO_CACHE.size,
        poolCacheKeys: Array.from(POOL_INFO_CACHE.keys()),
        tokenCacheKeys: Array.from(TOKEN_INFO_CACHE.keys())
    };
};

/**
 * 手动清理所有缓存
 */
export const clearAllCache = () => {
    POOL_INFO_CACHE.clear();
    TOKEN_INFO_CACHE.clear();
};

