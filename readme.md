---
title: "README"
editor:
  markdown:
    wrap: 72
---

## 王珉锴个人主页

这是 **王珉锴 (Minkai Wang)** 的个人学术主页，当前基于
[WowPage](https://github.com/WD7ang/WowPage) / AcademicPages 风格的
Jekyll 模板改造，用于展示个人简介、学术经历、论文成果、教育游戏项目、
荣誉服务和教学经历。

访问地址：<https://minkaiwang.github.io>

### 网站内容

- **Homepage**：核心学术简历，包含 News、Experience、Publications、
  Projects、Awards、Services、Talks、Teaching 等分区。
- **中文默认页**：`_pages/about.md`，访问路径为 `/`。
- **英文版本页**：`_pages/en.md`，访问路径为 `/en/`。
- **Publications**：当前只展示 Full Publications List，不再使用 Core
  Publications 切换。
- **PDF 简历**：`_pages/resume.html` 是一页 A4 打印版页面；当前下载文件为
  `files/Minkai_Wang_Resume_CN.pdf`。
- **Images**：头像和项目图片放在 `images/`。
- **发布目录**：Jekyll 构建结果输出到 `docs/`，以兼容 GitHub Pages
  原发布设置。

### 技术栈

- 站点生成：Jekyll
- 页面模板：WowPage / AcademicPages 风格
- 主页内容：`_pages/about.md`
- 站点配置：`_config.yml`
- 导航配置：`_data/navigation.yml`
- 自定义样式：`assets/css/home.css`，包含轻量像素网格背景和首页欢迎语样式。
- 部署：GitHub Pages（输出目录 `docs/`）

### 本地预览

```bash
bundle exec jekyll serve
```

### 生成发布文件

```bash
bundle exec jekyll build
```

### PDF 简历

PDF 简历由 `/resume/` 打印版页面生成，下载入口在中英文首页顶部。当前 PDF
为一页 A4 简历，采用双栏信息结构、低饱和像素网格背景和少量像素色块。当前
PDF 文件为 `files/Minkai_Wang_Resume_CN.pdf`，构建后会同步到
`docs/files/Minkai_Wang_Resume_CN.pdf`。

Word 简历文件不会上传；`.gitignore` 已忽略 `*.docx` 和 Word 临时锁文件。

### 迁移说明

旧版 Quarto 源文件仍保留在仓库中，并已备份到
`archive/quarto-before-wowpage-20260629/`。当前 Jekyll 构建会排除旧版
Quarto 文件，不再使用 `_quarto.yml`、`styles.scss`、`*.qmd` 生成主页。

### 致谢

本站点基于 WowPage 模板改造。感谢 WD7ang/WowPage、AcademicPages 及原始
开源模板作者的分享。
