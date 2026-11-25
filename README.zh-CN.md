# Blackbox Web Reverse

[English](README.md) · [Agent Skill](SKILL.md) · [安全边界](SECURITY.md)

一个通用的、证据驱动的 Web 黑盒逆向工作流，面向**自有或已获书面授权的站点**。仓库本身是一份可移植的 Agent Skill，并提供资产盘点、sourcemap 还原、HAR 脱敏、bundle 静态分析等无依赖 Node.js 小工具。

目标不是“抄站”，而是把黑盒系统整理成可维护的规格：

- 前端路由、懒加载 chunk 与状态边界；
- API 契约、请求/响应结构、错误信封与实时通道；
- 身份认证与权限模型；
- 数据实体、ID 编码与业务规则；
- 可复现的重建蓝图与证据包。

> **仅限授权范围。** 不得用于绕过登录、付费、配额、验证码或访问控制；不得访问约定范围之外的数据。详见 [SECURITY.md](SECURITY.md)。

## 为什么需要它

黑盒项目经常死在重复的错误上：一上来就爆破、把 `200` 当成功、漏掉按路由拆分的 chunk、把错误文案当业务数据、结论没有证据。

这个 Skill 把成本最低的路径排在最前面：

1. 官方 SDK、安装包、OpenAPI 文档或 sourcemap；
2. 在授权会话中做运行时观察；
3. 对已发布 JavaScript 做静态分析；
4. 最小化、限速的请求重放；
5. 只有更省力的证据走不通时，才手工硬逆。

## 安装为 Agent Skill

仓库根目录就是 skill 目录：

```bash
git clone https://github.com/MYTPONS/blackbox-web-reverse.git
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R blackbox-web-reverse "${CODEX_HOME:-$HOME/.codex}/skills/"
```

DSH 环境：

```bash
cp -R blackbox-web-reverse ~/.dsh/skills/
```

安装后重新开始一个 Agent 会话，让系统重新发现 skill 描述。

## 快速开始

```bash
# 1. 建目标卡，先记录授权边界。
cp templates/target-card.md ./TARGET_CARD.md

# 2. 盘点同源 HTML/JS/CSS 资产。
node scripts/asset_crawl.mjs https://app.example.test ./out \
  --max-pages 20 --max-depth 2 --delay 1000

# 3. 从 bundle 中抽取路由、API 路径、host 与协议线索。
node scripts/extract_endpoints.mjs ./out/js > ./out/ENDPOINTS.md

# 4. 有 sourcemap 时恢复源码骨架。
node scripts/sourcemap_restore.mjs \
  https://app.example.test/assets/app.js.map ./src-restored

# 5. 抓取授权会话并脱敏。
node scripts/cdp_capture.mjs https://app.example.test ./out/session.json
node scripts/redact_har.mjs ./out/session.json ./out/session.redacted.json

# 6. 生成接口清单，并把易变值替换成稳定占位符。
node scripts/summarize_har.mjs ./out/session.redacted.json > ./out/CONTRACTS.md

# 7. 跑本地门禁。
pnpm verify
```

`app.example.test` 是保留占位域名。不要把真实目标域名、Cookie、Token、个人数据或生产响应提交到仓库。

## 目录

| 路径 | 作用 |
|---|---|
| `SKILL.md` | Agent 入口与操作规约 |
| `references/` | 观察、契约、安全、重建等专题手册 |
| `scripts/` | 无第三方运行时依赖的 Node.js 小工具 |
| `templates/` | 目标卡、接口契约、证据包、适配器骨架 |
| `fixtures/` | 测试用合成数据，不含生产抓包 |
| `tests/` | 单元测试与 CLI 冒烟测试 |
| `docs/` | 维护与发布说明 |

## 设计原则

- **证据优先**：关键结论必须能回到请求、响应、文件或可复现命令。
- **最小访问**：用最小账号、最小数据集、最低请求量完成目标。
- **边界即终点**：遇到访问控制，记录它，不绕过它。
- **公开证据优先**：优先使用已发布产物与文档化接口，不做侵入式探测。
- **目标零残留**：示例一律用占位符，抓包先脱敏再入库。
- **保护层与业务层分离**：签名、加密、传输适配集中在一个层。
- **复刻行为，不复刻秘密**：生产凭据与个人数据不在交付范围内。

## 仓库门禁

```bash
pnpm verify
git diff --check
```

`pnpm verify` 会运行语法检查、全量测试、包冒烟检查和隐私扫描。

## 许可证

MIT，详见 [LICENSE](LICENSE)。
