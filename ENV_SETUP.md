# 环境变量配置说明

## 开发环境

在开发环境中，所有日志都会正常显示。

## 生产环境（Vercel部署）

在Vercel部署时，日志会自动屏蔽，只显示警告和错误信息。

### 自动环境检测

项目会自动检测以下环境变量：
- `NODE_ENV`: 当值为 `production` 时启用生产模式
- `VERCEL`: 当值为 `1` 时识别为Vercel环境

### 日志级别

- **开发环境**: 显示所有日志（DEBUG, INFO, WARN, ERROR）
- **生产环境**: 只显示警告和错误（WARN, ERROR）

### 强制日志

如果需要在生产环境显示特定日志，可以使用：
```javascript
import { logger } from '../utils/logger';

logger.force('这条日志会强制显示');
```

## 自定义配置

如需自定义日志级别，可以在代码中设置：
```javascript
import { LOG_LEVELS } from '../utils/logger';

// 设置日志级别
const customLogLevel = LOG_LEVELS.INFO;
```

## 部署检查清单

- [ ] 确保 `NODE_ENV` 设置为 `production`
- [ ] 确保 `VERCEL` 环境变量存在
- [ ] 测试日志是否按预期屏蔽
- [ ] 验证错误日志仍然正常显示 