'use client';

import { useState, useEffect } from 'react';
import {
    getLiquidityForAmounts, getTickSpacing, calculatePriceFromTick, calculateTickFromPrice,
    getLiquidityForAmount0, getLiquidityForAmount1, getAmountsForLiquidity
} from '../../utils/lpUtils';
import useIsMobile from '../../hooks/useIsMobile';

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

    const getDisplayPrice = (price) => {
        if (!price) return '';
        return isReversed ? (1 / price).toPrecision(6) : price.toPrecision(6);
    }
    const parseDisplayPrice = (displayPrice) => {
        const price = parseFloat(displayPrice);
        if (isNaN(price) || price === 0) return 0;
        return isReversed ? 1 / price : price;
    }

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
        if (poolInfo && tickLower !== null && tickUpper !== null) {
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
    }, [tickLower, tickUpper, isReversed, poolInfo]);

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

            let liquidity;
            if (lastEdited === 'amount0' && input0 > 0) {
                liquidity = getLiquidityForAmount0(poolInfo, tickLower, tickUpper, calcInput0);
                const { formatted } = getAmountsForLiquidity(liquidity.toString(), sqrtPriceX96, tick, tickLower, tickUpper, token0.decimals, token1.decimals);
                // Prevent feedback loop by checking if the value is different enough
                if (Math.abs(parseFloat(formatted.token1) - (input1 || 0)) / (input1 || 1) > 1e-6) {
                    setCalcInput1(formatted.token1);
                }
            } else if (lastEdited === 'amount1' && input1 > 0) {
                liquidity = getLiquidityForAmount1(poolInfo, tickLower, tickUpper, calcInput1);
                const { formatted } = getAmountsForLiquidity(liquidity.toString(), sqrtPriceX96, tick, tickLower, tickUpper, token0.decimals, token1.decimals);
                if (Math.abs(parseFloat(formatted.token0) - (input0 || 0)) / (input0 || 1) > 1e-6) {
                    setCalcInput0(formatted.token0);
                }
            }
        };

        const handler = setTimeout(calculateOtherAmount, 300);
        return () => clearTimeout(handler);

    }, [calcInput0, calcInput1, lastEdited, poolInfo, tickLower, tickUpper]);

    useEffect(() => {
        if (!isVisible) {
            setCalcInput0('');
            setCalcInput1('');
            setCalculatedRatio(null);
            setActivePoolAddress(null);
            setLastEdited(null);
        }
    }, [isVisible]);

    const handlePriceBlur = (e, type) => {
        const priceStr = e.target.value;
        const price = parseDisplayPrice(priceStr);

        if (poolInfo && price > 0) {
            const { token0, token1, fee } = poolInfo;
            const tickSpacing = getTickSpacing(fee);
            const newTick = calculateTickFromPrice(price, token0.decimals, token1.decimals);
            const alignedTick = Math.round(newTick / tickSpacing) * tickSpacing;

            if (type === 'lower') {
                setTickLower(alignedTick);
            } else {
                setTickUpper(alignedTick);
            }
        }
    };

    const adjustPrice = (boxType, direction) => {
        const tickToAdjustName = (boxType === 'min' && !isReversed) || (boxType === 'max' && isReversed)
            ? 'lower'
            : 'upper';

        const effectiveDirection = isReversed ? -direction : direction;

        adjustPriceByTick(tickToAdjustName, effectiveDirection);
    }

    const adjustPriceByTick = (type, direction) => {
        if (!poolInfo) return;
        const { fee } = poolInfo;
        const tickSpacing = getTickSpacing(fee);
        const tickToAdjust = type === 'lower' ? tickLower : tickUpper;
        const setter = type === 'lower' ? setTickLower : setTickUpper;

        if (tickToAdjust !== null) {
            const newTick = tickToAdjust + (direction * tickSpacing);
            setter(newTick);
        }
    };

    const handleSetPriceRange = (percentage) => {
        if (!poolInfo) return;

        const currentPrice = poolInfo.price.token1PerToken0;
        const range = currentPrice * percentage / 100;
        const newLowerPrice = currentPrice - range;
        const newUpperPrice = currentPrice + range;

        const { token0, token1, fee } = poolInfo;
        const tickSpacing = getTickSpacing(fee);

        const lowerTick = calculateTickFromPrice(newLowerPrice, token0.decimals, token1.decimals);
        const upperTick = calculateTickFromPrice(newUpperPrice, token0.decimals, token1.decimals);

        setTickLower(Math.round(lowerTick / tickSpacing) * tickSpacing);
        setTickUpper(Math.round(upperTick / tickSpacing) * tickSpacing);
    };

    // Debounced effect to update ticks from price inputs
    useEffect(() => {
        const handler = setTimeout(() => {
            if (!poolInfo) return;
            const { token0, token1, fee } = poolInfo;
            const tickSpacing = getTickSpacing(fee);

            // Update lower tick
            const lowerPrice = parseDisplayPrice(priceLower);
            if (lowerPrice > 0) {
                const newTick = calculateTickFromPrice(lowerPrice, token0.decimals, token1.decimals);
                const alignedTick = Math.round(newTick / tickSpacing) * tickSpacing;
                // Only set if changed to avoid re-triggering effects unnecessarily
                if (alignedTick !== tickLower) {
                    setTickLower(alignedTick);
                }
            }

            // Update upper tick
            const upperPrice = parseDisplayPrice(priceUpper);
            if (upperPrice > 0) {
                const newTick = calculateTickFromPrice(upperPrice, token0.decimals, token1.decimals);
                const alignedTick = Math.round(newTick / tickSpacing) * tickSpacing;
                if (alignedTick !== tickUpper) {
                    setTickUpper(alignedTick);
                }
            }
        }, 500); // 500ms debounce after user stops typing

        return () => {
            clearTimeout(handler);
        };
    }, [priceLower, priceUpper, poolInfo, isReversed, tickLower, tickUpper]);

    if (!poolInfo) return null;

    const priceSymbol = isReversed
        ? `${poolInfo.token0.symbol} / ${poolInfo.token1.symbol}`
        : `${poolInfo.token1.symbol} / ${poolInfo.token0.symbol}`;

    const PriceInput = ({ value, onChange, onAdjust }) => (
        <div className="relative">
            <input
                type="number"
                value={value}
                onChange={onChange}
                className="input-primary w-full text-sm pr-6"
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <button onClick={() => onAdjust(1)} className="h-1/2 px-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" /></svg>
                </button>
                <button onClick={() => onAdjust(-1)} className="h-1/2 px-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                </button>
            </div>
        </div>
    );

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
                    ${isMobile ? 'w-full max-w-sm mx-4' : 'w-80'}
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
                    {/* Token Inputs */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">输入数量</label>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder={`输入 ${poolInfo.token0.symbol} 数量`}
                                value={calcInput0}
                                onChange={(e) => { setCalcInput0(e.target.value); setLastEdited('amount0'); }}
                                className="input-primary w-full !py-2.5 !pl-4 !pr-20"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                                {poolInfo.token0.symbol}
                            </span>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder={`输入 ${poolInfo.token1.symbol} 数量`}
                                value={calcInput1}
                                onChange={(e) => { setCalcInput1(e.target.value); setLastEdited('amount1'); }}
                                className="input-primary w-full !py-2.5 !pl-4 !pr-20"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                                {poolInfo.token1.symbol}
                            </span>
                        </div>
                    </div>

                    {/* Price Range Inputs */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300">价格范围</label>
                            <button onClick={() => setIsReversed(!isReversed)} className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
                                {priceSymbol}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <PriceInput
                                value={priceLower}
                                onChange={(e) => setPriceLower(e.target.value)}
                                onAdjust={(dir) => adjustPrice('min', dir)}
                            />
                            <PriceInput
                                value={priceUpper}
                                onChange={(e) => setPriceUpper(e.target.value)}
                                onAdjust={(dir) => adjustPrice('max', dir)}
                            />
                        </div>
                    </div>

                    {/* Price Range Presets */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <button onClick={() => handleSetPriceRange(0.05)} className="btn-secondary-sm !py-2 text-xs transition-transform duration-200 hover:scale-105">±0.05%</button>
                        <button onClick={() => handleSetPriceRange(0.3)} className="btn-secondary-sm !py-2 text-xs transition-transform duration-200 hover:scale-105">±0.3%</button>
                        <button onClick={() => handleSetPriceRange(1)} className="btn-secondary-sm !py-2 text-xs transition-transform duration-200 hover:scale-105">±1%</button>
                    </div>

                    {/* Result Display */}
                    <div className="h-24 bg-gradient-to-br from-primary-50 to-indigo-100 dark:from-neutral-800 dark:to-neutral-900 rounded-xl flex items-center justify-center text-center p-4 transition-all duration-300">
                        {calculatedRatio !== null ? (
                            <div>
                                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">预计流动性占比</div>
                                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-indigo-600 dark:from-primary-400 dark:to-indigo-500">
                                    {calculatedRatio.toFixed(4)}%
                                </div>
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