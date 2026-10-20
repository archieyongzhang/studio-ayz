import Link from "next/link";
import { and, eq, or, sql, type Column } from "drizzle-orm";

import {
  ideas,
  kbResources,
  learnItems,
  projectMaterials,
  projects,
  todos,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const user = await getCurrentUser();
  const db = getDb();
  // 跨方言的大小写不敏感匹配 (Postgres / SQLite 都支持 lower() + like)
  const pattern = `%${q.toLowerCase()}%`;
  const match = (...cols: Column[]) =>
    or(...cols.map((c) => sql`lower(${c}) like ${pattern}`));

  const [td, id, pj, mt, ki, li] = q
    ? await Promise.all([
        db
          .select()
          .from(todos)
          .where(and(eq(todos.userId, user.id), match(todos.title)))
          .limit(10),
        db
          .select()
          .from(ideas)
          .where(
            and(
              eq(ideas.userId, user.id),
              match(ideas.title, ideas.content),
            ),
          )
          .limit(10),
        db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.userId, user.id),
              match(projects.name, projects.nextStep),
            ),
          )
          .limit(10),
        db
          .select()
          .from(projectMaterials)
          .where(
            and(
              eq(projectMaterials.userId, user.id),
              match(projectMaterials.name, projectMaterials.content),
            ),
          )
          .limit(10),
        db
          .select()
          .from(kbResources)
          .where(
            and(
              eq(kbResources.userId, user.id),
              match(kbResources.title, kbResources.description),
            ),
          )
          .limit(10),
        db
          .select()
          .from(learnItems)
          .where(and(eq(learnItems.userId, user.id), match(learnItems.title)))
          .limit(10),
      ])
    : [[], [], [], [], [], []];

  const groups: { label: string; rows: { text: string; href?: string }[] }[] = [
    { label: "✅ 待办", rows: td.map((r) => ({ text: r.title, href: "/todos" })) },
    { label: "💡 想法与需求", rows: id.map((r) => ({ text: r.title, href: "/ideas" })) },
    {
      label: "📁 项目",
      rows: pj.map((r) => ({ text: r.name, href: `/projects?id=${r.id}` })),
    },
    {
      label: "📎 项目资料",
      rows: mt.map((r) => ({
        text: r.name,
        href: `/projects?id=${r.projectId}`,
      })),
    },
    {
      label: "🗣️ 学习项",
      rows: li.map((r) => ({ text: r.title, href: `/english?item=${r.id}` })),
    },
    {
      label: "📚 知识库",
      rows: ki.map((r) => ({ text: r.title, href: r.url ?? "/kb" })),
    },
  ];
  const total = groups.reduce((acc, g) => acc + g.rows.length, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>搜索「{q}」</h1>
          <div className="sub">找到 {total} 条结果</div>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 760 }}>
        <div className="card-h">结果</div>
        {groups
          .filter((g) => g.rows.length > 0)
          .map((g) => (
            <div className="res-item" key={g.label}>
              <span className="tag proj" style={{ flexShrink: 0 }}>
                {g.label}
              </span>
              <div className="name" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {g.rows.map((row, idx) =>
                  row.href ? (
                    <Link key={idx} href={row.href} style={{ color: "var(--primary)" }}>
                      {row.text}
                    </Link>
                  ) : (
                    <span key={idx}>{row.text}</span>
                  ),
                )}
              </div>
            </div>
          ))}
        {total === 0 && (
          <div className="empty-hint">没有找到相关内容, 换个关键词试试</div>
        )}
      </div>
    </>
  );
}
