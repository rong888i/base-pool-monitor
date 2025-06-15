'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getLiquidityForAmounts, getTickSpacing, calculatePriceFromTick, calculateTickFromPrice,
    getLiquidityForAmount0, getLiquidityForAmount1, getAmountsForLiquidity
} from '../../utils/lpUtils';
import useIsMobile from '../../hooks/useIsMobile';

// 统一的代币输入框组件（与一键添加流动性保持一致）
const TokenInput = ({ symbol, value, onChange, placeholder }) => (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 space-y-2.5 transition-colors duration-300">
        <div className="flex justify-between items-baseline">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                {symbol}
            </label>
        </div>
        <div className="relative flex items-center">
            <input
                type="number"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full pl-3 pr-16 py-2.5 bg-white dark:bg-neutral-900/50 rounded-lg text-lg font-mono font-medium border-2 border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-0 outline-none transition-all duration-300"
            />
            <div className="absolute right-2.5 text-sm font-bold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                {symbol}
            </div>
        </div>
    </div>
);

// 统一的价格输入框组件（与一键添加流动性保持一致）
const PriceInput = ({ value, onChange, onBlur, onAdjust, label }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</label>
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
            <button onClick={() => onAdjust(-1)} className="w-7 h-7 rounded bg-white dark:bg-neutral-700/50 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-lg font-mono text-neutral-600 dark:text-neutral-300">-</button>
            <input
                type="number"
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                className="w-full bg-transparent text-center font-mono text-base font-medium text-neutral-800 dark:text-neutral-100 focus:outline-none"
                placeholder="0.0"
            />
            <button onClick={() => onAdjust(1)} className="w-7 h-7 rounded bg-white dark:bg-neutral-700/50 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-lg font-mono text-neutral-600 dark:text-neutral-300">+</button>
        </div>
    </div>
);

