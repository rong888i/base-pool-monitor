import { createPublicClient, http, encodeFunctionData, decodeAbiParameters, decodeFunctionResult } from 'viem';
import { base } from 'viem/chains';

// 获取RPC URL
const getRpcUrl = () => {
  const settings = JSON.parse(localStorage.getItem('poolMonitorSettings') || '{}');
  return settings.rpcUrl || 'https://base-mainnet.blastapi.io/fe9c30fc-3bc5-4064-91e2-6ab5887f8f4d';
};

// BASE主网配置
const getClient = () => {
  return createPublicClient({
    chain: base,
    transport: http(getRpcUrl())
  });
};

// 协议识别 - BASE上的已知Factory地址
const PROTOCOL_FACTORIES = {
  AERODROME: '0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A', // Aerodrome Factory on BASE
  UNISWAP_V3: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD', // Uniswap V3 Factory on BASE
  // 可以添加更多协议
};

// Aerodrome Pool ABI (特定于 Aerodrome)
const AERODROME_POOL_ABI = [
  {
    inputs: [],
    name: 'factory',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
      { internalType: 'int24', name: 'tick', type: 'int24' }
      // Aerodrome 可能只返回这两个字段
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'tickSpacing',  // Aerodrome 使用 tickSpacing 而不是 fee
    outputs: [{ internalType: 'int24', name: '', type: 'int24' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Uniswap V3 Pool ABI（简化版，只包含需要的函数）
const POOL_ABI = [
  {
    inputs: [],
    name: 'factory',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
      { internalType: 'int24', name: 'tick', type: 'int24' },
      { internalType: 'uint16', name: 'observationIndex', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinality', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinalityNext', type: 'uint16' },
      { internalType: 'uint8', name: 'feeProtocol', type: 'uint8' },
      { internalType: 'bool', name: 'unlocked', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'fee',
    outputs: [{ internalType: 'uint24', name: '', type: 'uint24' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// ERC20 ABI（获取代币信息）
const ERC20_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Uniswap V3 NonfungiblePositionManager ABI（用于获取NFT位置信息）
const POSITION_MANAGER_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'positions',
    outputs: [
      { internalType: 'uint96', name: 'nonce', type: 'uint96' },
      { internalType: 'address', name: 'operator', type: 'address' },
      { internalType: 'address', name: 'token0', type: 'address' },
      { internalType: 'address', name: 'token1', type: 'address' },
      { internalType: 'uint24', name: 'fee', type: 'uint24' },
      { internalType: 'int24', name: 'tickLower', type: 'int24' },
      { internalType: 'int24', name: 'tickUpper', type: 'int24' },
      { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
      { internalType: 'uint256', name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { internalType: 'uint256', name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { internalType: 'uint128', name: 'tokensOwed0', type: 'uint128' },
      { internalType: 'uint128', name: 'tokensOwed1', type: 'uint128' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint128', name: 'amount0Max', type: 'uint128' },
          { internalType: 'uint128', name: 'amount1Max', type: 'uint128' }
        ],
        internalType: 'struct INonfungiblePositionManager.CollectParams',
        name: 'params',
        type: 'tuple'
      }
    ],
    name: 'collect',
    outputs: [
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' }
    ],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' }
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
];

const FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "tokenA", "type": "address" },
      { "internalType": "address", "name": "tokenB", "type": "address" },
      { "internalType": "uint24", "name": "fee", "type": "uint24" }
    ],
    "name": "getPool",
    "outputs": [{ "internalType": "address", "name": "pool", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
]

// Aerodrome Factory ABI (使用 tickSpacing 而不是 fee)
const AERODROME_FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "tokenA", "type": "address" },
      { "internalType": "address", "name": "tokenB", "type": "address" },
      { "internalType": "int24", "name": "tickSpacing", "type": "int24" }  // 注意: int24 而不是 uint24
    ],
    "name": "getPool",
    "outputs": [{ "internalType": "address", "name": "pool", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
]

// BASE上的Position Manager地址
const POSITION_MANAGER_ADDRESSES = {
  AERODROME: '0x827922686190790b37229fd06084350E74485b72', // Aerodrome Position Manager on BASE
  UNISWAP_V3: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1', // Uniswap V3 Position Manager on BASE
};

/**
 * 识别协议类型
 * @param {string} factoryAddress - Factory合约地址
 * @returns {Object} 协议信息
 */
function identifyProtocol(factoryAddress) {
  if (!factoryAddress) {
    console.warn('Factory address is undefined');
    return {
      name: 'Unknown',
      displayName: '未知协议',
      factory: null
    };
  }
  const upperFactory = factoryAddress.toUpperCase();

  if (upperFactory === PROTOCOL_FACTORIES.AERODROME?.toUpperCase()) {
    return {
      name: 'Aerodrome',
      icon: '✈️',
      color: 'bg-blue-100 text-blue-800',
      borderColor: 'border-blue-300'
    };
  } else if (upperFactory === PROTOCOL_FACTORIES.UNISWAP_V3?.toUpperCase()) {
    return {
      name: 'Uni V3',
      icon: '🦄',
      color: 'bg-pink-100 text-pink-800',
      borderColor: 'border-pink-300'
    };
  } else {
    return {
      name: 'Unknown DEX',
      icon: '❓',
      color: 'bg-gray-100 text-gray-800',
      borderColor: 'border-gray-300'
    };
  }
}

/**
 * 获取费率对应的tickSpacing
 * @param {number} fee - 费率 (e.g., 500 for 0.05%)
 * @returns {number} tickSpacing
 */
export function getTickSpacing(fee) {
  switch (fee) {
    case 100: return 1; // 0.01%
    case 500: return 10; // 0.05%
    case 2500: return 50; // 0.25% (PancakeSwap)
    case 3000: return 60; // 0.3%
    case 10000: return 200; // 1%
    default: return 60; // 默认
  }
}

/**
 * 格式化大数字显示
 * @param {bigint} balance - 余额
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的余额
 */
function formatBalance(balance, decimals) {
  const balanceNumber = Number(balance) / Math.pow(10, decimals);

  if (balanceNumber >= 1000000) {
    return `${(balanceNumber / 1000000).toFixed(2)}M`;
  } else if (balanceNumber >= 1000) {
    return `${(balanceNumber / 1000).toFixed(2)}K`;
  } else if (balanceNumber >= 1) {
    return balanceNumber.toFixed(2);
  } else if (balanceNumber >= 0.01) {
    return balanceNumber.toFixed(4);
  } else {
    return balanceNumber.toExponential(2);
  }
}

/**
 * 计算价格从sqrtPriceX96
 * @param {bigint} sqrtPriceX96 - sqrt价格 * 2^96
 * @param {number} decimals0 - token0的小数位数
 * @param {number} decimals1 - token1的小数位数
 * @returns {number} 价格 (token1/token0)
 */
function calculatePriceFromSqrtPriceX96(sqrtPriceX96, decimals0, decimals1) {
  // price = (sqrtPriceX96 / 2^96)^2 * 10^(decimals0 - decimals1)
  const Q96 = 2n ** 96n;
  const price = Number(sqrtPriceX96 * sqrtPriceX96) / Number(Q96 * Q96);
  return price * Math.pow(10, decimals0 - decimals1);
}

/**
 * 批量获取LP池的详细信息
 * @param {string[]} poolAddresses - LP池地址数组
 * @returns {Promise<Object[]>} 包含价格、tick等信息的对象数组
 */
async function getBatchLPInfo(poolAddresses) {
  try {
    console.log(`🔍 正在批量获取LP池信息: ${poolAddresses.length}个池子`);

    // 1. 准备所有池子的基本信息请求
    const batchRequests = poolAddresses.flatMap(poolAddress => {
      const factoryData = {
        jsonrpc: '2.0',
        id: `${poolAddress}-factory`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: POOL_ABI,
            functionName: 'factory'
          })
        }, 'latest']
      };

      const slot0Data = {
        jsonrpc: '2.0',
        id: `${poolAddress}-slot0`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: POOL_ABI,
            functionName: 'slot0'
          })
        }, 'latest']
      };

      const token0Data = {
        jsonrpc: '2.0',
        id: `${poolAddress}-token0`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: POOL_ABI,
            functionName: 'token0'
          })
        }, 'latest']
      };

      const token1Data = {
        jsonrpc: '2.0',
        id: `${poolAddress}-token1`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: POOL_ABI,
            functionName: 'token1'
          })
        }, 'latest']
      };

      // 对于不同协议，使用不同的函数名
      // Uniswap 使用 'fee'，Aerodrome 使用 'tickSpacing'
      // 我们同时请求两个，然后根据结果判断
      const feeData = {
        jsonrpc: '2.0',
        id: `${poolAddress}-fee`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: POOL_ABI,
            functionName: 'fee'
          })
        }, 'latest']
      };

      // 添加 tickSpacing 请求（用于 Aerodrome）
      const tickSpacingData = {
        jsonrpc: '2.0',
        id: `${poolAddress}-tickSpacing`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: AERODROME_POOL_ABI,
            functionName: 'tickSpacing'
          })
        }, 'latest']
      };

      const liquidityData = {
        jsonrpc: '2.0',
        id: `${poolAddress}-liquidity`,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: encodeFunctionData({
            abi: POOL_ABI,
            functionName: 'liquidity'
          })
        }, 'latest']
      };

      return [factoryData, slot0Data, token0Data, token1Data, feeData, liquidityData, tickSpacingData];
    });

    // 2. 执行批量RPC调用
    const response = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchRequests)
    });

    const basicInfoResults = await response.json();
    if (!Array.isArray(basicInfoResults)) {
      throw new Error('Invalid RPC response');
    }

    // 3. 处理结果并准备代币信息请求
    const tokenRequests = [];
    const poolInfos = [];

    for (let i = 0; i < poolAddresses.length; i++) {
      const baseIndex = i * 7; // 现在每个池子有7个请求
      const [
        factoryResult,
        slot0Result,
        token0Result,
        token1Result,
        feeResult,
        liquidityResult,
        tickSpacingResult
      ] = basicInfoResults.slice(baseIndex, baseIndex + 7);

      if (factoryResult.error || slot0Result.error || token0Result.error ||
        token1Result.error || liquidityResult.error) {
        throw new Error(`RPC call failed: ${JSON.stringify(basicInfoResults.slice(baseIndex, baseIndex + 7))}`);
      }

      let factoryAddress = null;
      try {
        if (factoryResult.result && factoryResult.result !== '0x') {
          factoryAddress = decodeAbiParameters([{ type: 'address' }], factoryResult.result)[0];
        }
      } catch (e) {
        console.warn('Failed to decode factory address for pool:', poolAddresses[i]);
      }
      const token0Address = decodeAbiParameters([{ type: 'address' }], token0Result.result)[0];
      const token1Address = decodeAbiParameters([{ type: 'address' }], token1Result.result)[0];

      // 尝试解析 fee 和 tickSpacing
      let fee, tickSpacing;

      // 首先尝试解析 fee（Uniswap）
      if (!feeResult.error && feeResult.result && feeResult.result !== '0x') {
        try {
          fee = Number(decodeAbiParameters([{ type: 'uint24' }], feeResult.result)[0]);
        } catch (e) {
          console.warn('Failed to decode fee:', e);
        }
      }

      // 然后尝试解析 tickSpacing（Aerodrome）
      if (!tickSpacingResult.error && tickSpacingResult.result && tickSpacingResult.result !== '0x') {
        try {
          tickSpacing = Number(decodeAbiParameters([{ type: 'int24' }], tickSpacingResult.result)[0]);
          console.log('Pool has actual tickSpacing:', tickSpacing, 'for pool:', poolAddresses[i]);

          // 重要：对于 Aerodrome，保持原始的 tickSpacing 值
          // 不要映射到 fee，因为 Aerodrome 使用 tickSpacing 来标识池子
          // fee 值仅用于显示，实际添加流动性时使用 tickSpacing

          if (!fee && tickSpacing) {
            // 仅用于UI显示的映射，不影响实际操作
            // 注意：这个映射可能不准确，最好从池子直接获取 fee
            console.log('No fee found, keeping tickSpacing as is:', tickSpacing);
            // 不设置默认 fee，让它保持 undefined
          }
        } catch (e) {
          console.warn('Failed to decode tickSpacing:', e);
        }
      }

      // 如果都失败，使用默认值
      if (!fee && !tickSpacing) {
        fee = 3000; // 默认 0.3%
        tickSpacing = 60; // 默认 tickSpacing
        console.warn('Using default fee/tickSpacing for pool:', poolAddresses[i]);
      }

      const liquidity = BigInt(decodeAbiParameters([{ type: 'uint128' }], liquidityResult.result)[0]);

      // 解析slot0数据
      let sqrtPriceX96, tick;

      // 检查返回数据的长度来决定如何解码
      const dataLength = (slot0Result.result.length - 2) / 2; // 去掉 '0x' 前缀，每2个字符是1字节

      console.log(`Pool ${poolAddresses[i]} slot0 data length: ${dataLength} bytes, data: ${slot0Result.result}`);

      if (dataLength < 24) {
        // 数据太短，可能有错误
        console.error('slot0 data too short:', slot0Result.result);
        throw new Error(`slot0 data too short for pool ${poolAddresses[i]}`);
      } else if (dataLength <= 32) {
        // Aerodrome 格式：只有 sqrtPriceX96 (160 bits = 20 bytes) 和 tick (24 bits = 3 bytes)
        // 总共 23 bytes，但通常会被填充到 32 bytes (一个完整的字)
        try {
          // 手动解析前 20 字节为 uint160，接下来 3 字节为 int24
          const dataHex = slot0Result.result.slice(2); // 去掉 '0x'
          const sqrtPriceHex = '0x' + dataHex.slice(0, 40); // 前 20 字节（40个十六进制字符）
          const tickHex = '0x' + dataHex.slice(40, 46); // 接下来 3 字节（6个十六进制字符）

          sqrtPriceX96 = BigInt(sqrtPriceHex);
          // 处理 int24 的符号扩展
          let tickValue = parseInt(tickHex, 16);
          if (tickValue > 0x7FFFFF) { // 如果最高位是1，表示负数
            tickValue = tickValue - 0x1000000;
          }
          tick = tickValue;

          console.log('Decoded Aerodrome slot0:', { sqrtPriceX96: sqrtPriceX96.toString(), tick });
        } catch (e) {
          console.error('Failed to decode Aerodrome slot0:', e);
          // 如果手动解析失败，尝试使用 viem 的方式只解析前两个字段
          try {
            const slot0Decoded = decodeAbiParameters([
              { type: 'uint160' },
              { type: 'int24' }
            ], slot0Result.result);

            sqrtPriceX96 = slot0Decoded[0];
            tick = Number(slot0Decoded[1]);
            console.log('Decoded using viem (2 fields):', { sqrtPriceX96: sqrtPriceX96.toString(), tick });
          } catch (e2) {
            console.error('Also failed with viem 2-field decode:', e2);
            throw new Error(`Cannot decode Aerodrome slot0 data for pool ${poolAddresses[i]}`);
          }
        }
      } else {
        // Uniswap V3 格式：包含更多字段
        try {
          const slot0Decoded = decodeAbiParameters([
            { type: 'uint160' },
            { type: 'int24' },
            { type: 'uint16' },
            { type: 'uint16' },
            { type: 'uint16' },
            { type: 'uint8' },
            { type: 'bool' }
          ], slot0Result.result);

          sqrtPriceX96 = slot0Decoded[0];
          tick = Number(slot0Decoded[1]);
        } catch (e) {
          console.error('Failed to decode Uniswap V3 slot0:', e);
          // 回退：尝试只解析前两个字段
          try {
            const slot0Decoded = decodeAbiParameters([
              { type: 'uint160' },
              { type: 'int24' }
            ], slot0Result.result);

            sqrtPriceX96 = slot0Decoded[0];
            tick = Number(slot0Decoded[1]);
            console.log('Decoded using simplified format:', { sqrtPriceX96: sqrtPriceX96.toString(), tick });
          } catch (e2) {
            console.error('Also failed with simplified decode:', e2);
            throw new Error(`Cannot decode slot0 data for pool ${poolAddresses[i]}`);
          }
        }
      }

      // 准备代币信息请求
      tokenRequests.push(
        {
          jsonrpc: '2.0',
          id: `${token0Address}-symbol`,
          method: 'eth_call',
          params: [{
            to: token0Address,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'symbol'
            })
          }, 'latest']
        },
        {
          jsonrpc: '2.0',
          id: `${token0Address}-decimals`,
          method: 'eth_call',
          params: [{
            to: token0Address,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'decimals'
            })
          }, 'latest']
        },
        {
          jsonrpc: '2.0',
          id: `${token1Address}-symbol`,
          method: 'eth_call',
          params: [{
            to: token1Address,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'symbol'
            })
          }, 'latest']
        },
        {
          jsonrpc: '2.0',
          id: `${token1Address}-decimals`,
          method: 'eth_call',
          params: [{
            to: token1Address,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'decimals'
            })
          }, 'latest']
        },
        {
          jsonrpc: '2.0',
          id: `${token0Address}-balance`,
          method: 'eth_call',
          params: [{
            to: token0Address,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [poolAddresses[i]]
            })
          }, 'latest']
        },
        {
          jsonrpc: '2.0',
          id: `${token1Address}-balance`,
          method: 'eth_call',
          params: [{
            to: token1Address,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [poolAddresses[i]]
            })
          }, 'latest']
        }
      );

      poolInfos.push({
        poolAddress: poolAddresses[i],
        factoryAddress,
        slot0Data: [sqrtPriceX96, tick],
        token0Address,
        token1Address,
        fee,
        tickSpacing, // 添加 tickSpacing 到池子信息
        liquidity
      });
    }

    // 4. 执行代币信息的批量RPC调用
    const tokenResponse = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenRequests)
    });

    const tokenResults = await tokenResponse.json();
    if (!Array.isArray(tokenResults)) {
      throw new Error('Invalid RPC response for token info');
    }

    // 5. 处理所有结果
    const finalResults = [];
    for (let i = 0; i < poolAddresses.length; i++) {
      const poolInfo = poolInfos[i];
      const tokenBaseIndex = i * 6;
      const [
        token0SymbolResult,
        token0DecimalsResult,
        token1SymbolResult,
        token1DecimalsResult,
        token0BalanceResult,
        token1BalanceResult
      ] = tokenResults.slice(tokenBaseIndex, tokenBaseIndex + 6);

      if (token0SymbolResult.error || token0DecimalsResult.error || token1SymbolResult.error ||
        token1DecimalsResult.error || token0BalanceResult.error || token1BalanceResult.error) {
        throw new Error(`Token RPC call failed: ${JSON.stringify(tokenResults.slice(tokenBaseIndex, tokenBaseIndex + 6))}`);
      }

      // 使用 viem 解码结果，添加错误处理
      let token0Symbol, token1Symbol, token0Decimals, token1Decimals, token0Balance, token1Balance;

      try {
        token0Symbol = decodeAbiParameters([{ type: 'string' }], token0SymbolResult.result)[0];
      } catch (e) {
        console.warn('Failed to decode token0 symbol:', e);
        token0Symbol = 'UNKNOWN';
      }

      try {
        token1Symbol = decodeAbiParameters([{ type: 'string' }], token1SymbolResult.result)[0];
      } catch (e) {
        console.warn('Failed to decode token1 symbol:', e);
        token1Symbol = 'UNKNOWN';
      }

      try {
        token0Decimals = Number(decodeAbiParameters([{ type: 'uint8' }], token0DecimalsResult.result)[0]);
      } catch (e) {
        console.warn('Failed to decode token0 decimals:', e);
        token0Decimals = 18; // 默认值
      }

      try {
        token1Decimals = Number(decodeAbiParameters([{ type: 'uint8' }], token1DecimalsResult.result)[0]);
      } catch (e) {
        console.warn('Failed to decode token1 decimals:', e);
        token1Decimals = 18; // 默认值
      }

      try {
        token0Balance = BigInt(decodeAbiParameters([{ type: 'uint256' }], token0BalanceResult.result)[0]);
      } catch (e) {
        console.warn('Failed to decode token0 balance:', e);
        token0Balance = BigInt(0);
      }

      try {
        token1Balance = BigInt(decodeAbiParameters([{ type: 'uint256' }], token1BalanceResult.result)[0]);
      } catch (e) {
        console.warn('Failed to decode token1 balance:', e);
        token1Balance = BigInt(0);
      }

      const [sqrtPriceX96, tick] = poolInfo.slot0Data;
      const price = calculatePriceFromSqrtPriceX96(sqrtPriceX96, token0Decimals, token1Decimals);
      const reversePrice = 1 / price;

      finalResults.push({
        poolAddress: poolInfo.poolAddress,
        protocol: identifyProtocol(poolInfo.factoryAddress),
        factoryAddress: poolInfo.factoryAddress,
        token0: {
          address: poolInfo.token0Address,
          symbol: token0Symbol,
          decimals: token0Decimals,
          balance: formatBalance(token0Balance, token0Decimals),
          rawBalance: token0Balance.toString()
        },
        token1: {
          address: poolInfo.token1Address,
          symbol: token1Symbol,
          decimals: token1Decimals,
          balance: formatBalance(token1Balance, token1Decimals),
          rawBalance: token1Balance.toString()
        },
        fee: poolInfo.fee ? Number(poolInfo.fee) : undefined,
        feePercentage: poolInfo.fee ? Number(poolInfo.fee) / 10000 : undefined,
        tickSpacing: poolInfo.tickSpacing, // 添加 tickSpacing 到最终结果
        tick: Number(tick),
        liquidity: poolInfo.liquidity.toString(),
        sqrtPriceX96: sqrtPriceX96.toString(),
        price: {
          token1PerToken0: price,
          token0PerToken1: reversePrice,
          // formatted: `${price.toFixed(6)} ${token1Symbol}`,
          // formattedReverse: `${reversePrice.toFixed(6)} ${token0Symbol}`
          formatted: `1 ${token0Symbol} = ${price.toFixed(6)} ${token1Symbol}`,
          formattedReverse: `1 ${token1Symbol} = ${reversePrice.toFixed(6)} ${token0Symbol}`
        },
        lastUpdated: new Date().toLocaleTimeString()
      });
    }

    return finalResults;

  } catch (error) {
    console.error('❌ 批量获取LP信息时出错:', error.message);
    throw error;
  }
}

