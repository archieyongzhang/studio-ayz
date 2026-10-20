import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";

import {
  addMaterial,
  addProject,
  addProjectUpdate,
  deleteMaterial,
  deleteProject,
  deleteProjectUpdate,
  toggleTodo,
  updateProject,
} from "@/app/actions";
import { projectMaterials, projectUpdates, projects, todos } from "@/db/schema";
import { getDb } from "@/lib/db";
import { formatStamp } from "@/lib/format";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

const KIND_ICON: Record<string, string> = {
  link: "🔗",
  doc: "📄",
  image: "🖼️",
  note: "📝",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const db = getDb();
  const list = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt));
  const current =
    list.find((p) => String(p.id) === sp.id) ?? list[0];

  const [materials, updates, projTodos] = current
    ? await Promise.all([
        db
          .select()
          .from(projectMaterials)
          .where(
            and(
              eq(projectMaterials.projectId, current.id),
              eq(projectMaterials.userId, user.id),
            ),
          )
          .orderBy(desc(projectMaterials.createdAt)),
        db
          .select()
          .from(projectUpdates)
          .where(
            and(
              eq(projectUpdates.projectId, current.id),
              eq(projectUpdates.userId, user.id),
            ),
          )
          .orderBy(desc(projectUpdates.createdAt)),
        db
          .select()
          .from(todos)
          .where(and(eq(todos.projectId, current.id), eq(todos.userId, user.id)))
          .orderBy(desc(todos.createdAt)),
      ])
    : [[], [], []];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>项目进展</h1>
          <div className="sub">
            在做的项目 · 资料 · 进展时间线 · 下一步 · 共 {list.length} 个项目
          </div>
        </div>
        <form action={addProject} style={{ display: "flex", gap: 8 }}>
          <input
            name="name"
            placeholder="新项目名称"
            required
            className="sel-mini"
            style={{ width: 160 }}
          />
          <input
            name="color"
            type="color"
            defaultValue="#4f46e5"
            className="sel-mini"
            style={{ width: 44, padding: 2 }}
            title="项目颜色"
          />
          <button className="btn-primary">＋ 新建项目</button>
        </form>
      </div>

      <div className="grid grid-3">
        {list.map((p) => (
          <Link
            key={p.id}
            href={`/projects?id=${p.id}`}
            className="card proj-card"
            style={{
              textDecoration: "none",
              color: "inherit",
              outline: current?.id === p.id ? "2px solid var(--primary)" : "none",
            }}
          >
            <div className="proj-top">
              <span className="proj-dot" style={{ background: p.color }} />
              <b>{p.name}</b>
              <span className="pct">{p.progress}%</span>
            </div>
            <div className="bar">
              <i style={{ width: `${p.progress}%` }} />
            </div>
            <div className="proj-sub">
              <span>
                下一步：<b>{p.nextStep ?? "—"}</b>
              </span>
              <span>{p.status === "active" ? "进行中" : p.status === "paused" ? "已暂停" : "已完成"}</span>
            </div>
          </Link>
        ))}
        {list.length === 0 && <div className="empty-hint">还没有项目, 新建一个吧</div>}
      </div>

      {current && (
        <>
          <div className="section-title">
            当前项目:{current.name}
            <form action={deleteProject} style={{ display: "inline", marginLeft: 10 }}>
              <input type="hidden" name="id" value={current.id} />
              <button className="as-link">删除项目</button>
            </form>
          </div>
          <div className="grid grid-2">
            <div className="card">
              <div className="card-h">📈 进展时间线</div>
              <form action={addProjectUpdate}>
                <div className="input-add">
                  <input name="content" placeholder="＋ 记一条进展, 如: 完成了 xx" required />
                  <input type="hidden" name="projectId" value={current.id} />
                  <button className="btn-primary">记录</button>
                </div>
              </form>
              <div className="card-b timeline">
                {updates.map((u) => (
                  <div className="tl-item" key={u.id}>
                    <div className="t">{u.content}</div>
                    <div className="time" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {formatStamp(u.createdAt)}
                      <form action={deleteProjectUpdate}>
                        <input type="hidden" name="id" value={u.id} />
                        <button className="btn-icon-del">✕</button>
                      </form>
                    </div>
                  </div>
                ))}
                {updates.length === 0 && <div className="empty-hint">还没有进展记录</div>}
              </div>
            </div>
            <div className="card">
              <div className="card-h">📎 相关资料</div>
              <form action={addMaterial}>
                <div className="input-add" style={{ flexWrap: "wrap" }}>
                  <input type="hidden" name="projectId" value={current.id} />
                  <select name="kind" defaultValue="link" className="sel-mini">
                    <option value="link">链接</option>
                    <option value="doc">文档</option>
                    <option value="image">图片</option>
                    <option value="note">笔记</option>
                  </select>
                  <input name="name" placeholder="资料名称" required style={{ flex: 1, minWidth: 120 }} />
                  <input name="content" placeholder="链接地址 / 内容说明" className="sel-mini" style={{ height: 32 }} />
                  <button className="btn-primary">添加</button>
                </div>
              </form>
              {materials.map((m) => (
                <div className="res-item" key={m.id}>
                  <div className="res-ic" style={{ background: "#eef2ff" }}>
                    {KIND_ICON[m.kind] ?? "📎"}
                  </div>
                  <div className="name">
                    {m.content && m.kind === "link" ? (
                      <a href={m.content} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
                        {m.name}
                      </a>
                    ) : (
                      m.name
                    )}
                    {m.content && m.kind !== "link" && (
                      <span style={{ color: "#9ca3af", fontSize: 12 }}> · {m.content}</span>
                    )}
                  </div>
                  <span className="kind">{m.kind === "link" ? "链接" : m.kind === "doc" ? "文档" : m.kind === "image" ? "图片" : "笔记"}</span>
                  <form action={deleteMaterial}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className="btn-icon-del">✕</button>
                  </form>
                </div>
              ))}
              {materials.length === 0 && <div className="empty-hint">还没有资料</div>}
            </div>
          </div>

          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <div className="card">
              <div className="card-h">⚙️ 项目设置</div>
              <form action={updateProject}>
                <input type="hidden" name="id" value={current.id} />
                <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
                    进度(%)
                    <input
                      name="progress"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={current.progress}
                      className="sel-mini"
                      style={{ width: 80 }}
                    />
                    <div className="mini-bar" style={{ flex: 1 }}>
                      <i style={{ width: `${current.progress}%` }} />
                    </div>
                  </label>
                  <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
                    下一步
                    <input
                      name="nextStep"
                      defaultValue={current.nextStep ?? ""}
                      placeholder="下一步动作"
                      className="sel-mini"
                      style={{ flex: 1 }}
                    />
                  </label>
                  <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
                    状态
                    <select name="status" defaultValue={current.status} className="sel-mini">
                      <option value="active">进行中</option>
                      <option value="paused">已暂停</option>
                      <option value="done">已完成</option>
                    </select>
                    <button className="btn-primary" style={{ marginLeft: "auto" }}>
                      保存
                    </button>
                  </label>
                </div>
              </form>
            </div>
            <div className="card">
              <div className="card-h">✅ 该项目的待办（{projTodos.length}）</div>
              {projTodos.map((t) => (
                <div className="todo-item" key={t.id}>
                  <form action={toggleTodo}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className={"chk" + (t.done ? " done" : "")}>
                      {t.done ? "✓" : ""}
                    </button>
                  </form>
                  <div className={"todo-title" + (t.done ? " done" : "")}>{t.title}</div>
                </div>
              ))}
              {projTodos.length === 0 && (
                <div className="empty-hint">在「待办事项」里添加并关联此项目</div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
