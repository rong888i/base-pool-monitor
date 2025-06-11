'use client';

import { useState, useEffect } from 'react';

const LiquidityCalculator = ({
    poolInfo,
    position,
    isVisible,
    onClose,
    popoverRef
}) => {
    const [calcInput0, setCalcInput0] = useState('');
    const [calcInput1, setCalcInput1] = useState('');
    const [calculatedRatio, setCalculatedRatio] = useState(null);

    useEffect(() => {
        if (!poolInfo) {
            setCalculatedRatio(null);
            return;
        };

        const input0 = parseFloat(calcInput0) || 0;
        const input1 = parseFloat(calcInput1) || 0;

        if (input0 <= 0 && input1 <= 0) {
            setCalculatedRatio(null);
            return;
        }

        const poolAmount0 = Number(poolInfo.token0.rawBalance) / (10 ** poolInfo.token0.decimals);
        const poolAmount1 = Number(poolInfo.token1.rawBalance) / (10 ** poolInfo.token1.decimals);
        const priceT1inT0 = poolInfo.price.token0PerToken1;

        if (isNaN(poolAmount0) || isNaN(poolAmount1) || isNaN(priceT1inT0)) return;

        const poolValueInToken0 = poolAmount0 + (poolAmount1 * priceT1inT0);
        const inputValueInToken0 = input0 + (input1 * priceT1inT0);

        if (poolValueInToken0 === 0 && inputValueInToken0 > 0) {
            setCalculatedRatio(100);
            return;
        }

        if (poolValueInToken0 > 0) {
            const ratio = (inputValueInToken0 / (poolValueInToken0 + inputValueInToken0)) * 100;
            setCalculatedRatio(ratio);
        } else {
            setCalculatedRatio(null);
        }
    }, [calcInput0, calcInput1, poolInfo]);

    // Reset inputs when closed
    useEffect(() => {
        if (!isVisible) {
            setCalcInput0('');
            setCalcInput1('');
            setCalculatedRatio(null);
        }
    }, [isVisible]);

    return (
        <div
            ref={popoverRef}
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
            className={`fixed bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl p-5 w-80 z-50 transition-all duration-200 ease-in-out
             ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        >
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m3 1a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V10a2 2 0 012-2h3m3-4a2 2 0 012 2v2H9V6a2 2 0 012-2zm-3 8h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
                    </svg>
                    <span>流动性占比计算器</span>
                </h3>
                <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="space-y-3">
                {/* Token 0 Input */}
                <div className="relative">
                    <input
                        type="number"
                        placeholder={`输入 ${poolInfo.token0.symbol} 数量`}
                        value={calcInput0}
                        onChange={(e) => setCalcInput0(e.target.value)}
                        className="input-primary w-full text-sm pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                        {poolInfo.token0.symbol}
                    </span>
                </div>
                {/* Token 1 Input */}
                <div className="relative">
                    <input
                        type="number"
                        placeholder={`输入 ${poolInfo.token1.symbol} 数量`}
                        value={calcInput1}
                        onChange={(e) => setCalcInput1(e.target.value)}
                        className="input-primary w-full text-sm pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                        {poolInfo.token1.symbol}
                    </span>
                </div>
                {/* Result Display */}
                <div className="h-20 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg flex items-center justify-center text-center p-3">
                    {calculatedRatio !== null ? (
                        <div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">预计流动性占比</div>
                            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                                {calculatedRatio.toFixed(4)}%
                            </div>
                        </div>
                    ) : (
                        <span className="text-neutral-500 dark:text-neutral-400 text-xs">请输入数量以计算</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiquidityCalculator; 