/**
 * 获取单个LP池的详细信息
 * @param {string} poolAddress - LP池地址
 * @returns {Promise<Object>} 包含价格、tick等信息的对象
 */
async function getLPInfo(poolAddress) {
  const results = await getBatchLPInfo([poolAddress]);
  return results[0];
}

/**
 * 根据协议获取Position Manager地址
 * @param {string} factoryAddress - Factory合约地址
 * @returns {string} Position Manager地址
 */
function getPositionManagerAddress(factoryAddress) {
  if (!factoryAddress) {
    console.warn('Factory address is undefined, defaulting to Uniswap V3');
    return POSITION_MANAGER_ADDRESSES.UNISWAP_V3;
  }

  const upperFactory = factoryAddress.toUpperCase();

  if (upperFactory === PROTOCOL_FACTORIES.AERODROME?.toUpperCase()) {
    return POSITION_MANAGER_ADDRESSES.AERODROME;
  } else if (upperFactory === PROTOCOL_FACTORIES.UNISWAP_V3?.toUpperCase()) {
    return POSITION_MANAGER_ADDRESSES.UNISWAP_V3;
  } else {
    // 默认使用Uniswap V3的Position Manager
    return POSITION_MANAGER_ADDRESSES.UNISWAP_V3;
  }
}

