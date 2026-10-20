// 应用的全部表结构定义在本文件 (drizzle-orm pg-core)。
// 纪律 (由编译 lint 与发布预检强制):
//   - 只在这里声明表, 业务代码经 lib/db.ts 的 await getDb() 读写;
//   - 改动后两步走, 缺一不可: `pnpm run db:generate` 产出 drizzle/ 版本化迁移
//     并一起提交, 紧接着 `pnpm run db:migrate` 把它应用到开发库。
//   - 禁止手写 CREATE/ALTER SQL 与 IF NOT EXISTS 幂等技巧;
//   - 删表/删列和加表/加列不要放进同一次 generate。
//
// 用户隔离: 所有业务表都带 user_id, 一切读写都先经 lib/user.ts 取当前用户
// (本应用为个人工作台, 内置账号 archie, 免密码), 查询一律按 user_id 过滤。
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ---- 账号 ----
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // archie
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---- 项目 ----
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#4f46e5"), // 展示色
  progress: integer("progress").notNull().default(0), // 0-100
  nextStep: text("next_step"), // 下一步动作
  status: text("status").notNull().default("active"), // active | paused | done
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const projectMaterials = pgTable("project_materials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id").notNull(),
  kind: text("kind").notNull().default("link"), // link | doc | image | note
  name: text("name").notNull(),
  content: text("content"), // 链接地址 / 笔记正文
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const projectUpdates = pgTable("project_updates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id").notNull(),
  content: text("content").notNull(), // 进展记录
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---- 待办事项 ----
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  priority: text("priority").notNull().default("mid"), // high | mid | low
  dueDate: text("due_date"), // YYYY-MM-DD, 可空
  projectId: integer("project_id"), // 关联项目, 可空
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---- 想法与需求 ----
export const ideas = pgTable("ideas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  type: text("type").notNull().default("idea"), // idea 想法 | req 需求
  tags: text("tags"), // 逗号分隔
  status: text("status").notNull().default("open"), // open | todo | project | archived
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---- 英语学习 ----
export const learnItems = pgTable("learn_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull().default("book"), // book 书籍 | site 网站 | project 项目 | course 课程
  totalTarget: integer("total_target"), // 总目标 (章/集/页/周), 可空
  doneAmount: integer("done_amount").notNull().default(0), // 已完成量
  unit: text("unit"), // 单位: 章 / 集 / 页 / 周 / 次
  status: text("status").notNull().default("active"), // active | done | paused
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const learnActivities = pgTable("learn_activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  itemId: integer("item_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull().default("each"), // daily 每日 | weekly 每周 | each 每次 | chapter 章节
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const learnRecords = pgTable("learn_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  itemId: integer("item_id").notNull(),
  activityId: integer("activity_id"), // 关联活动, 可空
  note: text("note").notNull(), // 学习记录内容
  durationMin: integer("duration_min").notNull().default(0), // 用时(分钟)
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---- 知识库 ----
export const kbResources = pgTable("kb_resources", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  category: text("category").notNull().default("site"), // site 网站 | book 书籍 | other 其他
  title: text("title").notNull(),
  description: text("description"),
  url: text("url"), // 网址, 可空
  tags: text("tags"), // 逗号分隔
  status: text("status").notNull().default("active"), // 常用/在读/计划中/已读完 → active | doing | todo | done
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---- 沉淀与计划 (仪表盘) ----
export const retros = pgTable("retros", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  kind: text("kind").notNull().default("review"), // review 沉淀(做过的事) | plan 计划(没做的事)
  content: text("content").notNull(),
  refDate: text("ref_date"), // YYYY-MM-DD
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
