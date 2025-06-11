'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ethers } from 'ethers';
import { createAppKit, useAppKitAccount, modal, useAppKitProvider } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { bsc, mainnet, arbitrum } from '@reown/appkit/networks';

const WalletContext = createContext();

// AppKit 配置
createAppKit({
    adapters: [new EthersAdapter()],
    networks: [bsc],
    projectId: 'd6dc275fa05414798284f743d97b2639',
    metadata: {
        name: 'Pool Monitor',
        description: 'Monitor your liquidity pools',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://www.poolm.xyz/',
        icons: ['https://avatars.githubusercontent.com/u/37784886']
    },
    features: {
        analytics: true,
    }
});

export function WalletProvider({ children }) {
    const [state, setState] = useState({
        provider: null,
        signer: null,
        error: null,
        chainId: null
    });
    const [isInitializing, setIsInitializing] = useState(false);
    const initializingRef = useRef(false);

    const { address, isConnected } = useAppKitAccount();
    const { walletProvider } = useAppKitProvider('eip155');

    const resetState = useCallback(() => {
        setState({
            provider: null,
            signer: null,
            error: null,
            chainId: null
        });
        setIsInitializing(false);
        initializingRef.current = false;
    }, []);

    const initProvider = useCallback(async () => {
        if (initializingRef.current || !walletProvider) {
            return;
        }

        if (!isConnected || !address) {
            resetState();
            return;
        }

        try {
            initializingRef.current = true;
            setIsInitializing(true);

            const ethersProvider = new ethers.BrowserProvider(walletProvider);
            const newSigner = await ethersProvider.getSigner();
            const network = await ethersProvider.getNetwork();

            if (!isConnected || !address) {
                throw new Error('Connection lost during initialization');
            }

            setState({
                provider: ethersProvider,
                signer: newSigner,
                chainId: Number(network.chainId),
                error: null
            });
        } catch (error) {
            console.error('Provider initialization error:', error);
            resetState();
        } finally {
            initializingRef.current = false;
            setIsInitializing(false);
        }
    }, [isConnected, address, walletProvider, resetState]);

    useEffect(() => {
        if (!isConnected || !address || !walletProvider) {
            resetState();
            return;
        }

        const timeoutId = setTimeout(() => {
            initProvider();
        }, 300);

        return () => {
            clearTimeout(timeoutId);
            resetState();
        };
    }, [isConnected, address, walletProvider, initProvider, resetState]);


    const connect = useCallback(() => {
        modal.open();
    }, []);

    const disconnect = useCallback(() => {
        modal.open();
    }, []);

    const contextValue = useMemo(() => ({
        ...state,
        account: address,
        connected: isConnected,
        connect,
        disconnect,
        isInitializing
    }), [state, address, isConnected, connect, disconnect, isInitializing]);

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
        </WalletContext.Provider>
    );
}

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}; 