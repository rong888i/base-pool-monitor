/**
 * Web3 工具函数
 * 用于与区块链合约交互
 */

import { ethers } from 'ethers';

// ERC20 Token ABI (简化版)
const ERC20_ABI = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];

// ERC721 NFT ABI (用于授权检查)
const ERC721_ABI = [
    "function isApprovedForAll(address owner, address operator) view returns (bool)",
    "function setApprovalForAll(address operator, bool approved)",
    "function getApproved(uint256 tokenId) view returns (address)",
    "function approve(address to, uint256 tokenId)",
    "function ownerOf(uint256 tokenId) view returns (address)"
];

// Uniswap V3 NonfungiblePositionManager ABI (部分)
const POSITION_MANAGER_ABI = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "address", "name": "token0", "type": "address" },
                    { "internalType": "address", "name": "token1", "type": "address" },
                    { "internalType": "uint24", "name": "fee", "type": "uint24" },
                    { "internalType": "int24", "name": "tickLower", "type": "int24" },
                    { "internalType": "int24", "name": "tickUpper", "type": "int24" },
                    { "internalType": "uint256", "name": "amount0Desired", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1Desired", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount0Min", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1Min", "type": "uint256" },
                    { "internalType": "address", "name": "recipient", "type": "address" },
                    { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                ],
                "internalType": "struct INonfungiblePositionManager.MintParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "mint",
        "outputs": [
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
            { "internalType": "uint128", "name": "liquidity", "type": "uint128" },
            { "internalType": "uint256", "name": "amount0", "type": "uint256" },
            { "internalType": "uint256", "name": "amount1", "type": "uint256" }
        ],
        "stateMutability": "payable",
        "type": "function"
    }
];

// 合约地址
const CONTRACTS = {
    // BSC (Binance Smart Chain)
    56: {
        PANCAKESWAP_V3_POSITION_MANAGER: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364",
        UNISWAP_V3_POSITION_MANAGER: "0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613", // Uniswap V3 Position Manager on BSC
        // 常用代币地址
        WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
        USDT: "0x55d398326f99059ff775485246999027b3197955",
        USDC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        BUSD: "0xe9e7cea3dedca5984780bafc599bd69add087d56"
    },
    // Ethereum Mainnet
    1: {
        UNISWAP_V3_POSITION_MANAGER: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
        // 常用代币地址
        WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        USDC: "0xA0b86a33E6417aFD556E3e9bf2dd3D10bE6Fa95D"
    }
};

// 使用传入的provider和signer而不是从window.ethereum获取
export const checkTokenAllowance = async (tokenAddress, ownerAddress, spenderAddress, provider) => {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
        return allowance;
    } catch (error) {
        console.error('检查授权失败:', error);
        throw error;
    }
};

export const approveToken = async (tokenAddress, spenderAddress, amount, signer) => {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const tx = await tokenContract.approve(spenderAddress, amount);
        return tx;
    } catch (error) {
        console.error('授权失败:', error);
        throw error;
    }
};

// 检查NFT是否已授权给指定操作员
export const checkNFTApproval = async (nftContractAddress, ownerAddress, operatorAddress, provider) => {
    try {
        const nftContract = new ethers.Contract(nftContractAddress, ERC721_ABI, provider);
        const isApproved = await nftContract.isApprovedForAll(ownerAddress, operatorAddress);
        return isApproved;
    } catch (error) {
        console.error('检查NFT授权失败:', error);
        throw error;
    }
};

// 检查单个NFT是否已授权给指定地址
export const checkNFTTokenApproval = async (nftContractAddress, tokenId, operatorAddress, provider) => {
    try {
        const nftContract = new ethers.Contract(nftContractAddress, ERC721_ABI, provider);
        const approvedAddress = await nftContract.getApproved(tokenId);
        return approvedAddress.toLowerCase() === operatorAddress.toLowerCase();
    } catch (error) {
        console.error('检查NFT单个授权失败:', error);
        throw error;
    }
};

// 授权NFT给指定操作员（全部授权）
export const approveNFTForAll = async (nftContractAddress, operatorAddress, signer) => {
    try {
        const nftContract = new ethers.Contract(nftContractAddress, ERC721_ABI, signer);
        const tx = await nftContract.setApprovalForAll(operatorAddress, true);
        return tx;
    } catch (error) {
        console.error('NFT授权失败:', error);
        throw error;
    }
};