const LiquidityCalculator = ({
    poolInfo,
    position,
    isVisible,
    onClose,
    popoverRef
}) => {
    const [calcInput0, setCalcInput0] = useState('');
    const [calcInput1, setCalcInput1] = useState('');
    const [priceLower, setPriceLower] = useState('');
    const [priceUpper, setPriceUpper] = useState('');
    const [tickLower, setTickLower] = useState(null);
    const [tickUpper, setTickUpper] = useState(null);
    const [calculatedRatio, setCalculatedRatio] = useState(null);
    const [isReversed, setIsReversed] = useState(false);
    const [activePoolAddress, setActivePoolAddress] = useState(null);
    const [lastEdited, setLastEdited] = useState(null);
    const isMobile = useIsMobile();
    const [isUserInputting, setIsUserInputting] = useState(false);
    const inputTimer = useRef(null);

    const getDisplayPrice = useCallback((price) => {
        if (!price) return '';
        return isReversed ? (1 / price).toPrecision(6) : price.toPrecision(6);
    }, [isReversed]);

    const parseDisplayPrice = useCallback((displayPrice) => {
        const price = parseFloat(displayPrice);
        if (isNaN(price) || price === 0) return 0;
        return isReversed ? 1 / price : price;
    }, [isReversed]);

    const updateTicksFromPrices = (lowerPriceStr, upperPriceStr) => {
        if (!poolInfo) return;
        const { token0, token1, fee } = poolInfo;
        const tickSpacing = getTickSpacing(fee);

        const lowerPrice = parseDisplayPrice(lowerPriceStr);
        const upperPrice = parseDisplayPrice(upperPriceStr);

        if (lowerPrice > 0) {
            const newTick = calculateTickFromPrice(lowerPrice, token0.decimals, token1.decimals);
            setTickLower(Math.round(newTick / tickSpacing) * tickSpacing);
        }
        if (upperPrice > 0) {
            const newTick = calculateTickFromPrice(upperPrice, token0.decimals, token1.decimals);
            setTickUpper(Math.round(newTick / tickSpacing) * tickSpacing);
        }
    };

    useEffect(() => {
        if (poolInfo && poolInfo.poolAddress !== activePoolAddress) {
            setActivePoolAddress(poolInfo.poolAddress);
            const tickSpacing = getTickSpacing(poolInfo.fee);
            const currentTick = poolInfo.tick;
            const lower = Math.floor(currentTick / tickSpacing) * tickSpacing;
            const upper = lower + tickSpacing;
            setTickLower(lower);
            setTickUpper(upper);
        }
    }, [poolInfo, activePoolAddress]);

    // This effect ensures that the lower tick is always less than or equal to the upper tick.
    useEffect(() => {
        if (tickLower !== null && tickUpper !== null && tickLower > tickUpper) {
            // Swap them to maintain correct range
            const temp = tickLower;
            setTickLower(tickUpper);
            setTickUpper(temp);
        }
    }, [tickLower, tickUpper]);

    useEffect(() => {
        if (poolInfo && tickLower !== null && tickUpper !== null && !isUserInputting) {
            const { token0, token1 } = poolInfo;
            const baseLowerPrice = calculatePriceFromTick(tickLower, token0.decimals, token1.decimals);
            const baseUpperPrice = calculatePriceFromTick(tickUpper, token0.decimals, token1.decimals);

            if (isReversed) {
                // When reversed, the price derived from the upper tick becomes the lower bound of the displayed price
                setPriceLower(getDisplayPrice(baseUpperPrice));
                setPriceUpper(getDisplayPrice(baseLowerPrice));
            } else {
                setPriceLower(getDisplayPrice(baseLowerPrice));
                setPriceUpper(getDisplayPrice(baseUpperPrice));
            }
        }
    }, [tickLower, tickUpper, isReversed, poolInfo, isUserInputting, getDisplayPrice]);

    useEffect(() => {
        if (!poolInfo || tickLower === null || tickUpper === null) {
            setCalculatedRatio(null);
            setActivePoolAddress(null);
            setLastEdited(null);
        }
    }, [isVisible]);

    useEffect(() => {
        if (!poolInfo || tickLower === null || tickUpper === null) {
            setCalculatedRatio(null);
            return;
        };

        const input0 = parseFloat(calcInput0) || 0;
        const input1 = parseFloat(calcInput1) || 0;

        if ((input0 <= 0 && input1 <= 0) || tickLower >= tickUpper) {
            setCalculatedRatio(null);
            return;
        }

        try {
            const userLiquidity = getLiquidityForAmounts(poolInfo, tickLower, tickUpper, input0.toString(), input1.toString());
            const poolLiquidity = BigInt(poolInfo.liquidity);

            if (poolLiquidity === 0n && userLiquidity > 0n) {
                setCalculatedRatio(100);
                return;
            }

            if (poolLiquidity > 0n) {
                const totalLiquidity = poolLiquidity + userLiquidity;
                if (totalLiquidity === 0n) {
                    setCalculatedRatio(0);
                    return;
                }
                const ratio = (Number(userLiquidity * 10000n / totalLiquidity) / 100);
                setCalculatedRatio(ratio);
            } else {
                setCalculatedRatio(null);
            }
        } catch (error) {
            console.error("Error calculating liquidity ratio:", error);
            setCalculatedRatio(null);
        }

    }, [calcInput0, calcInput1, tickLower, tickUpper, poolInfo]);

    // Effect to calculate the other token amount automatically
    useEffect(() => {
        const calculateOtherAmount = () => {
            if (!poolInfo || tickLower === null || tickUpper === null || !lastEdited || tickLower >= tickUpper) {
                return;
            }

            const { tick, sqrtPriceX96, token0, token1 } = poolInfo;
            const input0 = parseFloat(calcInput0);
            const input1 = parseFloat(calcInput1);

            try {
                let liquidity;
                if (lastEdited === 'amount0' && input0 > 0) {
                    liquidity = getLiquidityForAmount0(poolInfo, tickLower, tickUpper, calcInput0);
                    const { formatted } = getAmountsForLiquidity(liquidity.toString(), sqrtPriceX96, tick, tickLower, tickUpper, token0.decimals, token1.decimals);
                    // Prevent feedback loop by checking if the value is different enough
                    const newValue = parseFloat(formatted.token1);
                    if (!isNaN(newValue) && Math.abs(newValue - (input1 || 0)) > 1e-6) {
                        setCalcInput1(formatted.token1);
                    }
                } else if (lastEdited === 'amount1' && input1 > 0) {
                    liquidity = getLiquidityForAmount1(poolInfo, tickLower, tickUpper, calcInput1);
                    const { formatted } = getAmountsForLiquidity(liquidity.toString(), sqrtPriceX96, tick, tickLower, tickUpper, token0.decimals, token1.decimals);
                    const newValue = parseFloat(formatted.token0);
                    if (!isNaN(newValue) && Math.abs(newValue - (input0 || 0)) > 1e-6) {
                        setCalcInput0(formatted.token0);
                    }
                } else if (lastEdited === 'amount0' && input0 === 0) {
                    setCalcInput1('');
                } else if (lastEdited === 'amount1' && input1 === 0) {
                    setCalcInput0('');
                }
            } catch (error) {
                console.error("Error calculating other token amount:", error);
            }
        };

        const handler = setTimeout(calculateOtherAmount, 800);
        return () => clearTimeout(handler);

    }, [calcInput0, calcInput1, lastEdited, poolInfo, tickLower, tickUpper]);

    const handlePriceBlur = useCallback((type) => {
        if (inputTimer.current) {
            clearTimeout(inputTimer.current);
        }
        setIsUserInputting(false);

        if (!poolInfo) return;

        const { token0, token1, fee } = poolInfo;
        const tickSpacing = getTickSpacing(fee);

        const isLowerBox = type === 'lower';
        const priceStr = isLowerBox ? priceLower : priceUpper;
        if (priceStr === '' || isNaN(parseFloat(priceStr))) return;

        const internalPrice = parseDisplayPrice(priceStr);
        if (internalPrice <= 0) return;

        const rawTick = calculateTickFromPrice(internalPrice, token0.decimals, token1.decimals);
        const alignedTick = Math.round(rawTick / tickSpacing) * tickSpacing;
        const newInternalPrice = calculatePriceFromTick(alignedTick, token0.decimals, token1.decimals);
        const newDisplayPrice = getDisplayPrice(newInternalPrice);

        let newPriceLower = isLowerBox ? newDisplayPrice : priceLower;
        let newPriceUpper = isLowerBox ? priceUpper : newDisplayPrice;
        let newTickLower = tickLower;
        let newTickUpper = tickUpper;

        if (isLowerBox) {
            if (isReversed) newTickUpper = alignedTick;
            else newTickLower = alignedTick;
        } else {
            if (isReversed) newTickLower = alignedTick;
            else newTickUpper = alignedTick;
        }

        if (newTickLower !== null && newTickUpper !== null && newTickLower > newTickUpper) {
            [newTickLower, newTickUpper] = [newTickUpper, newTickLower];
        }

        if (isReversed) {
            setPriceLower(getDisplayPrice(calculatePriceFromTick(newTickUpper, token0.decimals, token1.decimals)));
            setPriceUpper(getDisplayPrice(calculatePriceFromTick(newTickLower, token0.decimals, token1.decimals)));
        } else {
            setPriceLower(getDisplayPrice(calculatePriceFromTick(newTickLower, token0.decimals, token1.decimals)));
            setPriceUpper(getDisplayPrice(calculatePriceFromTick(newTickUpper, token0.decimals, token1.decimals)));
        }

        setTickLower(newTickLower);
        setTickUpper(newTickUpper);
    }, [isReversed, poolInfo, priceLower, priceUpper, tickLower, tickUpper, getDisplayPrice, parseDisplayPrice]);

    const handlePriceChange = useCallback((value, type) => {
        setIsUserInputting(true);
        if (type === 'lower') {
            setPriceLower(value);
        } else {
            setPriceUpper(value);
        }

        if (inputTimer.current) {
            clearTimeout(inputTimer.current);
        }

        inputTimer.current = setTimeout(() => {
            handlePriceBlur(type);
        }, 1500);
    }, [handlePriceBlur]);

    const adjustPrice = useCallback((boxType, direction) => {
        if (!poolInfo) return;

        const { fee } = poolInfo;
        const tickSpacing = getTickSpacing(fee);
        const isMinBox = boxType === 'min';

        // Correctly determine which tick state to update
        const isUpdatingTickLower = (isMinBox !== isReversed);
        const tickToChange = isUpdatingTickLower ? tickLower : tickUpper;

        if (tickToChange === null) return;

        // When price is reversed, the direction of change for the tick is also reversed
        const tickDirection = isReversed ? -direction : direction;
        const newTick = tickToChange + (tickDirection * tickSpacing);

        if (isUpdatingTickLower) {
            setTickLower(newTick);
        } else {
            setTickUpper(newTick);
        }
    }, [poolInfo, tickLower, tickUpper, isReversed]);

    const handleSetPriceRange = (percentage) => {
        if (!poolInfo) return;

        const currentPrice = poolInfo.price.token1PerToken0;
        const range = currentPrice * (percentage / 100);

        const newLowerInternalPrice = currentPrice - range;
        const newUpperInternalPrice = currentPrice + range;

        const { token0, token1, fee } = poolInfo;
        const tickSpacing = getTickSpacing(fee);

        const newTickLower = Math.round(calculateTickFromPrice(newLowerInternalPrice, token0.decimals, token1.decimals) / tickSpacing) * tickSpacing;
        const newTickUpper = Math.round(calculateTickFromPrice(newUpperInternalPrice, token0.decimals, token1.decimals) / tickSpacing) * tickSpacing;

        setTickLower(newTickLower);
        setTickUpper(newTickUpper);
    };

    // This debounced effect is removed to prevent circular updates
    // Price to tick conversion is now handled only in handlePriceBlur

    if (!poolInfo) return null;

    const priceSymbol = isReversed
        ? `${poolInfo.token0.symbol} / ${poolInfo.token1.symbol}`
        : `${poolInfo.token1.symbol} / ${poolInfo.token0.symbol}`;

    return (
        <div
            ref={popoverRef}
            style={isMobile ? {} : { top: `${position.top}px`, left: `${position.left}px` }}
            className={`fixed z-50 transition-all duration-300 ease-in-out
                ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                ${isMobile
                    ? 'inset-0 flex items-center justify-center bg-black/50'
                    : ''
                }`
            }
        >
            <div
                className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-5 transform-gpu transition-all duration-300 ease-in-out
                    ${isMobile ? 'w-full max-w-sm mx-4 max-h-[90vh]' : 'w-96'}
                    ${isVisible ? 'scale-100' : 'scale-95'}
                `}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m3 1a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h3m3-4a2 2 0 012 2v2H9V6a2 2 0 012-2zm-3 8h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
                        </svg>
                        <span>流动性占比计算器</span>
                    </h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors rounded-full p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* 当前价格显示 */}
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 text-center">
                        <div className="text-sm font-mono font-medium text-neutral-700 dark:text-neutral-300">
                            1 {isReversed ? poolInfo.token0?.symbol : poolInfo.token1?.symbol} = {
                                isReversed
                                    ? (1 / poolInfo.price?.token1PerToken0).toFixed(6)
                                    : poolInfo.price?.token1PerToken0.toFixed(6)
                            } {isReversed ? poolInfo.token1?.symbol : poolInfo.token0?.symbol}
                        </div>
                    </div>

                    {/* Token Inputs */}
                    <div className="space-y-3">
                        <TokenInput
                            symbol={poolInfo.token0.symbol}
                            value={calcInput0}
                            onChange={(e) => { setCalcInput0(e.target.value); setLastEdited('amount0'); }}
                            placeholder={`输入 ${poolInfo.token0.symbol} 数量`}
                        />
                        <TokenInput
                            symbol={poolInfo.token1.symbol}
                            value={calcInput1}
                            onChange={(e) => { setCalcInput1(e.target.value); setLastEdited('amount1'); }}
                            placeholder={`输入 ${poolInfo.token1.symbol} 数量`}
                        />
                    </div>

                    {/* Price Range */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">价格范围</label>
                            <button
                                onClick={() => {
                                    // Simply toggle the direction without complex state management
                                    setIsReversed(!isReversed);
                                }}
                                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 flex items-center gap-1 transition-colors"
                            >
                                {priceSymbol}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <PriceInput
                                value={priceLower}
                                onChange={(e) => handlePriceChange(e.target.value, 'lower')}
                                onBlur={() => handlePriceBlur('lower')}
                                onAdjust={(direction) => adjustPrice('min', direction)}
                                label={isReversed ? '最高价' : '最低价'}
                            />
                            <PriceInput
                                value={priceUpper}
                                onChange={(e) => handlePriceChange(e.target.value, 'upper')}
                                onBlur={() => handlePriceBlur('upper')}
                                onAdjust={(direction) => adjustPrice('max', direction)}
                                label={isReversed ? '最低价' : '最高价'}
                            />
                        </div>
                    </div>

                    {/* Price Range Presets */}
                    <div className="grid grid-cols-4 gap-2">
                        <button onClick={() => handleSetPriceRange(0.01)} className="btn-tertiary">±0.01%</button>
                        <button onClick={() => handleSetPriceRange(0.05)} className="btn-tertiary">±0.05%</button>
                        <button onClick={() => handleSetPriceRange(0.1)} className="btn-tertiary">±0.1%</button>
                        <button onClick={() => handleSetPriceRange(0.5)} className="btn-tertiary">±0.5%</button>
                    </div>

                    {/* Result Display */}
                    <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-center border border-neutral-200 dark:border-neutral-700">
                        {calculatedRatio !== null ? (
                            <div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">预计流动性占比</div>
                                <div className="text-2xl font-bold font-mono text-neutral-800 dark:text-neutral-100">{calculatedRatio.toFixed(4)}%</div>
                            </div>
                        ) : (
                            <span className="text-neutral-500 dark:text-neutral-400 text-sm">请输入数量和价格范围以计算</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiquidityCalculator;