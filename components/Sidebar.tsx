"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "总览仪表盘", icon: "🏠" },
  { href: "/todos", label: "待办事项", icon: "✅" },
  { href: "/ideas", label: "想法与需求", icon: "💡" },
  { href: "/projects", label: "项目进展", icon: "📁" },
  { href: "/english", label: "英语学习", icon: "🗣️" },
  { href: "/kb", label: "知识库", icon: "📚" },
];

export default function Sidebar({ counts }: { counts: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <div className="sidebar">
      <div className="side-label">工作模块</div>
      {NAV.map((n) => {
        const active = pathname === n.href;
        const badge = counts[n.href];
        return (
          <Link
            key={n.href}
            href={n.href}
            className={"nav-item" + (active ? " active" : "")}
          >
            <span>{n.icon}</span>
            <span>{n.label}</span>
            {badge ? <span className="badge">{badge}</span> : null}
          </Link>
        );
      })}
      <div className="foot">
        个人工作台 · archie
        <br />
        数据实时保存
      </div>
    </div>
  );
}
