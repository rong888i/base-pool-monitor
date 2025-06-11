'use client';

import { useState, useEffect } from 'react';
import { findNftPositionsByOwner } from '../../utils/lpUtils';
import { formatAddress } from './helpers';

const NftSearchSection = ({ pools, onAddPool }) => {
    const [walletAddress, setWalletAddress] = useState('');
    const [isSearchingNfts, setIsSearchingNfts] = useState(false);
    const [nftSearchResults, setNftSearchResults] = useState([]);
    const [nftSearchError, setNftSearchError] = useState(null);
    const [walletSearchHistory, setWalletSearchHistory] = useState([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedWalletHistory = localStorage.getItem('walletSearchHistory');
            if (savedWalletHistory) {
                setWalletSearchHistory(JSON.parse(savedWalletHistory));
            }
        }
    }, []);

    const getAddedPool = (address) => {
        return pools.find(pool => pool.address.toLowerCase() === address.toLowerCase());
    };

    const handleClearWalletHistory = () => {
        setWalletSearchHistory([]);
        localStorage.removeItem('walletSearchHistory');
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

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setWalletAddress(text.trim());
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
        }
    };

    const handleNftSearch = async () => {
        if (!walletAddress.trim()) {
            setNftSearchError('请输入钱包地址');
            return;
        }

        const trimmedAddress = walletAddress.trim();
        const newHistory = [trimmedAddress, ...walletSearchHistory.filter(item => item.toLowerCase() !== trimmedAddress.toLowerCase())].slice(0, 10);
        setWalletSearchHistory(newHistory);
        localStorage.setItem('walletSearchHistory', JSON.stringify(newHistory));

        setIsSearchingNfts(true);
        setNftSearchError(null);
        setNftSearchResults([]);
        try {
            const results = await findNftPositionsByOwner(walletAddress.trim());

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

    return (
        <div className="p-4 space-y-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200/60 dark:border-yellow-800/50 rounded-lg text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-500 dark:text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.636-1.214 2.27-1.214 2.906 0l4.257 8.125c.636 1.214-.24 2.776-1.453 2.776H5.453c-1.213 0-2.09-1.562-1.453-2.776l4.257-8.125zM9 9a1 1 0 011-1h.01a1 1 0 010 2H10a1 1 0 01-1-1zm1 5a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <div className="font-medium">
                    <strong className="font-semibold">提示:</strong> 此功能会进行大量链上查询，为了获得最佳体验，请在主页"设置"中配置个人RPC节点。
                </div>
            </div>
            <div className="space-y-3">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="输入钱包地址 (0x...)"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNftSearch()}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-2 border-transparent rounded-lg 
                                    text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 font-mono text-sm
                                    focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent focus:bg-white dark:focus:bg-neutral-900
                                    transition-all duration-300"
                    />
                </div>
                <button
                    onClick={handleNftSearch}
                    disabled={isSearchingNfts || !walletAddress.trim()}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                                disabled:from-neutral-300 disabled:to-neutral-400 dark:disabled:from-neutral-600 dark:disabled:to-neutral-700
                                text-white font-semibold py-2.5 px-4 rounded-lg 
                                disabled:opacity-70 disabled:cursor-not-allowed 
                                hover:shadow-lg hover:shadow-green-500/30 active:scale-[0.98]
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
                            <svg className="w-4 h-4 -ml-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>查找我的 LP NFT</span>
                        </>
                    )}
                </button>
            </div>
            {/* 钱包搜索历史 */}
            {walletSearchHistory.length > 0 && (
                <div className="pt-2 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            最近查找
                        </h3>
                        <button
                            onClick={handleClearWalletHistory}
                            className="text-xs text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
                        >
                            清除
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {walletSearchHistory.map((address) => (
                            <button
                                key={address}
                                onClick={() => setWalletAddress(address)}
                                className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800/80 text-xs text-neutral-700 dark:text-neutral-300 rounded-md hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 hover:text-neutral-900 dark:hover:text-white transition-all duration-200 font-mono"
                                title={address}
                            >
                                {formatAddress(address)}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {/* NFT 搜索结果 */}
            {nftSearchError && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <p className="text-center text-sm text-red-600 dark:text-red-400">{nftSearchError}</p>
                </div>
            )}
            {nftSearchResults.length > 0 && (
                <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 px-1">NFT 查找结果 ({nftSearchResults.length})</h3>
                    {nftSearchResults.map((result) => {
                        const resultPoolAddress = result.poolAddress;
                        const addedPool = getAddedPool(resultPoolAddress);
                        const poolExists = !!addedPool;

                        return (
                            <div key={result.poolAddress} className="bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 rounded-lg p-3 transition-shadow hover:shadow-md">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                                            {result.token0.symbol} / {result.token1.symbol}
                                        </div>
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                            {result.protocol.name} · Fee: {result.fee / 10000}%
                                        </div>
                                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 font-mono text-xs">
                                            <span className="font-sans text-neutral-500 dark:text-neutral-400">IDs:</span>
                                            {result.nftIds.map(id => {
                                                const isActive = poolExists && addedPool.nftId?.toString() === id.toString();
                                                if (isActive) {
                                                    return (
                                                        <span key={id} className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 font-medium">
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
                                                            className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-300 hover:bg-green-100 dark:hover:bg-green-500/20 hover:text-green-700 dark:hover:text-green-300 transition-colors font-medium"
                                                            title={`填充NFT ID: ${id}`}
                                                        >
                                                            #{id}
                                                        </button>
                                                    );
                                                }
                                                return (
                                                    <span key={id} className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
                                                        #{id}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {!poolExists ? (
                                            <button
                                                onClick={() => handleAddPool({
                                                    address: resultPoolAddress,
                                                    name: `${result.token0.symbol}/${result.token1.symbol}`,
                                                    nftId: result.nftIds?.[0],
                                                })}
                                                className="w-8 h-8 flex items-center justify-center rounded-md transition-all duration-200 bg-neutral-100 dark:bg-neutral-700/50 text-neutral-500 dark:text-neutral-300 hover:bg-green-500 hover:text-white"
                                                title="添加监控"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleRemovePool({ address: resultPoolAddress })}
                                                className="w-8 h-8 flex items-center justify-center rounded-md transition-all duration-200 bg-red-500/10 dark:bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white"
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
        </div>
    );
};

export default NftSearchSection; 