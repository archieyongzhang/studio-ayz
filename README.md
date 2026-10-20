# 我的工作台

个人工作台（Personal Workbench）：待办事项、想法与需求收集、项目进展、英语学习、知识库、总览仪表盘。
同一套界面与功能，支持两种运行形态：

| 形态 | 数据存储 | 用途 |
| --- | --- | --- |
| 线上版 | 平台托管 PostgreSQL | 多设备通过网址访问，数据云端同步 |
| Mac 本地版 | Node 内置 SQLite（单文件 `workbench.db`） | 数据全在本机，双击桌面图标即用，可离线 |

账号：内置免密账号 `archie`，所有业务表均带 `user_id`，服务端每个读写动作都按当前用户过滤，实现账号隔离。

---

## 功能一览

- **🏠 总览仪表盘**：待办完成度、项目进度汇总、沉淀（做过的事）、计划（没做的事）、最近学习
- **✅ 待办事项**：优先级、截止日期（逾期标红）、关联项目、完成/撤销/删除
- **💡 想法与需求**：记录类型（想法/需求）、标签、一键转待办 / 转项目
- **📁 项目进展**：项目卡片（进度%、下一步）、进展时间线、相关资料（链接/文档/图片/笔记）、关联待办
- **🗣️ 英语学习**：学习项（书籍/网站/项目/课程）→ 细化学习活动（每日/每周/每次/章节推进）→ 每次记录（内容+用时）；章节活动记一次自动推进进度；连续打卡、本月记录、累计时长统计
- **📚 知识库**：网站/书籍/其他三类收藏，标签与状态（常用/计划中/在读/已读完）
- **🔍 全局搜索**：跨六个模块搜索

---

## 技术栈

- Next.js 16（App Router、Turbopack、Server Actions）+ React 19 + TypeScript
- 样式：Tailwind v4 + 自带设计系统 CSS（`app/globals.css`）
- ORM：Drizzle ORM
  - 线上版：`drizzle-orm/node-postgres`（`lib/db.ts`、`db/schema.ts`）
  - 本地版：`drizzle-orm/sqlite-proxy` + Node 内置 `node:sqlite`（`lib/db.sqlite.ts`、`db/schema.sqlite.ts`）
- 迁移：drizzle-kit 生成版本化 SQL（`drizzle/` 线上版、`drizzle-sqlite/` 本地版）

---

## 目录结构

```
app/                 页面与服务端动作
  page.tsx           总览仪表盘
  todos/             待办事项
  ideas/             想法与需求
  projects/          项目进展
  english/           英语学习
  kb/                知识库
  search/            全局搜索
  actions.ts         全部服务端动作（增删改查、想法转化等）
  layout.tsx         顶部功能栏 + 左侧模块导航
  api/health/        健康检查
components/          客户端组件（侧边栏导航）
db/
  schema.ts          线上版表结构（Postgres）
  schema.sqlite.ts   本地版表结构（SQLite，与线上版一一对应）
lib/
  db.ts              线上版数据层（Postgres 连接单例）
  db.sqlite.ts       本地版数据层（node:sqlite + drizzle proxy）
  user.ts            当前用户（archie）与账号隔离
  format.ts          日期/时间展示
drizzle/             线上版迁移
drizzle-sqlite/      本地版迁移
scripts/
  migrate-local.mjs  本地版启动前迁移执行器
mac-package/         Mac 本地安装包的构建材料
  build-mac-package.sh   一条命令产出安装包 zip
  make-zip.py / copy-tree.py / flatten-nm.py   打包工具
  lib/               启动器 / 开机自启脚本
  安装我的工作台.command / 卸载我的工作台.command
  我的工作台.app/    桌面图标（app bundle 模板）
  assets/icon.png    图标
  download-page/     下载页源码
  dist/              构建产物（git 忽略）
demo/index.html      早期设计稿（可点击的静态 demo）
public/              静态资源
```

---

## 本地开发

```bash
pnpm install
```

### 方式一：接 PostgreSQL（与线上一致）

```bash
export DATABASE_URL="postgres://用户:密码@主机:5432/库名"
pnpm run db:migrate   # 应用 drizzle/ 下的迁移
pnpm dev              # http://localhost:3000
```

### 方式二：SQLite 本地模式（无需数据库服务）

```bash
export BUILD_TARGET=local      # 通过 next.config.ts 的别名切换到 SQLite 数据层
export WORKBENCH_DB="$PWD/.data/workbench.db"
export MIGRATIONS_DIR="$PWD/drizzle-sqlite"
node scripts/migrate-local.mjs # 建表 / 升级结构
pnpm dev
```

> `BUILD_TARGET=local` 时：
> - `next.config.ts` 把 `@/db/schema` 指向 `db/schema.sqlite.ts`、`@/lib/db` 指向 `lib/db.sqlite.ts`
> - 业务代码（页面 / actions）一行都不用改，界面与功能完全一致

### 数据表结构变更

两条链路各自生成迁移，缺一不可：

```bash
pnpm exec drizzle-kit generate                                    # 线上版 → drizzle/
pnpm exec drizzle-kit generate --config drizzle.local.config.ts   # 本地版 → drizzle-sqlite/
```

> 禁止使用 `drizzle-kit push`（不留迁移文件）。线上库由部署时执行 `drizzle-kit migrate`；本地版由 `scripts/migrate-local.mjs` 在启动前执行。

---

## 构建 Mac 本地安装包

```bash
bash mac-package/build-mac-package.sh
```

产出 `mac-package/dist/workbench-mac.zip`，包内含：

- `安装我的工作台.command`：选择数据文件夹 → 桌面生成「我的工作台」图标 → 设置开机自启 → 打开工作台
- `我的工作台.app`：桌面图标（双击 = 确保服务在跑 + 打开浏览器）
- `runtime/node`：内置 Node（Apple Silicon），Mac 上无需另装
- `app/`：Next.js standalone 产物 + SQLite 迁移
- `卸载我的工作台.command`、`使用说明.txt`

升级包逻辑：覆盖安装 → 启动时自动执行版本化迁移 → **数据保留**（数据库是用户自选文件夹里的 `workbench.db`，升级只补结构差异）。

> 构建机是 Linux：脚本会下载 darwin-arm64 的 Node、把 pnpm 虚拟存储摊平为普通 `node_modules`、清理构建机平台相关的原生包，保证解压后可直接运行。

---

## 部署（Docker）

```bash
docker build -t workbench .
docker run -p 3000:3000 -e DATABASE_URL="postgres://..." workbench
```

`compose.yaml` 提供了带 Postgres 的本地编排示例。生产环境需在启动前对目标库执行 `drizzle-kit migrate`。

---

## 说明与限制

- macOS 专属步骤（文件夹选择弹窗、桌面图标、LaunchAgent 开机自启）在构建机上无法真机验证，需在 Mac 上实际运行确认；
- 本地版与线上版数据互相独立；
- 本地版服务仅监听 `127.0.0.1`，默认端口 `4321`；
- 数据备份 = 拷走 `workbench.db` 一个文件。

---

## 设计稿

`demo/index.html` 是立项时的可点击静态设计稿（示例数据），用浏览器直接打开即可查看。
