// 展示用的时间/日期格式化
export function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDue(due: string | null): { text: string; cls: string } {
  if (!due) return { text: "", cls: "due" };
  const today = todayStr();
  if (due === today) return { text: "今天", cls: "due" };
  const diff = Math.round(
    (new Date(due).getTime() - new Date(today).getTime()) / 86400000,
  );
  if (diff < 0) return { text: `已逾期 ${-diff} 天`, cls: "due overdue" };
  if (diff === 1) return { text: "明天", cls: "due" };
  const wd = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const dt = new Date(`${due}T00:00:00`);
  if (diff <= 6) return { text: wd[dt.getDay()], cls: "due" };
  const p = (n: number) => String(n).padStart(2, "0");
  return { text: `${p(dt.getMonth() + 1)}-${p(dt.getDate())}`, cls: "due" };
}

export function formatStamp(ts: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const today = todayStr();
  const d = new Date(ts);
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`;
  if (day === today) return `今天 ${hm}`;
  const yest = new Date(Date.now() - 86400000);
  const yd = `${yest.getFullYear()}-${p(yest.getMonth() + 1)}-${p(yest.getDate())}`;
  if (day === yd) return `昨天 ${hm}`;
  return `${day.slice(5)} ${hm}`;
}

export function formatDay(ts: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const d = new Date(ts);
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const PRIORITY_LABEL: Record<string, string> = {
  high: "高",
  mid: "中",
  low: "低",
};
