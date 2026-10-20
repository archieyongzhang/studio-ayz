import type { Metadata } from "next";
import { and, count, eq } from "drizzle-orm";

import Sidebar from "@/components/Sidebar";
import { ideas, learnItems, projects, todos } from "@/db/schema";
import { getDb } from "@/lib/db";
import { ACCOUNT_NAME, getCurrentUser } from "@/lib/user";

import "./globals.css";

export const metadata: Metadata = {
  title: "我的工作台",
  description: "个人工作台：待办 / 想法 / 项目 / 英语学习 / 知识库",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // 构建期 (静态预渲染 /_not-found) 没有 DATABASE_URL, 安全降级; 运行时始终有库
  const hasDb = Boolean(process.env.DATABASE_URL);
  const user = hasDb
    ? await getCurrentUser()
    : { id: 0, name: ACCOUNT_NAME };
  const db = getDb();

  const [openTodos, openIdeas, activeProjects, learningItems] = hasDb
    ? await Promise.all([
      db
        .select({ n: count() })
        .from(todos)
        .where(and(eq(todos.userId, user.id), eq(todos.done, false)))
        .then((r) => Number(r[0]?.n ?? 0)),
      db
        .select({ n: count() })
        .from(ideas)
        .where(and(eq(ideas.userId, user.id), eq(ideas.status, "open")))
        .then((r) => Number(r[0]?.n ?? 0)),
      db
        .select({ n: count() })
        .from(projects)
        .where(and(eq(projects.userId, user.id), eq(projects.status, "active")))
        .then((r) => Number(r[0]?.n ?? 0)),
      db
        .select({ n: count() })
        .from(learnItems)
        .where(and(eq(learnItems.userId, user.id), eq(learnItems.status, "active")))
        .then((r) => Number(r[0]?.n ?? 0)),
    ])
  : [0, 0, 0, 0];

  const now = new Date();
  const week = ["日", "一", "二", "三", "四", "五", "六"];
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日 · 周${week[now.getDay()]}`;

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <div className="topbar">
          <div className="logo">
            <span className="mark">台</span>我的工作台
          </div>
          <form action="/search" method="get" style={{ flex: 1, maxWidth: 420 }}>
            <div className="search" style={{ maxWidth: "none" }}>
              <span className="icon">🔍</span>
              <input
                name="q"
                placeholder="全局搜索：任务、想法、项目、资料…"
              />
            </div>
          </form>
          <div className="top-actions">
            <span className="today-chip">📅 {dateLabel}</span>
            <a
              className="btn-primary"
              href="/todos"
              style={{ textDecoration: "none" }}
            >
              ＋ 快速新建 ▾
            </a>
            <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          </div>
        </div>
        <div className="layout">
          <Sidebar
            counts={{
              "/todos": openTodos,
              "/ideas": openIdeas,
              "/projects": activeProjects,
              "/english": learningItems,
            }}
          />
          <div className="main">{children}</div>
        </div>
      </body>
    </html>
  );
}
