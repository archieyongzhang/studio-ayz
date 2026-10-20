"use server";

// 全部服务端动作: 每个动作都先取当前用户 (archie), 写入时强制带 user.id,
// 查询/删除时按 user.id 过滤 —— 账号隔离在这里兜底。
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  ideas,
  kbResources,
  learnActivities,
  learnItems,
  learnRecords,
  projectMaterials,
  projectUpdates,
  projects,
  retros,
  todos,
} from "@/db/schema";
import { getDb } from "@/lib/db";
import { todayStr } from "@/lib/format";
import { getCurrentUser } from "@/lib/user";

function s(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function n(fd: FormData, key: string): number {
  return Number(fd.get(key) ?? 0);
}
function optInt(fd: FormData, key: string): number | null {
  const v = s(fd, key);
  return v ? Number(v) : null;
}

function refreshAll() {
  revalidatePath("/", "layout");
}

/* ---------------- 待办 ---------------- */
export async function addTodo(fd: FormData) {
  const user = await getCurrentUser();
  const title = s(fd, "title");
  if (!title) return;
  await getDb().insert(todos).values({
    userId: user.id,
    title,
    priority: s(fd, "priority") || "mid",
    dueDate: s(fd, "dueDate") || null,
    projectId: optInt(fd, "projectId"),
  });
  refreshAll();
}

export async function toggleTodo(fd: FormData) {
  const user = await getCurrentUser();
  const id = n(fd, "id");
  const rows = await getDb()
    .select()
    .from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, user.id)));
  const t = rows[0];
  if (!t) return;
  const done = !t.done;
  await getDb()
    .update(todos)
    .set({ done, completedAt: done ? new Date() : null })
    .where(and(eq(todos.id, id), eq(todos.userId, user.id)));
  refreshAll();
}

export async function deleteTodo(fd: FormData) {
  const user = await getCurrentUser();
  await getDb()
    .delete(todos)
    .where(and(eq(todos.id, n(fd, "id")), eq(todos.userId, user.id)));
  refreshAll();
}

/* ---------------- 想法与需求 ---------------- */
export async function addIdea(fd: FormData) {
  const user = await getCurrentUser();
  const title = s(fd, "title");
  if (!title) return;
  await getDb().insert(ideas).values({
    userId: user.id,
    title,
    content: s(fd, "content") || null,
    type: s(fd, "type") || "idea",
    tags: s(fd, "tags") || null,
  });
  refreshAll();
}

export async function deleteIdea(fd: FormData) {
  const user = await getCurrentUser();
  await getDb()
    .delete(ideas)
    .where(and(eq(ideas.id, n(fd, "id")), eq(ideas.userId, user.id)));
  refreshAll();
}

export async function convertIdeaToTodo(fd: FormData) {
  const user = await getCurrentUser();
  const id = n(fd, "id");
  const rows = await getDb()
    .select()
    .from(ideas)
    .where(and(eq(ideas.id, id), eq(ideas.userId, user.id)));
  const idea = rows[0];
  if (!idea) return;
  await getDb().insert(todos).values({
    userId: user.id,
    title: idea.title,
    priority: "mid",
    projectId: optInt(fd, "projectId"),
  });
  await getDb()
    .update(ideas)
    .set({ status: "todo" })
    .where(and(eq(ideas.id, id), eq(ideas.userId, user.id)));
  refreshAll();
}

export async function convertIdeaToProject(fd: FormData) {
  const user = await getCurrentUser();
  const id = n(fd, "id");
  const rows = await getDb()
    .select()
    .from(ideas)
    .where(and(eq(ideas.id, id), eq(ideas.userId, user.id)));
  const idea = rows[0];
  if (!idea) return;
  const inserted = await getDb()
    .insert(projects)
    .values({
      userId: user.id,
      name: s(fd, "name") || idea.title,
      nextStep: idea.content ? "拆解: " + idea.title : null,
    })
    .returning();
  await getDb().insert(projectUpdates).values({
    userId: user.id,
    projectId: inserted[0].id,
    content: `由想法「${idea.title}」立项。${idea.content ?? ""}`.trim(),
  });
  await getDb()
    .update(ideas)
    .set({ status: "project" })
    .where(and(eq(ideas.id, id), eq(ideas.userId, user.id)));
  refreshAll();
}

/* ---------------- 项目 ---------------- */
export async function addProject(fd: FormData) {
  const user = await getCurrentUser();
  const name = s(fd, "name");
  if (!name) return;
  await getDb().insert(projects).values({
    userId: user.id,
    name,
    color: s(fd, "color") || "#4f46e5",
  });
  refreshAll();
}

export async function deleteProject(fd: FormData) {
  const user = await getCurrentUser();
  const id = n(fd, "id");
  await getDb()
    .delete(projectMaterials)
    .where(and(eq(projectMaterials.projectId, id), eq(projectMaterials.userId, user.id)));
  await getDb()
    .delete(projectUpdates)
    .where(and(eq(projectUpdates.projectId, id), eq(projectUpdates.userId, user.id)));
  await getDb()
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)));
  refreshAll();
}

export async function updateProject(fd: FormData) {
  const user = await getCurrentUser();
  const id = n(fd, "id");
  const progress = Math.max(0, Math.min(100, n(fd, "progress")));
  await getDb()
    .update(projects)
    .set({
      progress,
      nextStep: s(fd, "nextStep") || null,
      status: s(fd, "status") || "active",
    })
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)));
  refreshAll();
}

