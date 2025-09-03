'use client';

import { useState } from 'react';

const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const ArchivedPoolCard = ({ pool, onRestore }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="bg-white dark:bg-neutral-800 rounded-lg p-3 shadow-sm border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-all duration-200"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                    {pool.lpInfo ? (
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm text-neutral-700 dark:text-neutral-200">
                                {pool.lpInfo.token0.symbol} / {pool.lpInfo.token1.symbol}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300">
                                {pool.lpInfo.feePercentage}%
                            </span>
                        </div>
                    ) : (
                        <span className="text-sm text-neutral-600 dark:text-neutral-300">
                            未加载
                        </span>
                    )}
                </div>
                {pool.lpInfo && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${pool.lpInfo.protocol.color} ${pool.lpInfo.protocol.borderColor} border`}>
                        {pool.lpInfo.protocol.name.split(' ')[0]}
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between">
                <a
                    href={`https://bscscan.com/address/${pool.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    {formatAddress(pool.address)}
                </a>

                <button
                    onClick={() => onRestore(pool.uniqueId)}
                    className={`text-xs px-2 py-1 rounded transition-all duration-200 ${isHovered
                            ? 'bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                        } hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-500/20 dark:hover:text-primary-400`}
                >
                    恢复
                </button>
            </div>

            {pool.nftId && (
                <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        NFT ID: {pool.nftId}
                    </span>
                </div>
            )}
        </div>
    );
};

const ArchivedPoolsSection = ({ archivedPools, onRestorePool }) => {
    if (!archivedPools || archivedPools.length === 0) {
        return (
            <div className="px-3 py-4">
                <div className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                    暂无归档的池子
                </div>
            </div>
        );
    }

    return (
        <div className="px-3 py-3 space-y-2">
            {/* <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                已归档 {archivedPools.length} 个池子
            </div> */}
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {archivedPools.map(pool => (
                    <ArchivedPoolCard
                        key={pool.uniqueId}
                        pool={pool}
                        onRestore={onRestorePool}
                    />
                ))}
            </div>
        </div>
    );
};

export default ArchivedPoolsSection;