/** @type {import('next').NextConfig} */
const nextConfig = {
    // 构建优化
    swcMinify: true,

    // 生产环境优化
    ...(process.env.NODE_ENV === 'production' && {
        // 生产环境禁用开发工具
        reactStrictMode: true,
        // 压缩输出
        compress: true
    })
};

export default nextConfig;