/**
 * 从tick计算价格
 * @param {number} tick - tick值
 * @param {number} decimals0 - token0的小数位数
 * @param {number} decimals1 - token1的小数位数
 * @returns {number} 价格
 */
export function calculatePriceFromTick(tick, decimals0, decimals1) {
  const price = Math.pow(1.0001, tick);
  return price * Math.pow(10, decimals0 - decimals1);
}

/**
 * 从价格计算tick (近似值)
 * @param {number} price - 价格 (token1/token0)
 * @param {number} decimals0 - token0的小数位数
 * @param {number} decimals1 - token1的小数位数
 * @returns {number} tick
 */
export function calculateTickFromPrice(price, decimals0, decimals1) {
  const adjustedPrice = price / Math.pow(10, decimals0 - decimals1);
  const tick = Math.log(adjustedPrice) / Math.log(1.0001);
  return Math.round(tick);
}

/**
 * 从tick计算sqrtPriceX96 (近似值)
 * @param {number} tick - tick值
 * @returns {bigint} sqrtPriceX96
 */
function tickToSqrtPriceX96(tick) {
  const sqrtPrice = Math.pow(1.0001, tick / 2);
  const Q96 = 2n ** 96n;
  // Using parseFloat on BigInt.toString() is safe for JS number limits
  return BigInt(Math.floor(sqrtPrice * parseFloat(Q96.toString())));
}

/**
 * 根据流动性计算代币数量
 * @param {string} liquidity - 流动性
 * @param {string} sqrtPriceX96_current - 当前的sqrtPriceX96
 * @param {number} tickCurrent - 当前的tick
 * @param {number} tickLower - 区间下限tick
 * @param {number} tickUpper - 区间上限tick
 * @param {number} decimals0 - token0的小数位数
 * @param {number} decimals1 - token1的小数位数
 * @returns {object} 包含两种代币数量的对象
 */
