import { useState, useEffect, useCallback, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { getLPInfo } from '../utils/lpUtils';
import { sendBarkNotification, isNFTInRange, getNotificationSettings } from '../utils/notificationUtils';
import { executeMonitorChecks } from '../utils/monitorUtils';

// 预设的池子地址
const DEFAULT_POOLS = [
    '0x099F84dE4Fb511e861cA8F635623Eae409405873',
];

export function usePools(settings) {
    const [pools, setPools] = useState([]);
    const [customAddress, setCustomAddress] = useState('');
    const [outOfRangeCounts, setOutOfRangeCounts] = useState({});
    const [flashingMonitors, setFlashingMonitors] = useState({});
    const cancelledFetches = useRef(new Set());

    // 新增：触发监控闪烁的函数
    const triggerMonitorFlash = (poolUniqueId, monitorType) => {
        // 设置特定监控器为闪烁状态
        setFlashingMonitors(prev => ({
            ...prev,
            [poolUniqueId]: {
                ...prev[poolUniqueId],
                [monitorType]: true,
            }
        }));

        // 10秒后自动关闭闪烁
        setTimeout(() => {
            setFlashingMonitors(prev => ({
                ...prev,
                [poolUniqueId]: {
                    ...prev[poolUniqueId],
                    [monitorType]: false,
                }
            }));
        }, 10000); // 持续10秒
    };

    // 生成唯一ID的函数
    const generateUniqueId = () => {
        return 'pool_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };

    // 从本地存储加载池子列表
    useEffect(() => {
        const loadPoolsFromStorage = () => {
            if (typeof window !== 'undefined') {
                const savedData = localStorage.getItem('monitoredPools');
                if (savedData) {
                    try {
                        const parsedData = JSON.parse(savedData);
                        if (Array.isArray(parsedData) && parsedData.length > 0 && typeof parsedData[0] === 'string') {
                            console.log('Migrating old pool data format...');
                            const newData = parsedData.map(address => ({
                                address,
                                nftId: '',
                                uniqueId: generateUniqueId()
                            }));
                            localStorage.setItem('monitoredPools', JSON.stringify(newData));
                            return newData;
                        }
                        if (Array.isArray(parsedData)) {
                            // 过滤掉无效的池子数据，确保每个池子都有 address 属性
                            const validPools = parsedData.filter(pool => pool && typeof pool.address === 'string');
                            // 为没有uniqueId的池子添加uniqueId
                            const poolsWithUniqueId = validPools.map(pool => ({
                                ...pool,
                                uniqueId: pool.uniqueId || generateUniqueId()
                            }));

                            if (validPools.length < parsedData.length || poolsWithUniqueId.some(p => !validPools.find(vp => vp.uniqueId === p.uniqueId))) {
                                console.warn('Updated pool entries with unique IDs.');
                                // 如果数据被清理过或添加了uniqueId，则更新 localStorage
                                localStorage.setItem('monitoredPools', JSON.stringify(poolsWithUniqueId));
                            }
                            return poolsWithUniqueId;
                        }
                    } catch (e) {
                        console.error('Failed to parse saved pools:', e);
                    }
                }
            }
            return DEFAULT_POOLS.map(address => ({
                address,
                nftId: '',
                uniqueId: generateUniqueId()
            }));
        };

        const initialPoolsData = loadPoolsFromStorage();
        const initialPools = initialPoolsData.map(poolData => ({
            ...poolData,
            lpInfo: null,
            isLoading: false,
            error: null,
            nftInfo: null,
            isLoadingNft: false,
            nftError: null
        }));

        setPools(initialPools);
    }, []);

    // 保存池子列表到本地存储
    const savePoolsToStorage = useCallback((poolsToSave) => {
        if (typeof window !== 'undefined') {
            const dataToStore = poolsToSave.map(pool => ({
                address: pool.address,
                nftId: pool.nftId || '',
                uniqueId: pool.uniqueId
            }));
            localStorage.setItem('monitoredPools', JSON.stringify(dataToStore));
        }
    }, []);

    // 检查NFT价格并发送通知
    const checkNFTPriceAndNotify = useCallback(async (pool) => {
        if (!pool.nftInfo || !pool.lpInfo || !pool.nftInfo.isValid) {
            if (outOfRangeCounts[pool.address] > 0) {
                setOutOfRangeCounts(prev => ({ ...prev, [pool.address]: 0 }));
            }
            return;
        }

        const { lower, upper } = pool.nftInfo.priceRange || {};
        const isInRange = isNFTInRange(pool.nftInfo, lower, upper);

        if (!isInRange) {
            const newCount = (outOfRangeCounts[pool.address] || 0) + 1;
            setOutOfRangeCounts(prev => ({ ...prev, [pool.address]: newCount }));

            const { notificationThreshold, barkKey, enableBarkNotification } = getNotificationSettings();
            if (barkKey && enableBarkNotification && newCount === notificationThreshold) {
                const title = '池子价格超出区间提醒';
                const content = `池子 ${pool.lpInfo.token0.symbol}/${pool.lpInfo.token1.symbol} ${pool.address.slice(0, 6)}...${pool.address.slice(-4)} 价格1 ${pool.lpInfo.price.token1PerToken0} 价格2 ${pool.lpInfo.price.token0PerToken1} 已连续 ${newCount} 次超出区间`;
                await sendBarkNotification(title, content, pool.nftInfo.id);
            }
        } else {
            if (outOfRangeCounts[pool.address] > 0) {
                setOutOfRangeCounts(prev => ({ ...prev, [pool.address]: 0 }));
            }
        }
    }, [outOfRangeCounts]);

    // 获取单个池子信息
    const fetchPoolInfo = useCallback(async (poolAddress, poolUniqueId) => {
        if (cancelledFetches.current.has(poolUniqueId)) {
            return;
        }

        setPools(prev => prev.map(p => p.uniqueId === poolUniqueId ? { ...p, isLoading: true, error: null } : p));

        try {
            const lpInfo = await getLPInfo(poolAddress);
            setPools(prev => prev.map(p => {
                if (p.uniqueId === poolUniqueId) {
                    const targetPool = { ...p, lpInfo, isLoading: false };

                    // 当 LP 和 NFT 信息都存在时，进行价格检查
                    if (targetPool.nftInfo) {
                        checkNFTPriceAndNotify(targetPool);
                    }

                    // 执行监控检查（流动性、价格等）
                    executeMonitorChecks(targetPool, outOfRangeCounts[targetPool.address] || 0, false, triggerMonitorFlash);

                    return targetPool;
                }
                return p;
            }));
        } catch (error) {
            setPools(prev => prev.map(p =>
                p.uniqueId === poolUniqueId ? { ...p, error: error.message, isLoading: false } : p
            ));
        }
    }, [checkNFTPriceAndNotify, triggerMonitorFlash, outOfRangeCounts]);

    // 刷新所有池子
    const refreshAllPools = useCallback(async () => {
        const promises = pools.map((pool) =>
            fetchPoolInfo(pool.address, pool.uniqueId)
        );
        await Promise.allSettled(promises);
    }, [pools, fetchPoolInfo]);

    // 添加新池子
    const addPool = useCallback(() => {
        if (!customAddress.trim()) return;
        if (pools.some(pool => pool && pool.address && pool.address.toLowerCase() === customAddress.toLowerCase())) {
            alert('该池子地址已存在！');
            return;
        }

        const address = customAddress.trim();
        const uniqueId = generateUniqueId();

        if (cancelledFetches.current.has(uniqueId)) {
            cancelledFetches.current.delete(uniqueId);
        }

        const newPool = {
            address: address,
            lpInfo: null,
            isLoading: true, // 立即设置为loading状态
            error: null,
            nftId: '',
            nftInfo: null,
            isLoadingNft: false,
            nftError: null,
            uniqueId: uniqueId
        };

        // 先更新状态
        setPools(prevPools => {
            const newPools = [...prevPools, newPool];
            savePoolsToStorage(newPools);
            return newPools;
        });

        fetchPoolInfo(newPool.address, newPool.uniqueId);
        setCustomAddress('');
    }, [customAddress, pools, fetchPoolInfo, savePoolsToStorage]);

    // 删除池子
    const removePool = useCallback((poolUniqueId) => {
        const poolToRemove = pools.find(p => p.uniqueId === poolUniqueId);
        if (poolToRemove) {
            cancelledFetches.current.add(poolToRemove.uniqueId);

            // 清理相关的状态数据
            // 只有当没有其他池子使用相同地址时，才清理 outOfRangeCounts
            const hasOtherPoolsWithSameAddress = pools.some((pool) =>
                pool.uniqueId !== poolUniqueId && pool.address === poolToRemove.address
            );

            if (!hasOtherPoolsWithSameAddress) {
                setOutOfRangeCounts(prev => {
                    const newCounts = { ...prev };
                    delete newCounts[poolToRemove.address];
                    return newCounts;
                });
            }

            setFlashingMonitors(prev => {
                const newFlashing = { ...prev };
                delete newFlashing[poolToRemove.uniqueId];
                return newFlashing;
            });
        }
        const newPools = pools.filter(p => p.uniqueId !== poolUniqueId);
        setPools(newPools);
        savePoolsToStorage(newPools);
    }, [pools, savePoolsToStorage]);

    // 克隆池子
    const clonePool = useCallback((poolUniqueId) => {
        const poolToClone = pools.find(p => p.uniqueId === poolUniqueId);
        if (!poolToClone) return;

        const poolIndex = pools.findIndex(p => p.uniqueId === poolUniqueId);

        const newPool = {
            ...poolToClone,
            nftId: '',
            nftInfo: null,
            isLoadingNft: false,
            nftError: null,
            uniqueId: generateUniqueId() // 生成新的唯一ID，确保监控设置独立
        };
        const newPools = [...pools.slice(0, poolIndex + 1), newPool, ...pools.slice(poolIndex + 1)];
        setPools(newPools);
        savePoolsToStorage(newPools);
    }, [pools, savePoolsToStorage]);

    // 从侧边栏添加
    const handleAddPoolFromSidebar = useCallback((poolData) => {
        if (poolData.isRemoving) {
            const poolToRemove = pools.find(pool => pool && pool.address && pool.address.toLowerCase() === poolData.address.toLowerCase());
            if (poolToRemove) removePool(poolToRemove.uniqueId);
            return;
        }

        const existingPool = pools.find(p => p && p.address && p.address.toLowerCase() === poolData.address.toLowerCase());

        if (existingPool) {
            if (poolData.nftId) {
                setPools(prevPools => {
                    const newPools = prevPools.map(p => {
                        if (p.uniqueId === existingPool.uniqueId) {
                            return {
                                ...p,
                                nftId: poolData.nftId,
                                nftInfo: p.nftId !== poolData.nftId ? null : p.nftInfo,
                                isLoadingNft: p.nftId !== poolData.nftId ? false : p.isLoadingNft,
                                nftError: p.nftId !== poolData.nftId ? null : p.nftError,
                            };
                        }
                        return p;
                    });
                    savePoolsToStorage(newPools);
                    return newPools;
                });
            }
            return;
        }

        const uniqueId = generateUniqueId();

        if (cancelledFetches.current.has(uniqueId)) {
            cancelledFetches.current.delete(uniqueId);
        }

        const newPool = {
            address: poolData.address,
            lpInfo: null,
            isLoading: true, // 立即设置为loading状态
            error: null,
            nftId: poolData.nftId || '',
            nftInfo: null,
            isLoadingNft: false,
            nftError: null,
            uniqueId: uniqueId
        };

        // 先更新状态
        setPools(prevPools => {
            const newPools = [...prevPools, newPool];
            savePoolsToStorage(newPools);
            return newPools;
        });

        fetchPoolInfo(newPool.address, newPool.uniqueId);
    }, [pools, removePool, savePoolsToStorage, fetchPoolInfo]);

    // 拖拽结束
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setPools((items) => {
                const oldIndex = items.findIndex(item => item.uniqueId === active.id);
                const newIndex = items.findIndex(item => item.uniqueId === over.id);
                if (oldIndex === -1 || newIndex === -1) return items;
                const newItems = arrayMove(items, oldIndex, newIndex);
                savePoolsToStorage(newItems);
                return newItems;
            });
        }
    }, [savePoolsToStorage]);

    // NFT ID 变化
    const handleNftIdChange = useCallback((poolUniqueId, newNftId) => {
        setPools(prevPools => {
            const newPools = prevPools.map(pool =>
                pool.uniqueId === poolUniqueId ? { ...pool, nftId: newNftId, nftInfo: null, isLoadingNft: false, nftError: null } : pool
            );
            savePoolsToStorage(newPools);
            return newPools;
        });
    }, [savePoolsToStorage]);

    // NFT 信息更新
    const handleNftInfoUpdate = useCallback((poolUniqueId, updatedNftInfo) => {
        setPools(prev => {
            const newPools = prev.map(p => {
                if (p.uniqueId === poolUniqueId) {
                    const targetPool = { ...p, nftInfo: updatedNftInfo };
                    // 当 LP 和 NFT 信息都存在时，进行价格检查
                    if (targetPool.lpInfo) {
                        checkNFTPriceAndNotify(targetPool);
                        // 执行监控检查（流动性、价格等）
                        executeMonitorChecks(targetPool, outOfRangeCounts[targetPool.address] || 0, false, triggerMonitorFlash);
                    }
                    return targetPool;
                }
                return p;
            });
            return newPools;
        });
    }, [checkNFTPriceAndNotify, outOfRangeCounts, triggerMonitorFlash]);

    // 初始化加载 - 简化依赖，避免复杂的字符串拼接
    useEffect(() => {
        pools.forEach((pool) => {
            if (!pool.lpInfo && !pool.isLoading && !pool.error) {
                fetchPoolInfo(pool.address, pool.uniqueId);
            }
        });
    }, [pools.length, fetchPoolInfo]); // fetchPoolInfo 添加到依赖

    // 自动刷新
    const refreshAllPoolsRef = useRef();

    useEffect(() => {
        refreshAllPoolsRef.current = refreshAllPools;
    });

    useEffect(() => {
        let interval;
        if (settings.autoRefresh && settings.refreshInterval > 0) {
            interval = setInterval(() => refreshAllPoolsRef.current && refreshAllPoolsRef.current(), settings.refreshInterval * 1000);
        }
        return () => clearInterval(interval);
    }, [settings.autoRefresh, settings.refreshInterval]);

    return {
        pools,
        customAddress,
        setCustomAddress,
        outOfRangeCounts,
        addPool,
        removePool,
        clonePool,
        refreshAllPools,
        handleAddPoolFromSidebar,
        handleDragEnd,
        handleNftIdChange,
        handleNftInfoUpdate,
        flashingMonitors,
    };
} 