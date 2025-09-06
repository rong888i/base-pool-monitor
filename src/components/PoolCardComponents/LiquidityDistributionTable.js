import React, { useState, useEffect } from 'react';
import { getTickLiquidityDataSimple, calculatePriceFromTick, getTickSpacing } from '../../utils/lpUtils';

const LiquidityDistributionTable = ({ pool }) => {
    const [liquidityData, setLiquidityData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLiquidityData = async () => {
            if (!pool?.lpInfo?.poolAddress || !pool?.lpInfo?.tick) {
                setError('池子信息不完整');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const tickSpacing = getTickSpacing(pool.lpInfo.fee);
                const currentTick = Number(pool.lpInfo.tick);
                
                // 获取前后5个tick的数据（简化版）
                const range = 5;
                const tickData = await getTickLiquidityDataSimple(
                    pool.lpInfo.poolAddress,
                    currentTick,
                    tickSpacing,
                    range,
                    pool.lpInfo.token0.decimals,
                    pool.lpInfo.token1.decimals
                );

                // 转换为表格数据
                const formattedData = tickData.map(tick => {
                    const price = calculatePriceFromTick(
                        tick.tick,
                        pool.lpInfo.token0.decimals,
                        pool.lpInfo.token1.decimals
                    );
                    
                    const isCurrentTick = Math.abs(tick.tick - currentTick) < tickSpacing;
                    const liquidityValue = Number(tick.liquidityGross);
                    
                    // 简单的流动性格式化
                    const formatLiquidity = (value) => {
                        if (value === 0) return '0';
                        if (value < 1e6) return (value / 1e3).toFixed(0) + 'K';
                        if (value < 1e9) return (value / 1e6).toFixed(1) + 'M';
                        if (value < 1e12) return (value / 1e9).toFixed(1) + 'B';
                        return value.toExponential(1);
                    };

                    return {
                        tick: tick.tick,
                        price: price.toFixed(6),
                        liquidity: formatLiquidity(liquidityValue),
                        isActive: isCurrentTick,
                        hasLiquidity: liquidityValue > 0
                    };
                });

                setLiquidityData(formattedData);
            } catch (err) {
                console.error('获取流动性数据失败:', err);
                setError('获取数据失败');
            } finally {
                setLoading(false);
            }
        };

        fetchLiquidityData();
    }, [pool]);

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-2"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-2"></div>
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-2">
                {error}
            </div>
        );
    }

    if (liquidityData.length === 0) {
        return (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-2">
                暂无流动性数据
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                流动性分布（当前价格附近）
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                            <th className="text-left py-1 px-2 text-neutral-600 dark:text-neutral-400 font-medium">
                                价格
                            </th>
                            <th className="text-right py-1 px-2 text-neutral-600 dark:text-neutral-400 font-medium">
                                流动性
                            </th>
                            <th className="text-center py-1 px-2 text-neutral-600 dark:text-neutral-400 font-medium">
                                状态
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {liquidityData.map((item, index) => (
                            <tr 
                                key={index}
                                className={`
                                    border-b border-neutral-100 dark:border-neutral-800
                                    ${item.isActive ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
                                    hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors
                                `}
                            >
                                <td className="py-1.5 px-2 text-neutral-700 dark:text-neutral-300">
                                    {item.price}
                                </td>
                                <td className="py-1.5 px-2 text-right">
                                    <span className={`
                                        ${item.hasLiquidity 
                                            ? 'text-neutral-700 dark:text-neutral-300 font-medium' 
                                            : 'text-neutral-400 dark:text-neutral-500'
                                        }
                                    `}>
                                        {item.liquidity}
                                    </span>
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                    {item.isActive ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                                            当前
                                        </span>
                                    ) : item.hasLiquidity ? (
                                        <span className="inline-flex items-center justify-center w-2 h-2 bg-green-500 rounded-full"></span>
                                    ) : (
                                        <span className="inline-flex items-center justify-center w-2 h-2 bg-neutral-300 dark:bg-neutral-600 rounded-full"></span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>有流动性</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-2 h-2 bg-neutral-300 dark:bg-neutral-600 rounded-full"></span>
                    <span>无流动性</span>
                </div>
            </div>
        </div>
    );
};

export default LiquidityDistributionTable;