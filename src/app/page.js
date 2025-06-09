'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortablePoolCard } from '../components/PoolCard';
import Sidebar from '../components/Sidebar';
import Settings from '../components/Settings';
import { getLPInfo } from '../utils/lpUtils';
import { sendBarkNotification, isNFTInRange, getNotificationSettings } from '../utils/notificationUtils';

// 预设的池子地址
const DEFAULT_POOLS = [
  '0xD317B5480faf6Ef228C502d9c4D0c04599C5B74b',
  '0x099f84de4fb511e861ca8f635623eae409405873',
  '0xafeCDd2Fc04F0939d7B6835529677608470c063d',
  '0x3FF1B7b1d2516a981670a9fF0B485e7c905b2400'
];

export default function Home() {
  const [pools, setPools] = useState([]);
  const [customAddress, setCustomAddress] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [outOfRangeCounts, setOutOfRangeCounts] = useState({});
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 3
  });

  // 从本地存储加载池子列表
  useEffect(() => {
    const loadPoolsFromStorage = () => {
      if (typeof window !== 'undefined') {
        const savedPools = localStorage.getItem('monitoredPools');
        if (savedPools) {
          try {
            return JSON.parse(savedPools);
          } catch (e) {
            console.error('Failed to parse saved pools:', e);
          }
        }
      }
      return DEFAULT_POOLS;
    };

    const initialPools = loadPoolsFromStorage().map(address => ({
      address,
      lpInfo: null,
      isLoading: false,
      error: null,
      nftId: '',
      nftInfo: null,
      isLoadingNft: false,
      nftError: null
    }));

    setPools(initialPools);
  }, []);

  // 保存池子列表到本地存储
  const savePoolsToStorage = (newPools) => {
    if (typeof window !== 'undefined') {
      const poolAddresses = newPools.map(pool => pool.address);
      localStorage.setItem('monitoredPools', JSON.stringify(poolAddresses));
    }
  };

  // 获取单个池子信息
  const fetchPoolInfo = async (poolAddress, poolIndex) => {
    setPools(prev => prev.map((pool, index) =>
      index === poolIndex ? { ...pool, isLoading: true, error: null } : pool
    ));

    try {
      const lpInfo = await getLPInfo(poolAddress);
      setPools(prev => {
        const newPools = prev.map((pool, index) =>
          index === poolIndex ? { ...pool, lpInfo, isLoading: false } : pool
        );
        // 检查价格并发送通知
        const updatedPool = newPools[poolIndex];
        if (updatedPool.nftInfo) {
          checkNFTPriceAndNotify(updatedPool);
        }
        return newPools;
      });
    } catch (error) {
      setPools(prev => prev.map((pool, index) =>
        index === poolIndex ? { ...pool, error: error.message, isLoading: false } : pool
      ));
    }
  };

  // 刷新所有池子
  const refreshAllPools = async () => {
    const promises = pools.map((pool, index) =>
      fetchPoolInfo(pool.address, index)
    );
    await Promise.allSettled(promises);
  };

  // 添加新池子
  const addPool = () => {
    if (!customAddress.trim()) return;

    // 检查是否已存在
    if (pools.some(pool => pool.address.toLowerCase() === customAddress.toLowerCase())) {
      alert('该池子地址已存在！');
      return;
    }

    const newPool = {
      address: customAddress.trim(),
      lpInfo: null,
      isLoading: false,
      error: null,
      nftId: '',
      nftInfo: null,
      isLoadingNft: false,
      nftError: null
    };

    const newPools = [...pools, newPool];
    setPools(newPools);
    savePoolsToStorage(newPools);
    setCustomAddress('');

    // 立即获取新池子信息
    fetchPoolInfo(newPool.address, pools.length);
  };

  // 删除池子
  const removePool = (poolIndex) => {
    const newPools = pools.filter((_, index) => index !== poolIndex);
    setPools(newPools);
    savePoolsToStorage(newPools);
  };

  // 从本地存储加载设置
  useEffect(() => {
    const savedSettings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
    setSettings(prev => ({
      ...prev,
      ...savedSettings
    }));
  }, []);

  // 自动刷新
  useEffect(() => {
    let interval;
    if (settings.autoRefresh && settings.refreshInterval > 0) {
      console.log('Starting auto refresh with interval:', settings.refreshInterval);
      interval = setInterval(async () => {
        console.log('Auto refreshing pools...');
        await refreshAllPools();
        // 检查所有池子的价格
        pools.forEach(pool => {
          if (pool.nftInfo) {
            checkNFTPriceAndNotify(pool);
          }
        });
      }, settings.refreshInterval * 1000);
    }
    return () => {
      if (interval) {
        console.log('Clearing auto refresh interval');
        clearInterval(interval);
      }
    };
  }, [settings.autoRefresh, settings.refreshInterval, pools]);

  // 初始化加载
  useEffect(() => {
    if (pools.length > 0) {
      refreshAllPools();
    }
  }, [pools.length]);

  // 处理从侧边栏添加的池子
  const handleAddPoolFromSidebar = (poolData) => {
    // 如果是删除操作
    if (poolData.isRemoving) {
      const poolIndex = pools.findIndex(pool => pool.address.toLowerCase() === poolData.address.toLowerCase());
      if (poolIndex !== -1) {
        removePool(poolIndex);
      }
      return;
    }

    // 检查是否已存在
    if (pools.some(pool => pool.address.toLowerCase() === poolData.address.toLowerCase())) {
      return;
    }

    const newPool = {
      address: poolData.address,
      lpInfo: null,
      isLoading: false,
      error: null,
      nftId: '',
      nftInfo: null,
      isLoadingNft: false,
      nftError: null
    };

    const newPools = [...pools, newPool];
    setPools(newPools);
    savePoolsToStorage(newPools);
    // 立即获取新池子信息
    fetchPoolInfo(newPool.address, pools.length);
  };

  // 处理拖拽结束事件
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setPools((items) => {
        const oldIndex = items.findIndex((item) => `${item.address}-${items.indexOf(item)}` === active.id);
        const newIndex = items.findIndex((item) => `${item.address}-${items.indexOf(item)}` === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        savePoolsToStorage(newItems);
        return newItems;
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 处理NFT信息更新
  const handleNftInfoUpdate = (updatedPool) => {
    console.log('NFT info updated:', updatedPool);
    setPools(prev => prev.map(pool =>
      pool.address === updatedPool.address ? {
        ...pool,
        nftInfo: updatedPool.nftInfo
      } : pool
    ));

    // 获取完整的池子信息
    const fullPool = pools.find(p => p.address === updatedPool.address);
    if (fullPool && fullPool.lpInfo) {
      // 立即检查价格
      checkNFTPriceAndNotify({
        ...fullPool,
        nftInfo: updatedPool.nftInfo
      });
    } else {
      console.log('Missing LP info for pool:', updatedPool.address);
    }
  };

  // 检查NFT价格并发送通知
  const checkNFTPriceAndNotify = async (pool) => {
    if (!pool.nftInfo || !pool.lpInfo) {
      console.log('Missing required info:', {
        hasNftInfo: !!pool.nftInfo,
        hasLpInfo: !!pool.lpInfo,
        poolAddress: pool.address,
        nftInfo: pool.nftInfo,
        lpInfo: pool.lpInfo
      });
      return;
    }

    const { minPrice, maxPrice } = pool.lpInfo;
    const isInRange = isNFTInRange(pool.nftInfo, minPrice, maxPrice);

    console.log('Checking NFT price:', {
      address: pool.address,
      nftId: pool.nftInfo.id,
      price: pool.nftInfo.currentPrice,
      minPrice,
      maxPrice,
      isInRange,
      currentCount: outOfRangeCounts[pool.address] || 0
    });

    if (!isInRange) {
      const newCount = (outOfRangeCounts[pool.address] || 0) + 1;
      setOutOfRangeCounts(prev => ({ ...prev, [pool.address]: newCount }));

      const { notificationThreshold, barkKey } = getNotificationSettings();

      console.log('Notification settings:', {
        barkKey: barkKey ? 'configured' : 'not configured',
        notificationThreshold,
        newCount
      });

      // 只有当配置了 Bark Key 且达到阈值时才发送通知
      if (barkKey && newCount === notificationThreshold) {
        const title = '池子价格超出区间提醒';
        const content = `池子 ${pool.lpInfo.token0.symbol}/${pool.lpInfo.token1.symbol} ${pool.address.slice(0, 6)}...${pool.address.slice(-4)} 价格1 ${pool.lpInfo.price.token1PerToken0} 价格2 ${pool.lpInfo.price.token0PerToken1} 已连续 ${newCount} 次超出区间`;
        const success = await sendBarkNotification(title, content, pool.nftInfo.id);
        if (success) {
          console.log('Notification sent successfully');
        } else {
          console.error('Failed to send notification');
        }
      }
    } else {
      // 当价格回到区间内时，重置计数器
      if (outOfRangeCounts[pool.address] > 0) {
        console.log('Price back in range, resetting counter for pool:', pool.address);
        setOutOfRangeCounts(prev => ({ ...prev, [pool.address]: 0 }));
      }
    }
  };

  // 处理设置更新
  const handleSettingsUpdate = (newSettings) => {
    console.log('Settings updated:', newSettings);
    setSettings(newSettings);
  };

  // 发送通知
  const sendNotification = async (pool) => {
    if (!settings.enableBarkNotification) return;

    const content = `交易对: ${pool.lpInfo.token0Symbol}/${pool.lpInfo.token1Symbol}\n` +
      `池子地址: ${pool.lpInfo.poolAddress}\n` +
      `价格1: ${pool.lpInfo.price.token1PerToken0}\n` +
      `价格2: ${pool.lpInfo.price.token0PerToken1}\n` +
      `连续超出区间次数: ${pool.outOfRangeCount}次`;

    await sendBarkNotification('价格超出区间提醒', content);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex">
      {/* 侧边栏 */}
      <Sidebar onAddPool={handleAddPoolFromSidebar} pools={pools} />

      {/* 主内容区 */}
      <div className="flex-1">
        <div className="container mx-auto px-3 py-4">
          {/* 控制面板 - 美化版 */}
          <div className="bg-white rounded-xl p-6 mb-6 shadow-lg border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* 添加池子 */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="输入池子地址 (0x...)"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                      hover:border-blue-300 dark:hover:border-blue-500 
                      focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 dark:focus:border-blue-500 
                      focus:outline-none transition-all duration-200 
                      text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <button
                    onClick={addPool}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    添加
                  </button>
                </div>
              </div>

              {/* 设置按钮 */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-200 dark:border-gray-700"
                title="设置"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* 池子卡片列表 */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pools.map((pool, index) => `${pool.address}-${index}`)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pools.map((pool, index) => (
                  <SortablePoolCard
                    key={`${pool.address}-${index}`}
                    id={`${pool.address}-${index}`}
                    pool={pool}
                    onRemove={() => removePool(index)}
                    outOfRangeCount={outOfRangeCounts[pool.address] || 0}
                    onNftInfoUpdate={handleNftInfoUpdate}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {pools.length === 0 && (
            <div className="text-center py-6">
              <div className="text-gray-400 text-lg mb-2">📊</div>
              <p className="text-gray-600 text-sm px-4">还没有添加任何池子，请在上方输入池子地址开始监控。</p>
            </div>
          )}

          {/* 页脚信息 - 手机端优化 */}
          <div className="mt-6 text-center text-gray-500 text-xs px-4">
            <p>🔗 BSC 主网 | 💡 Viem</p>
            <p className="mt-1">⚡ BSC DataSeed</p>
          </div>
        </div>
      </div>

      {/* 设置弹窗 */}
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdate={handleSettingsUpdate}
      />
    </div>
  );
}
