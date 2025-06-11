import { useState, useEffect, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { getLPInfo } from '../utils/lpUtils';
import { sendBarkNotification, isNFTInRange, getNotificationSettings } from '../utils/notificationUtils';

// 预设的池子地址
const DEFAULT_POOLS = [
    '0x099F84dE4Fb511e861cA8F635623Eae409405873',
];

export function usePools(settings) {
    const [pools, setPools] = useState([]);
    const [customAddress, setCustomAddress] = useState('');
    const [outOfRangeCounts, setOutOfRangeCounts] = useState({});

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
                            const newData = parsedData.map(address => ({ address, nftId: '' }));
                            localStorage.setItem('monitoredPools', JSON.stringify(newData));
                            return newData;
                        }
                        if (Array.isArray(parsedData) && (parsedData.length === 0 || typeof parsedData[0] === 'object')) {
                            return parsedData;
                        }
                    } catch (e) {
                        console.error('Failed to parse saved pools:', e);
                    }
                }
            }
            return DEFAULT_POOLS.map(address => ({ address, nftId: '' }));
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
                nftId: pool.nftId || ''
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

            const { notificationThreshold, barkKey } = getNotificationSettings();
            if (barkKey && newCount === notificationThreshold) {
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
    const fetchPoolInfo = useCallback(async (poolAddress, poolIndex) => {
        setPools(prev => prev.map((pool, index) =>
            index === poolIndex ? { ...pool, isLoading: true, error: null } : pool
        ));

        try {
            const lpInfo = await getLPInfo(poolAddress);
            setPools(prev => {
                const newPools = [...prev];
                const targetPool = { ...newPools[poolIndex], lpInfo, isLoading: false };
                newPools[poolIndex] = targetPool;
                // 当 LP 和 NFT 信息都存在时，进行价格检查
                if (targetPool.nftInfo) {
                    checkNFTPriceAndNotify(targetPool);
                }
                return newPools;
            });
        } catch (error) {
            setPools(prev => prev.map((pool, index) =>
                index === poolIndex ? { ...pool, error: error.message, isLoading: false } : pool
            ));
        }
    }, [checkNFTPriceAndNotify]);

    // 刷新所有池子
    const refreshAllPools = useCallback(async () => {
        const promises = pools.map((pool, index) =>
            fetchPoolInfo(pool.address, index)
        );
        await Promise.allSettled(promises);
    }, [pools, fetchPoolInfo]);

    // 添加新池子
    const addPool = useCallback(() => {
        if (!customAddress.trim()) return;
        if (pools.some(pool => pool.address.toLowerCase() === customAddress.toLowerCase())) {
            alert('该池子地址已存在！');
            return;
        }
        const newPool = {
            address: customAddress.trim(),
            lpInfo: null, isLoading: false, error: null,
            nftId: '', nftInfo: null, isLoadingNft: false, nftError: null
        };
        const newPools = [...pools, newPool];
        setPools(newPools);
        savePoolsToStorage(newPools);
        fetchPoolInfo(newPool.address, pools.length);
        setCustomAddress('');
    }, [customAddress, pools, fetchPoolInfo, savePoolsToStorage]);

    // 删除池子
    const removePool = useCallback((poolIndex) => {
        const newPools = pools.filter((_, index) => index !== poolIndex);
        setPools(newPools);
        savePoolsToStorage(newPools);
    }, [pools, savePoolsToStorage]);

    // 克隆池子
    const clonePool = useCallback((poolIndex) => {
        const poolToClone = pools[poolIndex];
        const newPool = { ...poolToClone, nftId: '', nftInfo: null, isLoadingNft: false, nftError: null };
        const newPools = [...pools.slice(0, poolIndex + 1), newPool, ...pools.slice(poolIndex + 1)];
        setPools(newPools);
        savePoolsToStorage(newPools);
    }, [pools, savePoolsToStorage]);

    // 从侧边栏添加
    const handleAddPoolFromSidebar = useCallback((poolData) => {
        if (poolData.isRemoving) {
            const poolIndex = pools.findIndex(pool => pool.address.toLowerCase() === poolData.address.toLowerCase());
            if (poolIndex !== -1) removePool(poolIndex);
            return;
        }

        const existingPoolIndex = pools.findIndex(p => p.address.toLowerCase() === poolData.address.toLowerCase());
        if (existingPoolIndex !== -1) {
            if (poolData.nftId) {
                setPools(prevPools => {
                    const newPools = [...prevPools];
                    const existingPool = newPools[existingPoolIndex];
                    newPools[existingPoolIndex] = {
                        ...existingPool,
                        nftId: poolData.nftId,
                        nftInfo: existingPool.nftId !== poolData.nftId ? null : existingPool.nftInfo,
                        isLoadingNft: existingPool.nftId !== poolData.nftId ? false : existingPool.isLoadingNft,
                        nftError: existingPool.nftId !== poolData.nftId ? null : existingPool.nftError,
                    };
                    savePoolsToStorage(newPools);
                    return newPools;
                });
            }
            return;
        }

        const newPool = {
            address: poolData.address, lpInfo: null, isLoading: false, error: null,
            nftId: poolData.nftId || '', nftInfo: null, isLoadingNft: false, nftError: null
        };
        const newPools = [...pools, newPool];
        setPools(newPools);
        savePoolsToStorage(newPools);
        fetchPoolInfo(newPool.address, pools.length);
    }, [pools, removePool, savePoolsToStorage, fetchPoolInfo]);

    // 拖拽结束
    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setPools((items) => {
                const oldIndex = items.findIndex((item, index) => `${item.address}-${index}` === active.id);
                const newIndex = items.findIndex((item, index) => `${item.address}-${index}` === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                savePoolsToStorage(newItems);
                return newItems;
            });
        }
    }, [savePoolsToStorage]);

    // NFT ID 变化
    const handleNftIdChange = useCallback((poolIndex, newNftId) => {
        setPools(prevPools => {
            const newPools = prevPools.map((pool, index) =>
                index === poolIndex ? { ...pool, nftId: newNftId, nftInfo: null, isLoadingNft: false, nftError: null } : pool
            );
            savePoolsToStorage(newPools);
            return newPools;
        });
    }, [savePoolsToStorage]);

    // NFT 信息更新
    const handleNftInfoUpdate = useCallback((poolIndex, updatedNftInfo) => {
        setPools(prev => {
            const newPools = [...prev];
            const targetPool = { ...newPools[poolIndex], nftInfo: updatedNftInfo };
            newPools[poolIndex] = targetPool;
            // 当 LP 和 NFT 信息都存在时，进行价格检查
            if (targetPool.lpInfo) {
                checkNFTPriceAndNotify(targetPool);
            }
            return newPools;
        });
    }, [checkNFTPriceAndNotify]);

    // 初始化加载
    useEffect(() => {
        if (pools.length > 0) {
            refreshAllPools();
        }
    }, [pools.length]); // 依赖 length 确保只在首次加载或添加/删除时触发

    // 自动刷新
    useEffect(() => {
        let interval;
        if (settings.autoRefresh && settings.refreshInterval > 0) {
            interval = setInterval(refreshAllPools, settings.refreshInterval * 1000);
        }
        return () => clearInterval(interval);
    }, [settings.autoRefresh, settings.refreshInterval, refreshAllPools]);

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
    };
} 