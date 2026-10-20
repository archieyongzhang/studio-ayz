// 本地版迁移配置: 为 SQLite 版表结构 (db/schema.sqlite.ts) 生成版本化迁移文件。
// 用法: pnpm exec drizzle-kit generate --config drizzle.local.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema.sqlite.ts",
  out: "./drizzle-sqlite",
});
