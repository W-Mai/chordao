# Chordao

<p align="center">
  <strong>简体中文</strong> · <a href="./README.en.md">English</a>
</p>

<p align="center">
  <img src="public/logo.svg" alt="Chordao logo" width="120"/>
</p>

<p align="center">
  <strong>基于 E/Em/A/Am 指型推导的吉他和弦可视化工具</strong>
</p>

<p align="center">
  <a href="https://w-mai.github.io/chordao/">
    <img src="https://img.shields.io/badge/demo-live-blue?style=flat-square" alt="Live Demo" />
  </a>
  <a href="https://github.com/W-Mai/chordao/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/W-Mai/chordao?style=flat-square" alt="License" />
  </a>
  <a href="https://github.com/W-Mai/chordao/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/W-Mai/chordao/deploy.yml?style=flat-square" alt="CI" />
  </a>
</p>

选一个调，看这个调里全部 6 个顺阶和弦（I / IIm / IIIm / IV / V / VIm）在指板上的分布 —— 最优移动路径自动高亮。

## 📖 目录

- [原理](#-原理)
- [功能](#-功能)
- [视图](#-视图)
- [练习游戏](#-练习游戏)
- [开发](#-开发)
- [技术栈](#-技术栈)
- [许可](#-许可)

## 🎸 原理

任何吉他和弦都可以从 **4 种开放指型**（E、Em、A、Am）出发，沿琴颈上推 + 横按得到：

```
开放 A 和弦           →  第 3 品横按     →  C 和弦（A 指型 @ 3 品）
x 0 2 2 2 0              x 3 5 5 5 3
```

**指型表（Shape Grid）** 把这件事可视化出来 —— 两行：上行是 A/Am 指型，下行是 E/Em 指型，列号代表横按的品位：

<p align="center">
  <img src="public/readme-shape-grid.svg" alt="指型表 — Eb 调，Pop Canon 进行" width="100%"/>
</p>

实心点 = 推荐的最优路径；空心点 = 备选位置；动画小点沿 Pop Canon 进行（1→5→6→4）循环移动。

Chordao 会按五度圈顺序，搜索 6 个顺阶和弦里**移动距离最小**的指型组合。如果需要更全的把位覆盖，可以切换到完整的 **CAGED**（C/A/G/E/D）五指型体系。

## ✨ 功能

### 核心可视化
- **指型推导** —— 所有和弦都由开放指型 + 横按上推得到。支持两种指型系统切换：
  - **E/Em/A/Am**（默认，2 种指型，结构简单直观）
  - **CAGED**（C/A/G/E/D，5 种指型，把位覆盖更全）
- **三和弦 ↔ 七和弦** —— E/Em/A/Am ↔ E7/Em7/A7/Am7（CAGED 同理）
- **最优路径** —— 自动高亮 6 个和弦里移动距离最小的组合
- **多组把位切换** —— 用数字按钮切换不同的位置组合，或点 `全部` 把所有路径叠加显示
- **低音方向偏好** —— ↗ 上行 / ↘ 下行 / — 无，让搜索倾向往指板上方或下方走

### 乐理叠加层
- **音程标签** —— 当前激活的和弦上，每个圆点显示该位置的音程（R/3/5/b3/b7）
- **音程地图模式** —— 切换 ♫ 按钮，把当前调所有音程（R/b3/3/4/5/b7/7）铺满整块指板
- **音程几何箭头** —— 点击指板上的根音，看到相邻弦音程的箭头 + 半音偏移量
- **和弦图标签** —— 显示 `I · E @ 8` 格式（级数 · 指型 · 横按品位）

### 练习游戏（详见 [练习游戏](#-练习游戏)）
- 6 种模式 × 3 种难度，每题倒计时、连击统计、本地最佳分数

### 歌片（详见 [歌片](#-歌片)）
- 歌词 + 小节对齐的和弦图；重音字用度数色高亮；内置歌片以 `.md` 文件形式放在 `songs/` 目录
- 可视化编辑器（点字设重音、点色块选度数）、localStorage 归档、链接 + 图片两种分享
- 歌片播放：▶/⏸/⏹，歌片级 BPM、拍号（3/4、6/8 等）、段落级扫弦覆盖；点 chip 可定位播放游标，从小节开头对齐播放

### 和弦进行与音频
- **内置进行** —— Pop Canon、布鲁斯、华语抒情、爵士 ii-V-I 等，带动画路径展示
- **自定义进行** —— 直接输入级数序列（如 `1 4 5 1`），与 URL 同步
- **和弦发音** —— 点击任意和弦即可发声（Web Audio API，泛音列合成，支持多种节奏型）

### 交互与导出
- **联动高亮** —— 单击发声，双击锁定；指型表 / 指板 / 和弦图三套视图同步响应
- **键盘快捷键** —— ← → 切调，1–6 过滤级数，0 / Esc 重置
- **可分享链接** —— 当前调、进行、面板设置（多组切换、低音方向、音程地图状态、全屏面板）全部编码进 URL hash；默认值不写入，URL 保持简洁
- **面板放大** —— 点 ⛶ 将 Shape Grid 或指板放大到全屏，面板顶部所有按钮（组合切换、音程筛选等）在全屏状态下仍可用
- **导出 PNG** —— 独立排版，含指向当前状态的二维码、进行信息、图例（自动适配指型系统）
- **三种主题** —— Catppuccin Mocha（暗）、Latte（亮）、Cyber（霓虹），可跟随系统
- **五度圈 / 半音** —— 切换调的排列顺序
- **横按线显示** —— 和弦图上横按线可开关
- **PWA** —— 可安装到设备，离线可用
- **i18n** —— 中文 / English，自动跟随浏览器语言
- **交互式指南** —— 首次打开时有分步可视化教程

## 🎯 视图

### 指型表（Shape Grid）

紧凑型指板，显示每个和弦的位置。实心 = 推荐，空心 = 备选。选中进行时，动画小点沿路径移动；在 `全部` 模式下每个组合的路径用不同颜色画出来。

- **E/Em/A/Am** 系统：2 行 —— 上 = A/Am，下 = E/Em
- **CAGED** 系统：3 行 —— 自上而下 A/C、E/G、D 指型
- 列号 = 横按品位

### 指板总览（Fretboard Overview）

17 品全指板，绘制所有 voicing，并支持多种叠加层：

- ⬤ **圆形** = E/Em 指型（根音在 6 弦；CAGED 下 E/G 指型）
- ◼ **方形** = A/Am 指型（根音在 5 弦；CAGED 下 A/C 指型）
- ◆ **菱形** = D 指型（根音在 4 弦；仅 CAGED）
- 同一品位相邻的圆点悬停时会合并为横按条
- 点击任意和弦发声，双击锁定跨视图高亮
- **音程标签** —— 激活和弦时每个圆点显示所在音程（R/3/5/b3/b7）
- **音程地图模式** —— 点 ♫ 切换，全指板铺显当前调的所有音程；点任一音程筹码可过滤（R/b3/3/4/5/b7/7）
- **音程几何箭头** —— 点击指板上任一根音，看到相邻弦上各音程的箭头 + 半音偏移

### 和弦图（Chord Diagrams）

标准和弦方框记谱：

- 竖线 = 琴弦（E A D G B e）
- 横线 = 品丝
- 圆点 = 按弦位置，横条 = 横按
- × = 闷弦，○ = 空弦
- 标题栏：`I · E @ 8` —— 级数 · 指型 · 横按品位

## 🎼 歌片

点 header 里的 🎼 按钮打开歌片面板。每行横跨指板的 4 个小节，每个小节带度数色的标题条，每小节可标记**一个重音字**（表示和弦真正进入的那个字）。

### 内置歌片

歌片以 `.md` 文件形式放在项目根目录的 `songs/` 下。加一首歌就直接往目录里扔一个文件（比如 `songs/mysong.md`），重新跑 dev 或 build 就会自动出现在下拉菜单里。例子：

```md
---
title: 我的歌
key: C
strum: pop
bpm: 144
time: 4/4
---

--- 主歌 | strum:pop ---
我[那]些残梦 | 灵异[九]霄 | 徒忙[漫]奋斗 | 满目[沧]愁 @ 1 3m 6m 4

--- 副歌 | strum:whole ---
黑[色]的不是夜晚 | 是[漫]长的孤单 | 看[脚]下一片黑暗 @ 1 3m 6m
```

- YAML frontmatter：`title` / `key` / `strum` / `bpm` / `time` （`time`、`bpm` 可省；拍号默认 4/4）
- `--- 段落名 | strum:pop ---` 开始一段；`strum:xxx` 可选，用来覆盖该段的扫弦
- `|` 分隔小节，`@ 1 3m 6m 4` 依次指定每小节的度数；一个小节内多个和弦用 `/` 分开（如 `@ 1/4` 表示该小节前半 1、后半 4）
- `[X]` 把 X 这个字标为该小节重音（按度数色高亮）

### 播放

- **▶/⏸/⏹** —— 播放遵循段落扫弦 + 歌片 BPM + 拍号；当前和弦在歌谱上精确高亮，右侧指型表 / 指板 / 和弦图联动跟随
- **点击任一 chip** —— 把播放游标钉在该位置；**▶** 从该 chord 所在**小节的开头**对齐播放；**⏸** 保留游标、下次 ▶ 从暂停处接续；**⏹** 清空游标，重置到开头
- **段落进行联动** —— 悬停任一段落（或播放指向它），右侧 Shape Grid 的连线和同步小球会切换到该段的和弦进行

### 可视化编辑器

点 panel 上的「新建」/「编辑」打开编辑器，完全所见即所得：点度数色块换度数、点字符 toggle 重音、双击小节改歌词。段落 / 行可任意增删改。顶栏有「查看源码」按钮，给喜欢直接写文本的用户留了退路。

### 自定义歌片与分享

- 自己写的歌片存在 localStorage 里（id 带 `user:` 前缀）
- 歌片面板右上的 ↗ 按钮：
  - **🔗 复制链接** —— 当前歌片压缩（deflate-raw + base64url）进 URL hash，对方打开自动导入到他本地 localStorage
  - **📷 导出图片** —— 带 key badge / 标题 / meta / 歌谱 / 页脚的完整 PNG，风格与主页面导出一致

## 🎮 练习游戏

6 种模式训练指板熟练度：

| 模式 | 描述 |
|------|------|
| 🎯 **定位（Locate）** | 给你一个级数，在指板上找到它 |
| 🔮 **辨别（Identify）** | 看高亮和弦，猜它是几级 |
| ⚡ **速通（Sprint）** | 尽快找出 6 个顺阶和弦 |
| 🔗 **接龙（Chain）** | 按五度圈顺序依次找到 |
| 👁 **记忆（Memory）** | 和弦短暂闪现，凭记忆找出位置 |
| 🎵 **音程（Interval）** | 给一个根音位置，找到指定音程（b3/3/5/b7/…） |

每种模式 3 种难度：

- ⭐ 简单 —— 有颜色提示，级数/音程较少
- ⭐⭐ 中等 —— 无颜色，只考 I/IV/V（或常用音程）
- ⭐⭐⭐ 困难 —— 无颜色，全部 6 级，倒计时更短

每题独立倒计时、连击统计、本地最佳分数（按 模式 × 难度 分别记录）。

## 🛠 开发

```bash
bun install
bun run dev
```

### 脚本

| 命令                 | 描述                                    |
| -------------------- | --------------------------------------- |
| `bun run dev`        | 启动开发服务器                          |
| `bun run build`      | 类型检查 + 构建                         |
| `bun run lint`       | ESLint（含 i18n 字面量检测）            |
| `bun run format`     | Prettier 格式化                         |
| `bun run check-i18n` | 检查翻译 key 是否一致                   |
| `bun test`           | 单元测试（和弦数据层）                  |

### 项目结构

```
songs/          — 内置歌片 (.md 文件 + YAML frontmatter)；往这里扔文件就能加歌
src/
  components/
    game/       — 各模式的 game 状态 hook + 纯逻辑
    *.tsx       — UI 组件（ShapeGrid、Fretboard、ChordDiagram、Game、Guide、ExportView、
                  SongSheetPanel、SongEditor、VisualSongEditor 等）
  data/
    songs/      — import.meta.glob 扫 /songs/*.md
    songSheet.ts         — SongSheet/Section/Line/Bar 类型 + parseBarSource
    songSheetText.ts     — UG 风格文本 parser + serializer (frontmatter + `|`/`@` body)
    songStorage.ts       — localStorage 归档 (listUserSongs/saveUserSong/deleteUserSong)
    songShare.ts         — lz-string URL payload (encodeSheetForUrl/decodeSheetFromUrl)
    chordData.ts         — 和弦数据层（指型、推导、最优组合搜索、音程表）
  hooks/        — 共享 hook（useHashState 处理 URL hash 同步）
  utils/        — 音频合成、二维码生成
  i18n/         — 翻译文件（en / zh）
tests/          — 数据/算法层的单元测试
```

## 🏗 技术栈

React + TypeScript + Vite + Tailwind CSS v4 + i18next + Web Audio API + vite-plugin-pwa + Bun

## 📄 许可

MIT
