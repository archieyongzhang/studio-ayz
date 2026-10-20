import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";

import {
  addLearnActivity,
  addLearnItem,
  deleteLearnActivity,
  deleteLearnItem,
  recordLearn,
} from "@/app/actions";
import { learnActivities, learnItems, learnRecords } from "@/db/schema";
import { getDb } from "@/lib/db";
import { formatStamp, todayStr } from "@/lib/format";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

const TYPE_META: Record<string, { label: string; cls: string; icon: string; bg: string }> = {
  book: { label: "书籍", cls: "itype book", icon: "📕", bg: "#ede9fe" },
  site: { label: "网站", cls: "itype site", icon: "🌐", bg: "#dbeafe" },
  project: { label: "项目", cls: "itype proj", icon: "🎤", bg: "#fef3c7" },
  course: { label: "课程", cls: "itype book", icon: "🎓", bg: "#dcfce7" },
};
const FREQ_META: Record<string, { label: string; cls: string }> = {
  daily: { label: "每日", cls: "freq daily" },
  weekly: { label: "每周", cls: "freq weekly" },
  each: { label: "每次", cls: "freq each" },
  chapter: { label: "章节推进", cls: "freq chapter" },
};

function streakOf(dates: Set<string>): number {
  let streak = 0;
  const d = new Date();
  if (!dates.has(todayStr())) d.setDate(d.getDate() - 1); // 今天还没学则从昨天起算
  for (;;) {
    const p = (x: number) => String(x).padStart(2, "0");
    const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    if (!dates.has(key)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export default async function EnglishPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const db = getDb();
  const items = await db
    .select()
    .from(learnItems)
    .where(eq(learnItems.userId, user.id))
    .orderBy(desc(learnItems.createdAt));
  const current =
    items.find((i) => String(i.id) === sp.item) ?? items[0];

  const allRecords = await db
    .select()
    .from(learnRecords)
    .where(eq(learnRecords.userId, user.id))
    .orderBy(desc(learnRecords.createdAt));

  const [activities, records] = current
    ? await Promise.all([
        db
          .select()
          .from(learnActivities)
          .where(
            and(eq(learnActivities.itemId, current.id), eq(learnActivities.userId, user.id)),
          )
          .orderBy(learnActivities.id),
        db
          .select()
          .from(learnRecords)
          .where(and(eq(learnRecords.itemId, current.id), eq(learnRecords.userId, user.id)))
          .orderBy(desc(learnRecords.createdAt)),
      ])
    : [[], []];

  const dateSet = new Set(
    allRecords.map((r) => {
      const d = new Date(r.createdAt);
      const p = (x: number) => String(x).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }),
  );
  const streak = streakOf(dateSet);
  const monthKey = todayStr().slice(0, 7);
  const monthCount = allRecords.filter((r) =>
    new Date(r.createdAt).toISOString().slice(0, 7) === monthKey,
  ).length;
  const totalMin = allRecords.reduce((acc, r) => acc + r.durationMin, 0);
  const actName = new Map(activities.map((a) => [a.id, a.name]));
  const pct =
    current && current.totalTarget
      ? Math.round((current.doneAmount / current.totalTarget) * 100)
      : null;
  const itemTotalMin = records.reduce((acc, r) => acc + r.durationMin, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>英语学习</h1>
          <div className="sub">
            学习项（书籍 / 网站 / 项目 / 课程）→ 每项下面的细化学习活动
          </div>
        </div>
      </div>

      <div className="eng-stats">
        <div className="eng-stat">🔥 <b>{streak} 天</b><span>连续打卡</span></div>
        <div className="eng-stat">📅 <b>{monthCount} 次</b><span>本月记录</span></div>
        <div className="eng-stat">📚 <b>{items.filter((i) => i.status === "active").length} 个</b><span>进行中学习项</span></div>
        <div className="eng-stat">⏱️ <b>{(totalMin / 60).toFixed(1)} h</b><span>累计学习时长</span></div>
      </div>

      <div className="learn-layout">
        <div className="card">
          <div className="card-h">📚 我的学习项</div>
          {items.map((it) => {
            const meta = TYPE_META[it.type] ?? TYPE_META.book;
            const p =
              it.totalTarget
                ? Math.round((it.doneAmount / it.totalTarget) * 100)
                : null;
            return (
              <Link
                key={it.id}
                href={`/english?item=${it.id}`}
                className={"li-card" + (current?.id === it.id ? " sel" : "")}
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div className="li-top">
                  <div className="li-ic" style={{ background: meta.bg }}>
                    {meta.icon}
                  </div>
                  <b>{it.title}</b>
                  <span className={meta.cls}>{meta.label}</span>
                </div>
                {it.totalTarget ? (
                  <>
                    <div className="li-bar">
                      <i style={{ width: `${p}%` }} />
                    </div>
                    <div className="li-sub">
                      <span>
                        {it.doneAmount}/{it.totalTarget} {it.unit ?? ""} · 活动{" "}
                        {it.id === current?.id ? activities.length : ""}
                      </span>
                      <span>{p}%</span>
                    </div>
                  </>
                ) : (
                  <div className="li-sub">
                    <span>未设总量 · 记录 {it.id === current?.id ? records.length : ""}</span>
                    <span>{it.status === "done" ? "已完成" : "进行中"}</span>
                  </div>
                )}
              </Link>
            );
          })}
          {items.length === 0 && <div className="empty-hint">先添加一个学习项</div>}
          <form action={addLearnItem}>
            <div className="card-b" style={{ borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  name="title"
                  placeholder="学习项名称"
                  required
                  className="sel-mini"
                  style={{ flex: 1 }}
                />
                <select name="type" defaultValue="book" className="sel-mini">
                  <option value="book">书籍</option>
                  <option value="site">网站</option>
                  <option value="project">项目</option>
                  <option value="course">课程</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input name="totalTarget" type="number" min={1} placeholder="总量" className="sel-mini" style={{ width: 70 }} />
                <input name="unit" placeholder="单位(章/集/页)" className="sel-mini" style={{ flex: 1 }} />
                <button className="btn-mini">添加</button>
              </div>
            </div>
          </form>
        </div>

        {current && (
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-h">
                {(TYPE_META[current.type] ?? TYPE_META.book).icon} {current.title}{" "}
                <span className={(TYPE_META[current.type] ?? TYPE_META.book).cls}>
                  {(TYPE_META[current.type] ?? TYPE_META.book).label}
                </span>
                <form action={deleteLearnItem} style={{ marginLeft: "auto" }}>
                  <input type="hidden" name="id" value={current.id} />
                  <button className="as-link">删除学习项</button>
                </form>
              </div>
              <div className="card-b">
                {current.totalTarget ? (
                  <>
                    <div className="proj-top">
                      <b>整体进度</b>
                      <span className="pct">{pct}%</span>
                    </div>
                    <div className="bar">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                    <div className="proj-sub">
                      <span>
                        已完成 {current.doneAmount} / {current.totalTarget} {current.unit ?? ""}
                      </span>
                      <span>累计 {(itemTotalMin / 60).toFixed(1)}h</span>
                      <span>记录 {records.length} 条</span>
                    </div>
                  </>
                ) : (
                  <div className="proj-sub" style={{ marginTop: 0 }}>
                    <span>未设总量目标</span>
                    <span>累计 {(itemTotalMin / 60).toFixed(1)}h</span>
                    <span>记录 {records.length} 条</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-h">🎯 学习活动（{activities.length}）</div>
              <form action={addLearnActivity}>
                <div className="input-add" style={{ flexWrap: "wrap" }}>
                  <input type="hidden" name="itemId" value={current.id} />
                  <input name="name" placeholder="活动名称, 如: 每日精听1集" required style={{ flex: 2, minWidth: 140 }} />
                  <select name="frequency" defaultValue="each" className="sel-mini">
                    <option value="daily">每日</option>
                    <option value="weekly">每周</option>
                    <option value="each">每次</option>
                    <option value="chapter">章节推进</option>
                  </select>
                  <input name="description" placeholder="说明（可空）" className="sel-mini" style={{ height: 32, flex: 1, minWidth: 100 }} />
                  <button className="btn-primary">添加活动</button>
                </div>
              </form>
              {activities.map((a) => {
                const fm = FREQ_META[a.frequency] ?? FREQ_META.each;
                return (
                  <div className="act-item" key={a.id}>
                    <div className="act-main">
                      <div className="act-name">
                        {a.name} <span className={fm.cls}>{fm.label}</span>
                      </div>
                      {a.description && <div className="act-desc">{a.description}</div>}
                      {a.frequency === "chapter" && current.totalTarget && (
                        <div className="act-meta">
                          <div className="mini-bar">
                            <i style={{ width: `${pct}%` }} />
                          </div>
                          <span style={{ fontSize: 12, color: "var(--text2)" }}>
                            第 {Math.min(current.doneAmount + 1, current.totalTarget)} / {current.totalTarget} {current.unit ?? ""}
                          </span>
                        </div>
                      )}
                    </div>
                    <details style={{ position: "relative" }}>
                      <summary className="btn-mini" style={{ listStyle: "none", cursor: "pointer" }}>
                        记一次
                      </summary>
                      <form
                        action={recordLearn}
                        style={{
                          position: "absolute",
                          right: 0,
                          top: "110%",
                          zIndex: 20,
                          background: "#fff",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                          padding: 12,
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          width: 260,
                        }}
                      >
                        <input type="hidden" name="itemId" value={current.id} />
                        <input type="hidden" name="activityId" value={a.id} />
                        <input
                          name="note"
                          placeholder="记录内容, 如: 读完第6章"
                          required
                          className="sel-mini"
                          style={{ height: 32 }}
                        />
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input name="durationMin" type="number" min={0} placeholder="用时(分)" className="sel-mini" style={{ width: 90 }} />
                          <button className="btn-primary" style={{ marginLeft: "auto", height: 28, fontSize: 12 }}>
                            保存记录
                          </button>
                        </div>
                      </form>
                    </details>
                    <form action={deleteLearnActivity}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="btn-icon-del" title="删除活动">
                        ✕
                      </button>
                    </form>
                  </div>
                );
              })}
              {activities.length === 0 && (
                <div className="empty-hint">还没有活动, 给这个学习项拆几个可执行的动作</div>
              )}
            </div>

            <div className="card">
              <div className="card-h">🧾 学习记录</div>
              <form action={recordLearn}>
                <div className="input-add">
                  <input type="hidden" name="itemId" value={current.id} />
                  <input name="note" placeholder="＋ 记一条学习记录" required />
                  <input name="durationMin" type="number" min={0} placeholder="分钟" className="sel-mini" style={{ width: 70 }} />
                  <button className="btn-primary">记录</button>
                </div>
              </form>
              <div className="card-b timeline">
                {records.slice(0, 15).map((r) => (
                  <div className="tl-item" key={r.id}>
                    <div className="t">{r.note}</div>
                    {r.activityId && actName.get(r.activityId) && (
                      <div className="d">活动:{actName.get(r.activityId)}</div>
                    )}
                    <div className="time">
                      {formatStamp(r.createdAt)}
                      {r.durationMin ? ` · ${r.durationMin} 分钟` : ""}
                    </div>
                  </div>
                ))}
                {records.length === 0 && <div className="empty-hint">还没有学习记录</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
