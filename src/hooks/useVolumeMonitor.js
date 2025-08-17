import { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { decodePancakeSwapSwap, decodeUniswapSwap } from '../utils/volumeMonitorUtils';
import { getWebSocketUrl, RECONNECT_CONFIG } from '../config/websocket';
import { logger } from '../utils/logger';
import {
    getPoolBasicInfo,
    getTokenInfo,
    checkCommonTokenPool,
    calculateUSDVolume,
    checkBSCConnection,
    COMMON_TOKENS
} from '../utils/poolInfoUtils';

// 事件主题
const TOPICS = {
    PANCAKESWAP_V3_SWAP: '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83',
    UNISWAP_V3_SWAP: '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67'
};

// 时间窗口（毫秒）
const TIME_WINDOWS = {
    FIVE_MIN: 5 * 60 * 1000,
    FIFTEEN_MIN: 15 * 60 * 1000
};

// 池子信息缓存
const POOL_CACHE = new Map();

export const useVolumeMonitor = (settings = {}) => {
    const [pools, setPools] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('未连接');
    const [selectedTimeWindow, setSelectedTimeWindow] = useState('5m');
    const [topPools, setTopPools] = useState([]);
    const [stats, setStats] = useState({
        totalPools: 0,
        commonTokenPools: 0,
        totalVolume: 0,
        totalSwaps: 0
    });

    const wsRef = useRef(null);
    const poolsDataRef = useRef(new Map());
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);

    // 初始化池子数据（使用真实的区块链数据）
    const initializePool = useCallback(async (poolAddress, protocol) => {
        const poolKey = poolAddress.toLowerCase();

        // 如果已经初始化过，直接返回
        if (poolsDataRef.current.has(poolKey)) {
            logger.info(`池子已存在: ${poolAddress}`);
            return;
        }

        try {
            logger.info(`正在初始化池子: ${poolAddress} (${protocol})`);

            // 获取池子基本信息（通过合约调用）
            const poolInfo = await getPoolBasicInfo(poolAddress);

            // 如果获取失败或不是常用代币池子，跳过
            if (!poolInfo) {
                logger.warn(`跳过池子: ${poolAddress} - 获取信息失败或不是常用代币池子`);
                return;
            }

            // 更新协议信息
            poolInfo.protocol = protocol;

            // fee已经在getPoolBasicInfo中获取，不需要额外处理
            logger.info(`池子信息获取完成: ${poolAddress}, fee=${poolInfo.fee}, protocol=${protocol}`);

            // 获取代币信息
            const [token0Info, token1Info] = await Promise.all([
                getTokenInfo(poolInfo.token0),
                getTokenInfo(poolInfo.token1)
            ]);

            // 初始化交易量数据
            poolsDataRef.current.set(poolKey, {
                ...poolInfo,
                token0Info,
                token1Info,
                displayName: `${token0Info.symbol}/${token1Info.symbol}`,
                fullName: `${token0Info.name}/${token1Info.name}`,
                volume5m: 0,
                volume15m: 0,
                lastUpdate: Date.now(),
                swapCount5m: 0,
                swapCount15m: 0,
                transactions: [],
                totalVolume: 0,
                totalSwaps: 0,
                firstSeen: Date.now()
            });

            logger.info(`池子初始化成功: ${poolAddress} - ${poolInfo.displayName} (${poolInfo.protocol}) - Fee: ${poolInfo.fee}`);

            // 更新统计信息
            updateStats();
        } catch (error) {
            logger.error(`初始化池子失败 ${poolAddress}:`, error);
        }
    }, []);

    // 添加交易记录（使用USD交易量计算）
    const addTransaction = useCallback((poolAddress, amount0, amount1, timestamp) => {
        const poolKey = poolAddress.toLowerCase();
        const poolData = poolsDataRef.current.get(poolKey);

        if (poolData) {
            logger.info(`添加交易记录: ${poolAddress}, amount0: ${amount0}, amount1: ${amount1}`);

            // 计算USD交易量
            const usdVolume = calculateUSDVolume(
                amount0,
                amount1,
                poolData.token0,
                poolData.token1,
                poolData.token0Info?.decimals || 18,
                poolData.token1Info?.decimals || 18
            );

            // 如果USD交易量为0，跳过（不包含常用代币的交易）
            if (usdVolume === 0) {
                logger.warn(`跳过非常用代币交易: ${poolAddress}`);
                return;
            }

            const transaction = {
                amount0: Math.abs(parseFloat(amount0)),
                amount1: Math.abs(parseFloat(amount1)),
                timestamp,
                usdVolume,
                rawVolume: Math.abs(parseFloat(amount0)) + Math.abs(parseFloat(amount1))
            };

            poolData.transactions.push(transaction);

            // 清理过期交易（只保留15分钟内的数据）
            const now = Date.now();
            poolData.transactions = poolData.transactions.filter(tx =>
                now - tx.timestamp < TIME_WINDOWS.FIFTEEN_MIN
            );

            // 重新计算USD交易量
            poolData.volume5m = poolData.transactions
                .filter(tx => now - tx.timestamp < TIME_WINDOWS.FIVE_MIN)
                .reduce((sum, tx) => sum + tx.usdVolume, 0);

            poolData.volume15m = poolData.transactions
                .filter(tx => now - tx.timestamp < TIME_WINDOWS.FIFTEEN_MIN)
                .reduce((sum, tx) => sum + tx.usdVolume, 0);

            poolData.swapCount5m = poolData.transactions
                .filter(tx => now - tx.timestamp < TIME_WINDOWS.FIVE_MIN).length;

            poolData.swapCount15m = poolData.transactions
                .filter(tx => now - tx.timestamp < TIME_WINDOWS.FIFTEEN_MIN).length;

            // 更新统计信息
            poolData.totalVolume += usdVolume;
            poolData.totalSwaps += 1;
            poolData.lastUpdate = now;

            logger.info(`交易量更新: 5m=$${poolData.volume5m.toFixed(2)}, 15m=$${poolData.volume15m.toFixed(2)}`);
        } else {
            logger.warn(`池子数据不存在: ${poolAddress}`);
        }
    }, []);

    // 更新统计信息
    const updateStats = useCallback(() => {
        const poolsArray = Array.from(poolsDataRef.current.values());

        // 过滤池子：只包含常用代币且排除0.01%的池子
        const filteredPools = poolsArray.filter(pool => {
            // 必须是常用代币池子
            if (!pool.isCommonPool) return false;

            // 排除0.01%的池子（这些池子通常交易量较小，不应该参与统计）
            if (pool.fee === '0.01%') return false;

            return true;
        });

        const totalVolume = filteredPools.reduce((sum, pool) => {
            const volume = selectedTimeWindow === '5m' ? pool.volume5m : pool.volume15m;
            return sum + volume;
        }, 0);

        const totalSwaps = filteredPools.reduce((sum, pool) => {
            const swaps = selectedTimeWindow === '5m' ? pool.swapCount5m : pool.swapCount15m;
            return sum + swaps;
        }, 0);

        const newStats = {
            totalPools: filteredPools.length,
            commonTokenPools: filteredPools.length,
            totalVolume,
            totalSwaps
        };

        setStats(newStats);
        logger.info('统计信息更新 (已排除0.01%池子):', newStats);
    }, [selectedTimeWindow]);

    // 更新排名前10的池子
    const updateTopPools = useCallback(() => {
        const poolsArray = Array.from(poolsDataRef.current.values());

        // 只显示包含常用代币的池子，并排除0.01%的池子
        const commonTokenPools = poolsArray.filter(pool => {
            // 必须是常用代币池子
            if (!pool.isCommonPool) return false;

            // 排除0.01%的池子（这些池子通常交易量较小，不应该参与排名）
            if (pool.fee === '0.01%') return false;

            return true;
        });

        const sortedPools = commonTokenPools
            .sort((a, b) => {
                const volumeA = selectedTimeWindow === '5m' ? a.volume5m : a.volume15m;
                const volumeB = selectedTimeWindow === '5m' ? b.volume5m : b.volume15m;
                return volumeB - volumeA;
            })
            .slice(0, 20);

        logger.info(`更新排名: ${sortedPools.length} 个池子 (已排除0.01%池子)`);
        setTopPools(sortedPools);

        // 更新统计信息
        updateStats();
    }, [selectedTimeWindow, updateStats]);

    // 连接WebSocket
    const connectWebSocket = useCallback(async () => {
        try {
            logger.info('开始连接WebSocket...');

            // 首先检查BSC网络连接
            const bscConnected = await checkBSCConnection();
            if (!bscConnected) {
                setConnectionStatus('BSC网络连接失败');
                logger.error('无法连接到BSC网络，请检查网络连接');
                return;
            }

            // 优先使用设置中的WSS URL，如果没有设置则使用默认的WebSocket URL
            let wsUrl;
            if (settings?.wssUrl && settings.wssUrl.trim()) {
                wsUrl = settings.wssUrl.trim();
                logger.info('使用设置中的WSS URL:', wsUrl);
            } else {
                wsUrl = getWebSocketUrl('BSC', 'DEFAULT');
                logger.info('使用默认WebSocket URL:', wsUrl);
            }

            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                logger.info('WebSocket连接已建立');
                setIsConnected(true);
                setConnectionStatus('已连接');

                // 订阅PancakeSwap V3 Swap事件
                const pancakeswapSub = {
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_subscribe',
                    params: [
                        'logs',
                        {
                            topics: [TOPICS.PANCAKESWAP_V3_SWAP]
                        }
                    ]
                };

                // 订阅Uniswap V3 Swap事件
                const uniswapSub = {
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'eth_subscribe',
                    params: [
                        'logs',
                        {
                            topics: [TOPICS.UNISWAP_V3_SWAP]
                        }
                    ]
                };

                logger.info('发送订阅请求...');
                wsRef.current.send(JSON.stringify(pancakeswapSub));
                wsRef.current.send(JSON.stringify(uniswapSub));

                logger.info('等待真实的Swap事件...');
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    logger.info('收到WebSocket消息:', data);

                    if (data.method === 'eth_subscription' && data.params && data.params.result) {
                        const log = data.params.result;
                        logger.info('解析到事件日志:', log);

                        if (log.topics && log.topics.length > 0) {
                            const topic = log.topics[0];
                            const poolAddress = log.address;

                            if (topic === TOPICS.PANCAKESWAP_V3_SWAP) {
                                // 解析PancakeSwap V3 Swap事件
                                const decoded = decodePancakeSwapSwap(log.data, log.topics);
                                if (decoded) {
                                    logger.info('PancakeSwap事件解析成功:', decoded);
                                    // 异步初始化池子（只在第一次遇到时），不传递硬编码的fee
                                    initializePool(poolAddress, 'PancakeSwap V3');
                                    // 立即添加交易记录
                                    addTransaction(poolAddress, decoded.amount0, decoded.amount1, Date.now());
                                }
                            } else if (topic === TOPICS.UNISWAP_V3_SWAP) {
                                // 解析Uniswap V3 Swap事件
                                const decoded = decodeUniswapSwap(log.data, log.topics);
                                if (decoded) {
                                    logger.info('Uniswap事件解析成功:', decoded);
                                    // 异步初始化池子（只在第一次遇到时），不传递硬编码的fee
                                    initializePool(poolAddress, 'Uniswap V3');
                                    // 立即添加交易记录
                                    addTransaction(poolAddress, decoded.amount0, decoded.amount1, Date.now());
                                }
                            }
                        }
                    }
                } catch (error) {
                    logger.error('解析WebSocket消息失败:', error);
                }
            };

            wsRef.current.onerror = (error) => {
                logger.error('WebSocket错误:', error);
                setConnectionStatus('连接错误');
                setIsConnected(false);
            };

            wsRef.current.onclose = () => {
                logger.info('WebSocket连接已关闭');
                setConnectionStatus('连接断开');
                setIsConnected(false);

                // 智能重连逻辑
                if (reconnectAttemptsRef.current < RECONNECT_CONFIG.MAX_ATTEMPTS) {
                    const delay = Math.min(
                        RECONNECT_CONFIG.INITIAL_DELAY * Math.pow(RECONNECT_CONFIG.BACKOFF_MULTIPLIER, reconnectAttemptsRef.current),
                        RECONNECT_CONFIG.MAX_DELAY
                    );

                    reconnectAttemptsRef.current++;
                    setConnectionStatus(`重连中... (${reconnectAttemptsRef.current}/${RECONNECT_CONFIG.MAX_ATTEMPTS})`);

                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                    }
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectWebSocket();
                    }, delay);
                } else {
                    setConnectionStatus('重连失败，请手动重试');
                    reconnectAttemptsRef.current = 0;
                }
            };

        } catch (error) {
            logger.error('建立WebSocket连接失败:', error);
            setConnectionStatus('连接失败');
            setIsConnected(false);
        }
    }, [initializePool, addTransaction, settings]);

    // 断开连接
    const disconnectWebSocket = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        setIsConnected(false);
        setConnectionStatus('已断开');
    }, []);

    // 刷新数据
    const refreshData = useCallback(() => {
        updateTopPools();
    }, [updateTopPools]);

    // 切换时间窗口
    const changeTimeWindow = useCallback((timeWindow) => {
        setSelectedTimeWindow(timeWindow);
    }, []);

    // 清理缓存（可选功能）
    const clearCache = useCallback(() => {
        POOL_CACHE.clear();
        poolsDataRef.current.clear();
        setTopPools([]);
        setStats({
            totalPools: 0,
            commonTokenPools: 0,
            totalVolume: 0,
            totalSwaps: 0
        });
        logger.info('缓存已清理');
    }, []);

    // 获取缓存统计信息
    const getCacheStats = useCallback(() => {
        return {
            poolCacheSize: POOL_CACHE.size,
            poolsDataSize: poolsDataRef.current.size,
            topPoolsCount: topPools.length,
            stats
        };
    }, [topPools.length, stats]);

    // 定期更新排名
    useEffect(() => {
        const interval = setInterval(() => {
            updateTopPools();
        }, 1000); // 每秒更新一次

        return () => clearInterval(interval);
    }, [updateTopPools]);

    // 清理函数
    useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return {
        pools: topPools,
        isConnected,
        connectionStatus,
        selectedTimeWindow,
        stats,
        connectWebSocket,
        disconnectWebSocket,
        refreshData,
        changeTimeWindow,
        clearCache,
        getCacheStats
    };
}; 