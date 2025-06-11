'use client';

import React from 'react';

const PoolInfo = ({ pool, outOfRangeCount }) => {
    if (!pool.lpInfo) return null;

    return (
        <>
            {/* 代币信息 - 包含余额 */}
            <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg">
                <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">💧 池子流动性</div>
                {/* 代币余额 */}
                <div className="flex items-center justify-around bg-white/60 dark:bg-black/10 p-2 rounded-lg text-sm font-mono mb-2">
                    <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-primary-700 dark:text-primary-400">{pool.lpInfo.token0.symbol}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{pool.lpInfo.token0.balance}</span>
                    </div>
                    <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-600"></div>
                    <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-success-700 dark:text-success-400">{pool.lpInfo.token1.symbol}</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{pool.lpInfo.token1.balance}</span>
                    </div>
                </div>
                {/* 池子倾斜度可视化 */}
                <div className="mt-2">
                    {(() => {
                        const token0Amount = Number(pool.lpInfo.token0.rawBalance) / Math.pow(10, pool.lpInfo.token0.decimals);
                        const token1Amount = Number(pool.lpInfo.token1.rawBalance) / Math.pow(10, pool.lpInfo.token1.decimals);
                        const token0Value = token0Amount;
                        const token1Value = token1Amount * pool.lpInfo.price.token0PerToken1;
                        const totalValue = token0Value + token1Value;
                        const percent0 = totalValue === 0 ? 50 : (token0Value / totalValue) * 100;
                        const percent1 = 100 - percent0;
                        if (totalValue === 0) {
                            return (
                                <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden"></div>
                            );
                        }
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
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* 价格信息 - 紧凑显示 */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg">
                <div className="text-xs text-neutral-700 dark:text-neutral-300 font-medium mb-2">💰 价格</div>
                <div className="flex items-center justify-around bg-white dark:bg-neutral-900 p-2 rounded-lg text-xs font-mono">
                    <div className="text-center">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{pool.lpInfo.price.token0PerToken1.toFixed(6)}</span>
                        <span className="font-semibold text-primary-700 dark:text-primary-400 mx-1">{pool.lpInfo.token0.symbol}</span>
                        <span className="text-neutral-500 dark:text-neutral-400">/</span>
                        <span className="font-semibold text-success-700 dark:text-success-400"> {pool.lpInfo.token1.symbol}</span>
                    </div>
                    <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700"></div>
                    <div className="text-center">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{pool.lpInfo.price.token1PerToken0.toFixed(6)}</span>
                        <span className="font-semibold text-success-700 dark:text-success-400 mx-1">{pool.lpInfo.token1.symbol}</span>
                        <span className="text-neutral-500 dark:text-neutral-400">/</span>
                        <span className="font-semibold text-primary-700 dark:text-primary-400"> {pool.lpInfo.token0.symbol}</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PoolInfo; 