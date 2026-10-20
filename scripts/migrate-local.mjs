// 本地 Mac 版: 服务启动前的版本化迁移执行器。
// 读取包内的 SQLite 迁移文件 (drizzle-sqlite 生成), 用 drizzle 官方 migrator 应用,
// 已应用的迁移记录在库内的 __drizzle_migrations 表 —— 升级包时只补差异,
// 用户数据一条不动。
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { drizzle } from "drizzle-orm/sqlite-proxy";
import { migrate } from "drizzle-orm/sqlite-proxy/migrator";

const file = process.env.WORKBENCH_DB;
const dir = process.env.MIGRATIONS_DIR ?? path.resolve("migrations");

if (!file) {
  console.error("[migrate] 缺少 WORKBENCH_DB 环境变量");
  process.exit(1);
}

mkdirSync(path.dirname(file), { recursive: true });
const sqlite = new DatabaseSync(file);
sqlite.exec("pragma journal_mode = WAL");
sqlite.exec("pragma busy_timeout = 5000");

const cache = new Map();
const prep = (text) => {
  let st = cache.get(text);
  if (!st) {
    st = sqlite.prepare(text);
    st.setReturnArrays(true);
    cache.set(text, st);
  }
  return st;
};

const db = drizzle(async (text, params, method) => {
  const st = prep(text);
  if (method === "run") {
    st.run(...params);
    return { rows: [] };
  }
  if (method === "get") {
    const row = st.get(...params);
    return { rows: row ?? undefined };
  }
  return { rows: st.all(...params) };
});

await migrate(
  db,
  async (queries) => {
    for (const q of queries) sqlite.exec(q);
  },
  { migrationsFolder: dir },
);

console.log(`[migrate] 数据库已就绪: ${file}`);
