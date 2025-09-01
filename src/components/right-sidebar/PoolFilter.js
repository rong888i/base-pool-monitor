import React, { useState, useEffect } from 'react';

const PoolFilter = ({ filters, onFilterChange, poolStats }) => {
    const [localFilters, setLocalFilters] = useState(filters);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

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
        <div className="space-y-2">
            {/* 简单的展开/收起按钮 */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                    {showFilters ? '收起筛选 ▲' : '展开筛选 ▼'}
                </button>
                {hasActiveFilters() && (
                    <button
                        onClick={resetFilters}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                        清除
                    </button>
                )}
            </div>

            {/* 筛选内容 */}
            {showFilters && (
                <div className="space-y-3 pb-3">


                    {/* 费用范围 */}
                    <div>
                        <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">费用 $</label>
                        <div className="flex gap-1 items-center">
                            <input
                                type="number"
                                placeholder="0"
                                value={localFilters.minFees}
                                onChange={(e) => updateFilter('minFees', e.target.value)}
                                className="w-full min-w-0 px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded"
                            />
                            <span className="text-xs text-neutral-400 flex-shrink-0">-</span>
                            <input
                                type="number"
                                placeholder="∞"
                                value={localFilters.maxFees}
                                onChange={(e) => updateFilter('maxFees', e.target.value)}
                                className="w-full min-w-0 px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded"
                            />
                        </div>
                    </div>

                    {/* 交易量范围 */}
                    <div>
                        <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">交易量 $</label>
                        <div className="flex gap-1 items-center">
                            <input
                                type="number"
                                placeholder="0"
                                value={localFilters.minVolume}
                                onChange={(e) => updateFilter('minVolume', e.target.value)}
                                className="w-full min-w-0 px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded"
                            />
                            <span className="text-xs text-neutral-400 flex-shrink-0">-</span>
                            <input
                                type="number"
                                placeholder="∞"
                                value={localFilters.maxVolume}
                                onChange={(e) => updateFilter('maxVolume', e.target.value)}
                                className="w-full min-w-0 px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded"
                            />
                        </div>
                    </div>

                    {/* 费率 */}
                    <div>
                        <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">费率</label>
                        <div className="flex flex-wrap gap-1">
                            {['0.01%', '0.05%', '0.25%', '0.30%', '1.00%'].map(rate => (
                                <button
                                    key={rate}
                                    onClick={() => toggleArrayFilter('feeRates', rate)}
                                    className={`px-2 py-0.5 text-xs rounded ${localFilters.feeRates.includes(rate)
                                            ? 'bg-neutral-700 text-white'
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
                                        ? 'bg-neutral-700 text-white'
                                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                    }`}
                            >
                                PCS
                            </button>
                            <button
                                onClick={() => toggleArrayFilter('protocols', 'UniswapV3')}
                                className={`px-2 py-0.5 text-xs rounded ${localFilters.protocols.includes('UniswapV3')
                                        ? 'bg-neutral-700 text-white'
                                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                                    }`}
                            >
                                UNI
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PoolFilter;