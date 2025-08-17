# Vercel 部署指南

## 自动部署

1. 将代码推送到 GitHub
2. 在 Vercel 中连接 GitHub 仓库
3. Vercel 会自动检测 Next.js 项目并部署

## 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

### 必需环境变量
```
NODE_ENV=production
VERCEL=1
```

### 可选环境变量
```
LOG_LEVEL=WARN
RPC_URL=https://rpc.ankr.com/bsc/your-api-key
WSS_URL=wss://your-wss-node.com
```

## 部署后验证

1. **检查日志屏蔽**：
   - 打开浏览器开发者工具
   - 查看控制台，应该只显示警告和错误日志
   - 普通信息日志应该被屏蔽

2. **检查环境信息**：
   - 页面左下角不应该显示"🚧 开发环境"信息框
   - 如果显示，说明环境变量配置有问题

## 常见问题

### 日志仍然显示
- 检查 `NODE_ENV` 是否设置为 `production`
- 检查 `VERCEL` 是否设置为 `1`
- 重新部署项目

### 环境信息仍然显示
- 确保环境变量正确设置
- 清除浏览器缓存
- 重新部署项目

## 本地测试

要测试生产环境行为，可以设置环境变量：

```bash
# Windows
set NODE_ENV=production
set VERCEL=1

# macOS/Linux
export NODE_ENV=production
export VERCEL=1
```

然后运行 `npm run build` 和 `npm start` 来测试生产环境。

## 性能优化

部署到 Vercel 后，项目会自动启用：
- 代码压缩和优化
- 静态资源缓存
- CDN 加速
- 自动 HTTPS 