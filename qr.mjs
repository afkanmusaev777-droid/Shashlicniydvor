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
  const count = Math.max(1, Math.min(100, parseInt(env("TABLES") || "20", 10) || 20));
  let html = '<meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{font-family:sans-serif}div{display:inline-block;margin:10px;text-align:center}</style><h2>QR-коды столов</h2>';
  for (let i = 1; i <= count; i++) { const link = `${url.origin}/#stol-${i}`; html += `<div><img width="180" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}"><br><b>Стол ${i}</b></div>`; }
  return { statusCode: 200, headers: { "Content-Type": "text/html; charset=utf-8" }, body: html };
};
