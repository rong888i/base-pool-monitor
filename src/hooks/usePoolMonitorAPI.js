import { useState, useEffect, useCallback, useRef } from 'react';

// 使用本地API转发，避免跨域和部署问题
const API_BASE_URL = '/api/pool-monitor';

export const usePoolMonitorAPI = () => {
    const [pools, setPools] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedTimeWindow, setSelectedTimeWindow] = useState(300); // 默认5分钟（300秒）
    const [lastUpdate, setLastUpdate] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('未连接');

    const intervalRef = useRef(null);
    const isActiveRef = useRef(false);

    // 获取池子数据
    const fetchPools = useCallback(async (timeWindowMinutes = selectedTimeWindow) => {
        try {
            setIsLoading(true);
            setError(null);
            setConnectionStatus('正在获取数据...');

            const response = await fetch(`${API_BASE_URL}?path=/api/pools/top-fees/${timeWindowMinutes}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // 添加超时控制 (兼容性处理)
                ...(typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? {
                    signal: AbortSignal.timeout(10000)
                } : {}),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                // 转换API数据格式以适配现有UI组件
                const formattedPools = data.data.map((pool, index) => ({
                    id: pool.pool_address,
                    address: pool.pool_address,
                    factory: pool.factory_name,
                    displayName: pool.trading_pair,
                    token0Symbol: pool.token0_symbol,
                    token1Symbol: pool.token1_symbol,
                    stableCoinSymbol: pool.stable_coin_symbol,
                    fee: `${pool.fee_percentage}%`,
                    feeRate: pool.fee_rate,
                    transactionCount: pool.transaction_count,
                    totalFees: pool.total_fees,
                    totalVolume: pool.total_volume,
                    avgPoolValue: pool.avg_pool_value,
                    currentPoolValue: pool.current_pool_value,
                    currentToken0Balance: pool.current_token0_balance,
                    currentToken1Balance: pool.current_token1_balance,
                    rank: index + 1,
                    // 为了兼容现有组件，添加一些计算属性
                    volume: pool.total_volume,
                    volumeUSD: pool.total_volume,
                    swapCount: pool.transaction_count,
                    lastUpdate: new Date().toISOString(),
                }));

                setPools(formattedPools);
                setLastUpdate(new Date());
                setConnectionStatus('已连接');

                console.info(`成功获取 ${formattedPools.length} 个池子数据 (${timeWindowMinutes}分钟窗口)`);
            } else {
                throw new Error('API返回数据格式错误');
            }
        } catch (err) {
            console.error('获取池子数据失败:', err);
            setError(err.message);
            setConnectionStatus('连接失败');

            // 如果是网络错误，保留上次的数据
            if (err.name === 'TypeError' || err.name === 'AbortError') {
                setConnectionStatus('网络连接失败');
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedTimeWindow]);

    // 开始自动刷新
    const startMonitoring = useCallback(() => {
        if (isActiveRef.current) return; // 避免重复启动

        isActiveRef.current = true;
        setConnectionStatus('启动中...');

        // 立即获取一次数据，使用当前选择的时间窗口
        fetchPools(selectedTimeWindow);

        // 设置定时器，每10秒刷新一次，使用当前选择的时间窗口
        intervalRef.current = setInterval(() => {
            if (isActiveRef.current) {
                fetchPools(selectedTimeWindow);
            }
        }, 10000);

        console.info('池子监控已启动，每10秒刷新一次');
    }, [fetchPools, selectedTimeWindow]);

    // 停止自动刷新
    const stopMonitoring = useCallback(() => {
        isActiveRef.current = false;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        setConnectionStatus('已停止');
        console.info('池子监控已停止');
    }, []);

    // 手动刷新
    const refreshData = useCallback(() => {
        fetchPools(selectedTimeWindow);
    }, [fetchPools, selectedTimeWindow]);

    // 切换时间窗口
    const changeTimeWindow = useCallback((minutes) => {
        setSelectedTimeWindow(minutes);
        // 如果正在监控中，立即用新的时间窗口获取数据
        if (isActiveRef.current) {
            fetchPools(minutes);
            // 重新设置定时器，确保后续的自动刷新使用新的时间窗口
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = setInterval(() => {
                    if (isActiveRef.current) {
                        fetchPools(minutes);
                    }
                }, 10000);
            }
        }
    }, [fetchPools]);

    // 获取统计信息
    const getStats = useCallback(() => {
        if (!pools.length) {
            return {
                totalPools: 0,
                totalVolume: 0,
                totalFees: 0,
                totalTransactions: 0,
                avgPoolValue: 0,
            };
        }

        return {
            totalPools: pools.length,
            totalVolume: pools.reduce((sum, pool) => sum + (pool.totalVolume || 0), 0),
            totalFees: pools.reduce((sum, pool) => sum + (pool.totalFees || 0), 0),
            totalTransactions: pools.reduce((sum, pool) => sum + (pool.transactionCount || 0), 0),
            avgPoolValue: pools.reduce((sum, pool) => sum + (pool.avgPoolValue || 0), 0) / pools.length,
        };
    }, [pools]);

    // 时间窗口选项
    const timeWindowOptions = [
        { value: 300, label: '5分钟', shortLabel: '5m' },
        { value: 900, label: '15分钟', shortLabel: '15m' },
        { value: 3600, label: '1小时', shortLabel: '1h' },
        { value: 86400, label: '24小时', shortLabel: '24h' },
    ];

    // 获取当前时间窗口标签
    const getCurrentTimeWindowLabel = useCallback(() => {
        const option = timeWindowOptions.find(opt => opt.value === selectedTimeWindow);
        if (option) {
            return option.label;
        }
        // 如果没有找到匹配的选项，将秒转换为分钟
        const minutes = Math.floor(selectedTimeWindow / 60);
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            return `${hours}小时`;
        }
        return `${minutes}分钟`;
    }, [selectedTimeWindow, timeWindowOptions]);

    // 清理函数
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            isActiveRef.current = false;
        };
    }, []);

    return {
        pools,
        isLoading,
        error,
        selectedTimeWindow,
        lastUpdate,
        connectionStatus,
        isActive: isActiveRef.current,
        stats: getStats(),
        timeWindowOptions,
        currentTimeWindowLabel: getCurrentTimeWindowLabel(),

        // 方法
        startMonitoring,
        stopMonitoring,
        refreshData,
        changeTimeWindow,
        fetchPools,
    };
}; 