// 授权单个NFT给指定地址
export const approveNFTToken = async (nftContractAddress, tokenId, operatorAddress, signer) => {
    try {
        const nftContract = new ethers.Contract(nftContractAddress, ERC721_ABI, signer);
        const tx = await nftContract.approve(operatorAddress, tokenId);
        return tx;
    } catch (error) {
        console.error('NFT单个授权失败:', error);
        throw error;
    }
};

export const getTokenInfo = async (tokenAddress, provider) => {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [symbol, name, decimals] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.name(),
            tokenContract.decimals()
        ]);
        return { symbol, name, decimals };
    } catch (error) {
        console.error('获取代币信息失败:', error);
        throw error;
    }
};

export const getTokenBalance = async (tokenAddress, userAddress, provider) => {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const balance = await tokenContract.balanceOf(userAddress);
        return balance;
    } catch (error) {
        console.error('获取代币余额失败:', error);
        throw error;
    }
};

export const addLiquidity = async (params, signer, chainId, slippage = 0.5, protocolName = '') => {
    try {
        const contracts = CONTRACTS[chainId];
        if (!contracts) {
            throw new Error(`不支持的网络: ${chainId}`);
        }

        // 根据协议名称选择正确的Position Manager地址
        let positionManagerAddress;
        if (protocolName.toLowerCase().includes('pancake')) {
            positionManagerAddress = contracts.PANCAKESWAP_V3_POSITION_MANAGER;
        } else if (protocolName.toLowerCase().includes('uniswap') || !protocolName) {
            // 默认使用Uniswap地址
            positionManagerAddress = contracts.UNISWAP_V3_POSITION_MANAGER;
        } else {
            // 如果无法识别协议，根据链ID选择默认值
            if (chainId === 56) {
                // BSC上默认使用Uniswap
                positionManagerAddress = contracts.UNISWAP_V3_POSITION_MANAGER;
            } else if (chainId === 1) {
                positionManagerAddress = contracts.UNISWAP_V3_POSITION_MANAGER;
            } else {
                throw new Error(`不支持的网络: ${chainId}`);
            }
        }

        const positionManager = new ethers.Contract(
            positionManagerAddress,
            POSITION_MANAGER_ABI,
            signer
        );

        // 确保滑点值有效，限制最大50%
        const effectiveSlippage = (typeof slippage === 'number' && slippage > 0 && slippage <= 50) ? slippage : 0.5;
        // 计算滑点保护
        const slippageMultiplier = BigInt(Math.floor((100 - effectiveSlippage) * 100)); // 转换为基点
        const slippageAmount0 = (BigInt(params.amount0Desired) * slippageMultiplier) / BigInt(10000);
        const slippageAmount1 = (BigInt(params.amount1Desired) * slippageMultiplier) / BigInt(10000);

        const mintParams = {
            ...params,
            amount0Min: slippageAmount0.toString(),
            amount1Min: slippageAmount1.toString(),
            deadline: Math.floor(Date.now() / 1000) + 1200 // 20分钟后过期
        };

        // 检查是否需要发送ETH/BNB
        const nativeTokenAddress = chainId === 56 ? CONTRACTS[chainId]?.WBNB?.toLowerCase() : CONTRACTS[chainId]?.WETH?.toLowerCase();
        const isToken0Native = params.token0.toLowerCase() === nativeTokenAddress;
        const isToken1Native = params.token1.toLowerCase() === nativeTokenAddress;

        let value = "0";
        if (isToken0Native) {
            value = params.amount0Desired;
        } else if (isToken1Native) {
            value = params.amount1Desired;
        }

        const tx = await positionManager.mint(mintParams, { value });
        return tx;
    } catch (error) {
        console.error('添加流动性失败:', error);
        throw error;
    }
};

// 格式化代币数量
export const formatTokenAmount = (amount, decimals) => {
    return ethers.formatUnits(amount, decimals);
};

// 解析代币数量
export const parseTokenAmount = (amount, decimals) => {
    return ethers.parseUnits(amount.toString(), decimals);
};

// 获取网络名称
export const getNetworkName = (chainId) => {
    switch (chainId) {
        case 1: return 'Ethereum';
        case 56: return 'BSC';
        case 137: return 'Polygon';
        case 42161: return 'Arbitrum';
        default: return `Chain ${chainId}`;
    }
};

/**
 * 获取Web3提供者
 */
