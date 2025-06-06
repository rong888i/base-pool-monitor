'use client';

import { useState, useEffect } from 'react';

const PoolCard = ({ poolAddress, lpInfo, isLoading, error, onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
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