'use client';

import React from 'react';

const ApprovalSection = ({
    connected,
    token0NeedsApproval,
    token1NeedsApproval,
    poolInfo,
    handleApprove,
    isApproving
}) => {
    if (!connected || (!token0NeedsApproval && !token1NeedsApproval)) {
        return null;
    }

    return (
        <div className="space-y-2">
            {token0NeedsApproval && (
                <div className="flex items-center justify-between p-2.5 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                需要授权 {poolInfo.token0?.symbol}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                首次使用需授权
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => handleApprove(poolInfo.token0?.address, poolInfo.token0?.symbol)}
                        disabled={isApproving[poolInfo.token0?.address]}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow"
                    >
                        {isApproving[poolInfo.token0?.address] ? (
                            <span className="flex items-center gap-1.5">
                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                授权中
                            </span>
                        ) : '立即授权'}
                    </button>
                </div>
            )}

            {token1NeedsApproval && (
                <div className="flex items-center justify-between p-2.5 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                需要授权 {poolInfo.token1?.symbol}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                首次使用需授权
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => handleApprove(poolInfo.token1?.address, poolInfo.token1?.symbol)}
                        disabled={isApproving[poolInfo.token1?.address]}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow"
                    >
                        {isApproving[poolInfo.token1?.address] ? (
                            <span className="flex items-center gap-1.5">
                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                授权中
                            </span>
                        ) : '立即授权'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ApprovalSection; 