import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";

import { addRetro, deleteRetro, toggleTodo } from "@/app/actions";
import { ideas, learnRecords, projects, retros, todos } from "@/db/schema";
import { getDb } from "@/lib/db";
import { formatDue, formatStamp, todayStr } from "@/lib/format";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const db = getDb();
  const today = todayStr();

  const [openTodos, todayDone, activeProjects, openIdeas, reviews, plans, learnToday] =
    await Promise.all([
      db
        .select()
        .from(todos)
        .where(and(eq(todos.userId, user.id), eq(todos.done, false)))
        .orderBy(desc(todos.createdAt)),
      db
        .select({ n: count() })
        .from(todos)
        .where(and(eq(todos.userId, user.id), eq(todos.done, true)))
        .then((r) => Number(r[0]?.n ?? 0)),
      db
        .select()
        .from(projects)
        .where(and(eq(projects.userId, user.id), eq(projects.status, "active"))),
      db
        .select({ n: count() })
        .from(ideas)
        .where(and(eq(ideas.userId, user.id), eq(ideas.status, "open")))
        .then((r) => Number(r[0]?.n ?? 0)),
      db
        .select()
        .from(retros)
        .where(and(eq(retros.userId, user.id), eq(retros.kind, "review")))
        .orderBy(desc(retros.createdAt))
        .limit(5),
      db
        .select()
        .from(retros)
        .where(and(eq(retros.userId, user.id), eq(retros.kind, "plan")))
        .orderBy(desc(retros.createdAt))
        .limit(5),
      db
        .select()
        .from(learnRecords)
        .where(eq(learnRecords.userId, user.id))
        .orderBy(desc(learnRecords.createdAt))
        .limit(5),
    ]);

  const todayOpen = openTodos.filter((t) => !t.dueDate || t.dueDate <= today).slice(0, 5);
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const weekReviews = reviews.filter((r) => new Date(r.createdAt) >= weekAgo).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>总览仪表盘</h1>
          <div className="sub">
            今天做了什么、该做什么、各项目进展汇总 · 数据实时保存
          </div>
        </div>
      </div>

      <div className="dashboard-wrap">
        <div className="grid grid-3">
          <div className="card stat">
            <div className="ic" style={{ background: "#dcfce7" }}>✅</div>
            <div>
              <div className="num">
                {todayDone} / {todayDone + openTodos.length}
              </div>
              <div className="lbl">待办完成</div>
            </div>
          </div>
          <div className="card stat">
            <div className="ic" style={{ background: "#e0e7ff" }}>📁</div>
            <div>
              <div className="num">{activeProjects.length}</div>
              <div className="lbl">进行中项目</div>
            </div>
          </div>
          <div className="card stat">
            <div className="ic" style={{ background: "#fef3c7" }}>💡</div>
            <div>
              <div className="num">{openIdeas}</div>
              <div className="lbl">想法与需求池</div>
            </div>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-h">
              📌 今日该做
              <Link className="more" href="/todos">
                查看全部 →
              </Link>
            </div>
            {todayOpen.map((t) => {
              const due = formatDue(t.dueDate);
              return (
                <div className="todo-item" key={t.id}>
                  <form action={toggleTodo}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="chk" />
                  </form>
                  <div className="todo-title">{t.title}</div>
                  <div className="todo-meta">
                    {t.dueDate ? <span className={due.cls}>{due.text}</span> : null}
                  </div>
                </div>
              );
            })}
            {todayOpen.length === 0 && (
              <div className="empty-hint">今天没有待安排的事, 去待办里加一条</div>
            )}
          </div>
          <div className="card">
            <div className="card-h">
              📁 项目进度汇总
              <Link className="more" href="/projects">
                →
              </Link>
            </div>
            <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeProjects.map((p) => (
                <div key={p.id}>
                  <div className="proj-top">
                    <span className="proj-dot" style={{ background: p.color }} />
                    <b>{p.name}</b>
                    <span className="pct">{p.progress}%</span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
              ))}
              {activeProjects.length === 0 && (
                <div className="empty-hint" style={{ padding: 0 }}>
                  还没有进行中的项目
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-h">🧾 近期沉淀（做过的事 · 本周 {weekReviews} 条）</div>
            <form action={addRetro}>
              <div className="input-add">
                <input type="hidden" name="kind" value="review" />
                <input name="content" placeholder="＋ 沉淀一条: 今天做成了什么 / 学到了什么" required />
                <button className="btn-primary">沉淀</button>
              </div>
            </form>
            {reviews.map((r) => (
              <div className="review-item" key={r.id}>
                <div className="rh">
                  {formatStamp(r.createdAt)}
                  <span className="tag proj">沉淀</span>
                  <form action={deleteRetro} style={{ marginLeft: "auto" }}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn-icon-del">✕</button>
                  </form>
                </div>
                <p>{r.content}</p>
              </div>
            ))}
            {reviews.length === 0 && <div className="empty-hint">做完的事, 沉淀下来</div>}
          </div>
          <div className="card">
            <div className="card-h">🎯 计划中（没做的事）</div>
            <form action={addRetro}>
              <div className="input-add">
                <input type="hidden" name="kind" value="plan" />
                <input name="content" placeholder="＋ 计划一条: 接下来要做什么" required />
                <button className="btn-primary">计划</button>
              </div>
            </form>
            {plans.map((r) => (
              <div className="review-item" key={r.id}>
                <div className="rh">
                  {formatStamp(r.createdAt)}
                  <span className="tag mid">计划</span>
                  <form action={deleteRetro} style={{ marginLeft: "auto" }}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn-icon-del">✕</button>
                  </form>
                </div>
                <p>{r.content}</p>
              </div>
            ))}
            {plans.length === 0 && <div className="empty-hint">把没做的事安排进计划</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            🗣️ 最近学习
            <Link className="more" href="/english">
              →
            </Link>
          </div>
          {learnToday.map((r) => (
            <div className="res-item" key={r.id}>
              <div className="res-ic" style={{ background: "#dcfce7" }}>🗣️</div>
              <div className="name">{r.note}</div>
              <span className="kind">
                {formatStamp(r.createdAt)}
                {r.durationMin ? ` · ${r.durationMin} 分钟` : ""}
              </span>
            </div>
          ))}
          {learnToday.length === 0 && (
            <div className="empty-hint">今天还没学习记录</div>
          )}
        </div>
      </div>
    </>
  );
}
