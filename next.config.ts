import path from "node:path";
import type { NextConfig } from "next";

// 两种构建目标:
//   线上版 (默认, BUILD_TARGET 未设置): 平台托管 Postgres, 表结构 db/schema.ts, 数据层 lib/db.ts
//   本地 Mac 版 (BUILD_TARGET=local): Node 内置 SQLite, 表结构 db/schema.sqlite.ts,
//     数据层 lib/db.sqlite.ts —— 通过别名把 "@/db/schema" 与 "@/lib/db" 换掉,
//     业务代码 (页面 / server actions) 一行都不用改, 界面与功能完全一致。
const isLocalBuild = process.env.BUILD_TARGET === "local";

const localAliases: Record<string, string> = isLocalBuild
  ? {
      "@/db/schema": "./db/schema.sqlite.ts",
      "@/lib/db": "./lib/db.sqlite.ts",
    }
  : {};

// allowedDevOrigins 放行沙箱预览反代域名. Next 15.2.2+ 在 dev 模式对
// _next/* 端点 (含 webpack-hmr WebSocket) 启用 cross-origin 校验, 默认仅
// 允许 localhost; 预览通过子域名反代 3000 端口, origin 非 localhost 会被
// 拒, 表现为页面不 hydrate/卡在初始加载. 详见 vercel/next.js#77253.
// 域名跟沙箱账号走 (e2b / 自建集群各不同), 由平台在创建沙箱时注入
// LUFFY_PREVIEW_ORIGINS (逗号分隔 *.域 通配), 此处只读 env 不硬编码.
const nextConfig: NextConfig = {
  allowedDevOrigins:
    process.env.LUFFY_PREVIEW_ORIGINS?.split(",").filter(Boolean) ?? [],
  // 本地 Mac 版打成 standalone, 便于用内置 Node 直接运行 server.js
  output: isLocalBuild ? "standalone" : undefined,
  // Next 16 默认 Turbopack: 只要提供了 webpack 配置, 就必须同时给出 turbopack 配置
  turbopack: isLocalBuild ? { resolveAlias: localAliases } : {},
  webpack(config) {
    if (isLocalBuild) {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        ...localAliases,
      };
    }
    return config;
  },
};

export default nextConfig;
