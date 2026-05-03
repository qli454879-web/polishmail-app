import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);

const PORT = Number(process.env.PORT || 8787);
const APP_BASE_URL = process.env.APP_BASE_URL || "";
const COOKIE_SECRET = process.env.APP_COOKIE_SECRET || "local-dev-secret";
const FREE_TRIAL_PER_DAY = Number(process.env.FREE_TRIAL_PER_DAY || 5);
const SITE_MODE = process.env.SITE_MODE || "test";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const stripe =
  process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

const priceConfig = {
  pro_month: process.env.STRIPE_PRICE_PRO_MONTH || "",
  pro_week: process.env.STRIPE_PRICE_PRO_WEEK || "",
  jp_pack: process.env.STRIPE_PRICE_JP_PACK || "",
  en_pack: process.env.STRIPE_PRICE_EN_PACK || "",
  cn_pack: process.env.STRIPE_PRICE_CN_PACK || ""
};

const planMeta = {
  pro_month: {
    title: "Pro 月卡",
    mode: "subscription",
    maxAgeMs: 30 * 24 * 60 * 60 * 1000
  },
  pro_week: {
    title: "周卡",
    mode: "subscription",
    maxAgeMs: 7 * 24 * 60 * 60 * 1000
  },
  jp_pack: {
    title: "日语邮件包",
    mode: "payment",
    maxAgeMs: 365 * 24 * 60 * 60 * 1000
  },
  en_pack: {
    title: "英语正式邮件包",
    mode: "payment",
    maxAgeMs: 365 * 24 * 60 * 60 * 1000
  },
  cn_pack: {
    title: "中文职场回复包",
    mode: "payment",
    maxAgeMs: 365 * 24 * 60 * 60 * 1000
  }
};

const paidSessionCache = new Map();

app.post(
  "/api/stripe-webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return res.status(400).send("Webhook not configured");
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).send("Missing stripe signature");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      if (session?.id) {
        paidSessionCache.set(session.id, {
          paid:
            session.payment_status === "paid" ||
            session.payment_status === "no_payment_required",
          plan: session.metadata?.plan || null,
          completedAt: new Date().toISOString()
        });
      }
    }

    res.json({ received: true });
  }
);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const index = item.indexOf("=");
      if (index === -1) return acc;
      const key = item.slice(0, index);
      const value = item.slice(index + 1);
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function normalizeBaseUrl(url = "") {
  return url.trim().replace(/\/+$/, "");
}

function getRequestBaseUrl(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol =
    typeof forwardedProto === "string"
      ? forwardedProto.split(",")[0].trim()
      : req.protocol;
  const host = req.get("host");
  if (!host) return "";
  return normalizeBaseUrl(`${protocol}://${host}`);
}

function getAppBaseUrl(req) {
  const configuredBaseUrl = normalizeBaseUrl(APP_BASE_URL);
  if (configuredBaseUrl) return configuredBaseUrl;
  const requestBaseUrl = getRequestBaseUrl(req);
  if (requestBaseUrl) return requestBaseUrl;
  return `http://localhost:${PORT}`;
}

function signValue(raw) {
  return crypto
    .createHmac("sha256", COOKIE_SECRET)
    .update(raw)
    .digest("hex");
}

