import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next.js 16 + Turbopack 默认自动 tree-shake barrel 导入（如 @heroui/react），无需额外配置
  images: {
    unoptimized: true, // 不依赖托管平台的图片优化服务
  },
}

export default nextConfig
