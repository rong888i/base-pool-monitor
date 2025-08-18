/** @type {import('next').NextConfig} */
const nextConfig = {
    // 在生产环境中移除console.log
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error'] // 保留console.error
        } : false,
    },
    // 其他配置选项
    experimental: {
        // 如果需要其他实验性功能可以在这里添加
    },
}

module.exports = nextConfig 