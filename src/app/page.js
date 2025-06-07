'use client';

import { useState, useEffect } from 'react';
import PoolCard from '../components/PoolCard';
import { getLPInfo } from '../utils/lpUtils';

// 预设的池子地址
const DEFAULT_POOLS = [
  '0xD317B5480faf6Ef228C502d9c4D0c04599C5B74b',
  '0x099f84de4fb511e861ca8f635623eae409405873',
  '0xafeCDd2Fc04F0939d7B6835529677608470c063d',
  '0x3FF1B7b1d2516a981670a9fF0B485e7c905b2400'
];

export default function Home() {
  const [pools, setPools] = useState(DEFAULT_POOLS.map(address => ({
    address,
    lpInfo: null,
    isLoading: false,
    error: null,
    nftId: '',
    nftInfo: null,
    isLoadingNft: false,
    nftError: null
  })));

  const [customAddress, setCustomAddress] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3); // 秒

  // 获取单个池子信息
  const fetchPoolInfo = async (poolAddress, poolIndex) => {
    setPools(prev => prev.map((pool, index) =>
      index === poolIndex ? { ...pool, isLoading: true, error: null } : pool
    ));

    try {
      const lpInfo = await getLPInfo(poolAddress);
      setPools(prev => prev.map((pool, index) =>
        index === poolIndex ? { ...pool, lpInfo, isLoading: false } : pool
      ));
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

    setPools(prev => [...prev, newPool]);
    setCustomAddress('');

    // 立即获取新池子信息
    fetchPoolInfo(newPool.address, pools.length);
  };

  // 删除池子
  const removePool = (poolIndex) => {
    setPools(prev => prev.filter((_, index) => index !== poolIndex));
  };

  // 自动刷新
  useEffect(() => {
    let interval;
    if (autoRefresh && refreshInterval > 0) {
      interval = setInterval(refreshAllPools, refreshInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, pools]);

  // 初始化加载
  useEffect(() => {
    refreshAllPools();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-3 py-4">
        {/* 控制面板 - 手机端优化 */}
        <div className="bg-white rounded-lg shadow-lg p-3 mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* 添加池子 */}
            <div className="flex-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入池子地址 (0x...)"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className="flex-1 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={addPool}
                  className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm whitespace-nowrap"
                >
                  添加
                </button>
              </div>
            </div>

            {/* 自动刷新控制 */}
            <div className="flex items-center gap-2 text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-1"
                />
                <span className="whitespace-nowrap">自动刷新</span>
              </label>
              {autoRefresh && (
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value={3}>3秒</option>
                  <option value={10}>10秒</option>
                  <option value={30}>30秒</option>
                  <option value={60}>1分钟</option>
                  <option value={300}>5分钟</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* 池子列表 - 手机端单列，桌面端多列 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {pools.map((pool, index) => (
            <PoolCard
              key={`${pool.address}-${index}`}
              poolAddress={pool.address}
              lpInfo={pool.lpInfo}
              isLoading={pool.isLoading}
              error={pool.error}
              onRefresh={() => fetchPoolInfo(pool.address, index)}
            />
          ))}
        </div>

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
  );
}
