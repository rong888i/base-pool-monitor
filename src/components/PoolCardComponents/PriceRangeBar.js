'use client';

import React from 'react';
import { getTickSpacing, calculatePriceFromTick } from '../../utils/lpUtils';

const PriceRangeBar = ({ lpInfo }) => {
    if (!lpInfo || lpInfo.tick === undefined || !lpInfo.fee) {
        return null;
    }

    const { tick, fee, token0, token1, price } = lpInfo;
    const currentPrice = price.token0PerToken1; // Change to token0/token1 price

    const tickSpacing = getTickSpacing(fee);
    const tickLower = Math.floor(tick / tickSpacing) * tickSpacing;
    const tickUpper = tickLower + tickSpacing;

    // To get token0/token1 price range, we calculate token1/token0 price and invert it.
    // Note that the upper and lower bounds are swapped after inversion.
    const priceLower = 1 / calculatePriceFromTick(tickUpper, token0.decimals, token1.decimals);
    const priceUpper = 1 / calculatePriceFromTick(tickLower, token0.decimals, token1.decimals);

    let percentage = 0;
    if (priceUpper > priceLower) {
        percentage = ((currentPrice - priceLower) / (priceUpper - priceLower)) * 100;
    }

    // Clamp between a small margin to prevent the indicator from being invisible at edges
    percentage = Math.max(2, Math.min(98, percentage));

    return (
        <div className="mt-2 text-xs">
            {/* <div className="flex justify-between items-center font-mono text-neutral-700 dark:text-neutral-300 px-1">
                <span title={priceLower.toString()}>{priceLower.toPrecision(5)}</span>
                <span className="font-sans text-neutral-500 dark:text-neutral-400 text-[11px] opacity-80">价格区间</span>
                <span title={priceUpper.toString()}>{priceUpper.toPrecision(5)}</span>
            </div> */}
            <div className="relative h-3 my-1">
                <div className="bg-neutral-200 dark:bg-neutral-600 rounded-full h-1.5 absolute top-1/2 -translate-y-1/2 w-full"></div>
                <div
                    className="absolute bg-primary-500 h-3 w-3 rounded-full border-2 border-white dark:border-neutral-800 shadow-md transition-all duration-300"
                    style={{ left: `${percentage}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                    data-tooltip-id="my-tooltip"
                    data-tooltip-html={`当前价格: ${currentPrice.toPrecision(7)} ${token0.symbol}/${token1.symbol}<br/>${priceLower.toPrecision(5)} ----- ${priceUpper.toPrecision(5)}`}
                >
                </div>
            </div>
        </div>
    );
};

export default PriceRangeBar; 