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
  if (!admin || url.searchParams.get("key") !== admin) return { statusCode: 403, body: "forbidden" };
  if (!env("BOT_TOKEN") || !env("WEBHOOK_SECRET")) return json({ error: "Добавьте BOT_TOKEN и WEBHOOK_SECRET в Netlify" }, 400);
  const webhookUrl = `${url.origin}/tg`;
  const result = await telegram("setWebhook", { url: webhookUrl, secret_token: env("WEBHOOK_SECRET") });
  return json({ webhook: webhookUrl, telegram: result }, result.ok ? 200 : 502);
};