function encodeSignedPayload(payload) {
  const raw = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${raw}.${signValue(raw)}`;
}

function decodeSignedPayload(value) {
  if (!value || !value.includes(".")) return null;
  const [raw, signature] = value.split(".");
  if (signValue(raw) !== signature) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function setSignedCookie(req, res, name, payload, maxAgeMs) {
  const value = encodeSignedPayload(payload);
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION ? req.secure : false,
    maxAge: maxAgeMs,
    path: "/"
  });
}

function readSignedCookie(req, name) {
  const cookies = parseCookies(req.headers.cookie || "");
  return decodeSignedPayload(cookies[name]);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getUsageState(req) {
  const saved = readSignedCookie(req, "pm_usage");
  const today = todayKey();
  if (!saved || saved.date !== today) {
    return { date: today, count: 0 };
  }
  return saved;
}

function getTrialRemaining(req) {
  const usage = getUsageState(req);
  return Math.max(0, FREE_TRIAL_PER_DAY - usage.count);
}

function incrementTrialUsage(req, res) {
  const usage = getUsageState(req);
  const next = { date: todayKey(), count: usage.count + 1 };
  setSignedCookie(req, res, "pm_usage", next, 3 * 24 * 60 * 60 * 1000);
  return Math.max(0, FREE_TRIAL_PER_DAY - next.count);
}

function getAccess(req) {
  const access = readSignedCookie(req, "pm_access");
  if (!access) return null;
  if (access.expiresAt && Date.now() > access.expiresAt) return null;
  return access;
}

function hasAccessForLanguage(access, language) {
  if (!access) return false;
  if (access.plan === "pro_month" || access.plan === "pro_week") return true;
  if (access.plan === "jp_pack") return language === "ja";
  if (access.plan === "en_pack") return language === "en";
  if (access.plan === "cn_pack") return language === "zh";
  return false;
}

function getPlanDisplay(plan) {
  return planMeta[plan]?.title || "已付费用户";
}

function getStatusPayload(req) {
  const access = getAccess(req);
  const trialRemaining = getTrialRemaining(req);
  const checkoutEnabled =
    SITE_MODE === "live" &&
    Boolean(stripe && Object.values(priceConfig).some(Boolean));
  return {
    access: access
      ? {
          plan: access.plan,
          title: getPlanDisplay(access.plan),
          activatedAt: access.activatedAt,
          expiresAt: access.expiresAt
        }
      : null,
    trialRemaining,
    siteMode: SITE_MODE,
    checkoutEnabled,
    stripeConfigured: Boolean(
      stripe && Object.values(priceConfig).some(Boolean)
    ),
    aiConfigured: Boolean(OPENAI_API_KEY)
  };
}

function buildAccessFromPlan(plan) {
  const meta = planMeta[plan];
  if (!meta) return null;
  return {
    plan,
    activatedAt: new Date().toISOString(),
    expiresAt: Date.now() + meta.maxAgeMs
  };
}

function getPlanFromSession(session) {
  return (
    session?.metadata?.plan ||
    paidSessionCache.get(session?.id)?.plan ||
    Object.keys(priceConfig).find(
      (key) => priceConfig[key] === session?.line_items?.data?.[0]?.price?.id
    ) ||
    null
  );
}

function escapeJsonBlock(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

function scenarioDictionary() {
  return {
    zh: {
      scenarios: {
        follow_up: "催进度 / 跟进",
        leave: "请假",
        reject: "拒绝额外任务",
        apology: "道歉补救",
        update: "汇报进展"
      },
      recipients: {
        boss: "老板",
        coworker: "同事",
        client: "客户"
      }
    },
    ja: {
      scenarios: {
        professor_absence: "教授へ欠席連絡",
        professor_extension: "教授へ締切延長の相談",
        interview_reschedule: "面接日程の調整依頼",
        thank_you_company: "企業へのお礼メール",
        late_reply_apology: "返信遅れのお詫び"
      },
      recipients: {
        professor: "教授",
        hr: "企業・人事",
        manager: "上司",
        office: "事務担当"
      }
    },
    en: {
      scenarios: {
        absence_professor: "Inform a professor about absence",
        extension_request: "Ask for an extension",
        interview_reschedule: "Reschedule an interview",
        thank_you_followup: "Post-interview thank-you email",
        late_reply_apology: "Apologize for delayed reply"
      },
      recipients: {
        professor: "Professor",
        hr: "HR / Recruiter",
        manager: "Manager",
        client: "Client"
      }
    }
  };
}

function toneLabels(language) {
  if (language === "ja") {
    return [
      { key: "safe", label: "丁寧版" },
      { key: "warm", label: "やわらかい版" },
      { key: "firm", label: "はっきり版" }
    ];
  }
  if (language === "en") {
    return [
      { key: "safe", label: "Safe Version" },
      { key: "warm", label: "Warm Version" },
      { key: "firm", label: "Firm Version" }
    ];
  }
  return [
    { key: "safe", label: "稳妥版" },
    { key: "warm", label: "高情商版" },
    { key: "firm", label: "强边界版" }
  ];
}

function buildLocalReply(input, toneKey) {
  const { language, scenario, recipient, urgency, goal, details } = input;
  const u = urgency || "normal";

  if (language === "ja") {
    const recipientMap = {
      professor: "先生",
      hr: "採用ご担当者様",
      manager: "〇〇様",
      office: "ご担当者様"
    };
    const subjectMap = {
      professor_absence: "授業欠席のご連絡",
      professor_extension: "課題提出期限に関するご相談",
      interview_reschedule: "面接日程のご相談",
      thank_you_company: "面接のお礼",
      late_reply_apology: "ご返信遅延のお詫び"
    };
    const mainMap = {
      professor_absence: {
        normal: "本日の授業ですが、やむを得ない事情により欠席させていただきたく、ご連絡いたしました。",
        today: "本日の授業について、当日のご連絡となり恐縮ですが、やむを得ない事情により欠席させていただきたく存じます。",
        urgent: "直前のご連絡となり大変恐縮ですが、本日の授業を欠席させていただきたく、ご連絡差し上げました。"
      },
      professor_extension: {
        normal: "課題提出についてご相談があり、ご連絡いたしました。可能でしたら、提出期限の延長をご検討いただけますと幸いです。",
        today: "課題提出について本日中にご相談したく、ご連絡いたしました。可能でしたら、提出期限を少し延長していただけないかお願いしたく存じます。",
        urgent: "締切直前のご相談となり大変申し訳ございません。可能でしたら、提出期限の延長をご検討いただけますでしょうか。"
      },
      interview_reschedule: {
        normal: "面接日程につきまして、やむを得ない都合により再調整をお願いしたく、ご連絡いたしました。",
        today: "面接日程につきまして、本日中にご相談したいことがあり、ご連絡いたしました。恐縮ですが、再調整は可能でしょうか。",
        urgent: "直前のご連絡となり誠に申し訳ございません。面接日程の再調整をご相談させていただけますでしょうか。"
      },
      thank_you_company: {
        normal: "本日はお忙しい中、お時間をいただきありがとうございました。面接を通じて、貴社で働きたいという思いがさらに強くなりました。",
        today: "本日中に改めて御礼をお伝えしたく、ご連絡いたしました。面接を通じて、貴社への志望度が一層高まりました。",
        urgent: "まずは取り急ぎ、面接の機会をいただいたことに心より御礼申し上げます。"
      },
      late_reply_apology: {
        normal: "ご返信が遅くなってしまい、申し訳ございません。",
        today: "本日のお返事となってしまい、大変失礼いたしました。",
        urgent: "ご連絡へのお返事が大変遅くなり、誠に申し訳ございません。"
      }
    };
    let body = `件名：${subjectMap[scenario] || "ご連絡"}\n\n${recipientMap[recipient] || "ご担当者様"}\n\nいつもお世話になっております。\n${mainMap[scenario]?.[u] || "ご連絡差し上げました。"}`
    if (goal) body += `\n今回特にお願いしたいことは、${goal} です。`;
    if (details) body += `\n背景として、${details}。`;
    body += "\n何卒よろしくお願いいたします。";
    if (toneKey === "warm") body = body.replaceAll("恐縮", "恐れ入ります").replaceAll("幸いです", "ありがたく存じます");
    if (toneKey === "firm") body = body.replaceAll("可能でしたら、", "").replaceAll("幸いです", "幸いです。");
    return {
      text: body,
      riskNote: "日语正式邮件里，先表达礼貌和配合意愿，再提出请求，成功率会更高。"
    };
  }

  if (language === "en") {
    const recipientMap = {
      professor: "Professor [Last Name]",
      hr: "Dear Hiring Team",
      manager: "Dear [Manager Name]",
      client: "Dear [Client Name]"
    };
    const subjectMap = {
      absence_professor: "Regarding My Absence",
      extension_request: "Request for Extension",
      interview_reschedule: "Request to Reschedule Interview",
      thank_you_followup: "Thank You for the Interview",
      late_reply_apology: "Apology for My Delayed Response"
    };
    const mainMap = {
      absence_professor: {
        normal: "I am writing to let you know that I will be unable to attend due to unavoidable circumstances.",
        today: "I apologize for the short notice, but I am writing today to let you know that I will be unable to attend.",
        urgent: "I am very sorry for the last-minute message, but I need to let you know that I will not be able to attend."
      },
      extension_request: {
        normal: "I am writing to ask whether it would be possible to receive a short extension.",
        today: "I am reaching out today to ask whether a brief extension might be possible.",
        urgent: "I apologize for contacting you so close to the deadline, but I would like to ask if an extension could be considered."
      },
      interview_reschedule: {
        normal: "I am writing to ask whether it might be possible to reschedule my interview due to an unavoidable conflict.",
        today: "I wanted to reach out today to ask whether my interview could be rescheduled because of a scheduling conflict.",
        urgent: "I sincerely apologize for the inconvenience, but I need to ask whether my interview can be rescheduled."
      },
      thank_you_followup: {
        normal: "Thank you very much for taking the time to speak with me. Our conversation strengthened my interest in the opportunity.",
        today: "I wanted to follow up today to express my appreciation and say that our conversation made me even more excited about the role.",
        urgent: "I wanted to send a quick note of thanks right away and let you know how much I appreciated the opportunity to speak with you."
      },
      late_reply_apology: {
        normal: "I apologize for my delayed reply.",
        today: "I am sorry that my response is only reaching you today.",
        urgent: "I sincerely apologize for the delay in getting back to you."
      }
    };
    let body = `Subject: ${subjectMap[scenario] || "Follow-Up"}\n\n${recipientMap[recipient] || "Dear [Name]"},\n\nI hope you are doing well.\n\n${mainMap[scenario]?.[u] || "I am reaching out regarding the matter below."}`;
    if (goal) body += `\n\nMy main request is to ${goal}.`;
    if (details) body += `\n\nFor context, ${details}.`;
    body += "\n\nThank you for your time and consideration.\n\nBest regards,\n[Your Name]";
    if (toneKey === "warm") body = body.replace("I am writing to", "I just wanted to").replace("Thank you for your time and consideration.", "Thank you again for your time and understanding.");
    if (toneKey === "firm") body = body.replace("whether it would be possible to", "if you could").replace("might be possible to", "could");
    return {
      text: body,
      riskNote: "Formal English emails work best when the request is explicit, the tone is calm, and the next step is easy for the recipient to understand."
    };
  }

  const recipientMap = {
    boss: "您",
    coworker: "你",
    client: "您"
  };
  const mainMap = {
    follow_up: {
      normal: "这边想跟进一下当前进度，方便的话麻烦同步我一下最新情况。",
      today: "这边想跟进一下当前进度，如果方便的话，麻烦尽量今天内同步我一下。",
      urgent: "这件事现在已经比较卡后续安排了，麻烦优先帮我看一下并尽快回复。"
    },
    leave: {
      normal: "我这边想请个假，相关事项会提前交接好。",
      today: "我今天需要临时请假处理一点事情，相关事项我会尽量安排好，不影响当前进度。",
      urgent: "我这边有临时紧急情况，需要马上请假处理，先和您同步。"
    },
    reject: {
      normal: "这个事情我看到了，但我这边当前排期已经比较满，建议先确认优先级再安排。",
      today: "这个事情我看到了，但如果今天临时插进来，会直接影响我原定要交付的事项。",
      urgent: "如果现在马上接这个任务，我手头已有事项会受到明显影响，建议先明确取舍。"
    },
    apology: {
      normal: "这件事确实是我这边处理得不够到位，先跟您说一声抱歉。",
      today: "这件事给您带来影响了，先向您说明并致歉，我今天会优先处理补救。",
      urgent: "这件事目前需要我马上处理，我先向您说明并道歉，稍后会尽快同步解决进展。"
    },
    update: {
      normal: "跟您同步一下当前进展，目前核心部分已经在推进。",
      today: "跟您同步一下当前进展，今天内我会先把关键部分收尾并回传结果。",
      urgent: "我先马上同步当前可以确认的进展，剩余部分继续处理后再补充。"
    }
  };
  let body = `${mainMap[scenario]?.[u] || "我这边想和您同步一下。"}`
  if (goal) body += ` 我这边最希望达到的结果是：${goal}。`;
  if (details) body += ` 当前背景是：${details}。`;
  body += ` 如果${recipientMap[recipient] || "您"}这边有更合适的安排，也可以直接告诉我。`;
  if (toneKey === "warm") body = body.replaceAll("麻烦", "辛苦").replaceAll("建议", "我建议").replaceAll("直接告诉我", "随时告诉我");
  if (toneKey === "firm") body = body.replaceAll("如果方便的话，", "").replaceAll("建议", "需要").replaceAll("也可以直接告诉我", "也请尽快明确");
  return {
    text: body,
    riskNote: "中文职场表达里，用户最在意的是既别太软，也别像在甩锅，所以风险提醒和对象区分非常重要。"
  };
}

async function generateWithAI(input) {
  if (!OPENAI_API_KEY) return null;
  const labels = toneLabels(input.language);
  const prompt = `
你是一个专业的多语言正式沟通助手。请根据用户输入，返回严格 JSON，结构如下：
{
  "versions": [
    {"label": "${labels[0].label}", "text": "..."},
    {"label": "${labels[1].label}", "text": "..."},
    {"label": "${labels[2].label}", "text": "..."}
  ],
  "riskNote": "..."
}

要求：
1. 只返回 JSON，不要 Markdown
2. 如果 language=ja，输出日语邮件；language=en，输出英文正式邮件；language=zh，输出中文职场消息
3. 保持真实、简洁、可直接发送
4. 根据语境自然生成三种不同语气

用户输入：
${JSON.stringify(input)}
`;

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`AI generation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  const parsed = JSON.parse(escapeJsonBlock(content));
  return parsed;
}

