# dsh-qianfan-token-plan

在 DSH Web GUI 输入框下方的统计行里显示**百度千帆 Token Plan 套餐用量**：已用积分百分比、剩余额度、今日消耗、到期时间；点开可看额度进度条、24h / 7d / 30d 趋势、按模型明细、控制台外链，以及手动刷新与 Cookie 维护。

只在使用 `baidu-qianfan-token-plan` 路由的会话里出现，其他模型 provider 下完全不轮询、不显示。

## 功能

- **胶囊**：`12.3% · 剩余 14.5 万 · 今日 1.2 万 · max · 2026-12-01`
- **面板**：
  - 额度进度条 + 套餐类型 / 到期日 / 剩余天数
  - 今日 / 近 24h 积分与 Token 消耗、7 天日均与耗尽预测
  - Token 拆分（输入 / 缓存 / 输出）与缓存占比
  - 三档趋势图（24h / 7d / 30d），点按式 tooltip（触屏可读）
  - 按模型用量占比、可展开分页的最近调用明细
  - 「打开控制台」外链、手动刷新、登录过期时粘贴 Cookie
- **缓存**：Host 侧 60 秒聚合缓存（可 `force=1` 绕过），面板轮询有节流；页面不可见时降低频率
- **主题**：跟随浅色 / 深色，面板限制在视口内（最大高度 520px 内滚动），移动端 390px 可用

## 安装

要求 DSH ≥ `0.2.1-rc.5`（在 `0.2.1-rc.5` 上实测）。

```bash
# 1) clone 后按本地包安装（已验证的路径）
git clone https://github.com/qnnp-me/dsh-qianfan-token-plan.git
dsh plugin --profile web add file:$PWD/dsh-qianfan-token-plan

# 2) 或直接指定 git 地址（pnpm 会拉取仓库；若提示需要批准构建脚本，
#    按提示把打印出的包名加进 profile 的 allowBuilds 再重跑）
dsh plugin --profile web add github:qnnp-me/dsh-qianfan-token-plan

# 重启一次 dsh web（bundle 层只在启动时组合）
supervisorctl -c /path/to/supervisord.conf restart dsh-web
```

## 配置 Cookie

数据来自千帆控制台的私有接口，需要**控制台登录态 Cookie**（`BDUSS` 等）。两种来源，按顺序取：

1. **DSH 凭据库**：key `BAIDU_QIANFAN_CONSOLE_COOKIE`
   - 推荐在面板里粘贴保存（POST 只回状态，不回显值）
   - 或提前写入凭据库 / 同名环境变量
2. **只读回退**：`~/.config/openchamber-qianfan-token-plan/config.json` 的 `cookie` 字段
   （如果你已经装了 OpenChamber 的千帆扩展，可以零迁移复用）

Cookie 过期时胶囊会显示「登录已过期」，点开面板粘贴新的即可。

## 数据来源与隐私

- 控制台接口：`https://console.bce.baidu.com/api/qianfan/charge/tokenPlanPersonal`
  （`/resource`、`/usage/trend`、`/usage/detail`）
- Host 侧只返回**字段白名单**内的数据：控制台 `/resource` 会返回套餐的 `apiKey`，插件直接丢弃，不会进入 API 响应
- Cookie 只存在 Host 进程内存与 DSH 凭据库；浏览器侧只拿到「已配置 / 来源 / 不可回写」状态，绝不回显
- 推理请求链路完全不受影响：插件只在 Client 轮询时访问控制台

## 验证

```bash
# 未登录访问插件路由应 401（DSH 浏览器鉴权生效）
curl -s -o /dev/null -w '%{http_code}\n' https://your-dsh.example.com/api/qianfan-token-plan

# 已登录（带 cookie）时返回聚合状态
curl -s -b 'dsh-auth-cookie=...' https://your-dsh.example.com/api/qianfan-token-plan | head -c 400
```

面板里检查：`state=ok` 时胶囊出现；把 provider 切到非千帆路由后胶囊消失、且不再有请求；登录过期时显示粘贴框。

## 排障

| 现象 | 处理 |
|---|---|
| 胶囊不出现 | 当前会话 model 是否走 `baidu-qianfan-token-plan` 路由（这是硬条件） |
| 显示「登录已过期」 | 重新登录千帆控制台，复制 Cookie 粘贴到面板 |
| 显示「未配置」 | 既没有凭据库 Cookie，也没有 OpenChamber 配置文件 |
| 数字不更新 | 60 秒缓存；点面板的刷新按钮（`force=1`）立即拉取 |

## 与 OpenChamber 的关系

这是 DSH（DeepSeek Harness）的插件，不是 OpenChamber 扩展；只是可以**只读复用** OpenChamber 千帆扩展已经保存的 Cookie 文件，避免重新配置。

## 许可

MIT © qnnp-me
