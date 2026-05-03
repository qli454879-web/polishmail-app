const dictionary = {
  zh: {
    label: "中文",
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
    },
    sample: {
      scenario: "follow_up",
      recipient: "coworker",
      urgency: "today",
      goal: "希望对方今天下午前把材料发我，我明早要汇总给老板",
      details: "对方已经拖了 3 天；我不想太强硬，但也不能继续等"
    }
  },
  ja: {
    label: "日语",
    scenarios: {
      professor_absence: "教授へ欠席連絡",
      professor_extension: "教授へ締切延長の相談",
      interview_reschedule: "面接日程の調整依頼",
      thank_you_company: "企業へのお礼メール",
      late_reply_apology: "返信遅れのお詫び"
    },
    recipients: {
      professor: "教授",
      hr: "企业・人事",
      manager: "上司",
      office: "事務担当"
    },
    sample: {
      scenario: "professor_extension",
      recipient: "professor",
      urgency: "today",
      goal: "提出期限を 2 日ほど延ばしていただきたい",
      details: "体調不良と研究発表の準備が重なっており、現状のままだと十分な内容で提出できません"
    }
  },
  en: {
    label: "英语",
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
    },
    sample: {
      scenario: "extension_request",
      recipient: "professor",
      urgency: "today",
      goal: "request a two-day extension",
      details: "I have been sick this week and need a little more time to submit work at the expected quality level"
    }
  }
};

const languageEl = document.getElementById("language");
const scenarioEl = document.getElementById("scenario");
const recipientEl = document.getElementById("recipient");
const urgencyEl = document.getElementById("urgency");
const goalEl = document.getElementById("goal");
const detailsEl = document.getElementById("details");
const generateBtn = document.getElementById("generateBtn");
const sampleBtn = document.getElementById("sampleBtn");
const resultArea = document.getElementById("resultArea");
const favoritesArea = document.getElementById("favoritesArea");
const historyArea = document.getElementById("historyArea");
const clearFavoritesBtn = document.getElementById("clearFavoritesBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const planStatusEl = document.getElementById("planStatus");
const trialStatusEl = document.getElementById("trialStatus");
const stripeStatusEl = document.getElementById("stripeStatus");

const storageKeys = {
  favorites: "polishmail_favorites",
  history: "polishmail_history"
};

function setStatusText(el, text, tone = "") {
  el.textContent = text;
  el.className = tone;
}

function populateLanguage() {
  languageEl.innerHTML = Object.entries(dictionary)
    .map(([value, item]) => `<option value="${value}">${item.label}</option>`)
    .join("");
}

function populateScenarioAndRecipient() {
  const lang = languageEl.value;
  const current = dictionary[lang];
  scenarioEl.innerHTML = Object.entries(current.scenarios)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
  recipientEl.innerHTML = Object.entries(current.recipients)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
}

function fillSample() {
  const lang = languageEl.value;
  const sample = dictionary[lang].sample;
  scenarioEl.value = sample.scenario;
  recipientEl.value = sample.recipient;
  urgencyEl.value = sample.urgency;
  goalEl.value = sample.goal;
  detailsEl.value = sample.details;
}

function renderResult(data) {
  resultArea.className = "result-stack";
  resultArea.innerHTML = `
    ${data.versions
      .map(
        (item, index) => `
      <div class="result-version">
        <strong>${item.label}</strong>
        <div class="result-text">${escapeHtml(item.text)}</div>
        <div class="result-tools">
          <button class="btn" data-copy-index="${index}">复制这条</button>
          <button class="btn" data-save-index="${index}">加入收藏</button>
        </div>
      </div>
    `
      )
      .join("")}
    <div class="result-note">
      <strong>风险提醒</strong>
      <div style="margin-top:8px;">${escapeHtml(data.riskNote)}</div>
    </div>
  `;

  resultArea.querySelectorAll("[data-copy-index]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.copyIndex);
      await navigator.clipboard.writeText(data.versions[index].text);
      const old = button.textContent;
      button.textContent = "已复制";
      setTimeout(() => {
        button.textContent = old;
      }, 1200);
    });
  });

  resultArea.querySelectorAll("[data-save-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.saveIndex);
      saveFavorite({
        label: data.versions[index].label,
        text: data.versions[index].text,
        language: languageEl.options[languageEl.selectedIndex].text,
        scenario: scenarioEl.options[scenarioEl.selectedIndex].text
      });
      const old = button.textContent;
      button.textContent = "已收藏";
      setTimeout(() => {
        button.textContent = old;
      }, 1200);
    });
  });
}

