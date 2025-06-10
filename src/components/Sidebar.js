import { useState } from 'react';

// 获取DEX名称和版本
const getDexInfo = (pool) => {
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

// 格式化数字
const formatNumber = (num) => {
    if (num >= 1000000) {
        return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
        return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
};

// 格式化地址
const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getRpcUrl = (chainId) => {
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

const Sidebar = ({ onAddPool, pools, onToggle }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchAddress, setSearchAddress] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isCollapsed, setIsCollapsed] = useState(true);

    // 检查池子是否已添加
    const isPoolAdded = (address) => {
        return pools.some(pool => pool.address.toLowerCase() === address.toLowerCase());
    };

    // 获取已添加的池子信息
    const getAddedPool = (address) => {
        return pools.find(pool => pool.address.toLowerCase() === address.toLowerCase());
    };

    // 处理删除池子
    const handleRemovePool = (pool) => {
        const addedPool = getAddedPool(pool.address);
        if (addedPool) {
            // 从观察列表中删除池子
            onAddPool({
                ...addedPool,
                isRemoving: true  // 添加标记表示这是一个删除操作
            });
        }
    };

    const searchPools = async () => {
        if (!searchAddress.trim()) {
            setError('请输入代币合约地址');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${searchAddress}`);
            const data = await response.json();

            if (data.pairs && data.pairs.length > 0) {
                const dexscreenerPools = data.pairs.map(pool => {
                    return {
                        name: `${pool.baseToken.symbol}/${pool.quoteToken.symbol}`,
                        address: pool.pairAddress,
                        chain: pool.chainId,
                        dexId: pool.dexId,
                        labels: pool.labels,
                        price: pool.priceUsd,
                        volume24h: pool.volume.h24,
                        volume5m: pool.volume.m5,
                        liquidity: pool.liquidity.usd,
                        baseToken: pool.baseToken,
                        quoteToken: pool.quoteToken
                    };
                });

                const fetchPoolFees = async (poolsToFetch) => {
                    const poolsByChain = poolsToFetch.reduce((acc, pool) => {
                        if (!acc[pool.chain]) {
                            acc[pool.chain] = [];
                        }
                        acc[pool.chain].push(pool);
                        return acc;
                    }, {});

                    const feePromises = Object.entries(poolsByChain).map(async ([chain, chainPools]) => {
                        const rpcUrl = getRpcUrl(chain);
                        if (!rpcUrl) {
                            return chainPools.map(p => ({ ...p, fee: null }));
                        }

                        const batchSize = 8;
                        let processedPools = [];

                        for (let i = 0; i < chainPools.length; i += batchSize) {
                            const batch = chainPools.slice(i, i + batchSize);
                            const requests = batch.map((pool, index) => ({
                                jsonrpc: '2.0',
                                id: i + index,
                                method: 'eth_call',
                                params: [{ to: pool.address, data: '0xddca3f43' }, 'latest'] // fee()
                            }));

                            try {
                                const res = await fetch(rpcUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(requests)
                                });
                                const results = await res.json();

                                const resultsById = Array.isArray(results) ? results.reduce((acc, r) => {
                                    acc[r.id] = r;
                                    return acc;
                                }, {}) : {};

                                const batchWithFees = batch.map((pool, index) => {
                                    const result = resultsById[i + index];
                                    let fee = null;
                                    if (result && result.result && result.result !== '0x') {
                                        const feeValue = parseInt(result.result, 16);
                                        fee = feeValue / 10000;
                                    } else {
                                        const { dexName, version } = getDexInfo(pool);
                                        if (version && version.toLowerCase().includes('v2')) {
                                            if (dexName === 'PancakeSwap') fee = 0.25;
                                            else if (dexName === 'Uniswap') fee = 0.3;
                                        }
                                    }
                                    return { ...pool, fee };
                                });
                                processedPools.push(...batchWithFees);
                            } catch (e) {
                                console.error(`Error fetching fees for chain ${chain}`, e);
                                processedPools.push(...batch.map(p => ({ ...p, fee: null })));
                            }
                        }
                        return processedPools;
                    });

                    const results = await Promise.all(feePromises);
                    // Flatten and restore original order
                    const poolOrder = poolsToFetch.map(p => p.address);
                    return results.flat().sort((a, b) => poolOrder.indexOf(a.address) - poolOrder.indexOf(b.address));
                };

                const poolsWithFees = await fetchPoolFees(dexscreenerPools);
                setSearchResults(poolsWithFees);

            } else {
                setSearchResults([]);
                setError('未找到相关池子');
            }
        } catch (err) {
            setError('获取池子数据失败，请稍后重试');
            console.error('Error fetching pool data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddPool = (pool) => {
        onAddPool(pool);
    };

    const handleTogglePool = (pool) => {
        if (isPoolAdded(pool.address)) {
            handleRemovePool(pool);
        } else {
            handleAddPool(pool);
        }
    };

    // 处理侧边栏切换
    const handleToggle = () => {
        const newCollapsedState = !isCollapsed;
        setIsCollapsed(newCollapsedState);
        // 通知父组件侧边栏状态变化
        if (onToggle) {
            onToggle(!newCollapsedState); // 传递的是isOpen状态
        }
    };

    return (
        <div className={`${isCollapsed ? 'w-0' : 'w-full sm:w-96'} bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 overflow-hidden transition-all duration-300 relative`}>
            {/* 收起/展开按钮 */}
            <button
                onClick={handleToggle}
                className={`fixed top-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-200 shadow-sm hover:shadow-md z-50 ${isCollapsed
                    ? 'left-3'
                    : 'sm:left-[21.5rem] left-[calc(100%-3rem)]'
                    }`}
            >
                <svg
                    className={`w-5 h-5 text-neutral-600 dark:text-neutral-400 transform transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* 内容区域 */}
            <div className="h-full overflow-y-auto custom-scrollbar">
                {/* 头部区域 */}
                <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-4 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg">
                            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        搜索池子
                    </h2>

                    {/* 搜索框组 */}
                    <div className="space-y-3">
                        {/* 搜索输入框 */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="输入代币合约地址 (0x...)"
                                value={searchAddress}
                                onChange={(e) => setSearchAddress(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchPools()}
                                className="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl 
                                    text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 
                                    hover:border-primary-300 dark:hover:border-primary-600 hover:bg-white dark:hover:bg-neutral-700
                                    focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-400
                                    focus:bg-white dark:focus:bg-neutral-700
                                    transition-all duration-200 text-sm font-medium"
                            />
                            {searchAddress && (
                                <button
                                    onClick={() => setSearchAddress('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* 搜索按钮 */}
                        <button
                            onClick={searchPools}
                            disabled={isLoading || !searchAddress.trim()}
                            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 
                                disabled:from-neutral-300 disabled:to-neutral-400 dark:disabled:from-neutral-600 dark:disabled:to-neutral-700
                                text-white font-medium py-3 px-4 rounded-xl 
                                disabled:opacity-50 disabled:cursor-not-allowed 
                                hover:shadow-lg hover:shadow-primary-500/25 active:scale-[0.98]
                                transition-all duration-200 text-sm flex items-center justify-center gap-2 group"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>搜索中...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <span>搜索池子</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 错误提示 */}
                {error && !isCollapsed && (
                    <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-error-50 to-orange-50 dark:from-error-900/20 dark:to-orange-900/20 
                        border border-error-200 dark:border-error-800/50 text-error-700 dark:text-error-400 
                        rounded-xl text-sm flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2 duration-300">
                        <div className="flex-shrink-0 mt-0.5">
                            <div className="p-1 bg-error-100 dark:bg-error-900/30 rounded-full">
                                <svg className="w-4 h-4 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-error-800 dark:text-error-300 mb-1">搜索失败</p>
                            <p className="text-error-600 dark:text-error-400 text-xs leading-relaxed">{error}</p>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="flex-shrink-0 text-error-400 hover:text-error-600 dark:hover:text-error-300 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* 搜索结果 */}
                {searchResults.length > 0 && !isCollapsed && (
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-gradient-to-br from-success-50 to-emerald-50 dark:from-success-900/20 dark:to-emerald-900/20 rounded-lg">
                                    <svg className="w-4 h-4 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">搜索结果</h3>
                            </div>
                            <div className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{searchResults.length}个</span>
                            </div>
                        </div>
                        {searchResults.map((pool) => (
                            <div key={pool.address} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                                {/* 池子信息头部 */}
                                <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-neutral-900 dark:text-white">{pool.name}</div>
                                            <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                                {getDexInfo(pool).dexName}{getDexInfo(pool).version ? ` · ${getDexInfo(pool).version}` : ''} · {pool.chain}
                                                {pool.fee !== null && ` · ${pool.fee.toFixed(2)}%`}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleTogglePool(pool)}
                                            aria-label={isPoolAdded(pool.address) ? 'Remove pool' : 'Add pool'}
                                            className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-800
                                                ${isPoolAdded(pool.address)
                                                    ? 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500'
                                                    : 'bg-transparent border-2 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
                                                }`
                                            }
                                        >
                                            {isPoolAdded(pool.address) ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>

                                    {/* 池子地址 */}
                                    <a
                                        href={`https://bscscan.com/address/${pool.address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        {formatAddress(pool.address)}
                                    </a>
                                </div>

                                {/* 交易信息 */}
                                <div className="p-4 grid grid-cols-2 gap-3">
                                    <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg">
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">价格</div>
                                        <div className="text-neutral-900 dark:text-white font-medium">${Number(pool.price).toFixed(6)}</div>
                                    </div>
                                    <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg">
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">5分钟成交量</div>
                                        <div className="text-neutral-900 dark:text-white font-medium">{formatNumber(pool.volume5m)}</div>
                                    </div>
                                    <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg">
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">24h成交量</div>
                                        <div className="text-neutral-900 dark:text-white font-medium">{formatNumber(pool.volume24h)}</div>
                                    </div>
                                    <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg">
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">流动性</div>
                                        <div className="text-neutral-900 dark:text-white font-medium">{formatNumber(pool.liquidity)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar; 