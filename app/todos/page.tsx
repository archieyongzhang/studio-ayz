import { and, desc, eq } from "drizzle-orm";

import { addTodo, deleteTodo, toggleTodo } from "@/app/actions";
import { projects, todos } from "@/db/schema";
import { getDb } from "@/lib/db";
import { formatDue, PRIORITY_LABEL } from "@/lib/format";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

const PRIO_CLASS: Record<string, string> = {
  high: "tag high",
  mid: "tag mid",
  low: "tag low",
};

export default async function TodosPage() {
  const user = await getCurrentUser();
  const db = getDb();
  const [open, doneList, projList] = await Promise.all([
    db
      .select()
      .from(todos)
      .where(and(eq(todos.userId, user.id), eq(todos.done, false)))
      .orderBy(desc(todos.createdAt)),
    db
      .select()
      .from(todos)
      .where(and(eq(todos.userId, user.id), eq(todos.done, true)))
      .orderBy(desc(todos.completedAt))
      .limit(20),
    db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, user.id), eq(projects.status, "active"))),
  ]);
  const projName = new Map(projList.map((p) => [p.id, p.name]));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>待办事项</h1>
          <div className="sub">
            该做的事情 · 按优先级与截止时间安排 · 共 {open.length} 项进行中
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-h">🕐 进行中（{open.length}）</div>
          <form action={addTodo}>
            <div className="input-add">
              <input name="title" placeholder="＋ 添加待办，回车或点添加" required />
              <select name="priority" defaultValue="mid" className="sel-mini">
                <option value="high">高</option>
                <option value="mid">中</option>
                <option value="low">低</option>
              </select>
              <input type="date" name="dueDate" className="sel-mini" />
              <select name="projectId" defaultValue="" className="sel-mini">
                <option value="">无项目</option>
                {projList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button className="btn-primary">添加</button>
            </div>
          </form>
          {open.map((t) => {
            const due = formatDue(t.dueDate);
            return (
              <div className="todo-item" key={t.id}>
                <form action={toggleTodo}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="chk" title="完成" />
                </form>
                <div className="todo-title">{t.title}</div>
                <div className="todo-meta">
                  {t.dueDate ? <span className={due.cls}>{due.text}</span> : null}
                  <span className={PRIO_CLASS[t.priority]}>
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                  {t.projectId && projName.get(t.projectId) ? (
                    <span className="tag proj">{projName.get(t.projectId)}</span>
                  ) : null}
                  <form action={deleteTodo}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="btn-icon-del" title="删除">
                      ✕
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          {open.length === 0 && (
            <div className="empty-hint">还没有待办, 添加第一条吧</div>
          )}
        </div>

        <div className="card">
          <div className="card-h">✅ 已完成（最近）</div>
          {doneList.map((t) => (
            <div className="todo-item" key={t.id}>
              <form action={toggleTodo}>
                <input type="hidden" name="id" value={t.id} />
                <button type="submit" className="chk done" title="撤销">
                  ✓
                </button>
              </form>
              <div className="todo-title done">{t.title}</div>
              <div className="todo-meta">
                <form action={deleteTodo}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="btn-icon-del" title="删除">
                    ✕
                  </button>
                </form>
              </div>
            </div>
          ))}
          {doneList.length === 0 && (
            <div className="empty-hint">完成的事情会出现在这里</div>
          )}
        </div>
      </div>
    </>
  );
}