function getAmountsForLiquidity(liquidity, sqrtPriceX96_current, tickCurrent, tickLower, tickUpper, decimals0, decimals1) {
  const L = BigInt(liquidity);
  if (L === 0n) {
    return {
      raw: { token0: '0', token1: '0' },
      formatted: { token0: '0.000000', token1: '0.000000' }
    };
  }

  const sp_current = BigInt(sqrtPriceX96_current);
  const sa = tickToSqrtPriceX96(tickLower);
  const sb = tickToSqrtPriceX96(tickUpper);
  const Q96 = 2n ** 96n;

  let amount0 = 0n;
  let amount1 = 0n;

  if (tickCurrent < tickLower) {
    if (sa > 0 && sb > 0) {
      amount0 = (L * (sb - sa) * Q96) / (sb * sa);
    }
  } else if (tickCurrent >= tickUpper) {
    amount1 = (L * (sb - sa)) / Q96;
  } else {
    if (sp_current > 0 && sb > 0) {
      amount0 = (L * (sb - sp_current) * Q96) / (sb * sp_current);
    }
    amount1 = (L * (sp_current - sa)) / Q96;
  }

  const amount0Formatted = Number(amount0) / (10 ** decimals0);
  const amount1Formatted = Number(amount1) / (10 ** decimals1);

  return {
    raw: {
      token0: amount0.toString(),
      token1: amount1.toString(),
    },
    formatted: {
      token0: amount0Formatted.toFixed(6),
      token1: amount1Formatted.toFixed(6),
    }
  };
}

/**
 * 根据代币数量计算流动性
 * @param {object} poolInfo - 池子信息
 * @param {number} tickLower - 区间下限tick
 * @param {number} tickUpper - 区间上限tick
 * @param {string} amount0 - token0的数量
 * @param {string} amount1 - token1的数量
 * @returns {bigint} liquidity
 */
export function getLiquidityForAmounts(poolInfo, tickLower, tickUpper, amount0, amount1) {
  const { sqrtPriceX96, tick: tickCurrent, token0: { decimals: decimals0 }, token1: { decimals: decimals1 } } = poolInfo;

  const sp_current = BigInt(sqrtPriceX96);
  const sa = tickToSqrtPriceX96(tickLower);
  const sb = tickToSqrtPriceX96(tickUpper);

  const Q96 = 2n ** 96n;

  const amount0BN = BigInt(Math.floor(Number(amount0) * (10 ** decimals0)));
  const amount1BN = BigInt(Math.floor(Number(amount1) * (10 ** decimals1)));

  let liquidity = 0n;

  if (tickCurrent < tickLower) {
    // L = amount0 * (sa * sb / Q96) / (sb - sa)
    if (sb > sa) {
      liquidity = (amount0BN * sa * sb / Q96) / (sb - sa);
    }
  } else if (tickCurrent >= tickUpper) {
    // L = amount1 * Q96 / (sb - sa)
    if (sb > sa) {
      liquidity = (amount1BN * Q96) / (sb - sa);
    }
  } else {
    // L_from_amount0 = amount0 * (sp * sb / Q96) / (sb - sp)
    // L_from_amount1 = amount1 * Q96 / (sp - sa)
    let liquidity0 = 0n;
    if (sb > sp_current) {
      liquidity0 = (amount0BN * sp_current * sb / Q96) / (sb - sp_current);
    }

    let liquidity1 = 0n;
    if (sp_current > sa) {
      liquidity1 = (amount1BN * Q96) / (sp_current - sa);
    }

    liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  }

  return liquidity;
}

export function getLiquidityForAmount0(poolInfo, tickLower, tickUpper, amount0) {
  const { sqrtPriceX96, tick: tickCurrent, token0: { decimals: decimals0 } } = poolInfo;
  const sp_current = BigInt(sqrtPriceX96);
  const sa = tickToSqrtPriceX96(tickLower);
  const sb = tickToSqrtPriceX96(tickUpper);
  const Q96 = 2n ** 96n;
  const amount0BN = BigInt(Math.floor(Number(amount0) * (10 ** decimals0)));

  let liquidity = 0n;
  if (tickCurrent < tickLower) {
    if (sb > sa) {
      liquidity = (amount0BN * sa * sb / Q96) / (sb - sa);
    }
  } else if (tickCurrent >= tickUpper) {
    liquidity = 0n;
  } else {
    if (sb > sp_current) {
      liquidity = (amount0BN * sp_current * sb / Q96) / (sb - sp_current);
    }
  }
  return liquidity;
}

export function getLiquidityForAmount1(poolInfo, tickLower, tickUpper, amount1) {
  const { sqrtPriceX96, tick: tickCurrent, token1: { decimals: decimals1 } } = poolInfo;
  const sp_current = BigInt(sqrtPriceX96);
  const sa = tickToSqrtPriceX96(tickLower);
  const sb = tickToSqrtPriceX96(tickUpper);
  const Q96 = 2n ** 96n;
  const amount1BN = BigInt(Math.floor(Number(amount1) * (10 ** decimals1)));

  let liquidity = 0n;
  if (tickCurrent < tickLower) {
    liquidity = 0n;
  } else if (tickCurrent >= tickUpper) {
    if (sb > sa) {
      liquidity = (amount1BN * Q96) / (sb - sa);
    }
  } else {
    if (sp_current > sa) {
      liquidity = (amount1BN * Q96) / (sp_current - sa);
    }
  }
  return liquidity;
}

/**
 * Executes RPC requests in batches to avoid overwhelming the provider.
 * @param {Array<object>} requests - Array of JSON-RPC request objects.
 * @param {number} batchSize - The number of requests per batch.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of all results.
 */
async function executeBatchRpc(requests, batchSize = 50) {
  if (requests.length === 0) {
    return [];
  }
  const allResults = [];
  const rpcUrl = getRpcUrl();
  console.log(`📦 执行批量RPC调用，总请求数: ${requests.length}, 每批大小: ${batchSize}`);

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    console.log(`  - 发送批次 ${Math.floor(i / batchSize) + 1} / ${Math.ceil(requests.length / batchSize)}`);

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        throw new Error(`RPC请求失败，状态码: ${response.status}`);
      }

      const results = await response.json();

      if (!Array.isArray(results)) {
        if (results.error) {
          throw new Error(`RPC错误: ${results.error.message || JSON.stringify(results.error)}`);
        }
        throw new Error('无效的RPC批量响应: 返回的不是一个数组。');
      }
      allResults.push(...results);

      // Add a small delay between batches to be nice to the RPC node
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`  - 批次 ${Math.floor(i / batchSize) + 1} 执行失败:`, error);
      throw error;
    }
  }
  return allResults;
}

/**
 * 获取NFT位置信息
 * @param {string} nftId - NFT ID
 * @param {string} poolAddress - 池子地址
 * @param {Object} lpInfo - 池子信息
 * @returns {Object} NFT位置信息
 */
