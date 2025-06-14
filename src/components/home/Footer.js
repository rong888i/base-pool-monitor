import React from 'react';

export default function Footer() {
    return (
        <footer className="w-full py-6 mt-auto">
            <div className="container mx-auto px-4">
                {/* Responsive footer layout */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-y-3 md:gap-x-6">
                    {/* Risk Warning Section */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center md:text-left">
                        <svg className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="leading-relaxed">
                            仅支持BSC主网，供学习研究，使用风险自担。
                        </span>
                    </div>

                    {/* Social Links Section */}
                    <div className="flex items-center gap-3">
                        <a
                            href="https://x.com/xzdejz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200 text-gray-800 dark:text-gray-200 hover:text-blue-500"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            <span className="text-xs sm:text-sm font-medium">@北北</span>
                        </a>
                        <a
                            href="https://x.com/qu33q"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200 text-gray-800 dark:text-gray-200 hover:text-blue-500"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            <span className="text-xs sm:text-sm font-medium">@333</span>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
} 