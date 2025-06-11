'use client';

import { useState, useEffect } from 'react';
import { getDexInfo, formatNumber, formatAddress, getRpcUrl } from './helpers';

const PoolSearchSection = ({ pools, onAddPool }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchAddress, setSearchAddress] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedHistory = localStorage.getItem('poolSearchHistory');
            if (savedHistory) {
                setSearchHistory(JSON.parse(savedHistory));
            }
        }
    }, []);

    const isPoolAdded = (address) => {
        return pools.some(pool => pool.address.toLowerCase() === address.toLowerCase());
    };

    const getAddedPool = (address) => {
        return pools.find(pool => pool.address.toLowerCase() === address.toLowerCase());
    };

    const handleAddPool = (pool) => {
        onAddPool(pool);
    };

    const handleRemovePool = (pool) => {
        const addedPool = getAddedPool(pool.address);
        if (addedPool) {
            onAddPool({
                ...addedPool,
                isRemoving: true
            });
        }
    };

    const handleTogglePool = (pool) => {
        if (isPoolAdded(pool.address)) {
            handleRemovePool(pool);
        } else {
            handleAddPool(pool);
        }
    };

    const handleClearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem('poolSearchHistory');
    };

    const searchPools = async () => {
        if (!searchAddress.trim()) {
            setError('请输入代币合约地址');
            return;
        }

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
                const bscPairs = data.pairs.filter(pool => pool.chainId === 'bsc');

                if (bscPairs.length === 0) {
                    setSearchResults([]);
                    setError('未找到相关的BSC池子');
                    return;
                }

                const dexscreenerPools = bscPairs.map(pool => {
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


    return (
        <div className="space-y-4">
            <div className="p-4 space-y-3">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="输入代币合约地址 (0x...)"
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchPools()}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-2 border-transparent rounded-lg 
                                text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 font-mono text-sm
                                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent focus:bg-white dark:focus:bg-neutral-900
                                transition-all duration-300"
                    />
                    {searchAddress && (
                        <button
                            onClick={() => setSearchAddress('')}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                <button
                    onClick={searchPools}
                    disabled={isLoading || !searchAddress.trim()}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                            disabled:from-neutral-300 disabled:to-neutral-400 dark:disabled:from-neutral-600 dark:disabled:to-neutral-700
                            text-white font-semibold py-2.5 px-4 rounded-lg 
                            disabled:opacity-70 disabled:cursor-not-allowed 
                            hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]
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
                            <svg className="w-4 h-4 -ml-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>搜索池子</span>
                        </>
                    )}
                </button>
            </div>

            {searchHistory.length > 0 && (
                <div className="px-4 pb-4 border-t border-neutral-200 dark:border-neutral-800 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center my-2 px-1">
                        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            搜索历史
                        </h3>
                        <button
                            onClick={handleClearHistory}
                            className="text-xs text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
                        >
                            清除
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {searchHistory.map((address) => (
                            <button
                                key={address}
                                onClick={() => setSearchAddress(address)}
                                className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800/80 text-xs text-neutral-700 dark:text-neutral-300 rounded-md hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 hover:text-neutral-900 dark:hover:text-white transition-all duration-200 font-mono"
                                title={address}
                            >
                                {formatAddress(address)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <div className="mx-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-red-500 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-red-800 dark:text-red-300 mb-1">搜索失败</p>
                            <p className="text-red-700 dark:text-red-400 text-xs">{error}</p>
                        </div>
                        <button
                            onClick={() => setError(null)}
                            className="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {searchResults.length > 0 && (
                <div className="p-4 space-y-3 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">搜索结果</h3>
                        <span className="px-2 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-full">{searchResults.length}个</span>
                    </div>
                    {searchResults.map((pool) => (
                        <div key={pool.address} className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="p-3 border-b border-neutral-200 dark:border-neutral-700/60">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-neutral-900 dark:text-white">{pool.name}</div>
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                            {getDexInfo(pool).dexName}{getDexInfo(pool).version ? ` · ${getDexInfo(pool).version}` : ''} · {pool.chain}
                                            {pool.fee !== null && ` · ${pool.fee.toFixed(2)}%`}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleTogglePool(pool)}
                                        aria-label={isPoolAdded(pool.address) ? 'Remove pool' : 'Add pool'}
                                        className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-800
                                        ${isPoolAdded(pool.address)
                                                ? 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500'
                                                : 'bg-neutral-100 dark:bg-neutral-700/50 text-neutral-400 dark:text-neutral-500 hover:bg-blue-500 hover:text-white'
                                            }`
                                        }
                                    >
                                        {isPoolAdded(pool.address) ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <a
                                    href={`https://bscscan.com/address/${pool.address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-1.5 font-mono"
                                >
                                    {formatAddress(pool.address)}
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            </div>

                            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-neutral-50 dark:bg-neutral-900/40 p-2 rounded-md">
                                    <div className="text-neutral-500 dark:text-neutral-400 mb-1">价格</div>
                                    <div className="text-neutral-800 dark:text-white font-semibold">${Number(pool.price).toFixed(6)}</div>
                                </div>
                                <div className="bg-neutral-50 dark:bg-neutral-900/40 p-2 rounded-md">
                                    <div className="text-neutral-500 dark:text-neutral-400 mb-1">5m 成交量</div>
                                    <div className="text-neutral-800 dark:text-white font-semibold">{formatNumber(pool.volume5m)}</div>
                                </div>
                                <div className="bg-neutral-50 dark:bg-neutral-900/40 p-2 rounded-md">
                                    <div className="text-neutral-500 dark:text-neutral-400 mb-1">24h 成交量</div>
                                    <div className="text-neutral-800 dark:text-white font-semibold">{formatNumber(pool.volume24h)}</div>
                                </div>
                                <div className="bg-neutral-50 dark:bg-neutral-900/40 p-2 rounded-md">
                                    <div className="text-neutral-500 dark:text-neutral-400 mb-1">流动性</div>
                                    <div className="text-neutral-800 dark:text-white font-semibold">{formatNumber(pool.liquidity)}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PoolSearchSection; 