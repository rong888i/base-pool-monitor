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

    // Refs for positioning
    const quickRemoverRef = useRef(null);
    const quickEnhancerRef = useRef(null);
    const quickRemoverPopoverRef = useRef(null);
    const quickEnhancerPopoverRef = useRef(null);

    // 获取钱包信息
    const { account, connected } = useWallet();

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

    // 处理点击外部关闭弹窗
    useEffect(() => {
        if (!showQuickRemover && !showQuickEnhancer) return;

        function handleClickOutside(event) {
            if (showQuickRemover && quickRemoverPopoverRef.current && !quickRemoverPopoverRef.current.contains(event.target) &&
                quickRemoverRef.current && !quickRemoverRef.current.contains(event.target)) {
                closeQuickRemover();
            }
            if (showQuickEnhancer && quickEnhancerPopoverRef.current && !quickEnhancerPopoverRef.current.contains(event.target) &&
                quickEnhancerRef.current && !quickEnhancerRef.current.contains(event.target)) {
                closeQuickEnhancer();
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showQuickRemover, showQuickEnhancer]);

    if (!pool.lpInfo) return null;

    return (
        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">🎯 V3 NFT 查询</div>
                {nftId.trim() && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {isLoadingNft ? '🔄 刷新中' : '🔄 自动刷新'}
                    </div>
                )}
            </div>
            <div className="flex gap-2 mb-2 relative">
                <input
                    type="text"
                    placeholder="输入NFT ID"
                    value={nftId}
                    onChange={(e) => onNftIdChange(e.target.value)}
                    className="input-primary flex-1 text-xs pr-8"
                />
                {nftId && (
                    <button
                        onClick={clearNftInfo}
                        className="absolute right-[calc(4rem+1rem)] top-1/2 -translate-y-1/2 text-neutral-400 hover:text-error-500 transition-colors p-1 rounded-full"
                        data-tooltip-id="my-tooltip"
                        data-tooltip-content="清除"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                )}
                <button
                    onClick={fetchNftInfo}
                    disabled={!nftId.trim() || isLoadingNft}
                    className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed w-16"
                >
                    {isLoadingNft ? '...' : '查询'}
                </button>
            </div>

            {nftError && (
                <div className="bg-error-50 border border-error-200 text-error-700 px-3 py-2 rounded text-xs mb-2">
                    <strong>错误:</strong> {nftError}
                </div>
            )}

            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showNftPanel && nftInfo && nftInfo.isValid
                ? 'max-h-screen opacity-100 transform translate-y-0'
                : 'max-h-0 opacity-0 transform -translate-y-2'
                }`}>
                {nftInfo && nftInfo.isValid && (
                    <div className="mt-3 space-y-3">
                        {/* Price direction toggle */}
                        <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center">
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
                        <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">仓位详情</div>
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
                                        <div className="mt-2 space-y-1.5">
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
                                for (let tick = nftInfo.tickLower; tick <= nftInfo.tickUpper; tick += tickSpacing) {
                                    const markPriceRaw = calculatePriceFromTick(tick, pool.lpInfo.token0.decimals, pool.lpInfo.token1.decimals);
                                    const markPrice = showReversedPrice ? markPriceRaw : (1 / markPriceRaw);
                                    if (markPrice >= viewPriceLower && markPrice <= viewPriceUpper) {
                                        marks.push({
                                            position: priceToPercentage(markPrice),
                                            price: markPrice,
                                        });
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


                                        <div className={`mt-3 p-3 rounded-lg text-xs text-center font-medium ${nftInfo.isInRange
                                            ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300'
                                            : 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300'
                                            }`}>
                                            {nftInfo.isInRange
                                                ? <>
                                                    ✅ 价格 ${displayCurrentPrice.toPrecision(6)} 在范围内
                                                </>
                                                : (() => {
                                                    // 根据显示方向计算价格偏离百分比
                                                    const lowerPrice = showReversedPrice ? nftInfo.priceRange.lower : (1 / nftInfo.priceRange.upper);
                                                    const upperPrice = showReversedPrice ? nftInfo.priceRange.upper : (1 / nftInfo.priceRange.lower);

                                                    if (displayCurrentPrice < lowerPrice) {
                                                        return `⬇️ 价格低于下限 ${(((lowerPrice - displayCurrentPrice) / displayCurrentPrice) * 100).toFixed(1)}%`;
                                                    } else {
                                                        return `⬆️ 价格高于上限 ${(((displayCurrentPrice - upperPrice) / upperPrice) * 100).toFixed(1)}%`;
                                                    }
                                                })()
                                            }
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="mt-3 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 text-center">
                                <span>范围宽度: ±{(((nftInfo.priceRange.upper - nftInfo.priceRange.lower) / ((nftInfo.priceRange.upper + nftInfo.priceRange.lower) / 2)) * 100).toFixed(1)}%</span>
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