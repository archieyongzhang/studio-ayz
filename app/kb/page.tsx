import { desc, eq } from "drizzle-orm";

import { addKbResource, deleteKbResource } from "@/app/actions";
import { kbResources } from "@/db/schema";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

const CATS = [
  { key: "site", label: "🌐 网站资料", iconBg: "#e0e7ff", icon: "🔗" },
  { key: "book", label: "📖 书籍", iconBg: "#fee2e2", icon: "📕" },
  { key: "other", label: "📦 其他资源", iconBg: "#f3f4f6", icon: "🗂️" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  active: "常用",
  doing: "在读",
  todo: "计划中",
  done: "已读完",
};
const STATUS_CLS: Record<string, string> = {
  active: "tag low",
  doing: "tag mid",
  todo: "tag taggray",
  done: "tag proj",
};

export default async function KbPage() {
  const user = await getCurrentUser();
  const db = getDb();
  const list = await db
    .select()
    .from(kbResources)
    .where(eq(kbResources.userId, user.id))
    .orderBy(desc(kbResources.createdAt));

  const tagsOf = (t: string | null) =>
    (t ?? "")
      .split(/[,，]/)
      .map((x) => x.trim())
      .filter(Boolean);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>知识库</h1>
          <div className="sub">
            网站资料 · 书籍 · 其他资源 · 分类展示 · 共 {list.length} 项收藏
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">＋ 收藏资料</div>
        <form action={addKbResource}>
          <div className="input-add" style={{ flexWrap: "wrap" }}>
            <select name="category" defaultValue="site" className="sel-mini">
              <option value="site">网站</option>
              <option value="book">书籍</option>
              <option value="other">其他</option>
            </select>
            <input name="title" placeholder="名称" required style={{ flex: 1, minWidth: 140 }} />
            <input name="url" placeholder="网址（可空）" className="sel-mini" style={{ height: 32, minWidth: 160 }} />
            <input name="description" placeholder="一句话描述" className="sel-mini" style={{ height: 32, flex: 1, minWidth: 140 }} />
            <input name="tags" placeholder="标签" className="sel-mini" style={{ height: 32, width: 90 }} />
            <select name="status" defaultValue="active" className="sel-mini">
              <option value="active">常用</option>
              <option value="todo">计划中</option>
              <option value="doing">在读</option>
              <option value="done">已读完</option>
            </select>
            <button className="btn-primary">收藏</button>
          </div>
        </form>
      </div>

      {CATS.map((cat) => {
        const items = list.filter((r) => r.category === cat.key);
        return (
          <div key={cat.key}>
            <div className="section-title">{cat.label}</div>
            <div className="kb-grid">
              {items.map((r) => (
                <div className="card kb-card" key={r.id}>
                  <div className="kc-top">
                    <div className="kc-ic" style={{ background: cat.iconBg }}>
                      {cat.icon}
                    </div>
                    <b>
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
                          {r.title}
                        </a>
                      ) : (
                        r.title
                      )}
                    </b>
                  </div>
                  {r.description && <p>{r.description}</p>}
                  <div className="kc-foot">
                    {tagsOf(r.tags).map((t) => (
                      <span className="tag taggray" key={t}>
                        {t}
                      </span>
                    ))}
                    <span className={STATUS_CLS[r.status] ?? "tag taggray"}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    <form action={deleteKbResource} style={{ marginLeft: "auto" }}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn-icon-del" title="删除">
                        ✕
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="empty-hint" style={{ gridColumn: "1 / -1" }}>
                  暂无内容
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
