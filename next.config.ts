import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next.js 16 + Turbopack 默认自动 tree-shake barrel 导入（如 @heroui/react），无需额外配置
  images: {
    unoptimized: true, // 不依赖托管平台的图片优化服务
  },
  // 本地开发的数据源：Edge Functions 与 KV 只在 EdgeOne 部署环境存在，
  // 本地 dev 的 /api 请求改写到 scripts/local-api.mjs 模拟服务（node scripts/local-api.mjs）。
  // 仅 development 生效：生产构建不产生任何改写，线上 /api 仍由平台 Edge Functions 处理
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return []
    }

    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3101/api/:path*',
      },
    ]
  },
}

export default nextConfig
