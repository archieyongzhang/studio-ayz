// 当前用户 (账号隔离): 个人工作台, 内置免密账号 archie。
// 所有业务读写都先取这里返回的用户, 再按 user.id 过滤, 保证数据按账号隔离。
import { eq } from "drizzle-orm";

import { users } from "@/db/schema";
import { getDb } from "@/lib/db";

export const ACCOUNT_NAME = "archie";

export async function getCurrentUser() {
  const db = getDb();
  const found = await db
    .select()
    .from(users)
    .where(eq(users.name, ACCOUNT_NAME))
    .limit(1);
  if (found[0]) return found[0];
  // layout 与页面可能并发渲染, 用 onConflictDoNothing 防止重复插入冲突
  const inserted = await db
    .insert(users)
    .values({ name: ACCOUNT_NAME })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];
  const again = await db
    .select()
    .from(users)
    .where(eq(users.name, ACCOUNT_NAME))
    .limit(1);
  return again[0];
}
