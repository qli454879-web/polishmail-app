# 部署到 Railway 或 Render

这份文档的目标只有一个：

**让你把 PolishMail 放到公网，并拿到能填给 Stripe 的网址。**

---

## 先说结论
如果你想快：

- 优先试 `Railway`

如果你想要更熟悉一点的“可视化云平台”：

- 试 `Render`

这两个都适合你现在这个项目。

---

## 部署前你已经有的东西
项目里已经帮你准备好了：

- `railway.json`
- `render.yaml`
- `Dockerfile`
- `README.md`
- 公开页面
  - `/`
  - `/japan.html`
  - `/business.html`
  - `/privacy.html`
  - `/terms.html`

---

## 一、部署到 Railway

### 第 1 步：把项目放到 GitHub
如果还没放到 GitHub，先做这个：

```bash
git init
git add .
git commit -m "init polishmail"
```

然后创建 GitHub 仓库，把代码推上去。

### 第 2 步：登录 Railway
打开 Railway，登录后创建一个新项目。

### 第 3 步：选择 GitHub 仓库
把 `polishmail-app` 所在仓库连进去。

### 第 4 步：设置根目录
如果 Railway 识别的是整个仓库，你要确保它使用：

`polishmail-app`

这个目录作为应用目录。

### 第 5 步：配置环境变量
在 Railway 后台设置这些：

- `APP_BASE_URL`
- `APP_COOKIE_SECRET`
- `FREE_TRIAL_PER_DAY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTH`
- `STRIPE_PRICE_PRO_WEEK`
- `STRIPE_PRICE_JP_PACK`
- `STRIPE_PRICE_EN_PACK`
- `STRIPE_PRICE_CN_PACK`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`

### 第 6 步：部署成功后拿公网域名
Railway 会给你一个域名，比如：

`https://xxx.up.railway.app`

这时你就可以访问：

- `https://xxx.up.railway.app/`
- `https://xxx.up.railway.app/business.html`

### 第 7 步：回填 APP_BASE_URL
把：

`APP_BASE_URL`

改成你实际的公网域名。

例如：

`https://xxx.up.railway.app`

---

## 二、部署到 Render

### 第 1 步：把项目推到 GitHub
Render 最方便的方式也是接 GitHub 仓库。

### 第 2 步：登录 Render
新建一个 `Web Service`

### 第 3 步：选择仓库
连接你的项目仓库。

### 第 4 步：设置 Root Directory
填：

`polishmail-app`

### 第 5 步：确认命令
如果 Render 没自动识别，你就填：

- Build Command: `npm install`
- Start Command: `npm start`

### 第 6 步：设置环境变量
和 Railway 一样，把这些填进去：

- `APP_BASE_URL`
- `APP_COOKIE_SECRET`
- `FREE_TRIAL_PER_DAY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTH`
- `STRIPE_PRICE_PRO_WEEK`
- `STRIPE_PRICE_JP_PACK`
- `STRIPE_PRICE_EN_PACK`
- `STRIPE_PRICE_CN_PACK`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`

### 第 7 步：拿到公网地址
Render 部署后会给你一个地址，例如：

`https://polishmail-app.onrender.com`

---

## 三、部署后第一件事做什么
先别急着去 Stripe 填一堆内容。

先确认这几个页面能打开：

1. `/`
2. `/business.html`
3. `/privacy.html`
4. `/terms.html`
5. `/japan.html`
6. `/health`

如果这些都能打开，说明站点已经是“Stripe 可以看懂的网站”。

---

## 四、Stripe 那一栏网站填什么
部署完成后，最优先填：

`https://你的域名/business.html`

比如：

`https://xxx.up.railway.app/business.html`

原因：
- 这页更像商家介绍页
- 能解释你卖什么
- 有产品、条款、隐私、支持信息

---

## 五、部署后还要在 Stripe 里补什么

### 1. 创建 Product 和 Price
你至少要建这几个：

- Pro 月卡
- 周卡
- 日语邮件包
- 英语邮件包
- 中文职场包

### 2. 填回你的 `.env`
对应这些变量：

- `STRIPE_PRICE_PRO_MONTH`
- `STRIPE_PRICE_PRO_WEEK`
- `STRIPE_PRICE_JP_PACK`
- `STRIPE_PRICE_EN_PACK`
- `STRIPE_PRICE_CN_PACK`

### 3. 配置 webhook
把 Stripe webhook 指向：

`https://你的域名/api/stripe-webhook`

监听：

- `checkout.session.completed`

然后把 webhook secret 填到：

- `STRIPE_WEBHOOK_SECRET`

---

## 六、部署完成后的最低测试顺序
按这个顺序就行：

1. 打开首页
2. 打开 `business.html`
3. 试一次免费生成
4. 点一次购买按钮
5. 看 Stripe 是否能正常跳转
6. 看支付成功页是否能回来

---

## 七、你现在最该做什么
最短路径是：

1. 先把项目推到 GitHub
2. 先上 Railway
3. 拿到公网网址
4. 用这个网址回填 Stripe 的“公司网站”
5. 再继续完成 Stripe 价格配置

---

## 八、一句话建议
如果你只想快点跑通：

**先部署到 Railway，然后把 `/business.html` 交给 Stripe。**
