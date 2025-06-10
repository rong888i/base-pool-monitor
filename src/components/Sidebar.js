'use client';

import { useState, useEffect } from 'react';
import { findNftPositionsByOwner } from '../utils/lpUtils';

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
    const [searchHistory, setSearchHistory] = useState([]);
    const [walletAddress, setWalletAddress] = useState('');
    const [isSearchingNfts, setIsSearchingNfts] = useState(false);
    const [nftSearchResults, setNftSearchResults] = useState([]);
    const [nftSearchError, setNftSearchError] = useState(null);
    const [openSection, setOpenSection] = useState('find'); // 'find' or 'search'
    const [walletSearchHistory, setWalletSearchHistory] = useState([]);

    // 从本地存储加载搜索历史
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedHistory = localStorage.getItem('poolSearchHistory');
            if (savedHistory) {
                setSearchHistory(JSON.parse(savedHistory));
            }
            const savedWalletHistory = localStorage.getItem('walletSearchHistory');
            if (savedWalletHistory) {
                setWalletSearchHistory(JSON.parse(savedWalletHistory));
            }
        }
    }, []);

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

    const handleNftSearch = async () => {
        if (!walletAddress.trim()) {
            setNftSearchError('请输入钱包地址');
            return;
        }

        // 更新钱包搜索历史
        const trimmedAddress = walletAddress.trim();
        const newHistory = [trimmedAddress, ...walletSearchHistory.filter(item => item.toLowerCase() !== trimmedAddress.toLowerCase())].slice(0, 10);
        setWalletSearchHistory(newHistory);
        localStorage.setItem('walletSearchHistory', JSON.stringify(newHistory));

        setIsSearchingNfts(true);
        setNftSearchError(null);
        setNftSearchResults([]);
        try {
            const results = await findNftPositionsByOwner(walletAddress.trim());

            // 合并相同池子的NFT，确保key的唯一性
            const positionMap = new Map();
            results.forEach(pos => {
                const address = pos.poolAddress.toLowerCase();
                if (positionMap.has(address)) {
                    const existing = positionMap.get(address);
                    const newIds = Array.isArray(pos.nftIds) ? pos.nftIds : [pos.nftIds];
                    existing.nftIds.push(...newIds);
                } else {
                    positionMap.set(address, {
                        ...pos,
                        nftIds: Array.isArray(pos.nftIds) ? [...pos.nftIds] : [pos.nftIds]
                    });
                }
            });

            const mergedResults = Array.from(positionMap.values());
            mergedResults.forEach(res => {
                res.nftIds = [...new Set(res.nftIds)];
            });

            setNftSearchResults(mergedResults);
            if (mergedResults.length === 0) {
                setNftSearchError('未找到该地址下的LP NFT，或仓位流动性为0。');
            }
        } catch (err) {
            setNftSearchError('查找NFT时出错，请检查地址或RPC设置。');
            console.error(err);
        } finally {
            setIsSearchingNfts(false);
        }
    };

    const searchPools = async () => {
        if (!searchAddress.trim()) {
            setError('请输入代币合约地址');
            return;
        }

        // 更新搜索历史
        const trimmedAddress = searchAddress.trim();
        const newHistory = [trimmedAddress, ...searchHistory.filter(item => item.toLowerCase() !== trimmedAddress.toLowerCase())].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem('poolSearchHistory', JSON.stringify(newHistory));

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

                // 去重，避免DEX Screener返回同一个池子地址多次
                const uniquePools = dexscreenerPools.reduce((acc, current) => {
                    if (!acc.some(item => item.address.toLowerCase() === current.address.toLowerCase())) {
                        acc.push(current);
                    }
                    return acc;
                }, []);

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

                const poolsWithFees = await fetchPoolFees(uniquePools);
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

    const AccordionSection = ({ title, id, icon, children }) => {
        const isOpen = openSection === id;

        return (
            <div className="border-b border-neutral-200 dark:border-neutral-800">
                <button
                    onClick={() => setOpenSection(isOpen ? null : id)}
                    className="w-full p-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 bg-gradient-to-br rounded-lg ${id === 'find' ? 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20' : 'from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20'}`}>
                                {icon}
                            </div>
                            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h2>
                        </div>
                        <svg
                            className={`w-5 h-5 text-neutral-500 dark:text-neutral-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </button>
                {isOpen && (
                    <div>
                        {children}
                    </div>
                )}
            </div>
        );
    };

    // 清除搜索历史
    const handleClearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem('poolSearchHistory');
    };

    // 清除钱包搜索历史
    const handleClearWalletHistory = () => {
        setWalletSearchHistory([]);
        localStorage.removeItem('walletSearchHistory');
    };

    return (
        <div className={`${isCollapsed ? 'w-0' : 'w-full sm:w-96'} bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-[width] duration-300 relative overflow-y-auto overflow-x-hidden custom-scrollbar`}>
            {/* 收起/展开按钮 */}
            <button
                onClick={handleToggle}
                className={`fixed top-1/2 -translate-y-1/2 z-50 rounded-full p-2
                bg-white/70 dark:bg-neutral-800/70 backdrop-blur-sm
                border border-neutral-200/50 dark:border-neutral-700/50
                shadow-lg hover:shadow-xl
                hover:bg-white/90 dark:hover:bg-neutral-800/90
                transition-all duration-300
                ${isCollapsed
                        ? 'left-3'
                        : 'sm:left-[23rem] left-[calc(100%-3.5rem)]'
                    }`}
                aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
            >
                <svg
                    className={`w-6 h-6 text-neutral-700 dark:text-neutral-300 transition-transform duration-300 ${!isCollapsed ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* 内容区域 */}
            <div className="h-full">
                <AccordionSection
                    title="查找地址的LP NFT"
                    id="find"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-600 dark:text-green-400">
                        <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v1.286a.75.75 0 0 0 .75.75h.25a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 0 .75.75h.25a.75.75 0 0 0 .75-.75V6.03a9.703 9.703 0 0 0 2.25-.533Z" />
                        <path fillRule="evenodd" d="M12.75 3a9.735 9.735 0 0 1 3.25.555.75.75 0 0 1 .5.707v1.286a.75.75 0 0 1-.75.75h-.25a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 1-.75.75h-.25a.75.75 0 0 1-.75-.75V6.03a9.703 9.703 0 0 1-2.25-.533.75.75 0 0 1-.5-.707V3.555A.75.75 0 0 1 8.25 3c1.045 0 2.019.311 2.812.86a3.74 3.74 0 0 1 1.688 0ZM18 5.25a.75.75 0 0 0-.75.75v1.25a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75V6a.75.75 0 0 0-.75-.75h-.75a.75.75 0 0 0-.75.75v3a3 3 0 0 0 3 3h1.5a3 3 0 0 0 3-3V6a.75.75 0 0 0-.75-.75h-.75Z" clipRule="evenodd" />
                        <path d="M5.25 12.375a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 .75.75h.75a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 0-.75-.75H5.25ZM9 12.375a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 .75.75h.75a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 0-.75-.75H9Z" />
                        <path d="M13.5 12.375a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 .75-.75v-6a.75.75 0 0 0-.75-.75h-3Z" />
                    </svg>}
                >
                    <div className="p-4 space-y-3">
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="输入钱包地址 (0x...)"
                                value={walletAddress}
                                onChange={(e) => setWalletAddress(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleNftSearch()}
                                className="w-full pl-4 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl 
                                    text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 
                                    hover:border-green-300 dark:hover:border-green-600
                                    focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 dark:focus:border-green-400
                                    transition-all duration-200 text-sm font-medium"
                            />
                        </div>
                        <button
                            onClick={handleNftSearch}
                            disabled={isSearchingNfts || !walletAddress.trim()}
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                                disabled:from-neutral-300 disabled:to-neutral-400 dark:disabled:from-neutral-600 dark:disabled:to-neutral-700
                                text-white font-medium py-3 px-4 rounded-xl 
                                disabled:opacity-50 disabled:cursor-not-allowed 
                                hover:shadow-lg hover:shadow-green-500/25 active:scale-[0.98]
                                transition-all duration-200 text-sm flex items-center justify-center gap-2 group"
                        >
                            {isSearchingNfts ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>查找中...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <span>查找NFT</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* 钱包搜索历史 */}
                    {walletSearchHistory.length > 0 && !isCollapsed && (
                        <div className="px-4 pb-4 animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    查找历史
                                </h3>
                                <button
                                    onClick={handleClearWalletHistory}
                                    className="text-xs text-neutral-400 hover:text-error-500 dark:hover:text-error-400 transition-colors duration-200"
                                >
                                    清除
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {walletSearchHistory.map((address) => (
                                    <button
                                        key={address}
                                        onClick={() => setWalletAddress(address)}
                                        className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-all duration-200 font-mono"
                                        title={address}
                                    >
                                        {formatAddress(address)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* NFT 搜索结果 */}
                    {nftSearchError && !isCollapsed && (
                        <div className="p-4">
                            <p className="text-center text-sm text-error-600 dark:text-error-400">{nftSearchError}</p>
                        </div>
                    )}
                    {nftSearchResults.length > 0 && !isCollapsed && (
                        <div className="p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">NFT 查找结果 ({nftSearchResults.length})</h3>
                            {nftSearchResults.map((result) => {
                                const resultPoolAddress = result.poolAddress;
                                const addedPool = getAddedPool(resultPoolAddress);
                                const poolExists = !!addedPool;

                                return (
                                    <div key={result.poolAddress} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3">
                                        <div className="flex justify-between items-start">
                                            {/* 内容区域 */}
                                            <div className="flex-1 min-w-0 pr-2">
                                                <div className="font-medium text-sm text-neutral-900 dark:text-white truncate">
                                                    {result.token0.symbol} / {result.token1.symbol}
                                                </div>
                                                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                                    {result.protocol.name} · Fee: {result.fee / 10000}%
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-xs">
                                                    <span className="font-sans text-neutral-500 dark:text-neutral-400">IDs:</span>
                                                    {result.nftIds.map(id => {
                                                        const isActive = poolExists && addedPool.nftId?.toString() === id.toString();
                                                        if (isActive) {
                                                            return (
                                                                <span key={id} className="px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 font-semibold">
                                                                    #{id}
                                                                </span>
                                                            );
                                                        }
                                                        if (poolExists) {
                                                            return (
                                                                <button
                                                                    key={id}
                                                                    onClick={() => handleAddPool({
                                                                        address: resultPoolAddress,
                                                                        name: `${result.token0.symbol}/${result.token1.symbol}`,
                                                                        nftId: id,
                                                                    })}
                                                                    className="px-2 py-1 rounded-full bg-neutral-200 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-300 hover:bg-green-100 dark:hover:bg-green-500/20 hover:text-green-700 dark:hover:text-green-300 transition-colors font-medium"
                                                                    title={`填充NFT ID: ${id}`}
                                                                >
                                                                    #{id}
                                                                </button>
                                                            );
                                                        }
                                                        return (
                                                            <span key={id} className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
                                                                #{id}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* 操作按钮区域 */}
                                            <div className="flex-shrink-0">
                                                {!poolExists ? (
                                                    <button
                                                        onClick={() => handleAddPool({
                                                            address: resultPoolAddress,
                                                            name: `${result.token0.symbol}/${result.token1.symbol}`,
                                                            nftId: result.nftIds?.[0],
                                                        })}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 bg-primary-500 text-white hover:bg-primary-600"
                                                        title="添加监控"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                        </svg>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRemovePool({ address: resultPoolAddress })}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 bg-error-500 text-white hover:bg-error-600"
                                                        title="删除监控"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </AccordionSection>

                <AccordionSection
                    title="搜索池子"
                    id="search"
                    icon={<svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>}
                >
                    <div className="p-4">
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

                    {/* 搜索历史 */}
                    {searchHistory.length > 0 && !isCollapsed && (
                        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    搜索历史
                                </h3>
                                <button
                                    onClick={handleClearHistory}
                                    className="text-xs text-neutral-400 hover:text-error-500 dark:hover:text-error-400 transition-colors duration-200"
                                >
                                    清除
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {searchHistory.map((address) => (
                                    <button
                                        key={address}
                                        onClick={() => setSearchAddress(address)}
                                        className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-all duration-200 font-mono"
                                        title={address}
                                    >
                                        {formatAddress(address)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

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
                </AccordionSection>
            </div>
        </div>
    );
};

export default Sidebar; 