# Stripe 获取与配置说明

## Stripe 是什么
Stripe 是一个在线收款平台。

你可以把它理解成：
- 你的网站前台负责展示套餐和按钮
- Stripe 负责真正收钱
- 付完钱后，Stripe 再通知你的网站“这个用户已经付费了”

对于你现在这个产品来说，Stripe 的作用就是：
- 用户点击 `开通 Pro 月卡`
- 跳转到 Stripe 的付款页
- 用户刷卡或用 Apple Pay 付款
- 付款成功后回到你的站点
- 你的站点自动开通权限

## 为什么现在用 Stripe
因为你这个产品更适合先做：
- 国际用户
- 日本留学生
- 海外学生和求职用户

这类用户更容易使用：
- Visa / MasterCard
- Apple Pay
- Google Pay

所以 Stripe 比做本地复杂支付更快启动。

## 你要怎么获得 Stripe
本质上是 4 步：

1. 注册 Stripe 商户账号
2. 完成身份和收款主体信息
3. 创建你要卖的价格
4. 拿到 API 密钥和 Price ID

---

## 第一步：注册 Stripe
去 Stripe 官网注册账号。

你需要准备的通常是：
- 邮箱
- 手机号
- 业务名称
- 你的国家或地区信息
- 收款主体信息

如果你后面是以个人或公司身份收款，Stripe 后台会引导你填。

## 第二步：完成商户信息
Stripe 不是“注册完马上就万事大吉”，你通常还要继续补这些：
- 你的业务类型
- 你的产品是什么
- 你的结算银行账户
- 身份验证信息

你可以先理解成：

**Stripe 要先知道“你是谁、卖什么、钱最后打到哪里”。**

## 第三步：创建产品价格
你现在这个项目里需要至少创建这些价格：

1. `Pro 月卡`
2. `周卡`
3. `日语邮件包`
4. `英语邮件包`
5. `中文职场包`

### 在 Stripe 里你会做什么
一般是：
- 创建一个 Product
- 给这个 Product 创建一个 Price

举例：
- Product: `PolishMail Pro`
- Price: `月付 19.9`

或者：
- Product: `Japanese Email Pack`
- Price: `一次性 9.9`

### 哪些是订阅
- `Pro 月卡`
- `周卡`

这些要建成 recurring price。

### 哪些是一次性购买
- `日语邮件包`
- `英语邮件包`
- `中文职场包`

这些要建成 one-time price。

## 第四步：拿到你要填进项目里的值
你最终要从 Stripe 拿到这些值：

### 1. Secret Key
这个用来让你的网站后台和 Stripe 通信。

项目里对应：

`STRIPE_SECRET_KEY`

### 2. Webhook Secret
这个用来验证 Stripe 发给你网站的付款通知是不是真的。

项目里对应：

`STRIPE_WEBHOOK_SECRET`

### 3. Price ID
每个套餐一个 Price ID。

项目里对应：

- `STRIPE_PRICE_PRO_MONTH`
- `STRIPE_PRICE_PRO_WEEK`
- `STRIPE_PRICE_JP_PACK`
- `STRIPE_PRICE_EN_PACK`
- `STRIPE_PRICE_CN_PACK`

---

## 这些值要填到哪里
填到项目里的 `.env` 文件。

你已经有模板文件：

`polishmail-app/.env.example`

你要做的是：

1. 复制一份 `.env.example`
2. 命名为 `.env`
3. 把真实值填进去

## 例子
```env
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_PRO_MONTH=price_xxxxx
STRIPE_PRICE_PRO_WEEK=price_xxxxx
STRIPE_PRICE_JP_PACK=price_xxxxx
STRIPE_PRICE_EN_PACK=price_xxxxx
STRIPE_PRICE_CN_PACK=price_xxxxx
APP_BASE_URL=https://your-domain.com
APP_COOKIE_SECRET=你自己的随机长字符串
```

## 你现在没有 Stripe 的话怎么办
很简单：

### 路线 A：先注册 Stripe
这是最直接的路线。

适合你现在就准备开始真收钱。

### 路线 B：先继续本地测试
即使你还没有 Stripe，这个项目现在也能：
- 跑页面
- 跑生成器
- 跑免费试用
- 跑产品展示

只是在用户点购买时，暂时不能真的付款。

## 你最关心的问题
### 1. Stripe 是免费的吗
注册通常不需要付年费。

但它会在你成功收款时收手续费。

也就是说：

**不是“先交一笔年费”，而是“你收款成功后抽成”。**

### 2. 我没有公司可以用吗
很多情况下个人也可以注册，但这取决于你所在地区和 Stripe 的要求。

你可以先去注册流程里看它要求你提供什么主体信息。

### 3. 我一定要先有 Stripe 才能继续吗
不一定。

你现在已经可以继续：
- 做页面
- 做测试
- 做推广页
- 跑试用

Stripe 只是“最后开收款”那一步。

## 你接下来最实际的动作
如果你真的要上线收钱，就按这个顺序：

1. 注册 Stripe
2. 创建 5 个价格
3. 把密钥和 Price ID 填进 `.env`
4. 部署项目
5. 先拿日本留学生专页去试流量和付款

## 一句话总结
Stripe 不是“一个代码库”，而是：

**你网站用来真正收钱的支付后台。**

你获得它的方式，就是：

**去 Stripe 注册商户账号，然后从后台拿密钥和价格 ID。**
