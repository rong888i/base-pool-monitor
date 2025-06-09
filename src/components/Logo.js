import React from 'react';

const Logo = ({ className = '', size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-10 h-10'
    };

    return (
        <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* 背景圆形 */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg shadow-blue-500/20" />

            {/* 监控图标 */}
            <div className="absolute inset-0 flex items-center justify-center">
                <svg
                    className="w-1/2 h-1/2 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    {/* 外框 */}
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />

                    {/* 波浪线 */}
                    <path
                        d="M7 12C7 12 9 10 12 10C15 10 17 12 17 12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* 监控点 */}
                    <circle cx="12" cy="12" r="1" fill="currentColor" />

                    {/* 信号线 */}
                    <path
                        d="M12 15V17"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {/* 装饰性光晕效果 */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-50" />

            {/* 动态效果 */}
            <div className="absolute inset-0 rounded-full animate-pulse bg-blue-400/20" />
        </div>
    );
};

export default Logo; 