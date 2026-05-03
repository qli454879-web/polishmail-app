# 我拿到 Stripe 后要填什么

拿到 Stripe 后，你不用研究很多概念，只要记住 3 类东西：

## 1. Secret Key
用途：
- 让你的网站后台创建付款链接

填到：

`STRIPE_SECRET_KEY`

## 2. Webhook Secret
用途：
- 验证 Stripe 发来的“用户已付款”通知

填到：

`STRIPE_WEBHOOK_SECRET`

## 3. 每个套餐的 Price ID
你至少要有这些：

- `STRIPE_PRICE_PRO_MONTH`
- `STRIPE_PRICE_PRO_WEEK`
- `STRIPE_PRICE_JP_PACK`
- `STRIPE_PRICE_EN_PACK`
- `STRIPE_PRICE_CN_PACK`

## 一句话理解
你在 Stripe 后台要做的事，就是：

1. 建好套餐
2. 复制这些 ID
3. 粘贴进 `.env`

## 填完以后做什么
重启项目：

```bash
npm start
```

然后你的网站里的购买按钮，就能开始真的跳转收款。
