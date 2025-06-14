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
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">代币授权</h4>

            {token0NeedsApproval && (
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                    <div>
                        <p className="text-orange-700 dark:text-orange-300 font-medium">
                            授权 {poolInfo.token0?.symbol}
                        </p>
                        <p className="text-orange-600 dark:text-orange-400 text-sm">
                            允许合约使用您的 {poolInfo.token0?.symbol} 代币
                        </p>
                    </div>
                    <button
                        onClick={() => handleApprove(poolInfo.token0?.address, poolInfo.token0?.symbol)}
                        disabled={isApproving[poolInfo.token0?.address]}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                        {isApproving[poolInfo.token0?.address] ? '授权中...' : '授权'}
                    </button>
                </div>
            )}

            {token1NeedsApproval && (
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                    <div>
                        <p className="text-orange-700 dark:text-orange-300 font-medium">
                            授权 {poolInfo.token1?.symbol}
                        </p>
                        <p className="text-orange-600 dark:text-orange-400 text-sm">
                            允许合约使用您的 {poolInfo.token1?.symbol} 代币
                        </p>
                    </div>
                    <button
                        onClick={() => handleApprove(poolInfo.token1?.address, poolInfo.token1?.symbol)}
                        disabled={isApproving[poolInfo.token1?.address]}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                        {isApproving[poolInfo.token1?.address] ? '授权中...' : '授权'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ApprovalSection; 