async function getNFTPositionInfo(nftId, poolAddress, lpInfo) {
  try {
    console.log(`🔍 正在获取NFT位置信息: ${nftId}`);

    // 获取Position Manager地址
    const positionManagerAddress = getPositionManagerAddress(lpInfo.factoryAddress);

    // 准备批量调用
    const calls = [
      // 获取NFT位置基本信息
      {
        jsonrpc: '2.0',
        id: 0,
        method: 'eth_call',
        params: [{
          to: positionManagerAddress,
          data: encodeFunctionData({
            abi: POSITION_MANAGER_ABI,
            functionName: 'positions',
            args: [BigInt(nftId)]
          })
        }, 'latest']
      },
      // 使用collect函数的staticcall获取真实手续费
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: positionManagerAddress,
          data: encodeFunctionData({
            abi: POSITION_MANAGER_ABI,
            functionName: 'collect',
            args: [{
              tokenId: BigInt(nftId),
              recipient: '0x0000000000000000000000000000000000000000', // 使用零地址进行staticcall
              amount0Max: BigInt('340282366920938463463374607431768211455'), // uint128 max
              amount1Max: BigInt('340282366920938463463374607431768211455')  // uint128 max
            }]
          })
        }, 'latest']
      },
      // 获取NFT所有者
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_call',
        params: [{
          to: positionManagerAddress,
          data: encodeFunctionData({
            abi: POSITION_MANAGER_ABI,
            functionName: 'ownerOf',
            args: [BigInt(nftId)]
          })
        }, 'latest']
      }
    ];

    // 执行批量RPC调用
    const response = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calls)
    });

    const results = await response.json();
    if (!Array.isArray(results) || results.length !== 3) {
      throw new Error('Invalid RPC response');
    }

    const [positionResult, collectResult, ownerResult] = results;

    if (positionResult.error) {
      throw new Error(`Position call failed: ${positionResult.error.message}`);
    }

    if (collectResult.error) {
      throw new Error(`Collect call failed: ${collectResult.error.message}`);
    }

    if (ownerResult.error) {
      throw new Error(`Owner call failed: ${ownerResult.error.message}`);
    }

    // 判断是否为 Aerodrome（根据 factory 地址）
    const isAerodrome = lpInfo.factoryAddress.toLowerCase() === PROTOCOL_FACTORIES.AERODROME.toLowerCase();

    // 根据协议类型使用不同的 ABI 解码
    let positionData;
    let nonce, operator, token0, token1, feeOrTickSpacing, tickLower, tickUpper, liquidity;
    let feeGrowthInside0LastX128, feeGrowthInside1LastX128, tokensOwed0, tokensOwed1;

    if (isAerodrome) {
      // Aerodrome 使用 tickSpacing 而不是 fee
      positionData = decodeAbiParameters([
        { type: 'uint96' },   // nonce
        { type: 'address' },  // operator
        { type: 'address' },  // token0
        { type: 'address' },  // token1
        { type: 'int24' },    // tickSpacing (注意：int24 而不是 uint24)
        { type: 'int24' },    // tickLower
        { type: 'int24' },    // tickUpper
        { type: 'uint128' },  // liquidity
        { type: 'uint256' },  // feeGrowthInside0LastX128
        { type: 'uint256' },  // feeGrowthInside1LastX128
        { type: 'uint128' },  // tokensOwed0
        { type: 'uint128' }   // tokensOwed1
      ], positionResult.result);
    } else {
      // Uniswap V3 使用 fee
      positionData = decodeAbiParameters([
        { type: 'uint96' },   // nonce
        { type: 'address' },  // operator
        { type: 'address' },  // token0
        { type: 'address' },  // token1
        { type: 'uint24' },   // fee
        { type: 'int24' },    // tickLower
        { type: 'int24' },    // tickUpper
        { type: 'uint128' },  // liquidity
        { type: 'uint256' },  // feeGrowthInside0LastX128
        { type: 'uint256' },  // feeGrowthInside1LastX128
        { type: 'uint128' },  // tokensOwed0
        { type: 'uint128' }   // tokensOwed1
      ], positionResult.result);
    }

    [
      nonce,
      operator,
      token0,
      token1,
      feeOrTickSpacing,
      tickLower,
      tickUpper,
      liquidity,
      feeGrowthInside0LastX128,
      feeGrowthInside1LastX128,
      tokensOwed0,
      tokensOwed1
    ] = positionData;

    console.log('positionData', positionData);
    console.log('协议类型:', isAerodrome ? 'Aerodrome' : 'Uniswap V3');
    console.log(isAerodrome ? 'tickSpacing:' : 'fee:', feeOrTickSpacing);

    // 解码collect数据（真实的手续费金额）
    const collectData = decodeAbiParameters([
      { type: 'uint256' }, // amount0
      { type: 'uint256' }  // amount1
    ], collectResult.result);

    const [collectableAmount0, collectableAmount1] = collectData;

    // 解码owner数据
    const ownerData = decodeAbiParameters([
      { type: 'address' } // owner
    ], ownerResult.result);

    const [owner] = ownerData;

    // 验证NFT是否属于当前池子
    let isValidPool;

    if (isAerodrome) {
      // Aerodrome: 比较 token 地址和 tickSpacing
      isValidPool = token0.toLowerCase() === lpInfo.token0.address.toLowerCase() &&
        token1.toLowerCase() === lpInfo.token1.address.toLowerCase() &&
        Number(feeOrTickSpacing) === lpInfo.tickSpacing;

      console.log('Aerodrome 池子验证:', {
        token0Match: token0.toLowerCase() === lpInfo.token0.address.toLowerCase(),
        token1Match: token1.toLowerCase() === lpInfo.token1.address.toLowerCase(),
        tickSpacingMatch: Number(feeOrTickSpacing) === lpInfo.tickSpacing,
        nftTickSpacing: Number(feeOrTickSpacing),
        poolTickSpacing: lpInfo.tickSpacing
      });
    } else {
      // Uniswap V3: 比较 token 地址和 fee
      isValidPool = token0.toLowerCase() === lpInfo.token0.address.toLowerCase() &&
        token1.toLowerCase() === lpInfo.token1.address.toLowerCase() &&
        Number(feeOrTickSpacing) === lpInfo.fee;
    }

    if (!isValidPool) {
      throw new Error('NFT不属于当前池子');
    }

    // 计算价格范围
    const priceLower = calculatePriceFromTick(Number(tickLower), lpInfo.token0.decimals, lpInfo.token1.decimals);
    const priceUpper = calculatePriceFromTick(Number(tickUpper), lpInfo.token0.decimals, lpInfo.token1.decimals);

    // 检查当前价格是否在范围内
    const currentPrice = lpInfo.price.token1PerToken0;
    const isInRange = currentPrice >= priceLower && currentPrice <= priceUpper;

    // 计算流动性状态
    const hasLiquidity = Number(liquidity) > 0;

    // 计算仓位包含的代币数量
    const positionLiquidity = getAmountsForLiquidity(
      liquidity.toString(),
      lpInfo.sqrtPriceX96,
      lpInfo.tick,
      Number(tickLower),
      Number(tickUpper),
      lpInfo.token0.decimals,
      lpInfo.token1.decimals
    );

    // 格式化手续费金额
    const formatFee = (amount, decimals, symbol) => {
      const feeAmount = Number(amount) / Math.pow(10, decimals);
      if (feeAmount >= 1000000) {
        return `${(feeAmount / 1000000).toFixed(4)}M ${symbol}`;
      } else if (feeAmount >= 1000) {
        return `${(feeAmount / 1000).toFixed(4)}K ${symbol}`;
      } else if (feeAmount >= 1) {
        return `${feeAmount.toFixed(6)} ${symbol}`;
      } else if (feeAmount >= 0.000001) {
        return `${feeAmount.toFixed(8)} ${symbol}`;
      } else {
        return `${feeAmount.toExponential(2)} ${symbol}`;
      }
    };

    return {
      nftId,
      isValid: true,
      isValidPool: true,
      hasLiquidity,
      isInRange,
      owner: owner.toLowerCase(), // 添加NFT所有者信息
      liquidity: liquidity.toString(),
      tickLower: Number(tickLower),
      tickUpper: Number(tickUpper),
      priceRange: {
        lower: priceLower,
        upper: priceUpper,
        lowerFormatted: `1 ${lpInfo.token0.symbol} = ${priceLower.toFixed(6)} ${lpInfo.token1.symbol}`,
        upperFormatted: `1 ${lpInfo.token0.symbol} = ${priceUpper.toFixed(6)} ${lpInfo.token1.symbol}`
      },
      currentPrice: currentPrice,
      positionLiquidity,
      fees: {
        // 真实可领取的手续费（通过collect staticcall获取）
        collectable: {
          token0: collectableAmount0.toString(),
          token1: collectableAmount1.toString(),
          token0Formatted: formatFee(collectableAmount0, lpInfo.token0.decimals, lpInfo.token0.symbol),
          token1Formatted: formatFee(collectableAmount1, lpInfo.token1.decimals, lpInfo.token1.symbol)
        },
        // 从positions函数获取的tokensOwed（仅供参考）
        tokensOwed: {
          token0: tokensOwed0.toString(),
          token1: tokensOwed1.toString()
        }
      },
      status: isInRange ? (hasLiquidity ? '✅ 活跃' : '⚠️ 无流动性') : '❌ 超出范围'
    };

  } catch (error) {
    console.error('❌ 获取NFT位置信息时出错:', error.message);
    return {
      nftId,
      isValid: false,
      error: error.message,
      status: '❌ 错误'
    };
  }
}

/**
 * 通过钱包地址查找其拥有的所有V3 LP NFT
 * @param {string} ownerAddress - 钱包地址
 * @returns {Promise<Object[]>} 包含NFT和池子信息的数组
 */
