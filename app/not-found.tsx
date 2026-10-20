// 404 页: 与根布局一致走动态渲染, 避免构建期预渲染时访问数据库
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="card" style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 40 }}>🧭</div>
      <h1 style={{ marginTop: 12, fontSize: 18 }}>页面不存在</h1>
      <p style={{ color: "var(--text2)", marginTop: 8, fontSize: 13 }}>
        用左侧导航回到对应模块吧
      </p>
    </div>
  );
}
