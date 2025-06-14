'use client';

import React from 'react';

const WalletStatus = ({ isInitializing, connected, connect }) => {
    if (isInitializing) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 border border-blue-200/50 dark:border-blue-700/50">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    </div>
                    <div>
                        <p className="font-semibold text-blue-700 dark:text-blue-300">连接钱包中</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">正在初始化连接...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!connected) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 border border-amber-200/50 dark:border-amber-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-semibold text-amber-700 dark:text-amber-300">未连接钱包</p>
                            <p className="text-sm text-amber-600 dark:text-amber-400">请先连接钱包以继续</p>
                        </div>
                    </div>
                    <button
                        onClick={connect}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 
                            text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                        连接钱包
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 border border-green-200/50 dark:border-green-700/50">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                    <p className="font-semibold text-green-700 dark:text-green-300">钱包已连接</p>
                    <p className="text-sm text-green-600 dark:text-green-400">准备添加流动性</p>
                </div>
            </div>
        </div>
    );
};

export default WalletStatus; 