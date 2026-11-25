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
  const url = new URL(event.rawUrl || `https://${event.headers?.host || "localhost"}${event.path || "/"}`);
  const admin = env("ADMIN_KEY");
  if (!admin || url.searchParams.get("key") !== admin) return json({ error: "forbidden" }, 403);
  const out = { vars: { BOT_TOKEN: !!env("BOT_TOKEN"), CHAT_ID: !!env("CHAT_ID"), WEBHOOK_SECRET: !!env("WEBHOOK_SECRET"), ADMIN_KEY: !!admin } };
  if (env("BOT_TOKEN")) {
    const me = await telegram("getMe", {});
    out.bot = me.ok ? "@" + me.result.username : "ошибка: " + me.description;
    if (env("CHAT_ID")) {
      const test = await telegram("sendMessage", { chat_id: env("CHAT_ID"), text: "✅ Проверка связи: бот видит эту группу" });
      out.test_message = test.ok ? "отправлено" : "ошибка: " + test.description;
    }
  }
  return json(out);
};