export async function findNftPositionsByOwner(ownerAddress) {
  console.log(`🔍 正在为地址 ${ownerAddress} 查找 LP NFT...`);
  console.log('Position Manager 地址:', POSITION_MANAGER_ADDRESSES);
  console.log('Protocol Factories:', PROTOCOL_FACTORIES);
  const rpcUrl = getRpcUrl();
  let allFoundPositions = [];
  let idCounter = 0; // 用于批量请求的唯一ID

  try {
    // 1. 获取所有 Position Manager 合约中该地址的 NFT 余额
    const balanceRequests = Object.entries(POSITION_MANAGER_ADDRESSES).map(([protocol, address]) => ({
      jsonrpc: '2.0',
      id: `${protocol}-balance`,
      method: 'eth_call',
      params: [{
        to: address,
        data: encodeFunctionData({
          abi: POSITION_MANAGER_ABI,
          functionName: 'balanceOf',
          args: [ownerAddress]
        })
      }, 'latest']
    }));

    const balanceResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(balanceRequests)
    });
    const balanceResults = await balanceResponse.json();

    // 2. 获取所有 NFT 的 tokenId
    const tokenIdRequests = [];
    const positionManagerInfo = {};

    for (const result of balanceResults) {
      if (result.error || result.result === '0x') continue;

      const balance = Number(decodeAbiParameters([{ type: 'uint256' }], result.result)[0]);
      if (balance === 0) continue;

      const protocol = result.id.split('-')[0];
      const managerAddress = POSITION_MANAGER_ADDRESSES[protocol];
      positionManagerInfo[protocol] = { managerAddress, tokenIds: [] };

      const NFT_LIMIT = 50; // 只获取最新的50个NFT
      const startIndex = Math.max(0, balance - NFT_LIMIT);

      console.log(`✅ 在 ${protocol} 中发现 ${balance} 个NFT`);
      console.log(`  Manager 地址: ${managerAddress}`);
      console.log(`  将从索引 ${startIndex} 开始获取最新的 ${balance - startIndex} 个`);

      for (let i = startIndex; i < balance; i++) {
        tokenIdRequests.push({
          jsonrpc: '2.0',
          id: `${protocol}-token-index-${i}`,
          method: 'eth_call',
          params: [{
            to: managerAddress,
            data: encodeFunctionData({
              abi: POSITION_MANAGER_ABI,
              functionName: 'tokenOfOwnerByIndex',
              args: [ownerAddress, i]
            })
          }, 'latest']
        });
      }
    }

    if (tokenIdRequests.length === 0) {
      console.log('✅ 在所有已知的 Position Manager 中未找到任何 LP NFT。');
      return [];
    }

    const tokenIdResults = await executeBatchRpc(tokenIdRequests);

    // 3. 获取每个 NFT 的仓位详情
    const positionDetailsRequests = [];
    for (const result of tokenIdResults) {
      if (result.error || result.result === '0x') continue;

      const tokenId = decodeAbiParameters([{ type: 'uint256' }], result.result)[0];
      const [protocol] = result.id.split('-');
      const managerAddress = positionManagerInfo[protocol].managerAddress;
      positionManagerInfo[protocol].tokenIds.push(tokenId);

      positionDetailsRequests.push({
        jsonrpc: '2.0',
        id: `${protocol}-position-${tokenId}`,
        method: 'eth_call',
        params: [{
          to: managerAddress,
          data: encodeFunctionData({
            abi: POSITION_MANAGER_ABI,
            functionName: 'positions',
            args: [tokenId]
          })
        }, 'latest']
      });
    }

    const positionDetailsResults = await executeBatchRpc(positionDetailsRequests);

    // 4. 获取池子地址和代币符号
    const poolAddressRequests = [];
    const tokenSymbolRequests = [];
    const positionsData = {};
    const uniqueTokens = new Set();
    const nftToPositionKey = {};

    for (const result of positionDetailsResults) {
      if (result.error || result.result === '0x') continue;

      const [protocol, , tokenId] = result.id.split('-');
      console.log(`\n📍 处理 ${protocol} NFT #${tokenId}`);
      console.log(`  数据长度: ${result.result.length}`);

      // 根据协议类型使用不同的解析方式
      let position;
      let token0, token1, feeOrTickSpacing, liquidity;

      if (protocol === 'AERODROME') {
        console.log('  使用 Aerodrome 解析方式');
        // Aerodrome 使用 tickSpacing (int24) 而不是 fee (uint24)
        position = decodeAbiParameters([
          { type: 'uint96' },   // nonce
          { type: 'address' },  // operator
          { type: 'address' },  // token0
          { type: 'address' },  // token1
          { type: 'int24' },    // tickSpacing
          { type: 'int24' },    // tickLower
          { type: 'int24' },    // tickUpper
          { type: 'uint128' }   // liquidity
        ], result.result);
      } else {
        // Uniswap V3 使用 fee (uint24)
        position = decodeAbiParameters([
          { type: 'uint96' },   // nonce
          { type: 'address' },  // operator
          { type: 'address' },  // token0
          { type: 'address' },  // token1
          { type: 'uint24' },   // fee
          { type: 'int24' },    // tickLower
          { type: 'int24' },    // tickUpper
          { type: 'uint128' }   // liquidity
        ], result.result);
      }

      [token0, token1, feeOrTickSpacing, liquidity] = [position[2], position[3], position[4], position[7]];

      console.log(`  Token0: ${token0}`);
      console.log(`  Token1: ${token1}`);
      console.log(`  ${protocol === 'AERODROME' ? 'TickSpacing' : 'Fee'}: ${feeOrTickSpacing}`);
      console.log(`  Liquidity: ${liquidity}`);

      if (liquidity === 0n) {
        console.log('  ❌ 跳过：没有流动性');
        continue;
      }

      const factoryAddress = PROTOCOL_FACTORIES[protocol];
      console.log(`  Factory 地址: ${factoryAddress}`);

      const positionKey = `${protocol}-${token0}-${token1}-${feeOrTickSpacing}`;
      nftToPositionKey[tokenId] = positionKey;
      console.log(`  Position Key: ${positionKey}`);

      if (!positionsData[positionKey]) {
        positionsData[positionKey] = { protocol, factoryAddress, token0, token1, feeOrTickSpacing };
        console.log(`  创建新的池子查询任务`);

        // 根据协议类型使用不同的 getPool 调用和 ABI
        if (protocol === 'AERODROME') {
          // Aerodrome 的 getPool 使用 tickSpacing 和专用 ABI
          const encodedData = encodeFunctionData({
            abi: AERODROME_FACTORY_ABI,  // 使用 Aerodrome 专用 ABI
            functionName: 'getPool',
            args: [token0, token1, Number(feeOrTickSpacing)] // tickSpacing as int24
          });

          poolAddressRequests.push({
            jsonrpc: '2.0',
            id: `pool-${positionKey}`,
            method: 'eth_call',
            params: [{
              to: factoryAddress,
              data: encodedData
            }, 'latest']
          });
          console.log(`  📞 调用 Aerodrome getPool:`);
          console.log(`    - tokenA: ${token0}`);
          console.log(`    - tokenB: ${token1}`);
          console.log(`    - tickSpacing (int24): ${feeOrTickSpacing}`);
          console.log(`    - Factory: ${factoryAddress}`);
          console.log(`    - Encoded data: ${encodedData}`);
        } else {
          // Uniswap V3 的 getPool 使用 fee
          poolAddressRequests.push({
            jsonrpc: '2.0',
            id: `pool-${positionKey}`,
            method: 'eth_call',
            params: [{
              to: factoryAddress,
              data: encodeFunctionData({
                abi: FACTORY_ABI,  // 使用标准 Uniswap V3 ABI
                functionName: 'getPool',
                args: [token0, token1, Number(feeOrTickSpacing)] // fee as uint24
              })
            }, 'latest']
          });
          console.log(`  📞 调用 Uniswap getPool:`);
          console.log(`    - tokenA: ${token0}`);
          console.log(`    - tokenB: ${token1}`);
          console.log(`    - fee: ${feeOrTickSpacing}`);
          console.log(`    - Factory: ${factoryAddress}`);
        }
      }

      if (!uniqueTokens.has(token0)) {
        uniqueTokens.add(token0);
        tokenSymbolRequests.push({
          jsonrpc: '2.0', id: `symbol-${token0}`, method: 'eth_call',
          params: [{ to: token0, data: encodeFunctionData({ abi: ERC20_ABI, functionName: 'symbol' }) }, 'latest']
        });
      }
      if (!uniqueTokens.has(token1)) {
        uniqueTokens.add(token1);
        tokenSymbolRequests.push({
          jsonrpc: '2.0', id: `symbol-${token1}`, method: 'eth_call',
          params: [{ to: token1, data: encodeFunctionData({ abi: ERC20_ABI, functionName: 'symbol' }) }, 'latest']
        });
      }
    }

    if (poolAddressRequests.length === 0) {
      console.log('✅ 未找到有流动性的 LP 仓位。');
      return [];
    }

    const [poolAddressResults, tokenSymbolResults] = await Promise.all([
      executeBatchRpc(poolAddressRequests),
      executeBatchRpc(tokenSymbolRequests)
    ]);

    const tokenSymbols = tokenSymbolResults.reduce((acc, r) => {
      if (!r.error && r.result !== '0x') {
        const address = r.id.split('-')[1];
        acc[address] = decodeAbiParameters([{ type: 'string' }], r.result)[0];
      }
      return acc;
    }, {});

    console.log('\n📋 处理池子地址响应:');
    console.log(`  收到 ${poolAddressResults.length} 个池子查询结果`);

    const poolAddressMapping = {};
    for (const result of poolAddressResults) {
      const positionKey = result.id.substring(5); // 移除 'pool-' 前缀
      console.log(`  检查池子 ${positionKey}...`);

      if (result.error) {
        console.error(`❌ 获取池子地址失败 ${positionKey}:`, result.error);
        continue;
      }

      if (result.result === '0x' || result.result === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.warn(`⚠️ 池子不存在或返回零地址 ${positionKey}`);
        console.warn(`  原始结果: ${result.result}`);
        continue;
      }

      const poolAddress = decodeAbiParameters([{ type: 'address' }], result.result)[0];
      console.log(`✅ 找到池子地址 ${positionKey}: ${poolAddress}`);

      if (poolAddress !== '0x0000000000000000000000000000000000000000') {
        poolAddressMapping[positionKey] = poolAddress;
      } else {
        console.warn(`池子地址为零地址 ${positionKey}`);
      }
    }

    allFoundPositions = Object.entries(nftToPositionKey).map(([tokenId, positionKey]) => {
      const poolAddress = poolAddressMapping[positionKey];
      if (!poolAddress) return null;

      const data = positionsData[positionKey];
      return {
        poolAddress: poolAddress,
        protocol: identifyProtocol(data.factoryAddress),
        token0: { address: data.token0, symbol: tokenSymbols[data.token0] || '?' },
        token1: { address: data.token1, symbol: tokenSymbols[data.token1] || '?' },
        fee: data.protocol === 'AERODROME' ? undefined : Number(data.feeOrTickSpacing), // Aerodrome 不使用 fee
        tickSpacing: data.protocol === 'AERODROME' ? Number(data.feeOrTickSpacing) : undefined, // Aerodrome 使用 tickSpacing
        nftIds: [tokenId.toString()] // 每个仓位只包含自己的NFT ID
      };
    }).filter(p => p !== null);

    console.log(`\n📊 搜索结果汇总:`);
    console.log(`  - 找到的有效仓位数: ${allFoundPositions.length}`);
    allFoundPositions.forEach(pos => {
      console.log(`  - ${pos.protocol.name}: ${pos.token0.symbol}/${pos.token1.symbol} (${pos.fee !== undefined ? `fee: ${pos.fee}` : `tickSpacing: ${pos.tickSpacing}`})`);
      console.log(`    池子地址: ${pos.poolAddress}`);
      console.log(`    NFT IDs: ${pos.nftIds.join(', ')}`);
    });
    return allFoundPositions;
  } catch (error) {
    console.error('❌ 查找 LP NFT 时出错:', error);
    throw error;
  }
}

