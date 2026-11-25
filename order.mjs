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

function validate(o) {
  if (!o || typeof o !== "object") return null;
  const table = String(o.table || "").replace(/\D/g, "").slice(0, 3);
  if (!table || !Array.isArray(o.items) || !o.items.length || o.items.length > 60) return null;
  const items = [];
  for (const item of o.items) {
    const n = String(item.n || "").slice(0, 120);
    const q = Math.floor(Number(item.q));
    const p = Math.floor(Number(item.p));
    if (!n || !(q >= 1 && q <= 50) || !(p >= 0 && p <= 100000)) return null;
    items.push({ n, q, p });
  }
  return { table, items, comment: String(o.comment || "").slice(0, 300) };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json({ error: "method_not_allowed" }, 405);
  const origin = event.headers?.origin;
  const host = event.headers?.host;
  if (origin && host) { try { if (new URL(origin).host !== host) return json({ error: "forbidden" }, 403); } catch { return json({ error: "bad_origin" }, 403); } }
  const raw = event.body || "";
  if (raw.length > 20000) return json({ error: "payload_too_large" }, 413);
  let order;
  try { order = validate(JSON.parse(raw)); } catch { order = null; }
  if (!order) return json({ error: "bad_order" }, 400);
  if (!env("CHAT_ID")) return json({ error: "config", detail: "Не задан CHAT_ID в переменных Netlify" }, 500);
  const total = order.items.reduce((sum, i) => sum + i.q * i.p, 0);
  const money = (n) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";
  let message = `🍢 Стол № ${order.table}\n\n`;
  for (const i of order.items) message += `• ${i.n} × ${i.q} — ${money(i.q * i.p)}\n`;
  message += `\nИтого: ${money(total)}`;
  if (order.comment) message += `\n💬 ${order.comment}`;
  const sent = await telegram("sendMessage", {
    chat_id: env("CHAT_ID"), text: message,
    reply_markup: { inline_keyboard: [[{ text: "✅ Принять", callback_data: "a" }]] },
  });
  if (!sent.ok) return json({ error: "telegram", detail: sent.description || "Telegram API error" }, 502);
  return json({ id: String(sent.result.message_id) });
};
