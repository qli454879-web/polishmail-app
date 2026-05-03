# PolishMail

一个可部署的轻量收费产品骨架：
- 支持中文 / 日语 / 英语正式沟通生成
- 支持免费试用次数限制
- 支持 Stripe Checkout 付费跳转
- 支持支付成功后自动解锁访问权限
- 支持 Stripe webhook 预留接口
- 可选接入真实 AI API

## 当前适合的市场切入
最建议先打：

1. 日本留学生给教授 / 公司 / 人事写邮件
2. 国际学生或求职者写英语正式邮件
3. 中文职场高频正式沟通

## 项目结构
`server.js`

后端接口，负责：
- 免费试用计数
- 收费校验
- Stripe Checkout 创建
- 支付成功后写入访问权限
- 可选 AI 生成

`public/index.html`

真正给用户看的产品页，包含：
- 产品介绍
- 生成器
- 套餐区
- FAQ

`public/success.html`

Stripe 支付成功后的权限开通页。

`public/japan.html`

日本留学生专用落地页，更适合内容投放和单独转化。

`public/cancel.html`

取消支付后的回退页。

## 本地启动
先安装依赖：

```bash
npm install
```

复制环境变量：

```bash
cp .env.example .env
```

启动：

```bash
npm run dev
```

默认地址：

`http://localhost:8787`

## 真正收款前必须填写的环境变量
### 1. Stripe
这些是“真正让人付费”的关键：

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTH`
- `STRIPE_PRICE_PRO_WEEK`
- `STRIPE_PRICE_JP_PACK`
- `STRIPE_PRICE_EN_PACK`
- `STRIPE_PRICE_CN_PACK`

### 2. 站点地址
- `APP_BASE_URL`

部署后要改成你的正式域名，例如：

`https://your-domain.com`

### 3. Cookie 密钥
- `APP_COOKIE_SECRET`

要换成随机长字符串。

## Stripe webhook
如果你要把支付链路做得更稳，建议在 Stripe 后台把 webhook 指向：

`https://your-domain.com/api/stripe-webhook`

监听事件：

- `checkout.session.completed`

然后把 webhook secret 填到：

- `STRIPE_WEBHOOK_SECRET`

## Stripe 上怎么配
### 推荐创建 5 个 Price
1. Pro 月卡
2. 周卡
3. 日语邮件包
4. 英语邮件包
5. 中文职场包

### Stripe 配置建议
- 月卡 / 周卡：用 recurring price
- 场景包：用 one-time payment

配置完成后，把 Price ID 填回 `.env`

## AI 怎么接
如果你要把本地模板升级成真实 AI 输出，填：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`

不填也能运行，只是走本地模板逻辑。

## 为什么这个版本已经接近“可卖”
因为它已经具备收费产品的核心闭环：

1. 用户进入首页
2. 免费试用真实生成
3. 免费次数用完触发升级
4. 跳转 Stripe Checkout
5. 支付成功后自动开通权限

另外还预留了 webhook 结构，方便你后面把收款链路做得更稳。

这比“只有 landing page”或者“只有 demo”更接近真正收款。

## 还差什么才算更完整
如果你要继续做成更像正式 SaaS，下一步建议加：

1. 用户账号系统
2. 历史记录持久化数据库
3. 购买记录同步
4. 订阅状态长期校验
5. 日语就活专区单独落地页

## 最务实的建议
不要一开始就把三种语言都做深。

建议先上线：

`日语教授 / 就活邮件版`

原因：
- 需求更尖锐
- 用户更紧张
- 付费更自然
- 更容易做内容传播

## 继续往上线走
如果你接下来要部署，请直接看：

- `部署到Railway或Render.md`
- `上线前最终检查版.md`
- `Stripe-获取与配置说明.md`
