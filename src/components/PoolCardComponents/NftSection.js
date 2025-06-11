'use client';

import { useState, useEffect } from 'react';
import { getNFTPositionInfo } from '../../utils/lpUtils';

// 计算价格在范围条中的位置百分比
const calculatePricePosition = (current, lower, upper) => {
    if (current <= lower) return 5; // 最左边，留一点边距
    if (current >= upper) return 95; // 最右边，留一点边距

    // 在范围内时，计算相对位置 (20% 到 80% 之间)
    const ratio = (current - lower) / (upper - lower);
    return 20 + (ratio * 60); // 20% 到 80% 的范围
};

const NftSection = ({ pool, nftId, onNftIdChange, onNftInfoUpdate }) => {
    const [nftInfo, setNftInfo] = useState(null);
    const [isLoadingNft, setIsLoadingNft] = useState(false);
    const [nftError, setNftError] = useState(null);
    const [showReversedPrice, setShowReversedPrice] = useState(false);
    const [showNftPanel, setShowNftPanel] = useState(false);

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
                        title="清除"
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
                        {/* ... (rest of the NFT panel JSX) ... */}
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
                                    <div className={`text-xs font-medium px-2 py-0.5 rounded-full border ${nftInfo.isInRange
                                        ? 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/30 dark:text-success-300 dark:border-success-700/50'
                                        : 'bg-error-50 text-error-700 border-error-200 dark:bg-error-900/30 dark:text-error-300 dark:border-error-700/50'
                                        }`}>
                                        {nftInfo.isInRange ? '范围内' : '范围外'}
                                    </div>

                                    {(() => {
                                        if (!nftInfo?.liquidity || !pool.lpInfo?.liquidity || BigInt(pool.lpInfo.liquidity) === 0n) {
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
                                                title={`仓位占比\nNFT 流动性: ${nftLiquidity.toString()}\n池子总流动性: ${totalLiquidity.toString()}`}
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
                                        <div className="mt-2 space-y-1.5">
                                            <div className="flex justify-between items-baseline bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg text-xs font-mono">
                                                <span className="text-primary-700 dark:text-primary-400 font-semibold">{pool.lpInfo.token0.symbol}</span>
                                                <div className="text-right">
                                                    <span className="text-neutral-800 dark:text-neutral-200 font-semibold">{nftInfo.positionLiquidity.formatted.token0}</span>
                                                    <span className="ml-2 text-success-600 dark:text-success-400" title="未领取手续费">
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
                                                    <span className="ml-2 text-success-600 dark:text-success-400" title="未领取手续费">
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
                            <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                                价格范围可视化 ({showReversedPrice ? `${pool.lpInfo.token1.symbol}/${pool.lpInfo.token0.symbol}` : `${pool.lpInfo.token0.symbol}/${pool.lpInfo.token1.symbol}`}):
                            </div>

                            <div className="flex justify-between text-xs font-medium px-1 mb-1">
                                <span className="w-1/3 text-center font-bold text-success-500">下限</span>
                                <span className="w-1/3 text-center font-bold text-neutral-500">中心</span>
                                <span className="w-1/3 text-center font-bold text-error-500">上限</span>
                            </div>

                            <div className="relative mb-3">
                                <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full relative overflow-hidden">
                                    <div
                                        className="absolute h-full bg-success-200 dark:bg-success-900/30 rounded-full"
                                        style={{
                                            left: '20%',
                                            width: '60%'
                                        }}
                                    ></div>
                                    <div className="absolute top-0 left-[50%] w-0.5 h-full bg-neutral-400 dark:bg-neutral-600 opacity-50"></div>
                                    <div
                                        className={`absolute top-0 w-1 h-full ${nftInfo.isInRange ? 'bg-success-500' : 'bg-error-500'} shadow-lg z-10`}
                                        style={{
                                            left: `${calculatePricePosition(
                                                showReversedPrice ? (1 / nftInfo.currentPrice) : nftInfo.currentPrice,
                                                showReversedPrice ? (1 / nftInfo.priceRange.upper) : nftInfo.priceRange.lower,
                                                showReversedPrice ? (1 / nftInfo.priceRange.lower) : nftInfo.priceRange.upper
                                            )}%`,
                                            transform: 'translateX(-50%)'
                                        }}
                                    ></div>
                                    <div className="absolute top-0 left-[20%] w-0.5 h-full bg-success-500"></div>
                                    <div className="absolute top-0 left-[80%] w-0.5 h-full bg-error-500"></div>
                                </div>
                                <div className="flex justify-between text-xs font-mono px-1 mt-1">
                                    <span className="w-1/3 text-center font-mono font-bold text-xs !text-success-500">
                                        {showReversedPrice
                                            ? (1 / nftInfo.priceRange.upper).toFixed(6)
                                            : nftInfo.priceRange.lower.toFixed(6)
                                        }
                                    </span>
                                    <span className="w-1/3 text-center font-mono font-bold text-xs text-neutral-500">
                                        {showReversedPrice
                                            ? (1 / ((nftInfo.priceRange.upper + nftInfo.priceRange.lower) / 2)).toFixed(6)
                                            : ((nftInfo.priceRange.upper + nftInfo.priceRange.lower) / 2).toFixed(6)
                                        }
                                    </span>
                                    <span className="w-1/3 text-center font-mono font-bold text-xs text-error-500">
                                        {showReversedPrice
                                            ? (1 / nftInfo.priceRange.lower).toFixed(6)
                                            : nftInfo.priceRange.upper.toFixed(6)
                                        }
                                    </span>
                                </div>
                                <div className="text-center mt-3">
                                    <span className={`text-xs font-medium ${nftInfo.isInRange ? 'text-success-500' : 'text-error-500'}`}>
                                        {nftInfo.isInRange
                                            ? `✅ 当前价格 ${showReversedPrice ? (1 / nftInfo.currentPrice).toFixed(6) : nftInfo.currentPrice.toFixed(6)} 在范围内`
                                            : `❌ 当前价格 ${showReversedPrice ? (1 / nftInfo.currentPrice).toFixed(6) : nftInfo.currentPrice.toFixed(6)} 超出范围`
                                        }
                                    </span>
                                </div>
                            </div>

                            <div className={`mt-3 p-3 rounded-lg text-xs text-center font-medium ${nftInfo.isInRange
                                ? 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300'
                                : 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300'
                                }`}>
                                {nftInfo.isInRange
                                    ? <>
                                        🎯 价格在范围内，正在赚取手续费
                                    </>
                                    : nftInfo.currentPrice < nftInfo.priceRange.lower
                                        ? `⬇️ 价格低于下限 ${(((nftInfo.priceRange.lower - nftInfo.currentPrice) / nftInfo.currentPrice) * 100).toFixed(1)}%`
                                        : `⬆️ 价格高于上限 ${(((nftInfo.currentPrice - nftInfo.priceRange.upper) / nftInfo.priceRange.upper) * 100).toFixed(1)}%`
                                }
                            </div>
                            <div className="mt-3 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 text-center">
                                <span>范围宽度: ±{(((nftInfo.priceRange.upper - nftInfo.priceRange.lower) / ((nftInfo.priceRange.upper + nftInfo.priceRange.lower) / 2)) * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NftSection; 