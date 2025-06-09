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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
        // 不再在这里调用 checkNFTPriceAndNotify
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
        // 不再在这里遍历 pools 主动调用 checkNFTPriceAndNotify
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

    // 只在 NFT 有效时检查价格
    if (!pool.nftInfo.isValid) {
      // 如果 NFT 无效，重置计数器
      if (outOfRangeCounts[pool.address] > 0) {
        setOutOfRangeCounts(prev => ({ ...prev, [pool.address]: 0 }));
      }
      return;
    }

    // 正确获取 NFT 区间
    const { lower, upper } = pool.nftInfo.priceRange || {};
    const isInRange = isNFTInRange(pool.nftInfo, lower, upper);

    console.log('Checking NFT price:', {
      address: pool.address,
      nftId: pool.nftInfo.id,
      price: pool.nftInfo.currentPrice,
      lower,
      upper,
      isInRange,
      currentCount: outOfRangeCounts[pool.address] || 0
    });

    if (!isInRange) {
      // 只在连续超出范围时增加计数
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

  // 处理侧边栏切换
  const handleSidebarToggle = (isOpen) => {
    setIsSidebarOpen(isOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex">
      {/* 侧边栏 */}
      <Sidebar onAddPool={handleAddPoolFromSidebar} pools={pools} onToggle={handleSidebarToggle} />

      {/* 主内容区 */}
      <div className="flex-1">
        <div className="container mx-auto px-3 py-4">
          {/* 控制面板 - 在移动端侧边栏打开时隐藏 */}
          <div className={`${isSidebarOpen ? 'hidden lg:block' : 'block'} relative bg-gradient-to-r from-white via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/20 dark:to-purple-950/20 
            rounded-2xl p-8 mb-8 shadow-xl border border-gray-100/50 dark:border-gray-800/50 
            backdrop-blur-sm before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-blue-500/5 before:to-purple-500/5 before:-z-10`}>

            {/* 装饰性元素 */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-400/10 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

            <div className="relative z-10">
              {/* 标题部分 */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    池子监控面板
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">添加和管理您的流动性池</p>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                {/* 添加池子输入区域 */}
                <div className="flex-1 space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    池子地址
                  </label>

                  {/* 输入框和按钮对齐区域 */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative group">
                      {/* 输入框装饰背景 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm group-focus-within:blur-md group-focus-within:scale-105 transition-all duration-300"></div>

                      <div className="relative flex items-center">
                        {/* 地址图标 */}
                        <div className="absolute left-4 w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors duration-200">
                          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>

                        <input
                          type="text"
                          placeholder="输入池子地址 (0x...)"
                          value={customAddress}
                          onChange={(e) => setCustomAddress(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addPool()}
                          className="w-full pl-12 pr-32 py-4 rounded-xl bg-white/80 dark:bg-gray-800/80 
                            border-2 border-gray-200/50 dark:border-gray-700/50 
                            hover:border-blue-300/70 dark:hover:border-blue-500/70
                            focus:border-blue-400 dark:focus:border-blue-500 
                            focus:ring-4 focus:ring-blue-400/10 dark:focus:ring-blue-500/20
                            focus:outline-none transition-all duration-300
                            text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                            backdrop-blur-sm font-mono text-sm
                            shadow-inner"
                        />

                        {/* 添加按钮 */}
                        <button
                          onClick={addPool}
                          disabled={!customAddress.trim()}
                          className="absolute right-2 bg-gradient-to-r from-blue-500 to-purple-500 
                            hover:from-blue-600 hover:to-purple-600 
                            disabled:from-gray-400 disabled:to-gray-400
                            text-white px-6 py-2.5 rounded-lg font-medium
                            transition-all duration-200 
                            flex items-center gap-2 shadow-lg
                            hover:shadow-xl hover:scale-105
                            disabled:hover:scale-100 disabled:cursor-not-allowed
                            group/btn"
                          title="添加池子"
                        >
                          <svg className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="hidden sm:inline">添加</span>
                        </button>
                      </div>
                    </div>

                    {/* 右侧操作按钮区域 - 与输入框对齐 */}
                    <div className="flex items-center gap-3">
                      {/* 快速刷新按钮 */}
                      <button
                        onClick={refreshAllPools}
                        className="flex items-center justify-center w-14 h-14 rounded-xl 
                          bg-white/80 dark:bg-gray-800/80 
                          hover:bg-green-50 dark:hover:bg-green-900/20
                          border-2 border-gray-200/50 dark:border-gray-700/50
                          hover:border-green-300/70 dark:hover:border-green-500/70
                          transition-all duration-200 group
                          shadow-lg hover:shadow-xl hover:scale-105"
                        title="刷新所有池子"
                      >
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400 group-hover:rotate-180 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>

                      {/* 设置按钮 */}
                      <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center justify-center w-14 h-14 rounded-xl 
                          bg-white/80 dark:bg-gray-800/80 
                          hover:bg-purple-50 dark:hover:bg-purple-900/20
                          border-2 border-gray-200/50 dark:border-gray-700/50
                          hover:border-purple-300/70 dark:hover:border-purple-500/70
                          transition-all duration-200 group
                          shadow-lg hover:shadow-xl hover:scale-105"
                        title="设置"
                      >
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:rotate-90 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 提示文字 */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    支持 BSC 网络上的 Uniswap V3 和 PancakeSwap V3 池子地址，按 Enter 快速添加
                  </p>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-600 dark:text-gray-400">
                        已监控: <span className="font-semibold text-gray-900 dark:text-white">{pools.length}</span> 个池子
                      </span>
                    </div>
                    {settings.autoRefresh && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-gray-600 dark:text-gray-400">
                          自动刷新: <span className="font-semibold text-gray-900 dark:text-white">{settings.refreshInterval}s</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    🚀 BSC 主网
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 池子卡片列表 - 在移动端侧边栏打开时隐藏 */}
          <div className={`${isSidebarOpen ? 'hidden lg:block' : 'block'}`}>
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