function renderMessage(message, type = "error") {
  resultArea.className = "";
  resultArea.innerHTML = `<div class="inline-message ${type}">${escapeHtml(message)}</div>`;
}

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("\n", "<br>");
}

function readStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function saveHistory(item) {
  const history = readStore(storageKeys.history);
  history.unshift({
    ...item,
    createdAt: new Date().toLocaleString("zh-CN")
  });
  writeStore(storageKeys.history, history.slice(0, 12));
  renderMemory();
}

function saveFavorite(item) {
  const favorites = readStore(storageKeys.favorites);
  favorites.unshift({
    ...item,
    createdAt: new Date().toLocaleString("zh-CN")
  });
  writeStore(storageKeys.favorites, favorites.slice(0, 20));
  renderMemory();
}

function renderMemoryBlock(targetEl, items, emptyText) {
  if (!items.length) {
    targetEl.className = "empty-box small-empty";
    targetEl.innerHTML = escapeHtml(emptyText);
    return;
  }

  targetEl.className = "";
  targetEl.innerHTML = items
    .map(
      (item) => `
      <div class="memory-item">
        <strong>${escapeHtml(item.label || item.scenario || "记录")}</strong>
        <div class="memory-meta">${escapeHtml(`${item.language || ""} · ${item.scenario || ""} · ${item.createdAt || ""}`)}</div>
        <div class="memory-text">${escapeHtml(item.text || "")}</div>
      </div>
    `
    )
    .join("");
}

function renderMemory() {
  renderMemoryBlock(favoritesArea, readStore(storageKeys.favorites), "还没有收藏内容。");
  renderMemoryBlock(historyArea, readStore(storageKeys.history), "还没有生成记录。");
}

async function refreshStatus() {
  const response = await fetch("/api/status");
  const data = await response.json();

  if (data.access) {
    setStatusText(planStatusEl, data.access.title, "ok");
  } else {
    setStatusText(planStatusEl, "免费试用中", "warn");
  }

  setStatusText(trialStatusEl, String(data.trialRemaining), data.trialRemaining > 0 ? "ok" : "danger");
  setStatusText(stripeStatusEl, data.stripeConfigured ? "已配置" : "未配置", data.stripeConfigured ? "ok" : "warn");
}

async function generate() {
  generateBtn.disabled = true;
  generateBtn.textContent = "生成中...";
  try {
    const payload = {
      language: languageEl.value,
      scenario: scenarioEl.value,
      recipient: recipientEl.value,
      urgency: urgencyEl.value,
      goal: goalEl.value.trim(),
      details: detailsEl.value.trim()
    };

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      renderMessage(data.message || "生成失败，请稍后再试。", "error");
      await refreshStatus();
      return;
    }

    renderResult(data);
    saveHistory({
      label: data.versions[0]?.label || "生成结果",
      text: data.versions[0]?.text || "",
      language: languageEl.options[languageEl.selectedIndex].text,
      scenario: scenarioEl.options[scenarioEl.selectedIndex].text
    });
    await refreshStatus();
  } catch (error) {
    renderMessage("请求失败，请检查服务是否启动。", "error");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "生成 3 个版本";
  }
}

function applyQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang");
  if (lang && dictionary[lang]) {
    languageEl.value = lang;
    populateScenarioAndRecipient();
    fillSample();
  }

  const focus = params.get("focus");
  if (focus === "pricing") {
    setTimeout(() => {
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
    }, 120);
  }
}

async function createCheckout(plan, email) {
  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, email })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "创建支付链接失败");
  }
  window.location.href = data.url;
}

function bindCheckoutButtons() {
  document.querySelectorAll(".buy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const plan = button.dataset.plan;
      const emailInputId = button.dataset.emailInput;
      const email = document.getElementById(emailInputId)?.value?.trim() || "";
      const original = button.textContent;
      button.disabled = true;
      button.textContent = "跳转支付中...";
      try {
        await createCheckout(plan, email);
      } catch (error) {
        alert(error.message);
        button.disabled = false;
        button.textContent = original;
      }
    });
  });
}

languageEl.addEventListener("change", () => {
  populateScenarioAndRecipient();
  fillSample();
});

sampleBtn.addEventListener("click", fillSample);
generateBtn.addEventListener("click", generate);
clearFavoritesBtn.addEventListener("click", () => {
  writeStore(storageKeys.favorites, []);
  renderMemory();
});
clearHistoryBtn.addEventListener("click", () => {
  writeStore(storageKeys.history, []);
  renderMemory();
});

populateLanguage();
languageEl.value = "ja";
populateScenarioAndRecipient();
fillSample();
applyQueryParams();
bindCheckoutButtons();
refreshStatus();
renderMemory();