export const getWeb3Provider = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
        return window.ethereum;
    }
    throw new Error('请安装MetaMask或其他Web3钱包');
};

/**
 * 创建合约实例（需要ethers.js或web3.js）
 * 这里提供接口，实际使用时需要安装相应的库
 */
export const createContract = (address, abi, provider) => {
    // 使用ethers.js的示例代码
    // const { ethers } = require('ethers');
    // const signer = provider.getSigner();
    // return new ethers.Contract(address, abi, signer);

    console.log('Creating contract:', { address, abi: abi.length + ' methods' });
    return null; // 占位符，实际项目中需要返回真实的合约实例
};



/**
 * 获取当前连接的账户
 */
export const getCurrentAccount = async () => {
    try {
        const provider = getWeb3Provider();
        const accounts = await provider.request({ method: 'eth_accounts' });
        return accounts[0] || null;
    } catch (error) {
        console.error('Error getting current account:', error);
        return null;
    }
};

/**
 * 连接钱包
 */
export const connectWallet = async () => {
    try {
        const provider = getWeb3Provider();
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        return accounts[0];
    } catch (error) {
        console.error('Error connecting wallet:', error);
        throw error;
    }
};

/**
 * 获取网络信息
 */
export const getNetworkInfo = async () => {
    try {
        const provider = getWeb3Provider();
        const chainId = await provider.request({ method: 'eth_chainId' });
        return {
            chainId: parseInt(chainId, 16),
            isMainnet: chainId === '0x1',
            isBSC: chainId === '0x38'
        };
    } catch (error) {
        console.error('Error getting network info:', error);
        throw error;
    }
};

/**
 * 切换网络
 */
export const switchNetwork = async (chainId) => {
    try {
        const provider = getWeb3Provider();
        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
    } catch (error) {
        console.error('Error switching network:', error);
        throw error;
    }
};

// 获取Position Manager地址（根据协议类型）
const getPositionManagerAddress = (protocolName, chainId = 56) => {
    const contracts = CONTRACTS[chainId];
    if (!contracts) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    if (protocolName.toLowerCase().includes('pancake')) {
        return contracts.PANCAKESWAP_V3_POSITION_MANAGER;
    } else if (protocolName.toLowerCase().includes('uniswap')) {
        return contracts.UNISWAP_V3_POSITION_MANAGER;
    } else {
        // 默认使用Uniswap
        return contracts.UNISWAP_V3_POSITION_MANAGER;
    }
};

