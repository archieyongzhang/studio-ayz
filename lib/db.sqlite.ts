// 本地 Mac 版的数据层: Node 内置 SQLite (node:sqlite) + drizzle sqlite-proxy。
// 构建本地版时, next.config.ts 把 "@/lib/db" 别名指到本文件; 业务代码不变。
//
// 数据库文件位置由启动器通过环境变量传入:
//   WORKBENCH_DB   = 用户所选文件夹里的 .db 文件绝对路径
// 建表/升级由启动包里的 scripts/migrate-local.mjs 在服务启动前完成 (版本化迁移)。
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/sqlite-proxy";

import * as schema from "@/db/schema.sqlite";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | undefined;

export function getDb(): Db {
  if (_db === undefined) {
    const file = process.env.WORKBENCH_DB;
    if (!file) {
      throw new Error("WORKBENCH_DB 未设置: 请通过「我的工作台」启动图标运行");
    }
    mkdirSync(path.dirname(file), { recursive: true });
    const sqlite = new DatabaseSync(file);
    sqlite.exec("pragma journal_mode = WAL");
    sqlite.exec("pragma busy_timeout = 5000");

    const cache = new Map<string, StatementSync>();
    const prep = (text: string): StatementSync => {
      let st = cache.get(text);
      if (!st) {
        st = sqlite.prepare(text);
        st.setReturnArrays(true); // drizzle 需要「按列位置」的行数组
        cache.set(text, st);
      }
      return st;
    };

    _db = drizzle(
      async (text, params, method) => {
        const st = prep(text);
        if (method === "run") {
          st.run(...(params as never[]));
          return { rows: [] };
        }
        if (method === "get") {
          // setReturnArrays(true) 后运行时返回「值数组」, 类型声明仍写的是对象行
          const row = st.get(...(params as never[])) as unknown;
          return { rows: row as never[] };
        }
        return { rows: st.all(...(params as never[])) as unknown as never[] };
      },
      { schema },
    );
  }
  return _db;
}
