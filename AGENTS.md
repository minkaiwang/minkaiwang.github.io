# AGENTS.md

本文件用于指导后续 AI 助手在本项目中协作。默认用中文沟通，直接推进可交付结果，少做泛泛建议。

## 项目理解

- 本项目是王珉锴（Minkai Wang）的个人学术简历网站，当前已迁移为基于 WowPage/AcademicPages 风格的 Jekyll 站点，并通过 GitHub Pages 发布。
- 站点地址为 `https://minkaiwang.github.io`，仓库为 `minkaiwang.github.io`。
- 当前定位是“个人学术主页 + 简历 + 学术成果展示 + 教育游戏/项目展示”，内容涉及教育技术学、游戏化学习、AI 教育应用、元宇宙、电竞教育等方向。
- 当前站点采用 WowPage 的左侧作者档案栏 + 右侧单页锚点内容流结构，主要样式集中在 `assets/css/home.css`。主页背景为低调像素网格风格，欢迎语当前使用“早上好，夜之城！”/“Good morning, Night City!”。

## 关键文件

- `_config.yml`：Jekyll 网站配置、作者侧栏信息、构建输出目录和排除规则。当前 `destination` 为 `docs`，以兼容原 GitHub Pages 发布目录。
- `_pages/about.md`：中文默认首页和主要简历内容，包含最新动态、经历、Publications、项目、荣誉、服务、会议、教学经历等单页锚点分区。
- `_pages/en.md`：英文版本页面，访问路径为 `/en/`，正文和侧栏作者资料使用英文口径。
- `_pages/resume.html`：PDF 简历打印版页面，访问路径为 `/resume/`，用于生成一页 A4 PDF 简历；当前为双栏信息结构，带轻量像素网格背景和少量像素色块。
- `_data/navigation.yml`：顶部导航链接，包含中文默认导航和英文页导航；当前不在导航栏放 CV。
- `assets/css/home.css`：主页自定义样式，基于 WowPage 模板调整；包含首页轻像素背景、欢迎语横幅、卡片与响应式样式。
- `files/Minkai_Wang_CV.pdf`：历史 PDF 文件仍保留在 `files/`，当前不作为导航入口，也不进入 sitemap。
- `files/Minkai_Wang_Resume_CN.pdf`：网页“导出 PDF 简历”按钮指向的当前中文 PDF 简历。
- `images/`：源图片目录。当前包含头像、游戏作品图和站点图标。
- `docs/`：Jekyll 构建输出目录，供 GitHub Pages 发布使用。一般不要手改其中 HTML，应修改源文件后重新构建。
- `archive/quarto-before-wowpage-20260629/`：迁移前 Quarto 版本备份。
- `index.qmd`、`Chinese.qmd`、`publications.qmd`、`codes.qmd`、`Teaching.md`、`CV.md`：旧 Quarto 版本源文件/材料，后续改履历时可作为补充参照，但 Jekyll 构建时已排除。

## 工作原则

- 优先理解现有页面结构、语气和视觉风格，再修改内容。
- 修改简历、成果、项目经历、教学经历、荣誉奖项时，优先同步 `_pages/about.md` 和 `_pages/en.md`；如影响 PDF 简历，也同步 `_pages/resume.html` 并重新生成 `files/Minkai_Wang_Resume_CN.pdf`。旧 Quarto 文件仅作为内容来源，除非用户明确要求维护旧版。
- 网页版简历当前不展示“软件著作权”模块；如需恢复，先与用户确认展示口径。
- Word 简历和 Word 临时锁文件不上传 Git；`.gitignore` 已忽略 `*.docx` 和 `~$*.docx`。
- 论文题名、作者顺序、年份、卷期页码、DOI/URL、影响因子、分区、CSSCI/SCI/SSCI 统计等属于高风险信息，不能凭印象补写。无法从项目内材料或权威网页确认时，标注待核实，不要写成确定事实。
- 公开履历中的时间表述要特别谨慎。涉及“至今”“已发表”“录用”“在读”“入学”等状态时，结合当前日期和用户提供材料核对，避免把未来安排写成已发生事实。
- 对外展示文本应稳妥、克制、适合公开访问。避免过强承诺、夸大性表述、模板痕迹和内部工作痕迹。
- 英文主页不是逐句直译中文简历，要符合学术个人主页表达。

## 编码与格式

- 本项目包含大量中文内容，读写文本文件时使用 UTF-8。PowerShell 中读取中文文件建议显式使用 `-Encoding UTF8`。
- 保持 Jekyll/Liquid/Markdown 原有结构：YAML front matter、HTML 卡片结构、锚点标题、图片路径和脚本引用不要随意改动。
- 不要把 `docs/` 中生成的 HTML 当作源文件维护；源文件修改后用 Jekyll 重新生成。
- 保持 WowPage 的学术主页结构，样式改动优先集中在 `assets/css/home.css`，避免在单个页面写零散内联样式。
- 图片资源优先放在 `images/`，PDF 等下载文件优先放在 `files/`。

## 构建与检查

- 本地预览：

```bash
bundle exec jekyll serve
```

- 生成发布文件：

```bash
bundle exec jekyll build
```

- 修改 `_pages/about.md`、`_config.yml`、`_data/navigation.yml`、`assets/css/home.css`、图片或 PDF 后，原则上运行 `bundle exec jekyll build`，确认 `docs/` 同步更新。
- 渲染后重点检查：
  - 首页是否能打开；
  - 顶部锚点导航是否能跳转；
  - 左侧头像、联系入口和语言切换是否正常；
  - PDF 简历下载按钮是否能打开 `files/Minkai_Wang_Resume_CN.pdf`；
  - Publications 是否只展示 Full Publications List，不恢复 Core Publications 切换；
  - 项目图片是否显示；
  - 桌面和移动端是否没有明显拥挤、遮挡或文本溢出。

## Git 与交付

- 修改前先看工作区状态，避免覆盖用户未提交改动。
- 不要删除历史文件或批量重命名，除非用户明确要求。
- 涉及站点内容或样式的实质修改，交付时说明：
  - 改了哪些源文件；
  - 是否重新生成了 `docs/`；
  - 是否完成本地预览/渲染检查；
  - 还有哪些信息需要用户或权威来源确认。

## 已知注意点

- 旧版 Quarto 源文件仍保留在仓库根目录，但已通过 `_config.yml` 排除，不参与 Jekyll 构建。
- `readme.md` 是 UTF-8 中文文件，如果读取方式不对会出现乱码，不代表文件本身损坏。
- `王珉锴简历.docx` 被 `.gitignore` 忽略，若需要用作权威来源或同步 Word 版本，先确认它是否为最新材料，并按用户要求保留备份。
- `docs/` 是发布目录；本项目配置了 `destination: docs`，构建时会更新该目录内容。