async function generateReplyBundle(input) {
  try {
    const aiResult = await generateWithAI(input);
    if (aiResult?.versions?.length) return aiResult;
  } catch {
    // 忽略 AI 失败，直接回退到本地模板
  }

  const versions = toneLabels(input.language).map((item) => {
    const result = buildLocalReply(input, item.key);
    return {
      label: item.label,
      text: result.text
    };
  });

  return {
    versions,
    riskNote: buildLocalReply(input, "safe").riskNote
  };
}

app.get("/api/status", (req, res) => {
  res.json(getStatusPayload(req));
});

app.post("/api/generate", async (req, res) => {
  try {
    const input = req.body || {};
    const language = input.language || "ja";
    const access = getAccess(req);
    const trialRemaining = getTrialRemaining(req);
    const allowed =
      hasAccessForLanguage(access, language) || trialRemaining > 0;

    if (!allowed) {
      return res.status(402).json({
        error: "trial_exhausted",
        message:
          SITE_MODE === "test"
            ? "当前是测试版，今日免费次数已用完。你可以明天再试，或等待正式开放。"
            : "免费次数已用完，请升级套餐后继续使用。",
        ...getStatusPayload(req)
      });
    }

    const result = await generateReplyBundle(input);
    let nextTrialRemaining = trialRemaining;

    if (!hasAccessForLanguage(access, language)) {
      nextTrialRemaining = incrementTrialUsage(req, res);
    }

    res.json({
      ...result,
      status: getStatusPayload(req),
      trialRemaining: nextTrialRemaining
    });
  } catch (error) {
    res.status(500).json({
      error: "generate_failed",
      message: error?.message || "生成失败，请稍后再试。"
    });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    if (SITE_MODE !== "live") {
      return res.status(403).json({
        error: "checkout_disabled",
        message: "当前站点为测试版，真实支付暂未开放。"
      });
    }

    const { plan, email } = req.body || {};
    if (!stripe) {
      return res.status(400).json({
        error: "stripe_not_configured",
        message:
          "当前还没有配置 Stripe 密钥。请先在 .env 中填写 STRIPE_SECRET_KEY 和对应价格 ID。"
      });
    }

    const priceId = priceConfig[plan];
    const meta = planMeta[plan];
    if (!priceId || !meta) {
      return res.status(400).json({
        error: "plan_not_configured",
        message: "当前套餐还没有配置 Stripe Price ID。"
      });
    }

    const baseUrl = getAppBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: meta.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      allow_promotion_codes: true,
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel.html`,
      metadata: {
        plan
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({
      error: "checkout_session_failed",
      message: error?.message || "创建支付链接失败。"
    });
  }
});

app.post("/api/activate", async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!stripe || !sessionId) {
      return res.status(400).json({
        error: "missing_session",
        message: "缺少 sessionId 或 Stripe 未配置。"
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"]
    });
    const isPaid =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required" ||
      paidSessionCache.get(sessionId)?.paid;

    if (!isPaid) {
      return res.status(400).json({
        error: "session_not_paid",
        message: "该支付会话尚未完成。"
      });
    }

    const plan = getPlanFromSession(session);

    if (!plan || !planMeta[plan]) {
      return res.status(400).json({
        error: "unknown_plan",
        message: "无法识别当前购买的套餐。"
      });
    }

    const access = buildAccessFromPlan(plan);
    setSignedCookie(req, res, "pm_access", access, planMeta[plan].maxAgeMs);
    res.json({
      ok: true,
      access: {
        plan: access.plan,
        title: getPlanDisplay(access.plan),
        activatedAt: access.activatedAt,
        expiresAt: access.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({
      error: "activate_failed",
      message: error?.message || "支付成功后的权限开通失败。"
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    app: "PolishMail",
    siteMode: SITE_MODE,
    stripeConfigured: Boolean(stripe),
    aiConfigured: Boolean(OPENAI_API_KEY)
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`PolishMail running at ${getAppBaseUrl({ headers: {}, protocol: "http", get: () => "" })}`);
});