// 移除流动性
export const decreaseLiquidity = async (params, signer, chainId, protocolName) => {
    try {
        const positionManagerAddress = getPositionManagerAddress(protocolName, chainId);

        const decreaseLiquidityABI = [
            {
                "inputs": [
                    {
                        "components": [
                            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
                            { "internalType": "uint128", "name": "liquidity", "type": "uint128" },
                            { "internalType": "uint256", "name": "amount0Min", "type": "uint256" },
                            { "internalType": "uint256", "name": "amount1Min", "type": "uint256" },
                            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                        ],
                        "internalType": "struct INonfungiblePositionManager.DecreaseLiquidityParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "decreaseLiquidity",
                "outputs": [
                    { "internalType": "uint256", "name": "amount0", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1", "type": "uint256" }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ];

        const contract = new ethers.Contract(positionManagerAddress, decreaseLiquidityABI, signer);

        console.log('发送移除流动性交易...', params);
        const tx = await contract.decreaseLiquidity(params);
        console.log('移除流动性交易已发送:', tx.hash);

        return tx;
    } catch (error) {
        console.error('移除流动性失败:', error);
        throw error;
    }
};

// 收集费用和代币
export const collectFromPosition = async (params, signer, chainId, protocolName) => {
    try {
        const positionManagerAddress = getPositionManagerAddress(protocolName, chainId);

        const collectABI = [
            {
                "inputs": [
                    {
                        "components": [
                            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
                            { "internalType": "address", "name": "recipient", "type": "address" },
                            { "internalType": "uint128", "name": "amount0Max", "type": "uint128" },
                            { "internalType": "uint128", "name": "amount1Max", "type": "uint128" }
                        ],
                        "internalType": "struct INonfungiblePositionManager.CollectParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "collect",
                "outputs": [
                    { "internalType": "uint256", "name": "amount0", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1", "type": "uint256" }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ];

        const contract = new ethers.Contract(positionManagerAddress, collectABI, signer);

        console.log('发送收集交易...', params);
        const tx = await contract.collect(params);
        console.log('收集交易已发送:', tx.hash);

        return tx;
    } catch (error) {
        console.error('收集失败:', error);
        throw error;
    }
};

// 增加流动性到现有NFT
export const increaseLiquidity = async (params, signer, chainId, protocolName) => {
    try {
        const positionManagerAddress = getPositionManagerAddress(protocolName, chainId);

        const increaseLiquidityABI = [
            {
                "inputs": [
                    {
                        "components": [
                            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
                            { "internalType": "uint256", "name": "amount0Desired", "type": "uint256" },
                            { "internalType": "uint256", "name": "amount1Desired", "type": "uint256" },
                            { "internalType": "uint256", "name": "amount0Min", "type": "uint256" },
                            { "internalType": "uint256", "name": "amount1Min", "type": "uint256" },
                            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                        ],
                        "internalType": "struct INonfungiblePositionManager.IncreaseLiquidityParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "increaseLiquidity",
                "outputs": [
                    { "internalType": "uint128", "name": "liquidity", "type": "uint128" },
                    { "internalType": "uint256", "name": "amount0", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1", "type": "uint256" }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ];

        const contract = new ethers.Contract(positionManagerAddress, increaseLiquidityABI, signer);

        console.log('发送增加流动性交易...', params);
        const tx = await contract.increaseLiquidity(params);
        console.log('增加流动性交易已发送:', tx.hash);

        return tx;
    } catch (error) {
        console.error('增加流动性失败:', error);
        throw error;
    }
};

// 移除流动性并收集代币（使用multicall在一个交易中完成）
export const decreaseLiquidityAndCollect = async (decreaseParams, collectParams, signer, chainId, protocolName) => {
    try {
        const positionManagerAddress = getPositionManagerAddress(protocolName, chainId);

        const multicallABI = [
            {
                "inputs": [
                    { "internalType": "bytes[]", "name": "data", "type": "bytes[]" }
                ],
                "name": "multicall",
                "outputs": [
                    { "internalType": "bytes[]", "name": "results", "type": "bytes[]" }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ];

        const decreaseLiquidityABI = [
            {
                "inputs": [
                    {
                        "components": [
                            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
                            { "internalType": "uint128", "name": "liquidity", "type": "uint128" },
                            { "internalType": "uint256", "name": "amount0Min", "type": "uint256" },
                            { "internalType": "uint256", "name": "amount1Min", "type": "uint256" },
                            { "internalType": "uint256", "name": "deadline", "type": "uint256" }
                        ],
                        "internalType": "struct INonfungiblePositionManager.DecreaseLiquidityParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "decreaseLiquidity",
                "outputs": [
                    { "internalType": "uint256", "name": "amount0", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1", "type": "uint256" }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ];

        const collectABI = [
            {
                "inputs": [
                    {
                        "components": [
                            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
                            { "internalType": "address", "name": "recipient", "type": "address" },
                            { "internalType": "uint128", "name": "amount0Max", "type": "uint128" },
                            { "internalType": "uint128", "name": "amount1Max", "type": "uint128" }
                        ],
                        "internalType": "struct INonfungiblePositionManager.CollectParams",
                        "name": "params",
                        "type": "tuple"
                    }
                ],
                "name": "collect",
                "outputs": [
                    { "internalType": "uint256", "name": "amount0", "type": "uint256" },
                    { "internalType": "uint256", "name": "amount1", "type": "uint256" }
                ],
                "stateMutability": "payable",
                "type": "function"
            }
        ];

        // 创建合约实例
        const contract = new ethers.Contract(positionManagerAddress, multicallABI, signer);
        const decreaseLiquidityInterface = new ethers.Interface(decreaseLiquidityABI);
        const collectInterface = new ethers.Interface(collectABI);

        // 编码两个函数调用
        const decreaseLiquidityData = decreaseLiquidityInterface.encodeFunctionData('decreaseLiquidity', [decreaseParams]);
        const collectData = collectInterface.encodeFunctionData('collect', [collectParams]);

        console.log('发送multicall交易...', { decreaseParams, collectParams });

        // 执行multicall
        const tx = await contract.multicall([decreaseLiquidityData, collectData]);
        console.log('Multicall交易已发送:', tx.hash);

        return tx;
    } catch (error) {
        console.error('Multicall失败:', error);
        throw error;
    }
}; 