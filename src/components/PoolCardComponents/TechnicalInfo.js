'use client';

import React from 'react';

const TechnicalInfo = ({ lpInfo, outOfRangeCount }) => {
    return (
        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg">
            <div className="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400">
                <span>Tick: <span className="font-medium text-neutral-700 dark:text-neutral-300">{lpInfo.tick}</span></span>
                {outOfRangeCount > 0 ? <span className="text-center"><span className="font-medium text-neutral-700 dark:text-neutral-300">已连续 {outOfRangeCount} 次超出区间</span></span> : ''}
                <span className="text-center">更新: <span className="font-medium text-neutral-700 dark:text-neutral-300">{lpInfo.lastUpdated}</span></span>
            </div>
        </div>
    );
};

export default TechnicalInfo; 