export async function addMaterial(fd: FormData) {
  const user = await getCurrentUser();
  const name = s(fd, "name");
  const projectId = n(fd, "projectId");
  if (!name || !projectId) return;
  await getDb().insert(projectMaterials).values({
    userId: user.id,
    projectId,
    kind: s(fd, "kind") || "link",
    name,
    content: s(fd, "content") || null,
  });
  refreshAll();
}

export async function deleteMaterial(fd: FormData) {
  const user = await getCurrentUser();
  await getDb()
    .delete(projectMaterials)
    .where(and(eq(projectMaterials.id, n(fd, "id")), eq(projectMaterials.userId, user.id)));
  refreshAll();
}

export async function addProjectUpdate(fd: FormData) {
  const user = await getCurrentUser();
  const content = s(fd, "content");
  const projectId = n(fd, "projectId");
  if (!content || !projectId) return;
  await getDb().insert(projectUpdates).values({ userId: user.id, projectId, content });
  refreshAll();
}

export async function deleteProjectUpdate(fd: FormData) {
  const user = await getCurrentUser();
  await getDb()
    .delete(projectUpdates)
    .where(and(eq(projectUpdates.id, n(fd, "id")), eq(projectUpdates.userId, user.id)));
  refreshAll();
}

/* ---------------- 英语学习 ---------------- */
export async function addLearnItem(fd: FormData) {
  const user = await getCurrentUser();
  const title = s(fd, "title");
  if (!title) return;
  const total = optInt(fd, "totalTarget");
  await getDb().insert(learnItems).values({
    userId: user.id,
    title,
    type: s(fd, "type") || "book",
    unit: s(fd, "unit") || null,
    totalTarget: total,
  });
  refreshAll();
}

export async function deleteLearnItem(fd: FormData) {
  const user = await getCurrentUser();
  const id = n(fd, "id");
  await getDb()
    .delete(learnActivities)
    .where(and(eq(learnActivities.itemId, id), eq(learnActivities.userId, user.id)));
  await getDb()
    .delete(learnRecords)
    .where(and(eq(learnRecords.itemId, id), eq(learnRecords.userId, user.id)));
  await getDb()
    .delete(learnItems)
    .where(and(eq(learnItems.id, id), eq(learnItems.userId, user.id)));
  refreshAll();
}

export async function addLearnActivity(fd: FormData) {
  const user = await getCurrentUser();
  const name = s(fd, "name");
  const itemId = n(fd, "itemId");
  if (!name || !itemId) return;
  await getDb().insert(learnActivities).values({
    userId: user.id,
    itemId,
    name,
    description: s(fd, "description") || null,
    frequency: s(fd, "frequency") || "each",
  });
  refreshAll();
}

export async function deleteLearnActivity(fd: FormData) {
  const user = await getCurrentUser();
  await getDb()
    .delete(learnActivities)
    .where(and(eq(learnActivities.id, n(fd, "id")), eq(learnActivities.userId, user.id)));
  refreshAll();
}

export async function recordLearn(fd: FormData) {
  const user = await getCurrentUser();
  const itemId = n(fd, "itemId");
  const note = s(fd, "note");
  if (!itemId || !note) return;
  const activityId = optInt(fd, "activityId");
  const duration = optInt(fd, "durationMin") ?? 0;
  await getDb().insert(learnRecords).values({
    userId: user.id,
    itemId,
    activityId,
    note,
    durationMin: duration,
  });
  // 章节类活动记一次 → 学习项完成量 +1
  if (activityId) {
    const acts = await getDb()
      .select()
      .from(learnActivities)
      .where(and(eq(learnActivities.id, activityId), eq(learnActivities.userId, user.id)));
    if (acts[0]?.frequency === "chapter") {
      const items = await getDb()
        .select()
        .from(learnItems)
        .where(and(eq(learnItems.id, itemId), eq(learnItems.userId, user.id)));
      const item = items[0];
      if (item) {
        const next = item.totalTarget
          ? Math.min(item.doneAmount + 1, item.totalTarget)
          : item.doneAmount + 1;
        await getDb()
          .update(learnItems)
          .set({
            doneAmount: next,
            status: item.totalTarget && next >= item.totalTarget ? "done" : item.status,
          })
          .where(and(eq(learnItems.id, itemId), eq(learnItems.userId, user.id)));
      }
    }
  }
  refreshAll();
}

/* ---------------- 知识库 ---------------- */
export async function addKbResource(fd: FormData) {
  const user = await getCurrentUser();
  const title = s(fd, "title");
  if (!title) return;
  await getDb().insert(kbResources).values({
    userId: user.id,
    category: s(fd, "category") || "site",
    title,
    description: s(fd, "description") || null,
    url: s(fd, "url") || null,
    tags: s(fd, "tags") || null,
    status: s(fd, "status") || "active",
  });
  refreshAll();
}

export async function deleteKbResource(fd: FormData) {
  const user = await getCurrentUser();
  await getDb()
    .delete(kbResources)
    .where(and(eq(kbResources.id, n(fd, "id")), eq(kbResources.userId, user.id)));
  refreshAll();
}

/* ---------------- 沉淀与计划 ---------------- */
export async function addRetro(fd: FormData) {
  const user = await getCurrentUser();
  const content = s(fd, "content");
  if (!content) return;
  await getDb().insert(retros).values({
    userId: user.id,
    kind: s(fd, "kind") || "review",
    content,
    refDate: todayStr(),
  });
  refreshAll();
}

export async function deleteRetro(fd: FormData) {
  const user = await getCurrentUser();
  await getDb()
    .delete(retros)
    .where(and(eq(retros.id, n(fd, "id")), eq(retros.userId, user.id)));
  refreshAll();
}