/**
 * 通过NFT ID获取池子地址
 * @param {string} nftId - NFT ID
 * @returns {Object} 包含池子地址和NFT ID的对象
 */
async function getPoolAddressFromNftId(nftId) {
  try {
    console.log(`🔍 正在通过NFT ID获取池子地址: ${nftId}`);

    // 根据NFT ID大小确定优先尝试的协议
    const nftIdNumber = parseInt(nftId);
    let protocolOrder;

    if (nftIdNumber > 2500000) {
      // NFT ID > 2500000，优先尝试PancakeSwap
      protocolOrder = ['PANCAKESWAP_V3', 'UNISWAP_V3'];
      console.log(`NFT ID ${nftId} > 2500000，优先尝试 PancakeSwap`);
    } else {
      // NFT ID <= 2500000，优先尝试Uniswap  
      protocolOrder = ['UNISWAP_V3', 'PANCAKESWAP_V3'];
      console.log(`NFT ID ${nftId} <= 2500000，优先尝试 Uniswap`);
    }

    // 按照优先级顺序尝试协议
    for (const protocol of protocolOrder) {
      const managerAddress = POSITION_MANAGER_ADDRESSES[protocol];
      try {
        // 调用positions函数获取NFT信息
        const response = await fetch(getRpcUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{
              to: managerAddress,
              data: encodeFunctionData({
                abi: POSITION_MANAGER_ABI,
                functionName: 'positions',
                args: [BigInt(nftId)]
              })
            }, 'latest']
          })
        });

        const result = await response.json();

        if (result.error) {
          console.log(`❌ ${protocol}: ${result.error.message}`);
          continue;
        }

        // 解码position数据
        const positionData = decodeAbiParameters([
          { type: 'uint96' },   // nonce
          { type: 'address' },  // operator
          { type: 'address' },  // token0
          { type: 'address' },  // token1
          { type: 'uint24' },   // fee
          { type: 'int24' },    // tickLower
          { type: 'int24' },    // tickUpper
          { type: 'uint128' },  // liquidity
          { type: 'uint256' },  // feeGrowthInside0LastX128
          { type: 'uint256' },  // feeGrowthInside1LastX128
          { type: 'uint128' },  // tokensOwed0
          { type: 'uint128' }   // tokensOwed1
        ], result.result);

        const [nonce, operator, token0, token1, fee] = positionData;

        // 检查token地址是否有效（不是零地址）
        if (token0 === '0x0000000000000000000000000000000000000000' ||
          token1 === '0x0000000000000000000000000000000000000000') {
          continue;
        }

        // 获取对应的工厂地址
        const factoryAddress = PROTOCOL_FACTORIES[protocol];
        if (!factoryAddress) {
          continue;
        }

        // 通过工厂合约获取池子地址
        const poolResponse = await fetch(getRpcUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'eth_call',
            params: [{
              to: factoryAddress,
              data: encodeFunctionData({
                abi: FACTORY_ABI,
                functionName: 'getPool',
                args: [token0, token1, fee]
              })
            }, 'latest']
          })
        });

        const poolResult = await poolResponse.json();

        if (poolResult.error) {
          console.log(`❌ 获取池子地址失败 (${protocol}): ${poolResult.error.message}`);
          continue;
        }

        const poolAddress = decodeAbiParameters([{ type: 'address' }], poolResult.result)[0];

        // 检查池子地址是否有效（不是零地址）
        if (poolAddress === '0x0000000000000000000000000000000000000000') {
          continue;
        }

        console.log(`✅ 找到有效的NFT (${protocol}): 池子地址 ${poolAddress}`);

        return {
          success: true,
          poolAddress: poolAddress,
          nftId: nftId,
          protocol: protocol,
          token0: token0,
          token1: token1,
          fee: Number(fee)
        };

      } catch (error) {
        console.log(`❌ 检查 ${protocol} 时出错: ${error.message}`);
        continue;
      }
    }

    throw new Error('未找到有效的NFT或NFT不存在');

  } catch (error) {
    console.error('❌ 通过NFT ID获取池子地址时出错:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 计算给定tick的sqrt价格
 * @param {number} tick - tick值
 * @returns {bigint} sqrt价格 (Q96格式)
 */
function getSqrtRatioAtTick(tick) {
  const sqrtPrice = Math.sqrt(Math.pow(1.0001, tick));
  const Q96 = 2 ** 96;
  return BigInt(Math.floor(sqrtPrice * Q96));
}

/**
 * 简化版获取tick流动性数据（直接查询，不使用bitmap）
 * @param {string} poolAddress - 池子地址
 * @param {number} currentTick - 当前tick
 * @param {number} tickSpacing - tick间隔
 * @param {number} range - 获取范围（上下各多少格）
 * @param {number} decimals0 - token0的小数位数
 * @param {number} decimals1 - token1的小数位数
 * @param {string} sqrtPriceX96 - 当前sqrt价格
 * @returns {Promise<Array>} tick流动性数据数组
 */
export async function getTickLiquidityDataSimple(poolAddress, currentTick, tickSpacing, range = 15, decimals0 = 18, decimals1 = 18, sqrtPriceX96 = null) {
  const rpcUrl = getRpcUrl();

  try {
    // 计算起始和结束tick，确保对齐到 tickSpacing
    const alignedCurrentTick = Math.round(currentTick / tickSpacing) * tickSpacing;
    const startTick = alignedCurrentTick - range * tickSpacing;
    const endTick = alignedCurrentTick + range * tickSpacing;

    console.log('--- getTickLiquidityDataSimple Debug ---');
    console.log('currentTick:', currentTick);
    console.log('tickSpacing:', tickSpacing);
    console.log('range:', range);
    console.log('alignedCurrentTick:', alignedCurrentTick);
    console.log('startTick:', startTick);
    console.log('endTick:', endTick);
    console.log('------------------------------------');

    // Pool合约ABI（只包含需要的函数）
    const POOL_ABI = [
      {
        inputs: [{ name: "tick", type: "int24" }],
        name: "ticks",
        outputs: [
          { name: "liquidityGross", type: "uint128" },
          { name: "liquidityNet", type: "int128" },
          { name: "feeGrowthOutside0X128", type: "uint256" },
          { name: "feeGrowthOutside1X128", type: "uint256" },
          { name: "tickCumulativeOutside", type: "int56" },
          { name: "secondsPerLiquidityOutsideX128", type: "uint160" },
          { name: "secondsOutside", type: "uint32" },
          { name: "initialized", type: "bool" }
        ],
        stateMutability: "view",
        type: "function"
      }
    ];

    // 构建所有需要查询的tick  
    const ticksToQuery = [];
    for (let tick = startTick; tick <= endTick; tick += tickSpacing) {
      ticksToQuery.push(tick);
    }

    // 批量查询tick数据
    const tickRequests = ticksToQuery.map(tick => ({
      jsonrpc: '2.0',
      id: `tick-${tick}`,
      method: 'eth_call',
      params: [{
        to: poolAddress,
        data: encodeFunctionData({
          abi: POOL_ABI,
          functionName: 'ticks',
          args: [tick]
        })
      }, 'latest']
    }));

    // 执行查询
    const tickResults = await executeBatchRpc(tickRequests);

    // 整理tick数据
    const allTicks = [];

    // 首先收集所有tick数据
    const tickDataList = [];
    for (let i = 0; i < ticksToQuery.length; i++) {
      const tick = ticksToQuery[i];
      const result = tickResults[i];

      let liquidityNet = 0n;
      let liquidityGross = 0n;
      let initialized = false;

      if (!result.error && result.result && result.result !== '0x') {
        try {
          // 处理返回的数据 - result.result 应该是一个完整的 ABI 编码值
          // 对于 ticks 函数，返回值是一个 tuple
          // 先打印看看数据格式
          if (result.result !== '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000') {
            console.log('Non-zero tick data for tick', tick, ':', result.result);
          }

          // 将返回值作为单个 tuple 解码
          const decoded = decodeAbiParameters(
            [{
              type: 'tuple',
              components: [
                { name: 'liquidityGross', type: 'uint128' },
                { name: 'liquidityNet', type: 'int128' },
                { name: 'feeGrowthOutside0X128', type: 'uint256' },
                { name: 'feeGrowthOutside1X128', type: 'uint256' },
                { name: 'tickCumulativeOutside', type: 'int56' },
                { name: 'secondsPerLiquidityOutsideX128', type: 'uint160' },
                { name: 'secondsOutside', type: 'uint32' },
                { name: 'initialized', type: 'bool' }
              ]
            }],
            result.result
          );

          const tickData = decoded[0];
          liquidityGross = tickData.liquidityGross;
          liquidityNet = tickData.liquidityNet;
          initialized = tickData.initialized;
        } catch (e) {
          // 如果 tuple 解码失败，尝试直接解码为独立的参数
          try {
            // 移除 0x 前缀
            const data = result.result.slice(2);

            // 每个参数占 32 字节（64 个十六进制字符）
            // liquidityGross (uint128) - 32 bytes
            const liquidityGrossHex = '0x' + data.slice(0, 64);
            // liquidityNet (int128) - 32 bytes  
            const liquidityNetHex = '0x' + data.slice(64, 128);
            // 跳过其他参数，直接获取 initialized (最后 32 bytes)
            const initializedHex = '0x' + data.slice(448, 512);

            liquidityGross = BigInt(liquidityGrossHex);

            // liquidityNet 是有符号的 int128，需要正确处理负数
            const liquidityNetBigInt = BigInt(liquidityNetHex);
            // 检查是否为负数（最高位为1）
            const isNegative = liquidityNetBigInt >= (1n << 127n);
            if (isNegative) {
              // 转换为负数：减去 2^128
              liquidityNet = liquidityNetBigInt - (1n << 128n);
            } else {
              liquidityNet = liquidityNetBigInt;
            }

            // initialized 是 bool，检查最后一个字节
            initialized = initializedHex !== '0x0000000000000000000000000000000000000000000000000000000000000000';

            if (liquidityGross > 0n || liquidityNet !== 0n || initialized) {
              console.log(`Tick ${tick}: liquidityGross=${liquidityGross}, liquidityNet=${liquidityNet}, initialized=${initialized}`);
            }
          } catch (e2) {
            console.log('Manual decode error for tick', tick, 'Error:', e2.message);
            // 保持默认值
          }
        }
      }

      tickDataList.push({ tick, liquidityGross, liquidityNet, initialized });
    }

    // 重新实现流动性累积逻辑
    // 在 Uniswap V3 中，流动性从低 tick 向高 tick 累积
    // 但我们需要考虑当前价格的位置
    let cumulativeLiquidity = 0n;
    const processedTicks = [];

    console.log('Processing ticks, currentTick:', currentTick);

    // 首先，找出所有初始化的 ticks 并按 tick 值排序
    const initializedTicks = tickDataList.filter(t => t.initialized).sort((a, b) => a.tick - b.tick);
    console.log('Initialized ticks:', initializedTicks.map(t => ({ tick: t.tick, liquidityNet: t.liquidityNet.toString() })));

    // 计算当前价格处的流动性
    // 需要累加所有低于当前价格的 tick 的 liquidityNet
    let currentLiquidity = 0n;
    for (const tickData of initializedTicks) {
      if (tickData.tick <= currentTick) {
        currentLiquidity += tickData.liquidityNet;
      }
    }
    console.log('Current liquidity at tick', currentTick, ':', currentLiquidity);

    // 现在处理每个 tick 区间
    for (let i = 0; i < tickDataList.length; i++) {
      const { tick, liquidityGross, liquidityNet, initialized } = tickDataList[i];

      // 计算这个 tick 区间内的流动性
      // 需要累加所有 <= tick 的 liquidityNet
      let tickLiquidity = 0n;
      for (const t of initializedTicks) {
        if (t.tick <= tick) {
          tickLiquidity += t.liquidityNet;
        }
      }

      // 如果流动性为负，说明没有活跃的流动性
      let displayLiquidity = tickLiquidity < 0n ? 0n : tickLiquidity;

      if (displayLiquidity > 0n || initialized) {
        console.log(`Tick ${tick}: liquidity=${displayLiquidity}, initialized=${initialized}`);
      }

      let amount0 = '0';
      let amount1 = '0';

      // 只有当有活跃流动性时才计算token数量
      if (displayLiquidity > 0n) {
        try {
          const sqrtRatioA = getSqrtRatioAtTick(tick);
          const sqrtRatioB = getSqrtRatioAtTick(tick + tickSpacing);
          const sqrtRatioCurrent = sqrtPriceX96 ? BigInt(sqrtPriceX96) : getSqrtRatioAtTick(currentTick);
          const Q96 = 2n ** 96n;

          // 根据当前价格与tick区间的关系计算token数量
          if (currentTick < tick) { // 当前价格在tick区间上方（价格更高），只有token0
            if (sqrtRatioB > 0n && sqrtRatioA > 0n) {
              amount0 = (displayLiquidity * Q96 * (sqrtRatioB - sqrtRatioA) / (sqrtRatioB * sqrtRatioA)).toString();
            }
            amount1 = '0';
          } else if (currentTick >= tick + tickSpacing) { // 当前价格在tick区间下方（价格更低），只有token1
            const deltaPrice = sqrtRatioB - sqrtRatioA;
            amount1 = (displayLiquidity * deltaPrice / Q96).toString();
            amount0 = '0';
          } else { // currentTick 在 [tick, tick + tickSpacing) 区间内，两种token都有
            const deltaPrice1 = sqrtRatioCurrent - sqrtRatioA;
            amount1 = (displayLiquidity * deltaPrice1 / Q96).toString();

            if (sqrtRatioB > 0n && sqrtRatioCurrent > 0n) {
              amount0 = (displayLiquidity * Q96 * (sqrtRatioB - sqrtRatioCurrent) / (sqrtRatioB * sqrtRatioCurrent)).toString();
            }
          }
        } catch (e) {
          console.log('Token amount calculation error for tick', tick, e);
          // 备用计算：如果计算失败，简单估算
          if (currentTick < tick) {
            amount0 = displayLiquidity.toString();
            amount1 = '0';
          } else if (currentTick >= tick + tickSpacing) {
            amount0 = '0';
            amount1 = displayLiquidity.toString();
          } else {
            amount0 = (displayLiquidity / 2n).toString();
            amount1 = (displayLiquidity / 2n).toString();
          }
        }
      }

      processedTicks.push({
        tick,
        liquidityGross: liquidityGross.toString(),
        liquidityNet: liquidityNet.toString(),
        initialized: initialized,
        activeLiquidity: displayLiquidity.toString(), // 每个tick区间的活跃流动性
        amount0,
        amount1,
        decimals0,
        decimals1
      });
    }

    return processedTicks;

  } catch (error) {
    console.error('获取tick流动性数据失败(简化版):', error);
    // 返回默认数据，避免完全失败
    const defaultTicks = [];
    const alignedCurrentTick = Math.round(currentTick / tickSpacing) * tickSpacing;
    for (let tick = alignedCurrentTick - range * tickSpacing; tick <= alignedCurrentTick + range * tickSpacing; tick += tickSpacing) {
      defaultTicks.push({
        tick,
        liquidityGross: '0',
        liquidityNet: '0',
        initialized: false,
        activeLiquidity: '0',
        amount0: '0',
        amount1: '0',
        decimals0,
        decimals1
      });
    }
    return defaultTicks;
  }
}

export { getLPInfo, getBatchLPInfo, calculatePriceFromSqrtPriceX96, getNFTPositionInfo, getAmountsForLiquidity, getPoolAddressFromNftId }; 