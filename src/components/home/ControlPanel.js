import React from 'react';
import { useWallet } from '@/providers/WalletProvider';

function ConnectWalletButton() {
    const { connect, disconnect, connected, account, isInitializing } = useWallet();

    if (connected) {
        return (
            <div className="flex items-center gap-2">
                <span className="px-4 py-2 text-sm font-mono rounded-lg bg-white/70 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700">
                    {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : '...'}
                </span>
                <button
                    onClick={disconnect}
                    className="flex items-center justify-center w-10 h-10 rounded-full
                                bg-white/70 hover:bg-white/100 dark:bg-gray-800/80 dark:hover:bg-gray-700/80
                                border border-gray-200/80 dark:border-gray-700
                                shadow-md hover:shadow-lg hover:scale-110 transition-all duration-300 group"
                    data-tooltip-id="my-tooltip"
                    data-tooltip-content="断开连接"
                >
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={connect}
            disabled={isInitializing}
            className="flex items-center justify-center gap-2 px-4 h-10 rounded-full
                       bg-white/70 hover:bg-white/100 dark:bg-gray-800/80 dark:hover:bg-gray-700/80
                       border border-gray-200/80 dark:border-gray-700
                       shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 group
                       font-semibold text-gray-700 dark:text-gray-200
                       disabled:opacity-70 disabled:cursor-wait disabled:scale-100"
        >
            {isInitializing ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m-4-4l4 4m0 0l-4 4m4-4H7" />
                </svg>
            )}
            <span>{isInitializing ? "连接中..." : "连接钱包"}</span>
        </button>
    );
}

export default function ControlPanel({
    isSidebarOpen,
    isRightSidebarOpen,
    onToggleRightSidebar,
    customAddress,
    onCustomAddressChange,
    addPool,
    refreshAllPools,
    openSettings,
    pools,
    settings,
}) {
    return (
        <div className={`${isSidebarOpen ? 'hidden lg:block' : 'block'} 
            bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl
            rounded-2xl p-4 mb-6 shadow-lg border border-gray-200/30 dark:border-gray-700/50`}>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Left Side: Input */}
                <div className="flex-grow w-full md:w-auto relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="输入V3池子地址"
                        value={customAddress}
                        onChange={(e) => onCustomAddressChange(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addPool()}
                        className="w-full pl-12 pr-28 sm:pr-24 py-3 rounded-xl bg-white/50 dark:bg-gray-800/50
                          border border-gray-300/50 dark:border-gray-700/80
                          focus:border-blue-500 dark:focus:border-blue-500 
                          focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-500/40
                          focus:outline-none transition-all duration-300
                          text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                          font-mono text-sm shadow-inner"
                    />
                    <button
                        onClick={addPool}
                        disabled={!customAddress.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-purple-500 
                          hover:from-blue-500 hover:to-purple-500 
                          disabled:from-gray-400 disabled:to-gray-400 disabled:bg-gradient-to-r
                          text-white px-3 sm:px-4 py-1.5 rounded-lg font-semibold
                          transition-all duration-300 
                          flex items-center gap-1.5 shadow-md hover:shadow-lg
                          hover:shadow-blue-500/40
                          hover:scale-105 active:scale-95
                          disabled:hover:scale-100 disabled:cursor-not-allowed disabled:shadow-none"
                        data-tooltip-id="my-tooltip"
                        data-tooltip-content="添加池子"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="hidden sm:inline">添加</span>
                    </button>
                </div>

                {/* Right Side: Stats & Actions */}
                <div className="flex items-center gap-4 self-end md:self-center">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300"
                            data-tooltip-id="my-tooltip"
                            data-tooltip-content="当前监控的池子数量">
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span className="font-semibold text-gray-800 dark:text-white">{pools.length}</span>
                        </span>
                        {settings.autoRefresh && (
                            <span className="hidden md:flex items-center gap-1.5 text-gray-600 dark:text-gray-300"
                                data-tooltip-id="my-tooltip"
                                data-tooltip-content={`每 ${settings.refreshInterval} 秒自动刷新`}>
                                <svg className="w-4 h-4 text-blue-500 animate-spin" style={{ animationDuration: '2s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                <span className="hidden lg:inline font-semibold text-gray-800 dark:text-white">{settings.refreshInterval}s</span>
                            </span>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-300/70 dark:bg-gray-600/70 hidden md:block mx-2"></div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={refreshAllPools}
                            className="flex items-center justify-center w-10 h-10 rounded-full
                                bg-white/70 hover:bg-white/100 dark:bg-gray-800/80 dark:hover:bg-gray-700/80
                                border border-gray-200/80 dark:border-gray-700
                                shadow-md hover:shadow-lg hover:scale-110 transition-all duration-300 group"
                            data-tooltip-id="my-tooltip"
                            data-tooltip-content="刷新所有池子"
                        >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        <button
                            onClick={openSettings}
                            className="flex items-center justify-center w-10 h-10 rounded-full 
                                bg-white/70 hover:bg-white/100 dark:bg-gray-800/80 dark:hover:bg-gray-700/80
                                border border-gray-200/80 dark:border-gray-700
                                shadow-md hover:shadow-lg hover:scale-110 transition-all duration-300 group"
                            data-tooltip-id="my-tooltip"
                            data-tooltip-content="设置"
                        >
                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        <ConnectWalletButton />
                    </div>
                </div>
            </div>
        </div>
    );
} 