'use client';
import React, { useState, useEffect } from 'react';

// 价格输入框组件
export const PriceInput = ({ value, onChange, onAdjust, onBlur, label }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {label}
        </label>
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

// 代币输入框组件
export const TokenInput = ({ symbol, value, onChange, onBlur, balance, isLoading, placeholder }) => (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 space-y-2.5 transition-colors duration-300">
        <div className="flex justify-between items-baseline">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                {symbol}
            </label>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Balance: {isLoading ? (
                    <span className="animate-pulse">...</span>
                ) : (
                    <span
                        className="font-mono cursor-pointer hover:text-primary-500 transition-colors"
                        onClick={() => onChange({ target: { value: balance } })}
                    >
                        {parseFloat(balance).toFixed(4)}
                    </span>
                )}
            </div>
        </div>
        <div className="relative flex items-center">
            <input
                type="number"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                className="w-full pl-3 pr-32 py-2.5 bg-white dark:bg-neutral-900/50 rounded-lg text-lg font-mono font-medium border-2 border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-0 outline-none transition-all duration-300"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onChange({ target: { value: (parseFloat(balance) / 2).toString() } })}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 rounded-md px-2.5 py-1.5 transition-colors"
                >
                    50%
                </button>
                <button
                    type="button"
                    onClick={() => onChange({ target: { value: balance } })}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 rounded-md px-2.5 py-1.5 transition-colors"
                >
                    MAX
                </button>
            </div>
        </div>
    </div>
);

// 滑点设置组件
export const SlippageSelector = ({ slippage, setSlippage }) => {
    return (
        <div className="flex justify-between items-center bg-neutral-100/80 dark:bg-neutral-800/60 p-2.5 pr-3 rounded-lg">
            <label className="text-sm font-medium text-neutral-600 dark:text-neutral-300 ml-1">滑点容限</label>
            <div className="relative flex items-center">
                <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={slippage}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                            setSlippage('');
                            return;
                        }
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && numValue >= 0) {
                            setSlippage(numValue > 50 ? 50 : numValue);
                        }
                    }}
                    onBlur={(e) => {
                        const value = parseFloat(e.target.value);
                        if (isNaN(value) || value <= 0) {
                            setSlippage(1);
                        }
                    }}
                    placeholder="1.0"
                    className="w-20 text-right pr-6 py-1.5 font-mono text-sm font-medium bg-white dark:bg-neutral-900/50 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                />
                <span className="absolute right-2.5 text-sm text-neutral-500 dark:text-neutral-400 pointer-events-none">
                    %
                </span>
            </div>
        </div>
    );
}; 