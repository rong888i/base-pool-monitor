'use client';

import { useState, useEffect } from 'react';
import { getNFTPositionInfo } from '../utils/lpUtils';

const PoolCard = ({ poolAddress, lpInfo, isLoading, error, onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nftId, setNftId] = useState('');
  const [nftInfo, setNftInfo] = useState(null);
  const [isLoadingNft, setIsLoadingNft] = useState(false);
  const [nftError, setNftError] = useState(null);
  const [showReversedPrice, setShowReversedPrice] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  // 获取NFT信息
  const fetchNftInfo = async () => {
    if (!nftId.trim() || !lpInfo) return;

    setIsLoadingNft(true);
    setNftError(null);

    try {
      const info = await getNFTPositionInfo(nftId.trim(), poolAddress, lpInfo);
      setNftInfo(info);
    } catch (error) {
      setNftError(error.message);
      setNftInfo(null);
    } finally {
      setIsLoadingNft(false);
    }
  };

  // 计算价格在范围条中的位置百分比
  const calculatePricePosition = (current, lower, upper) => {
    if (current <= lower) return 5; // 最左边，留一点边距
    if (current >= upper) return 95; // 最右边，留一点边距
    
    // 在范围内时，计算相对位置 (20% 到 80% 之间)
    const ratio = (current - lower) / (upper - lower);
    return 20 + (ratio * 60); // 20% 到 80% 的范围
  };

  // 当池子信息更新时，如果有NFT ID，自动刷新NFT信息
  useEffect(() => {
    if (lpInfo && nftId.trim() && !isLoading && !error && !isLoadingNft) {
      // 添加一个小延迟，避免与池子信息加载冲突
      const timer = setTimeout(() => {
        fetchNftInfo();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [lpInfo?.lastUpdated, nftId]); // 只在池子信息真正更新时触发

  // 清除NFT信息
  const clearNftInfo = () => {
    setNftId('');
    setNftInfo(null);
    setNftError(null);
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = () => {
    if (error) return 'border-red-300 bg-red-25';
    if (isLoading || isRefreshing) return 'border-blue-300 bg-blue-25';
    return 'border-green-300 bg-green-25';
  };

  const getStatusIcon = () => {
    if (error) return '❌';
    if (isLoading || isRefreshing) return '🔄';
    return '✅';
  };

  return (
    <div className={`border rounded-lg p-2 transition-all duration-300 bg-white shadow-sm hover:shadow-md ${getStatusColor()}`}>
      {/* 头部 - 手机端优化 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs">{getStatusIcon()}</span>
          <span className="font-mono text-xs text-gray-600">{formatAddress(poolAddress)}</span>
        </div>
        {/* 协议标识 */}
        {lpInfo && lpInfo.protocol && (
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${lpInfo.protocol.color} ${lpInfo.protocol.borderColor} border`}>
            <span className="mr-1">{lpInfo.protocol.icon}</span>
            <span className="hidden sm:inline">{lpInfo.protocol.name}</span>
            <span className="sm:hidden">{lpInfo.protocol.name.split(' ')[0]}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded text-xs mb-2">
          <strong>错误:</strong> {error}
        </div>
      )}

      {isLoading && !lpInfo && (
        <div className="flex items-center justify-center py-3">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-blue-600 text-xs">加载中...</span>
        </div>
      )}

      {lpInfo && (
        <div className="space-y-2">
          {/* 代币信息 - 包含余额 */}
          <div className="bg-purple-50 p-2 rounded">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs">
                <span className="font-medium text-purple-700">{lpInfo.token0.symbol}</span>
                <span className="text-gray-500 ml-1">⇄</span>
                <span className="font-medium text-purple-700 ml-1">{lpInfo.token1.symbol}</span>
              </div>
              <span className="text-gray-500 text-xs">费率: {lpInfo.feePercentage}%</span>
            </div>
            {/* 代币余额 */}
            <div className="flex justify-between text-xs text-gray-600">
              <span>{lpInfo.token0.balance} {lpInfo.token0.symbol}</span>
              <span>{lpInfo.token1.balance} {lpInfo.token1.symbol}</span>
            </div>
          </div>

          {/* 价格信息 - 紧凑显示 */}
          <div className="bg-blue-50 p-2 rounded">
            <div className="text-xs text-blue-600 font-medium mb-1">💰 价格</div>
            <div className="space-y-1 text-xs">
              <div className="font-mono bg-white px-2 py-1 rounded text-center text-xs">
                {lpInfo.price.formatted}
              </div>
              <div className="font-mono bg-white px-2 py-1 rounded text-center text-xs">
                {lpInfo.price.formattedReverse}
              </div>
            </div>
          </div>

          {/* NFT位置查询 */}
          <div className="bg-orange-50 p-2 rounded">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-orange-600 font-medium">🎯 NFT位置查询</div>
              {nftId.trim() && (
                <div className="text-xs text-gray-500">
                  {isLoadingNft ? '🔄 刷新中' : '🔄 自动刷新'}
                </div>
              )}
            </div>
            <div className="flex gap-1 mb-2">
              <input
                type="text"
                placeholder="输入NFT ID"
                value={nftId}
                onChange={(e) => setNftId(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <button
                onClick={fetchNftInfo}
                disabled={!nftId.trim() || isLoadingNft}
                className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isLoadingNft ? '...' : '查询'}
              </button>
              {nftInfo && (
                <button
                  onClick={clearNftInfo}
                  className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
                >
                  清除
                </button>
              )}
            </div>

            {/* NFT信息显示 */}
            {isLoadingNft && (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-500"></div>
                <span className="ml-2 text-orange-600 text-xs">查询中...</span>
              </div>
            )}

            {nftError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded text-xs">
                <strong>错误:</strong> {nftError}
              </div>
            )}

            {nftInfo && (
              <div className="space-y-1">
                {/* NFT状态 */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">NFT #{nftInfo.nftId}</span>
                  <span className="text-xs">{nftInfo.status}</span>
                </div>

                {nftInfo.isValid && (
                  <>
                    {/* 价格方向选择 */}
                    <div className="bg-white p-2 rounded border mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">价格显示方向:</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setShowReversedPrice(false)}
                            className={`px-2 py-1 text-xs rounded ${
                              !showReversedPrice 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {lpInfo.token0.symbol}/{lpInfo.token1.symbol}
                          </button>
                          <button
                            onClick={() => setShowReversedPrice(true)}
                            className={`px-2 py-1 text-xs rounded ${
                              showReversedPrice 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {lpInfo.token1.symbol}/{lpInfo.token0.symbol}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 价格范围可视化 */}
                    <div className="bg-white p-2 rounded border">
                      <div className="text-xs font-medium text-gray-700 mb-2">
                        价格范围可视化 ({showReversedPrice ? `${lpInfo.token1.symbol}/${lpInfo.token0.symbol}` : `${lpInfo.token0.symbol}/${lpInfo.token1.symbol}`}):
                      </div>
                      
                      {/* 价格范围条 */}
                      <div className="relative mb-3">
                        <div className="h-6 bg-gray-200 rounded-full relative overflow-hidden">
                          {/* 范围内区域 */}
                          <div 
                            className="absolute h-full bg-green-200 rounded-full"
                            style={{
                              left: '20%',
                              width: '60%'
                            }}
                          ></div>
                          
                          {/* 中心线 */}
                          <div className="absolute top-0 left-[50%] w-0.5 h-full bg-gray-400 opacity-50"></div>
                          
                          {/* 当前价格指示器 */}
                          <div 
                            className={`absolute top-0 w-1 h-full ${nftInfo.isInRange ? 'bg-green-600' : 'bg-red-600'} shadow-lg z-10`}
                            style={{
                              left: `${calculatePricePosition(
                                showReversedPrice ? (1 / nftInfo.currentPrice) : nftInfo.currentPrice,
                                showReversedPrice ? (1 / nftInfo.priceRange.upper) : nftInfo.priceRange.lower,
                                showReversedPrice ? (1 / nftInfo.priceRange.lower) : nftInfo.priceRange.upper
                              )}%`,
                              transform: 'translateX(-50%)'
                            }}
                          ></div>
                          
                          {/* 下限标记 */}
                          <div className="absolute top-0 left-[20%] w-0.5 h-full bg-green-600"></div>
                          {/* 上限标记 */}
                          <div className="absolute top-0 left-[80%] w-0.5 h-full bg-red-600"></div>
                        </div>
                        
                        {/* 标签 */}
                        <div className="flex justify-between text-xs mt-1 px-1">
                          <span className="text-green-600 font-medium">下限</span>
                          <span className="text-gray-500">中心</span>
                          <span className="text-red-600 font-medium">上限</span>
                        </div>
                        
                        {/* 当前价格位置标签 */}
                        <div className="text-center mt-1">
                          <span className={`text-xs font-medium ${nftInfo.isInRange ? 'text-green-600' : 'text-red-600'}`}>
                            {nftInfo.isInRange ? '✅ 当前价格在范围内' : '❌ 当前价格超出范围'}
                          </span>
                        </div>
                      </div>

                      {/* 价格数值 */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between p-1 bg-green-50 rounded">
                          <span className="text-green-700 font-medium">📉 下限:</span>
                          <span className="font-mono text-green-800">
                            {showReversedPrice 
                              ? (1 / nftInfo.priceRange.upper).toFixed(6)
                              : nftInfo.priceRange.lower.toFixed(6)
                            }
                          </span>
                        </div>
                        
                        <div className={`flex items-center justify-between p-1 rounded ${nftInfo.isInRange ? 'bg-green-50' : 'bg-red-50'}`}>
                          <span className={`font-medium ${nftInfo.isInRange ? 'text-green-700' : 'text-red-700'}`}>
                            {nftInfo.isInRange ? '✅ 当前:' : '❌ 当前:'}
                          </span>
                          <span className={`font-mono ${nftInfo.isInRange ? 'text-green-800' : 'text-red-800'}`}>
                            {showReversedPrice 
                              ? (1 / nftInfo.currentPrice).toFixed(6)
                              : nftInfo.currentPrice.toFixed(6)
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-1 bg-red-50 rounded">
                          <span className="text-red-700 font-medium">📈 上限:</span>
                          <span className="font-mono text-red-800">
                            {showReversedPrice 
                              ? (1 / nftInfo.priceRange.lower).toFixed(6)
                              : nftInfo.priceRange.upper.toFixed(6)
                            }
                          </span>
                        </div>
                      </div>

                      {/* 双向价格对比 */}
                      <div className="mt-2 p-2 bg-blue-50 rounded border">
                        <div className="text-xs font-medium text-blue-700 mb-1">📊 当前价格对比:</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">{lpInfo.token0.symbol}/{lpInfo.token1.symbol}:</span>
                            <span className="font-mono text-blue-800">{nftInfo.currentPrice.toFixed(6)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">{lpInfo.token1.symbol}/{lpInfo.token0.symbol}:</span>
                            <span className="font-mono text-blue-800">{(1 / nftInfo.currentPrice).toFixed(6)}</span>
                          </div>
                        </div>
                      </div>

                      {/* 状态说明 */}
                      <div className={`mt-2 p-2 rounded text-xs text-center font-medium ${
                        nftInfo.isInRange 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {nftInfo.isInRange 
                          ? '🎯 价格在范围内，正在赚取手续费' 
                          : nftInfo.currentPrice < nftInfo.priceRange.lower
                            ? `⬇️ 价格低于下限 ${(((nftInfo.priceRange.lower - nftInfo.currentPrice) / nftInfo.currentPrice) * 100).toFixed(1)}%`
                            : `⬆️ 价格高于上限 ${(((nftInfo.currentPrice - nftInfo.priceRange.upper) / nftInfo.priceRange.upper) * 100).toFixed(1)}%`
                        }
                      </div>

                      {/* 价格范围宽度信息 */}
                      <div className="mt-2 text-xs text-gray-600 text-center">
                        <span>范围宽度: ±{(((nftInfo.priceRange.upper - nftInfo.priceRange.lower) / ((nftInfo.priceRange.upper + nftInfo.priceRange.lower) / 2)) * 100).toFixed(1)}%</span>
                      </div>
                    </div>

                    {/* 流动性和收益信息 */}
                    <div className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-1">
                        <span>💧 流动性:</span>
                        <span className={`font-medium ${nftInfo.hasLiquidity ? 'text-green-600' : 'text-red-600'}`}>
                          {nftInfo.hasLiquidity ? '有' : '无'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>📊 状态:</span>
                        <span className={`font-medium ${nftInfo.isInRange ? 'text-green-600' : 'text-red-600'}`}>
                          {nftInfo.isInRange ? '活跃' : '非活跃'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 技术指标 - 所有信息一行显示 */}
          <div className="bg-green-50 p-2 rounded">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>Tick: <span className="font-medium text-black">{lpInfo.tick}</span></span>
              <span className="text-center">更新: <span className="font-medium text-black">{lpInfo.lastUpdated}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolCard; 