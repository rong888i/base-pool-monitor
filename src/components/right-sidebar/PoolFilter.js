import React, { useState, useEffect, useRef } from 'react';

const PoolFilter = ({ filters, onFilterChange, poolStats, excludedPools, onExcludePool, onRestorePool, onClearAllExcluded, pools, selectedTimeWindow, onTimeWindowChange }) => {
    const [localFilters, setLocalFilters] = useState(filters);
    const [showFilters, setShowFilters] = useState(false);
    const contentRef = useRef(null);
    const [contentHeight, setContentHeight] = useState(0);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    // 计算内容高度用于动画
    useEffect(() => {
        if (contentRef.current) {
            setContentHeight(contentRef.current.scrollHeight);
        }
    }, [showFilters, localFilters, excludedPools]);

    const updateFilter = (key, value) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        // 实时应用
        onFilterChange(newFilters);
    };

    const toggleArrayFilter = (key, value) => {
        const newArray = localFilters[key].includes(value)
            ? localFilters[key].filter(v => v !== value)
            : [...localFilters[key], value];
        updateFilter(key, newArray);
    };

    const resetFilters = () => {
        const defaultFilters = {
            minFees: '',
            maxFees: '',
            minVolume: '',
            maxVolume: '',
            minPoolValue: '',
            maxPoolValue: '',
            feeRates: [],
            protocols: [],
            tokens: [],
            hideZeroVolume: false,
            hideZeroFees: false
        };
        setLocalFilters(defaultFilters);
        onFilterChange(defaultFilters);
    };

    const hasActiveFilters = () => {
        return localFilters.minFees || localFilters.maxFees ||
            localFilters.minVolume || localFilters.maxVolume ||
            localFilters.feeRates.length > 0 || localFilters.protocols.length > 0 ||
            localFilters.hideZeroVolume || localFilters.hideZeroFees;
    };

    return (
        <div>
            {/* 筛选器标题行 */}
            <div className="flex items-center justify-between py-2 pr-1">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full flex items-center justify-between text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        <span>筛选条件</span>
                        {hasActiveFilters() && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    resetFilters();
                                }}
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                            >
                                重置
                            </button>
                        )}
                    </div>
                    <svg
                        className={`w-4 h-4 text-neutral-400 dark:text-neutral-500 transform transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {/* 筛选内容容器 - 带动画 */}
            <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                    maxHeight: showFilters ? `${contentHeight}px` : '0px',
                    opacity: showFilters ? 1 : 0
                }}
            >
                <div ref={contentRef} className="space-y-3 pt-2 pb-3">
                    {/* 时间范围选择 */}
                    <div>
                        <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">时间范围</label>
                        <div className="flex gap-1">
                            <button
                                onClick={() => onTimeWindowChange(5)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${selectedTimeWindow === 5
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                    }`}
                            >
                                5M
                            </button>
                            <button
                                onClick={() => onTimeWindowChange(15)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${selectedTimeWindow === 15
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                    }`}
                            >
                                15M
                            </button>
                            <button
                                onClick={() => onTimeWindowChange(60)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${selectedTimeWindow === 60
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                    }`}
                            >
                                1H
                            </button>
                            <button
                                onClick={() => onTimeWindowChange(360)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${selectedTimeWindow === 360
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                    }`}
                            >
                                6H
                            </button>
                            <button
                                onClick={() => onTimeWindowChange(1440)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${selectedTimeWindow === 1440
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                    }`}
                            >
                                24H
                            </button>
                        </div>
                    </div>

                    {/* 已排除池子 */}
                    {excludedPools && excludedPools.size > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-neutral-500 dark:text-neutral-400">
                                    已排除 ({excludedPools.size})
                                </label>
                                <button
                                    onClick={onClearAllExcluded}
                                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                >
                                    清空
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto scrollbar-hide">
                                {Array.from(excludedPools).map((address) => {
                                    const pool = pools?.find(p => p.address === address);
                                    return (
                                        <div key={address} className="flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-xs">
                                            <span className="text-neutral-600 dark:text-neutral-400">
                                                {pool ? pool.displayName : `${address.slice(0, 4)}...`}
                                            </span>
                                            <button
                                                onClick={() => onRestorePool(address)}
                                                className="text-green-600 dark:text-green-400 hover:text-green-700"
                                            >
                                                ✓
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 费用范围 */}
                    <div>
                        <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">费用范围 (USD)</label>
                        <div className="flex gap-1.5 items-center">
                            <div className="flex-1 relative overflow-hidden rounded">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 z-10">$</span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={localFilters.minFees}
                                    onChange={(e) => updateFilter('minFees', e.target.value)}
                                    className="w-full pl-6 pr-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 border border-transparent rounded text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500/50 focus:border-transparent focus:bg-neutral-50 dark:focus:bg-neutral-800 transition-colors duration-200"
                                />
                            </div>
                            <div className="flex items-center justify-center w-4">
                                <span className="text-xs text-neutral-400">-</span>
                            </div>
                            <div className="flex-1 relative overflow-hidden rounded">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 z-10">$</span>
                                <input
                                    type="number"
                                    placeholder="∞"
                                    value={localFilters.maxFees}
                                    onChange={(e) => updateFilter('maxFees', e.target.value)}
                                    className="w-full pl-6 pr-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 border border-transparent rounded text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500/50 focus:border-transparent focus:bg-neutral-50 dark:focus:bg-neutral-800 transition-colors duration-200"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 交易量范围 */}
                    <div>
                        <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">交易量范围 (USD)</label>
                        <div className="flex gap-1.5 items-center">
                            <div className="flex-1 relative overflow-hidden rounded">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 z-10">$</span>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={localFilters.minVolume}
                                    onChange={(e) => updateFilter('minVolume', e.target.value)}
                                    className="w-full pl-6 pr-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 border border-transparent rounded text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500/50 focus:border-transparent focus:bg-neutral-50 dark:focus:bg-neutral-800 transition-colors duration-200"
                                />
                            </div>
                            <div className="flex items-center justify-center w-4">
                                <span className="text-xs text-neutral-400">-</span>
                            </div>
                            <div className="flex-1 relative overflow-hidden rounded">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 z-10">$</span>
                                <input
                                    type="number"
                                    placeholder="∞"
                                    value={localFilters.maxVolume}
                                    onChange={(e) => updateFilter('maxVolume', e.target.value)}
                                    className="w-full pl-6 pr-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 border border-transparent rounded text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500/50 focus:border-transparent focus:bg-neutral-50 dark:focus:bg-neutral-800 transition-colors duration-200"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 费率 */}
                    <div>
                        <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">费率</label>
                        <div className="flex flex-wrap gap-1">
                            {['0.05%', '0.25%', '0.30%', '1.00%'].map(rate => (
                                <button
                                    key={rate}
                                    onClick={() => toggleArrayFilter('feeRates', rate)}
                                    className={`px-2 py-0.5 text-xs rounded ${localFilters.feeRates.includes(rate)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                        }`}
                                >
                                    {rate}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 协议 */}
                    <div>
                        <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">协议</label>
                        <div className="flex gap-1">
                            <button
                                onClick={() => toggleArrayFilter('protocols', 'PancakeswapV3')}
                                className={`px-2 py-0.5 text-xs rounded ${localFilters.protocols.includes('PancakeswapV3')
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                    }`}
                            >
                                PCS
                            </button>
                            <button
                                onClick={() => toggleArrayFilter('protocols', 'UniswapV3')}
                                className={`px-2 py-0.5 text-xs rounded ${localFilters.protocols.includes('UniswapV3')
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                    }`}
                            >
                                UNI
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PoolFilter;