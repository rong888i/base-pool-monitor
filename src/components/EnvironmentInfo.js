'use client';

import { useState, useEffect } from 'react';
import { logger, isDev, isProd, isVercelEnv } from '../utils/logger';

const EnvironmentInfo = () => {
    const [envInfo, setEnvInfo] = useState(null);

    useEffect(() => {
        // 只在开发环境中显示环境信息
        if (isDev) {
            setEnvInfo(logger.getEnvironment());
        }
    }, []);

    // 只在开发环境中渲染
    if (!isDev || !envInfo) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 z-50 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 text-xs">
            <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                🚧 开发环境
            </div>
            <div className="space-y-1 text-yellow-700 dark:text-yellow-300">
                <div>NODE_ENV: {process.env.NODE_ENV}</div>
                <div>VERCEL: {process.env.VERCEL || 'undefined'}</div>
                <div>日志级别: {envInfo.logLevel}</div>
                <div>Vercel环境: {envInfo.isVercel ? '是' : '否'}</div>
            </div>
        </div>
    );
};

export default EnvironmentInfo; 