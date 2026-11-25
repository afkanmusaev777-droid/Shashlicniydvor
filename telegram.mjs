const json = (data, statusCode = 200) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  body: JSON.stringify(data),
});
const env = (name) => String(process.env[name] || "").trim();
const token = () => env("BOT_TOKEN").replace(/^bot/i, "");
async function telegram(method, payload) {
  const t = token();
  if (!t) return { ok: false, description: "BOT_TOKEN is not configured" };
  const r = await fetch(`https://api.telegram.org/bot${t}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  return r.json();
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "method not allowed" };
  const expected = env("WEBHOOK_SECRET");
  const supplied = event.headers?.["x-telegram-bot-api-secret-token"] || event.headers?.["X-Telegram-Bot-Api-Secret-Token"];
  if (!expected || supplied !== expected) return { statusCode: 403, body: "forbidden" };
  let update;
  try { update = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "bad json" }; }
  if (update.message?.text?.startsWith("/id")) {
    await telegram("sendMessage", { chat_id: update.message.chat.id, text: "ID этого чата: " + update.message.chat.id });
  }
  const cb = update.callback_query;
  if (cb?.message && String(cb.message.chat.id) === env("CHAT_ID")) {
    const who = [cb.from?.first_name, cb.from?.last_name].filter(Boolean).join(" ") || "официант";
    const old = cb.message.text || "";
    let next = null, keyboard = [];
    if (cb.data === "a" && !old.includes("✅ Принят")) { next = old + `\n\n✅ Принят: ${who}`; keyboard = [[{ text: "🍽 Выдан", callback_data: "d" }]]; }
    else if (cb.data === "d" && !old.includes("🍽 Выдан")) next = old + "\n🍽 Выдан";
    if (next !== null) {
      await telegram("editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: next, reply_markup: { inline_keyboard: keyboard } });
      await telegram("answerCallbackQuery", { callback_query_id: cb.id });
    } else await telegram("answerCallbackQuery", { callback_query_id: cb.id, text: "Уже обработано" });
  }
  return { statusCode: 200, body: "ok" };
};
