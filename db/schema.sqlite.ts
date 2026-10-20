// 本地 Mac 版 (SQLite) 的表结构 —— 与 db/schema.ts (云端 Postgres 版) 一一对应,
// 表名/列名完全一致, 只是驱动不同。构建本地版时通过 next.config.ts 的别名
// 把 "@/db/schema" 指到本文件, 业务代码 (pages / actions) 一行都不用改。
//
// 时间戳统一用 integer + mode:"timestamp" (返回 Date 对象, 与 pg 版一致);
// 布尔用 integer + mode:"boolean"; 自增主键用 integer primaryKey autoincrement。
import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#4f46e5"),
  progress: integer("progress").notNull().default(0),
  nextStep: text("next_step"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const projectMaterials = sqliteTable("project_materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id").notNull(),
  kind: text("kind").notNull().default("link"),
  name: text("name").notNull(),
  content: text("content"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const projectUpdates = sqliteTable("project_updates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const todos = sqliteTable("todos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  priority: text("priority").notNull().default("mid"),
  dueDate: text("due_date"),
  projectId: integer("project_id"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const ideas = sqliteTable("ideas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  type: text("type").notNull().default("idea"),
  tags: text("tags"),
  status: text("status").notNull().default("open"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const learnItems = sqliteTable("learn_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull().default("book"),
  totalTarget: integer("total_target"),
  doneAmount: integer("done_amount").notNull().default(0),
  unit: text("unit"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const learnActivities = sqliteTable("learn_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  itemId: integer("item_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull().default("each"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const learnRecords = sqliteTable("learn_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  itemId: integer("item_id").notNull(),
  activityId: integer("activity_id"),
  note: text("note").notNull(),
  durationMin: integer("duration_min").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const kbResources = sqliteTable("kb_resources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  category: text("category").notNull().default("site"),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url"),
  tags: text("tags"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const retros = sqliteTable("retros", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  kind: text("kind").notNull().default("review"),
  content: text("content").notNull(),
  refDate: text("ref_date"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
