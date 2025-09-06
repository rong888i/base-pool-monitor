import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getTickLiquidityDataSimple, calculatePriceFromTick, getTickSpacing } from '../../utils/lpUtils';

const SimpleLiquidityChart = ({ pool, range = 15, isReversed = false, onPriceRangeSelect }) => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartIndex, setDragStartIndex] = useState(null);
    const [dragEndIndex, setDragEndIndex] = useState(null);
    const isPriceInverted = isReversed; // 使用外部传入的价格方向
    const fetchTimeoutRef = useRef(null);
    const lastFetchRef = useRef(null);
    const chartContainerRef = useRef(null);

    // Only extract the essential pool data we need for the chart
    const poolKey = useMemo(() => {
        if (!pool?.lpInfo?.poolAddress || !pool?.lpInfo?.tick) return null;
        return `${pool.lpInfo.poolAddress}-${pool.lpInfo.tick}-${pool.lpInfo.fee}-${isPriceInverted}`;
    }, [pool?.lpInfo?.poolAddress, pool?.lpInfo?.tick, pool?.lpInfo?.fee, isPriceInverted]);

    const fetchLiquidityData = useCallback(async () => {
        if (!pool?.lpInfo?.poolAddress || !pool?.lpInfo?.tick) {
            setError('池子信息不完整');
            setLoading(false);
            return;
        }

        // Check if we already fetched for this pool state
        if (lastFetchRef.current === poolKey) {
            return;
        }
        lastFetchRef.current = poolKey;

        try {
            setLoading(true);
            setError(null);

            const tickSpacing = getTickSpacing(pool.lpInfo.fee);
            const currentTick = Number(pool.lpInfo.tick);

            // 获取数据
            const tickData = await getTickLiquidityDataSimple(
                pool.lpInfo.poolAddress,
                currentTick,
                tickSpacing,
                range,
                pool.lpInfo.token0.decimals,
                pool.lpInfo.token1.decimals,
                pool.lpInfo.sqrtPriceX96  // 传入实际的 sqrtPriceX96
            );

            // 转换为图表数据
            const formattedData = tickData.map(tick => {
                const basePrice = calculatePriceFromTick(
                    tick.tick,
                    pool.lpInfo.token0.decimals,
                    pool.lpInfo.token1.decimals
                );

                // 根据价格方向调整价格
                const price = isPriceInverted ? 1 / basePrice : basePrice;

                const isCurrentTick = Math.abs(tick.tick - currentTick) < tickSpacing;
                // 使用 activeLiquidity 而不是 liquidityGross，因为 activeLiquidity 才代表该tick区间内的实际流动性
                const liquidityValue = Number(tick.activeLiquidity || tick.liquidityGross);

                // 处理token数量，考虑精度
                const rawAmount0 = tick.amount0 || '0';
                const rawAmount1 = tick.amount1 || '0';

                // 安全地转换为实际数量（处理精度和大数）
                let amount0 = 0;
                let amount1 = 0;

                try {
                    // 处理可能的大数
                    if (rawAmount0 !== '0') {
                        const bigAmount0 = BigInt(rawAmount0);
                        const divisor0 = BigInt(10 ** pool.lpInfo.token0.decimals);
                        // 保留6位小数精度
                        amount0 = Number(bigAmount0 * 1000000n / divisor0) / 1000000;
                    }

                    if (rawAmount1 !== '0') {
                        const bigAmount1 = BigInt(rawAmount1);
                        const divisor1 = BigInt(10 ** pool.lpInfo.token1.decimals);
                        // 保留6位小数精度
                        amount1 = Number(bigAmount1 * 1000000n / divisor1) / 1000000;
                    }
                } catch (e) {
                    console.log('Error converting amounts:', e);
                    // 如果转换失败，使用简单除法
                    amount0 = Number(rawAmount0) / Math.pow(10, pool.lpInfo.token0.decimals);
                    amount1 = Number(rawAmount1) / Math.pow(10, pool.lpInfo.token1.decimals);
                }

                // 计算该tick的总价值
                // 使用基础价格（未反转）来计算统一的价值
                // basePrice = token1/token0，所以总价值（以token1为单位）= amount0 * basePrice + amount1
                const totalValueInToken1 = amount0 * basePrice + amount1;

                // 根据位置和价格方向选择主要显示的token（用于tooltip显示）
                const displayAmount = tick.tick > currentTick ? amount0 : amount1;
                const displaySymbol = isPriceInverted
                    ? (tick.tick > currentTick ? pool.lpInfo.token1.symbol : pool.lpInfo.token0.symbol)
                    : (tick.tick > currentTick ? pool.lpInfo.token0.symbol : pool.lpInfo.token1.symbol);

                return {
                    tick: tick.tick,
                    price: price,
                    liquidity: liquidityValue,
                    amount0: amount0,
                    amount1: amount1,
                    totalValue: totalValueInToken1, // 添加总价值字段
                    displayAmount: displayAmount,
                    displaySymbol: displaySymbol,
                    isActive: isCurrentTick,
                    hasLiquidity: liquidityValue > 0 || amount0 > 0 || amount1 > 0,
                    isAboveCurrent: tick.tick > currentTick,
                    isBelowCurrent: tick.tick < currentTick
                };
            });

            // 调试输出（可选）
            // console.log('Current Tick:', currentTick);
            // console.log('Tick Data:', tickData);

            // 如果价格反转，需要反转数据顺序
            const sortedData = isPriceInverted ? [...formattedData].reverse() : formattedData;

            // 标记当前价格所在的tick区间，并根据价格方向调整上下位置判断
            const processedData = sortedData.map((item, index) => {
                // 判断当前价格是否在这个tick区间内
                const isCurrentPriceTick = currentTick >= item.tick && currentTick < item.tick + tickSpacing;

                // 当价格反转时，需要调整上下位置的判断逻辑
                let isAbove, isBelow;
                if (isPriceInverted) {
                    // 价格反转后，数据顺序也反转了，所以要根据索引位置判断
                    const originalIndex = formattedData.findIndex(d => d.tick === item.tick);
                    isAbove = item.tick < currentTick; // tick值小于当前tick的在上方
                    isBelow = item.tick > currentTick; // tick值大于当前tick的在下方
                } else {
                    isAbove = item.tick > currentTick;
                    isBelow = item.tick < currentTick;
                }

                return {
                    ...item,
                    isActive: isCurrentPriceTick,
                    isAboveCurrent: isAbove,
                    isBelowCurrent: isBelow,
                    isMerged: false
                };
            })

            // 找出最大值用于归一化 - 使用总价值而不是单个token数量
            const maxValue = Math.max(...processedData.map(d => d.totalValue), 0.000001);

            // 添加归一化高度
            const finalData = processedData.map(item => ({
                ...item,
                height: item.totalValue > 0
                    ? Math.max(5, (Math.sqrt(item.totalValue / maxValue) * 100)) // 使用平方根缩放，最小高度5%
                    : (item.liquidity > 0 && (item.amount0 > 0 || item.amount1 > 0) ? 3 : 0)  // 如果有流动性且有代币才显示最小高度
            }));

            setChartData(finalData);

            console.log('--- SimpleLiquidityChart Debug ---');
            console.log('chartData.length:', finalData.length);
            console.log('------------------------------------');

        } catch (err) {
            console.error('获取流动性数据失败:', err);
            setError('获取数据失败');
        } finally {
            setLoading(false);
        }
    }, [pool?.lpInfo, poolKey, range, isPriceInverted]);

    useEffect(() => {
        // Only fetch if poolKey has changed
        if (!poolKey) return;

        // Clear existing timeout
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        // Set debounce delay
        fetchTimeoutRef.current = setTimeout(() => {
            fetchLiquidityData();
        }, 800); // 800ms debounce

        // Cleanup
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, [poolKey, range, fetchLiquidityData]);

    // 格式化价格显示
    const formatPrice = (price) => {
        if (price < 0.0001) return price.toExponential(2);
        if (price < 1) return price.toFixed(6);
        if (price < 1000) return price.toFixed(4);
        return price.toFixed(2);
    };

    // 格式化token数量
    const formatTokenAmount = (value) => {
        if (value === 0) return '0';
        if (value < 0.0001) return value.toExponential(2);
        if (value < 1) return value.toFixed(4);
        if (value < 1000) return value.toFixed(2);
        if (value < 1e6) return (value / 1e3).toFixed(1) + 'K';
        if (value < 1e9) return (value / 1e6).toFixed(1) + 'M';
        if (value < 1e12) return (value / 1e9).toFixed(1) + 'B';
        return value.toExponential(1);
    };

    // 处理拖动开始
    const handleDragStart = (index, e) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStartIndex(index);
        setDragEndIndex(index);
    };

    // 处理拖动移动
    const handleDragMove = useCallback((e) => {
        if (!isDragging || !chartContainerRef.current) return;

        const rect = chartContainerRef.current.getBoundingClientRect();
        const x = e.clientX || (e.touches && e.touches[0]?.clientX);
        if (!x) return;

        const relativeX = x - rect.left;
        const width = rect.width;
        const itemCount = chartData.length;
        const itemWidth = width / itemCount;

        let index = Math.floor(relativeX / itemWidth);
        index = Math.max(0, Math.min(index, itemCount - 1));

        setDragEndIndex(index);
    }, [isDragging, chartData.length]);

    // 处理拖动结束
    const handleDragEnd = useCallback(() => {
        if (!isDragging || dragStartIndex === null || dragEndIndex === null) {
            setIsDragging(false);
            setDragStartIndex(null);
            setDragEndIndex(null);
            return;
        }

        const startIdx = Math.min(dragStartIndex, dragEndIndex);
        const endIdx = Math.max(dragStartIndex, dragEndIndex);

        console.log('Drag ended:', { startIdx, endIdx, onPriceRangeSelect: !!onPriceRangeSelect });

        if (startIdx !== endIdx && chartData[startIdx] && chartData[endIdx] && onPriceRangeSelect) {
            const minPrice = Math.min(chartData[startIdx].price, chartData[endIdx].price);
            const maxPrice = Math.max(chartData[startIdx].price, chartData[endIdx].price);

            console.log('Calling onPriceRangeSelect with:', { minPrice, maxPrice });

            onPriceRangeSelect({
                minPrice,
                maxPrice,
                minTick: Math.min(chartData[startIdx].tick, chartData[endIdx].tick),
                maxTick: Math.max(chartData[startIdx].tick, chartData[endIdx].tick)
            });
        }

        setIsDragging(false);
        setDragStartIndex(null);
        setDragEndIndex(null);
    }, [isDragging, dragStartIndex, dragEndIndex, chartData, onPriceRangeSelect]);

    // 添加全局事件监听
    useEffect(() => {
        if (isDragging) {
            const handleMouseMove = (e) => handleDragMove(e);
            const handleMouseUp = () => handleDragEnd();
            const handleTouchMove = (e) => handleDragMove(e);
            const handleTouchEnd = () => handleDragEnd();

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
            };
        }
    }, [isDragging, handleDragMove, handleDragEnd]);

    if (loading) {
        return (
            <div className="h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-32 flex items-center justify-center">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">{error}</div>
            </div>
        );
    }

    // 检查索引是否在选中范围内
    const isInSelection = (index) => {
        if (!isDragging || dragStartIndex === null || dragEndIndex === null) return false;
        const min = Math.min(dragStartIndex, dragEndIndex);
        const max = Math.max(dragStartIndex, dragEndIndex);
        return index >= min && index <= max;
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 text-center flex-1">
                    流动性分布 {onPriceRangeSelect && <span className="text-neutral-500">(拖动选择范围)</span>}
                </div>
            </div>
            {/* （{chartData.length - 1} 个价格区间） */}

            {/* 柱状图容器 */}
            <div
                ref={chartContainerRef}
                className="relative h-32 flex items-end gap-0.5 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg select-none"
                style={{ cursor: onPriceRangeSelect ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
                {chartData.map((item, index) => (
                    <div
                        key={index}
                        className="relative flex-1 h-full flex flex-col justify-end group"
                        onMouseDown={(e) => onPriceRangeSelect && handleDragStart(index, e)}
                        onTouchStart={(e) => onPriceRangeSelect && handleDragStart(index, e)}
                    >
                        {/* 选中区域背景 */}
                        {isInSelection(index) && (
                            <div className="absolute inset-0 bg-blue-400 dark:bg-blue-500 opacity-20 pointer-events-none" />
                        )}

                        {/* 柱子 */}
                        {item.isActive ? (
                            // 当前价格柱子 - 显示token比例
                            <div
                                className={`
                                    w-full transition-all duration-200 rounded-t relative z-10 overflow-hidden
                                    ${item.hasLiquidity ? 'opacity-90' : 'opacity-20'}
                                    ${isInSelection(index) ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}
                                `}
                                style={{
                                    height: `${item.height}%`,
                                    minHeight: item.hasLiquidity ? '4px' : '2px'
                                }}
                            >
                                {/* 计算token比例 */}
                                {(() => {
                                    const totalValue = item.totalValue || 1;
                                    const token0Value = item.amount0 * (isPriceInverted ? 1 / item.price : item.price);
                                    const token1Value = item.amount1;
                                    const token0Percentage = (token0Value / totalValue) * 100;
                                    const token1Percentage = (token1Value / totalValue) * 100;

                                    return (
                                        <>
                                            {/* Token1 部分 (绿色) */}
                                            <div
                                                className="absolute bottom-0 left-0 w-full bg-green-500 hover:bg-green-600 transition-colors"
                                                style={{ height: `${token1Percentage}%` }}
                                            />
                                            {/* Token0 部分 (蓝色) */}
                                            <div
                                                className="absolute top-0 left-0 w-full bg-blue-500 hover:bg-blue-600 transition-colors"
                                                style={{ height: `${token0Percentage}%` }}
                                            />
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            // 非当前价格柱子 - 保持原样
                            <div
                                className={`
                                    w-full transition-all duration-200 rounded-t relative z-10
                                    ${item.isAboveCurrent
                                        ? 'bg-blue-500 hover:bg-blue-600'
                                        : 'bg-green-500 hover:bg-green-600'
                                    }
                                    ${item.hasLiquidity ? 'opacity-90' : 'opacity-20'}
                                    ${isInSelection(index) ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}
                                `}
                                style={{
                                    height: `${item.height}%`,
                                    minHeight: item.hasLiquidity ? '4px' : '2px'
                                }}
                            />
                        )}

                        {/* Hover 提示 - 根据位置调整 */}
                        <div className={`absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10
                            ${index < 5 ? 'left-0' : index > chartData.length - 5 ? 'right-0' : 'left-1/2 transform -translate-x-1/2'}`}>
                            <div className="bg-neutral-900 dark:bg-neutral-800 text-white p-2 rounded text-xs whitespace-nowrap">
                                <div>价格: {formatPrice(item.price)}</div>
                                {item.amount0 > 0 && (
                                    <div>{pool.lpInfo.token0.symbol}: {formatTokenAmount(item.amount0)}</div>
                                )}
                                {item.amount1 > 0 && (
                                    <div>{pool.lpInfo.token1.symbol}: {formatTokenAmount(item.amount1)}</div>
                                )}
                                {item.isActive && (
                                    <div className="text-yellow-400 mt-1">
                                        <div>当前价格区间</div>
                                        {(() => {
                                            const totalValue = item.totalValue || 1;
                                            const token0Value = item.amount0 * (isPriceInverted ? 1 / item.price : item.price);
                                            const token1Value = item.amount1;
                                            const token0Percentage = ((token0Value / totalValue) * 100).toFixed(1);
                                            const token1Percentage = ((token1Value / totalValue) * 100).toFixed(1);
                                            return (
                                                <div className="text-xs mt-0.5">
                                                    <span className="text-blue-400">{pool.lpInfo.token0.symbol}: {token0Percentage}%</span>
                                                    {' / '}
                                                    <span className="text-green-400">{pool.lpInfo.token1.symbol}: {token1Percentage}%</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                            <div className={`w-2 h-2 bg-neutral-900 dark:bg-neutral-800 transform rotate-45 -translate-y-1 
                                ${index < 5 ? 'ml-4' : index > chartData.length - 5 ? 'mr-4 ml-auto' : 'mx-auto'}`}></div>
                        </div>

                        {/* 当前价格标记 */}
                        {item.isActive && (
                            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 -translate-y-3">
                                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-yellow-500"></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* 图例 */}
            <div className="mt-3 flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-neutral-600 dark:text-neutral-400">
                        {isPriceInverted ? pool.lpInfo.token0.symbol : pool.lpInfo.token1.symbol}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-neutral-600 dark:text-neutral-400">
                        {isPriceInverted ? pool.lpInfo.token1.symbol : pool.lpInfo.token0.symbol}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded overflow-hidden flex flex-col">
                        <div className="h-1/2 bg-blue-500"></div>
                        <div className="h-1/2 bg-green-500"></div>
                    </div>
                    <span className="text-neutral-600 dark:text-neutral-400">
                        当前价格
                    </span>
                </div>
            </div>
        </div>
    );
};

export default SimpleLiquidityChart;