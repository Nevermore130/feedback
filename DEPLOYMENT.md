# InsightFlow - Vercel 部署指南

## 快速开始

### 1. 安装 Vercel CLI

```bash
npm i -g vercel
```

### 2. 登录 Vercel

```bash
vercel login
```

### 3. 一键部署

```bash
# 部署到预览环境
./scripts/deploy.sh

# 部署到生产环境
./scripts/deploy.sh prod
```

或使用 npm 命令：

```bash
# 部署到预览环境
npm run deploy

# 部署到生产环境
npm run deploy:prod
```

## 环境变量配置

在 Vercel Dashboard 中配置以下环境变量：

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `SUPABASE_URL` | 是 | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | 是 | Supabase 匿名密钥 |
| `FEISHU_WEBHOOK_URL` | 否 | 飞书机器人 Webhook URL |
| `GEMINI_API_KEY` | 否 | Google Gemini API 密钥（AI 分析功能） |

### 配置步骤

1. 进入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 点击 "Settings" -> "Environment Variables"
4. 添加上述环境变量

## 项目结构

```
feedback/
├── api/                    # Vercel Serverless Functions
│   ├── feedback/
│   │   ├── index.ts       # GET /api/feedback - 获取反馈列表
│   │   ├── summary.ts     # GET /api/feedback/summary - 获取统计数据
│   │   ├── share.ts       # POST /api/feedback/share - 分享到飞书
│   │   ├── feishu/
│   │   │   └── status.ts  # GET /api/feedback/feishu/status
│   │   └── tags/
│   │       └── all.ts     # GET /api/feedback/tags/all
│   └── health.ts          # GET /api/health - 健康检查
├── components/             # React 组件
├── server/                 # 本地开发服务器（不部署到 Vercel）
├── scripts/
│   └── deploy.sh          # 部署脚本
├── vercel.json            # Vercel 配置
└── package.json
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/feedback` | GET | 获取反馈列表（分页） |
| `/api/feedback/summary` | GET | 获取仪表盘统计数据 |
| `/api/feedback/tags/all` | GET | 获取所有标签 |
| `/api/feedback/feishu/status` | GET | 检查飞书配置状态 |
| `/api/feedback/share` | POST | 分享反馈到飞书 |

## 本地开发 vs Vercel 部署

### 本地开发
- 使用 `server/` 目录下的 Express 服务器
- 支持定时刷新任务
- 支持从原始 API 拉取数据并 AI 分析

### Vercel 部署
- 使用 `api/` 目录下的 Serverless Functions
- 仅从 Supabase 读取数据
- 不支持定时任务（需要使用 Vercel Cron 或外部服务）
- 需要先用本地服务器同步数据到 Supabase

## 数据同步流程

1. 在本地运行 server 同步数据：
   ```bash
   cd server
   npm run refresh:quarterly  # 同步最近 3 个月数据
   ```

2. 数据会自动保存到 Supabase

3. Vercel 部署的应用从 Supabase 读取数据

## 定时数据更新（可选）

如需在 Vercel 上实现定时更新，可以：

1. 使用 [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
2. 使用外部服务如 GitHub Actions
3. 使用第三方 Cron 服务调用刷新 API

## 故障排除

### 部署失败
- 检查 `vercel.json` 配置
- 确保所有依赖已安装
- 查看 Vercel 构建日志

### API 返回 500 错误
- 检查环境变量是否正确配置
- 查看 Vercel Function 日志
- 确保 Supabase 数据库可访问

### 数据为空
- 确保已运行本地 server 同步数据
- 检查 Supabase 数据库中是否有数据
- 验证日期范围参数

## 相关链接

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Supabase Documentation](https://supabase.com/docs)
