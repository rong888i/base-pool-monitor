'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/providers/WalletProvider';
import { getNFTPositionInfo, getTickSpacing, calculatePriceFromTick } from '../../utils/lpUtils';
import QuickLiquidityRemover from './QuickLiquidityRemover';
import QuickLiquidityEnhancer from './QuickLiquidityEnhancer';

const NftSection = ({ pool, nftId, onNftIdChange, onNftInfoUpdate }) => {
    const [nftInfo, setNftInfo] = useState(null);
    const [isLoadingNft, setIsLoadingNft] = useState(false);
    const [nftError, setNftError] = useState(null);
    const [showReversedPrice, setShowReversedPrice] = useState(false);
    const [showNftPanel, setShowNftPanel] = useState(false);

    // 快速操作弹窗状态
    const [showQuickRemover, setShowQuickRemover] = useState(false);
    const [showQuickEnhancer, setShowQuickEnhancer] = useState(false);
    const [quickRemoverPosition, setQuickRemoverPosition] = useState({ top: 0, left: 0 });
    const [quickEnhancerPosition, setQuickEnhancerPosition] = useState({ top: 0, left: 0 });
    const [isQuickRemoverVisible, setIsQuickRemoverVisible] = useState(false);
    const [isQuickEnhancerVisible, setIsQuickEnhancerVisible] = useState(false);

    // 历史记录状态
    const [nftHistory, setNftHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);

    // Refs for positioning
    const quickRemoverRef = useRef(null);
    const quickEnhancerRef = useRef(null);
    const quickRemoverPopoverRef = useRef(null);
    const quickEnhancerPopoverRef = useRef(null);
    const inputRef = useRef(null);
    const historyRef = useRef(null);

    // 获取钱包信息
    const { account, connected } = useWallet();

    // 初始化历史记录
    useEffect(() => {
        const savedHistory = localStorage.getItem('nft-id-history');
        if (savedHistory) {
            try {
                const history = JSON.parse(savedHistory);
                setNftHistory(Array.isArray(history) ? history.slice(0, 5) : []);
            } catch (error) {
                console.warn('Failed to parse NFT history:', error);
                setNftHistory([]);
            }
        }
    }, []);

    // 保存NFT ID到历史记录
    const saveToHistory = (nftIdValue) => {
        if (!nftIdValue.trim()) return;

        setNftHistory(prevHistory => {
            // 移除重复项并添加到开头
            const newHistory = [nftIdValue, ...prevHistory.filter(id => id !== nftIdValue)].slice(0, 5);
            // 保存到localStorage
            localStorage.setItem('nft-id-history', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    // 获取NFT信息
    const fetchNftInfo = async () => {
        if (!nftId.trim() || !pool.lpInfo) return;

        setIsLoadingNft(true);
        setNftError(null);

        try {
            const info = await getNFTPositionInfo(nftId.trim(), pool.address, pool.lpInfo);

            if (info.isValid) {
                setNftInfo(info);
                setShowNftPanel(true);
                setNftError(null);
                // 查询成功时保存到历史记录
                saveToHistory(nftId.trim());
                if (onNftInfoUpdate) {
                    onNftInfoUpdate(info);
                }
            } else {
                setNftError(info.error || 'NFT信息无效');
                setNftInfo(null);
                setShowNftPanel(false);
            }
        } catch (error) {
            setNftError(error.message);
            setNftInfo(null);
            setShowNftPanel(false);
        } finally {
            setIsLoadingNft(false);
        }
    };

    // 当池子信息更新时，如果有NFT ID，自动刷新NFT信息
    useEffect(() => {
        if (pool.lpInfo && nftId.trim() && !pool.isLoading && !pool.error && !isLoadingNft) {
            const timer = setTimeout(() => {
                fetchNftInfo();
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [pool.lpInfo?.lastUpdated, nftId]);

    // 监听NFT ID变化，如果被清空则隐藏面板
    useEffect(() => {
        if (!nftId.trim()) {
            setShowNftPanel(false);
            setTimeout(() => {
                setNftInfo(null);
                setNftError(null);
            }, 500); // 与动画持续时间一致
        }
    }, [nftId]);

    const clearNftInfo = () => {
        setShowNftPanel(false); // 先触发关闭动画
        setTimeout(() => {
            onNftIdChange('');
            setNftInfo(null);
            setNftError(null);
        }, 500); // 与动画持续时间一致
    };

    // 检查当前用户是否是NFT的所有者
    const isNftOwner = () => {
        if (!connected || !account || !nftInfo || !nftInfo.owner) {
            return false;
        }
        return account.toLowerCase() === nftInfo.owner.toLowerCase();
    };

    // 快速移除流动性相关函数
    const openQuickRemover = () => {
        if (quickRemoverRef.current) {
            const rect = quickRemoverRef.current.getBoundingClientRect();
            const popoverWidth = 384;
            let left = rect.right + 12;
            if (left + popoverWidth > window.innerWidth - 20) {
                left = rect.left - popoverWidth - 12;
            }

            const availableHeight = window.innerHeight - rect.top - 20;

            setQuickRemoverPosition({
                top: rect.top,
                left: left,
                maxHeight: availableHeight
            });
            setShowQuickRemover(true);
        }
    };

    const closeQuickRemover = () => {
        setIsQuickRemoverVisible(false);
        setTimeout(() => {
            setShowQuickRemover(false);
        }, 300);
    };

    // 快速增加流动性相关函数
    const openQuickEnhancer = () => {
        if (quickEnhancerRef.current) {
            const rect = quickEnhancerRef.current.getBoundingClientRect();
            const popoverWidth = 384;
            let left = rect.right + 12;
            if (left + popoverWidth > window.innerWidth - 20) {
                left = rect.left - popoverWidth - 12;
            }

            const availableHeight = window.innerHeight - rect.top - 20;

            setQuickEnhancerPosition({
                top: rect.top,
                left: left,
                maxHeight: availableHeight
            });
            setShowQuickEnhancer(true);
        }
    };

    const closeQuickEnhancer = () => {
        setIsQuickEnhancerVisible(false);
        setTimeout(() => {
            setShowQuickEnhancer(false);
        }, 300);
    };

    // 处理弹窗显示动画
    useEffect(() => {
        if (showQuickRemover) {
            const timer = setTimeout(() => {
                setIsQuickRemoverVisible(true);
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [showQuickRemover]);

    useEffect(() => {
        if (showQuickEnhancer) {
            const timer = setTimeout(() => {
                setIsQuickEnhancerVisible(true);
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [showQuickEnhancer]);

    // 处理点击外部关闭弹窗和历史记录
    useEffect(() => {
        if (!showQuickRemover && !showQuickEnhancer && !showHistory) return;

        function handleClickOutside(event) {
            if (showQuickRemover && quickRemoverPopoverRef.current && !quickRemoverPopoverRef.current.contains(event.target) &&
                quickRemoverRef.current && !quickRemoverRef.current.contains(event.target)) {
                closeQuickRemover();
            }
            if (showQuickEnhancer && quickEnhancerPopoverRef.current && !quickEnhancerPopoverRef.current.contains(event.target) &&
                quickEnhancerRef.current && !quickEnhancerRef.current.contains(event.target)) {
                closeQuickEnhancer();
            }
            if (showHistory && historyRef.current && !historyRef.current.contains(event.target) &&
                inputRef.current && !inputRef.current.contains(event.target)) {
                setShowHistory(false);
                setIsInputFocused(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showQuickRemover, showQuickEnhancer, showHistory]);

    // 处理输入框焦点
    const handleInputFocus = () => {
        setIsInputFocused(true);
        if (nftHistory.length > 0) {
            setShowHistory(true);
        }
    };

    const handleInputBlur = () => {
        // 延迟失焦，以便点击历史记录项
        setTimeout(() => {
            if (!showHistory) {
                setIsInputFocused(false);
            }
        }, 150);
    };

    // 选择历史记录项
    const selectHistoryItem = (historyId) => {
        onNftIdChange(historyId);
        setShowHistory(false);
        setIsInputFocused(false);
        if (inputRef.current) {
            inputRef.current.blur();
        }
    };

    if (!pool.lpInfo) return null;

    return (
        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">🎯 V3 NFT 查询</div>
                {nftId.trim() && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {isLoadingNft ? '🔄 刷新中' : '🔄 自动刷新'}
                    </div>
                )}
            </div>
            <div className="flex gap-2 mb-1.5 relative">
                <div className="relative flex-1">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="输入NFT ID"
                        value={nftId}
                        onChange={(e) => onNftIdChange(e.target.value)}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        className="input-primary w-full text-xs pr-8"
                    />
                    {nftId && (
                        <button
                            onClick={clearNftInfo}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-error-500 transition-colors p-1 rounded-full"
                            data-tooltip-id="my-tooltip"
                            data-tooltip-content="清除"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    )}

                    {/* 历史记录下拉列表 */}
                    {showHistory && nftHistory.length > 0 && (
                        <div
                            ref={historyRef}
                            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto"
                        >
                            <div className="p-1">
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 px-2 py-1 border-b border-neutral-100 dark:border-neutral-700">
                                    历史记录
                                </div>
                                {nftHistory.map((historyId, index) => (
                                    <button
                                        key={index}
                                        onClick={() => selectHistoryItem(historyId)}
                                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors text-neutral-700 dark:text-neutral-300 font-mono"
                                    >
                                        {historyId}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <button
                    onClick={fetchNftInfo}
                    disabled={!nftId.trim() || isLoadingNft}
                    className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed w-16"
                >
                    {isLoadingNft ? '...' : '查询'}
                </button>
            </div>

            {nftError && (
                <div className="bg-error-50 border border-error-200 text-error-700 px-2.5 py-1.5 rounded text-xs mb-1.5">
                    <strong>错误:</strong> {nftError}
                </div>
            )}

            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showNftPanel && nftInfo && nftInfo.isValid
                ? 'max-h-screen opacity-100 transform translate-y-0'
                : 'max-h-0 opacity-0 transform -translate-y-2'
                }`}>
                {nftInfo && nftInfo.isValid && (
                    <div className="mt-2 space-y-2.5">
                        {/* Price direction toggle */}
                        <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center">
                            <div className="flex items-center justify-between w-full">
                                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">价格显示方向:</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowReversedPrice(false)}
                                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${!showReversedPrice
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                            }`}
                                    >
                                        {pool.lpInfo.token0.symbol}/{pool.lpInfo.token1.symbol}
                                    </button>
                                    <button
                                        onClick={() => setShowReversedPrice(true)}
                                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${showReversedPrice
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                            }`}
                                    >
                                        {pool.lpInfo.token1.symbol}/{pool.lpInfo.token0.symbol}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Position Details */}
                        <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">仓位详情</div>
                                    {nftInfo?.owner && (
                                        <button
                                            onClick={() => window.open(`https://bscscan.com/address/${nftInfo.owner}`, '_blank')}
                                            className="flex text-xs font-mono px-2 py-0.5 rounded-full border
                                                 bg-neutral-50 text-neutral-600 border-neutral-200
                                                 dark:bg-neutral-800/50 dark:text-neutral-400 dark:border-neutral-600
                                                 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-300
                                                 dark:hover:bg-primary-900/20 dark:hover:text-primary-300 dark:hover:border-primary-600
                                                 transition-all duration-200 items-center gap-1
                                                 hover:scale-[1.02] active:scale-[0.98]"
                                            data-tooltip-id="my-tooltip"
                                            data-tooltip-content={`NFT 所有者: ${nftInfo.owner}`}
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <span className="hidden md:inline">{nftInfo.owner.slice(-4)}</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* 快速操作按钮 - 仅当用户是NFT所有者时显示 */}
                                    {isNftOwner() && (
                                        <>
                                            <button
                                                ref={quickEnhancerRef}
                                                onClick={openQuickEnhancer}
                                                className="text-xs font-medium px-2 py-0.5 rounded-full border 
                                                    bg-green-50 text-green-700 border-green-200 
                                                    dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50
                                                    hover:bg-green-100 hover:border-green-300 
                                                    dark:hover:bg-green-800/30 dark:hover:border-green-600
                                                    transition-all duration-200 flex items-center gap-1
                                                    hover:scale-[1.05] active:scale-[0.95]"
                                                data-tooltip-id="my-tooltip"
                                                data-tooltip-content="快速增加流动性"
                                            >
                                                {/* <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg> */}
                                                &nbsp;+&nbsp;
                                            </button>
                                            <button
                                                ref={quickRemoverRef}
                                                onClick={openQuickRemover}
                                                className="text-xs font-medium px-2 py-0.5 rounded-full border 
                                                    bg-red-50 text-red-700 border-red-200 
                                                    dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50
                                                    hover:bg-red-100 hover:border-red-300 
                                                    dark:hover:bg-red-800/30 dark:hover:border-red-600
                                                    transition-all duration-200 flex items-center gap-1
                                                    hover:scale-[1.05] active:scale-[0.95]"
                                                data-tooltip-id="my-tooltip"
                                                data-tooltip-content="快速移除流动性"
                                            >
                                                {/* <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
                                                </svg> */}
                                                &nbsp;-&nbsp;
                                            </button>
                                        </>
                                    )}

                                    <div className={`text-xs font-medium px-2 py-0.5 rounded-full border ${nftInfo.isInRange
                                        ? 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/30 dark:text-success-300 dark:border-success-700/50'
                                        : 'bg-error-50 text-error-700 border-error-200 dark:bg-error-900/30 dark:text-error-300 dark:border-error-700/50'
                                        }`}>
                                        {nftInfo.isInRange ? '范围内' : '范围外'}
                                    </div>

                                    {(() => {
                                        if (!nftInfo.isInRange || !nftInfo?.liquidity || !pool.lpInfo?.liquidity || BigInt(pool.lpInfo.liquidity) === 0n) {
                                            return null;
                                        }
                                        const totalLiquidity = BigInt(pool.lpInfo.liquidity);
                                        const nftLiquidity = BigInt(nftInfo.liquidity);

                                        const basisPoints = (nftLiquidity * 10000n) / totalLiquidity;
                                        const percentage = Number(basisPoints) / 100;

                                        let displayPercentage;
                                        if (percentage < 0.01 && percentage > 0) {
                                            displayPercentage = '< 0.01%';
                                        } else {
                                            displayPercentage = `${percentage.toFixed(2)}%`;
                                        }

                                        let colorClass = 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'; // 默认: 虾米
                                        if (percentage >= 10) { // 巨鲸
                                            colorClass = 'bg-error-50 text-error-700 border-error-200 dark:bg-error-500/10 dark:text-error-400 dark:border-error-500/30';
                                        } else if (percentage >= 1) { // 海豚
                                            colorClass = 'bg-warning-50 text-warning-700 border-warning-500/30 dark:bg-warning-700/20 dark:text-warning-500 dark:border-warning-700/30';
                                        } else if (percentage >= 0.1) { // 鱼
                                            colorClass = 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-500/10 dark:text-primary-400 dark:border-primary-500/30';
                                        }

                                        return (
                                            <div
                                                className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full border ${colorClass}`}
                                                data-tooltip-id="my-tooltip"
                                                data-tooltip-html={`仓位占比<br/>NFT 流动性: ${nftLiquidity.toString()}<br/>池子总流动性: ${totalLiquidity.toString()}`}
                                            >
                                                {displayPercentage}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            {(() => {
                                if (!nftInfo.positionLiquidity || !nftInfo.hasLiquidity) {
                                    return (
                                        <div className="text-center text-xs text-neutral-500 dark:text-neutral-400 py-2">
                                            仓位中没有流动性
                                        </div>
                                    );
                                }

                                const token0Amount = Number(nftInfo.positionLiquidity.raw.token0) / (10 ** pool.lpInfo.token0.decimals);
                                const token1Amount = Number(nftInfo.positionLiquidity.raw.token1) / (10 ** pool.lpInfo.token1.decimals);

                                const token0Value = token0Amount;
                                const token1Value = token1Amount * pool.lpInfo.price.token0PerToken1;
                                const totalValue = token0Value + token1Value;

                                const percent0 = totalValue === 0 ? 50 : (token0Value / totalValue) * 100;
                                const percent1 = 100 - percent0;

                                return (
                                    <>
                                        <div
                                            data-tooltip-id="my-tooltip"
                                            data-tooltip-content={`${pool.lpInfo.token0.symbol}: ${percent0.toFixed(2)}% / ${pool.lpInfo.token1.symbol}: ${percent1.toFixed(2)}%`}
                                        >
                                            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden flex">
                                                <div
                                                    className="h-full bg-primary-500 transition-all duration-300"
                                                    style={{ width: `${percent0}%`, minWidth: percent0 > 0 ? '4px' : '0' }}
                                                ></div>
                                                <div
                                                    className="h-full bg-success-500 transition-all duration-300"
                                                    style={{ width: `${percent1}%`, minWidth: percent1 > 0 ? '4px' : '0' }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="mt-1.5 space-y-1.5">
                                            <div className="flex justify-between items-baseline bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg text-xs font-mono">
                                                <span className="text-primary-700 dark:text-primary-400 font-semibold">{pool.lpInfo.token0.symbol}</span>
                                                <div className="text-right">
                                                    <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{nftInfo.positionLiquidity.formatted.token0}</span>
                                                    <span
                                                        className="ml-2 text-success-600 dark:text-success-400"
                                                        data-tooltip-id="my-tooltip"
                                                        data-tooltip-content="未领取手续费"
                                                    >
                                                        {(() => {
                                                            const fee = nftInfo.fees?.collectable?.token0;
                                                            const decimals = pool.lpInfo.token0.decimals;
                                                            if (!fee || fee === '0') return '(+0.00)';
                                                            const amount = Number(fee) / (10 ** decimals);
                                                            const formattedAmount = amount < 0.000001 ? amount.toExponential(2) : amount.toFixed(6);
                                                            return `(+${formattedAmount})`;
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-baseline bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg text-xs font-mono">
                                                <span className="text-success-700 dark:text-success-400 font-semibold">{pool.lpInfo.token1.symbol}</span>
                                                <div className="text-right">
                                                    <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{nftInfo.positionLiquidity.formatted.token1}</span>
                                                    <span
                                                        className="ml-2 text-success-600 dark:text-success-400"
                                                        data-tooltip-id="my-tooltip"
                                                        data-tooltip-content="未领取手续费"
                                                    >
                                                        {(() => {
                                                            const fee = nftInfo.fees?.collectable?.token1;
                                                            const decimals = pool.lpInfo.token1.decimals;
                                                            if (!fee || fee === '0') return '(+0.00)';
                                                            const amount = Number(fee) / (10 ** decimals);
                                                            const formattedAmount = amount < 0.000001 ? amount.toExponential(2) : amount.toFixed(6);
                                                            return `(+${formattedAmount})`;
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Price Range Visualizer */}
                        <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                            {(() => {
                                // Base prices are always token1/token0 from getNFTPositionInfo
                                const nftPriceLower_1_per_0 = nftInfo.priceRange.lower;
                                const nftPriceUpper_1_per_0 = nftInfo.priceRange.upper;
                                const currentPrice_1_per_0 = nftInfo.currentPrice;

                                // Determine display prices based on toggle
                                const displayPriceLower = showReversedPrice ? nftPriceLower_1_per_0 : (1 / nftPriceUpper_1_per_0);
                                const displayPriceUpper = showReversedPrice ? nftPriceUpper_1_per_0 : (1 / nftPriceLower_1_per_0);
                                const displayCurrentPrice = showReversedPrice ? currentPrice_1_per_0 : (1 / currentPrice_1_per_0);

                                const displayRange = displayPriceUpper - displayPriceLower;
                                if (displayRange <= 0) return null;

                                // Define view window with padding
                                const padding = displayRange * 0.20;
                                const viewPriceLower = displayPriceLower - padding;
                                const viewPriceUpper = displayPriceUpper + padding;
                                const viewRange = viewPriceUpper - viewPriceLower;

                                const tickSpacing = getTickSpacing(pool.lpInfo.fee);
                                const numTicks = (nftInfo.tickUpper - nftInfo.tickLower) / tickSpacing;

                                const priceToPercentage = (price) => {
                                    if (viewRange <= 0) return 50;
                                    const rawPercent = ((price - viewPriceLower) / viewRange) * 100;
                                    return Math.max(0, Math.min(100, rawPercent));
                                };

                                const lowerBoundPos = priceToPercentage(displayPriceLower);
                                const upperBoundPos = priceToPercentage(displayPriceUpper);
                                const currentPricePos = priceToPercentage(displayCurrentPrice);
                                const centerPrice = (displayPriceLower + displayPriceUpper) / 2;
                                const centerPos = priceToPercentage(centerPrice);

                                const marks = [];
                                const totalTicks = Math.floor((nftInfo.tickUpper - nftInfo.tickLower) / tickSpacing) + 1;
                                const maxMarks = 25;

                                // 先收集所有有效的刻度
                                const allValidMarks = [];
                                for (let tick = nftInfo.tickLower; tick <= nftInfo.tickUpper; tick += tickSpacing) {
                                    const markPriceRaw = calculatePriceFromTick(tick, pool.lpInfo.token0.decimals, pool.lpInfo.token1.decimals);
                                    const markPrice = showReversedPrice ? markPriceRaw : (1 / markPriceRaw);
                                    if (markPrice >= viewPriceLower && markPrice <= viewPriceUpper) {
                                        allValidMarks.push({
                                            tick,
                                            position: priceToPercentage(markPrice),
                                            price: markPrice,
                                        });
                                    }
                                }

                                // 如果有效刻度数量少于等于最大显示数量，显示所有
                                if (allValidMarks.length <= maxMarks) {
                                    marks.push(...allValidMarks);
                                } else {
                                    // 否则按比例选择刻度显示
                                    const step = Math.ceil(allValidMarks.length / maxMarks);
                                    for (let i = 0; i < allValidMarks.length; i += step) {
                                        marks.push(allValidMarks[i]);
                                    }
                                    // 确保最后一个刻度也被包含
                                    if (marks[marks.length - 1] !== allValidMarks[allValidMarks.length - 1]) {
                                        marks.push(allValidMarks[allValidMarks.length - 1]);
                                    }
                                }

                                return (
                                    <div>
                                        <div
                                            className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2"
                                            data-tooltip-id="my-tooltip"
                                            data-tooltip-content={`价格范围 tickLower: ${nftInfo.tickLower}, tickUpper: ${nftInfo.tickUpper}, tickSpacing: ${tickSpacing}`}
                                        >
                                            价格范围可视化 ({showReversedPrice ? `${pool.lpInfo.token1.symbol}/${pool.lpInfo.token0.symbol}` : `${pool.lpInfo.token0.symbol}/${pool.lpInfo.token1.symbol}`} {numTicks}格):
                                        </div>
                                        <div className="relative h-5 text-xs font-medium px-1 mb-1">
                                            <div style={{ position: 'absolute', left: `${lowerBoundPos}%`, transform: 'translateX(-50%)' }} className="font-bold text-success-500">下限</div>
                                            <div style={{ position: 'absolute', left: `${centerPos}%`, transform: 'translateX(-50%)' }} className="font-bold text-neutral-500">中心</div>
                                            <div style={{ position: 'absolute', left: `${upperBoundPos}%`, transform: 'translateX(-50%)' }} className="font-bold text-error-500">上限</div>
                                        </div>

                                        <div className="relative h-6">
                                            <div className="h-full bg-neutral-200 dark:bg-neutral-700 rounded-full relative">
                                                <div className="absolute h-full bg-success-200 dark:bg-success-900/30" style={{ left: `${lowerBoundPos}%`, width: `${upperBoundPos - lowerBoundPos}%` }}></div>

                                                {/* Intermediate Ticks */}
                                                {marks.map((mark, i) => (
                                                    <div
                                                        key={i}
                                                        className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-neutral-400 dark:bg-neutral-500 opacity-50"
                                                        style={{ left: `${mark.position}%`, transform: 'translateX(-50%)' }}
                                                        data-tooltip-id="my-tooltip"
                                                        data-tooltip-content={`${mark.price.toPrecision(6)}`}
                                                    ></div>
                                                ))}

                                                {/* Major lines */}
                                                <div className="absolute top-0 w-0.5 h-full bg-success-500" style={{ left: `${lowerBoundPos}%`, transform: 'translateX(-50%)' }}></div>
                                                <div className="absolute top-0 w-0.5 h-full bg-neutral-500" style={{ left: `${centerPos}%`, transform: 'translateX(-50%)' }}></div>
                                                <div className="absolute top-0 w-0.5 h-full bg-error-500" style={{ left: `${upperBoundPos}%`, transform: 'translateX(-50%)' }}></div>

                                                {/* Current price line with boundary clamping */}
                                                <div
                                                    className={`absolute top-0 w-1 h-full ${nftInfo.isInRange ? 'bg-green-500' : 'bg-red-500'} shadow-lg z-10`}
                                                    style={{
                                                        left: `${Math.max(7, Math.min(93, currentPricePos))}%`,
                                                        transform: 'translateX(-50%)'
                                                    }}
                                                    data-tooltip-id="my-tooltip"
                                                    data-tooltip-content={`当前价格: ${displayCurrentPrice.toPrecision(6)}`}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="relative h-5 text-xs font-mono px-1 mt-1">
                                            <div style={{ position: 'absolute', left: `${lowerBoundPos}%`, transform: 'translateX(-50%)' }} className="font-bold text-success-500">{displayPriceLower.toPrecision(6)}</div>
                                            <div style={{ position: 'absolute', left: `${centerPos}%`, transform: 'translateX(-50%)' }} className="font-bold text-neutral-500">{centerPrice.toPrecision(6)}</div>
                                            <div style={{ position: 'absolute', left: `${upperBoundPos}%`, transform: 'translateX(-50%)' }} className="font-bold text-error-500">{displayPriceUpper.toPrecision(6)}</div>
                                        </div>

                                        {(() => {
                                            const currentTick = pool.lpInfo.tick;
                                            const currentGridTickLower = Math.floor(currentTick / tickSpacing) * tickSpacing;
                                            const currentGridTickUpper = currentGridTickLower + tickSpacing;

                                            const gridPriceLowerRaw = calculatePriceFromTick(currentGridTickLower, pool.lpInfo.token0.decimals, pool.lpInfo.token1.decimals);
                                            const gridPriceUpperRaw = calculatePriceFromTick(currentGridTickUpper, pool.lpInfo.token0.decimals, pool.lpInfo.token1.decimals);

                                            const gridDisplayPriceLower = showReversedPrice ? gridPriceLowerRaw : (1 / gridPriceUpperRaw);
                                            const gridDisplayPriceUpper = showReversedPrice ? gridPriceUpperRaw : (1 / gridPriceLowerRaw);

                                            const gridIndex = (!showReversedPrice
                                                ? Math.floor(((nftInfo.tickUpper - currentTick) - 1) / tickSpacing)
                                                : Math.floor((currentTick - nftInfo.tickLower) / tickSpacing)) + 1;

                                            return (
                                                <div className="mt-3 p-2 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg text-xs text-center text-neutral-600 dark:text-neutral-400">
                                                    {nftInfo.isInRange ? (
                                                        <span>
                                                            当前位于第 {gridIndex} 格 (共 {numTicks} 格)
                                                        </span>
                                                    ) : (
                                                        <span>当前池子价格已超出您的仓位范围</span>
                                                    )}
                                                    {/* <span>当前 tick ({currentTick}) 所在的价格区间:</span><br /> */}
                                                    <div className="mt-1 text-neutral-800 dark:text-neutral-200">
                                                        <span>{gridDisplayPriceLower.toPrecision(6)} - {gridDisplayPriceUpper.toPrecision(6)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className={`mt-3 p-3 rounded-lg text-xs text-center font-medium ${nftInfo.isInRange
                                            ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300'
                                            : 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300'
                                            }`}>
                                            {nftInfo.isInRange
                                                ? <>
                                                    ✅ 价格 {displayCurrentPrice.toPrecision(6)} 在范围内
                                                </>
                                                : (() => {
                                                    // 根据显示方向计算价格偏离百分比
                                                    const lowerPrice = showReversedPrice ? nftInfo.priceRange.lower : (1 / nftInfo.priceRange.upper);
                                                    const upperPrice = showReversedPrice ? nftInfo.priceRange.upper : (1 / nftInfo.priceRange.lower);

                                                    if (displayCurrentPrice < lowerPrice) {
                                                        return `⬇️ 价格 ${displayCurrentPrice.toPrecision(6)} 低于下限 ${(((lowerPrice - displayCurrentPrice) / displayCurrentPrice) * 100).toFixed(3)}%`;
                                                    } else {
                                                        return `⬆️ 价格 ${displayCurrentPrice.toPrecision(6)} 高于上限 ${(((displayCurrentPrice - upperPrice) / upperPrice) * 100).toFixed(3)}%`;
                                                    }
                                                })()
                                            }
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="mt-3 p-2 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg text-xs text-center text-neutral-600 dark:text-neutral-400r">
                                <div className="text-neutral-800 dark:text-neutral-200">
                                    <span>范围宽度: ±{(((nftInfo.priceRange.upper - nftInfo.priceRange.lower) / ((nftInfo.priceRange.upper + nftInfo.priceRange.lower) / 2)) * 100).toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 快速移除流动性弹窗 */}
            {showQuickRemover && nftInfo && nftInfo.isValid && pool.lpInfo && (
                <QuickLiquidityRemover
                    poolInfo={pool.lpInfo}
                    nftInfo={nftInfo}
                    position={quickRemoverPosition}
                    isVisible={isQuickRemoverVisible}
                    onClose={closeQuickRemover}
                    popoverRef={quickRemoverPopoverRef}
                />
            )}

            {/* 快速增加流动性弹窗 */}
            {showQuickEnhancer && nftInfo && nftInfo.isValid && pool.lpInfo && (
                <QuickLiquidityEnhancer
                    poolInfo={pool.lpInfo}
                    nftInfo={nftInfo}
                    position={quickEnhancerPosition}
                    isVisible={isQuickEnhancerVisible}
                    onClose={closeQuickEnhancer}
                    popoverRef={quickEnhancerPopoverRef}
                />
            )}
        </div>
    );
};

export default NftSection; 