import { and, desc, eq } from "drizzle-orm";

import {
  addIdea,
  convertIdeaToProject,
  convertIdeaToTodo,
  deleteIdea,
} from "@/app/actions";
import { ideas } from "@/db/schema";
import { getDb } from "@/lib/db";
import { formatStamp } from "@/lib/format";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const user = await getCurrentUser();
  const db = getDb();
  const list = await db
    .select()
    .from(ideas)
    .where(eq(ideas.userId, user.id))
    .orderBy(desc(ideas.createdAt));
  const open = list.filter((i) => i.status === "open");
  const convertible = list.filter((i) => i.status === "open").slice(0, 5);

  const tagsOf = (t: string | null) =>
    (t ?? "")
      .split(/[,，]/)
      .map((x) => x.trim())
      .filter(Boolean);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>想法与需求收集</h1>
          <div className="sub">
            随手记录 · 标记类型与标签 · 成熟后转为待办或立项 · 共 {open.length} 条待处理
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-h">💡 全部记录</div>
          <form action={addIdea}>
            <div className="input-add" style={{ flexWrap: "wrap" }}>
              <input
                name="title"
                placeholder="一句话标题"
                required
                style={{ flex: 2, minWidth: 160 }}
              />
              <select name="type" defaultValue="idea" className="sel-mini">
                <option value="idea">想法</option>
                <option value="req">需求</option>
              </select>
              <input
                name="tags"
                placeholder="标签, 逗号分隔"
                className="sel-mini"
                style={{ height: 32 }}
              />
            </div>
            <div className="input-add">
              <textarea
                name="content"
                placeholder="补充描述（可空）"
                style={{
                  flex: 1,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 13,
                  minHeight: 40,
                  fontFamily: "inherit",
                }}
              />
              <button className="btn-primary">记一条</button>
            </div>
          </form>
          {list.map((i) => (
            <div className="idea-card" key={i.id}>
              <div className="idea-top">
                <b>{i.title}</b>
                <span className={"tag " + (i.type === "req" ? "type-req" : "type-idea")}>
                  {i.type === "req" ? "需求" : "想法"}
                </span>
                {i.status === "todo" && <span className="tag low">已转待办</span>}
                {i.status === "project" && <span className="tag proj">已立项</span>}
              </div>
              {i.content && <div className="idea-text">{i.content}</div>}
              <div className="idea-foot">
                {tagsOf(i.tags).map((t) => (
                  <span className="tag taggray" key={t}>
                    {t}
                  </span>
                ))}
                <span className="time">{formatStamp(i.createdAt)}</span>
                {i.status === "open" && (
                  <>
                    <form action={convertIdeaToTodo} style={{ marginLeft: "auto" }}>
                      <input type="hidden" name="id" value={i.id} />
                      <button className="btn-mini">转为待办</button>
                    </form>
                    <form action={convertIdeaToProject}>
                      <input type="hidden" name="id" value={i.id} />
                      <button className="btn-mini">转为项目</button>
                    </form>
                  </>
                )}
                <form action={deleteIdea}>
                  <input type="hidden" name="id" value={i.id} />
                  <button className="btn-icon-del" title="删除">
                    ✕
                  </button>
                </form>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="empty-hint">想到什么就记下来, 别让它溜走</div>
          )}
        </div>

        <div className="card">
          <div className="card-h">🔄 可以转化</div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>
              想法池里比较成熟、可以落地成行动的（前 5 条）:
            </div>
            {convertible.map((i) => (
              <div className="card" style={{ boxShadow: "none", padding: "12px 14px" }} key={i.id}>
                <b style={{ fontSize: 13 }}>📌 {i.title}</b>
                <div style={{ color: "var(--text2)", fontSize: 12, margin: "4px 0 8px" }}>
                  {i.type === "req" ? "需求" : "想法"} · 建议转为待办排期, 或独立立项
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <form action={convertIdeaToTodo}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="btn-primary" style={{ height: 28, fontSize: 12 }}>
                      转为待办
                    </button>
                  </form>
                  <form action={convertIdeaToProject}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="btn-ghost" style={{ height: 28, fontSize: 12 }}>
                      转为项目
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {convertible.length === 0 && (
              <div className="empty-hint">没有待转化的想法</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
