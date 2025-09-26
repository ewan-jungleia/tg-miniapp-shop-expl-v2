export default async function handler(req, res) {
  try {
    if ((req.method || "GET") !== "POST") { res.status(405).json({ ok:false, error:"Method Not Allowed" }); return; }

    const secretHeader = req.headers["x-telegram-bot-api-secret-token"] || req.headers["x-telegram-secret-token"];
    const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
    if (!WEBHOOK_SECRET || secretHeader !== WEBHOOK_SECRET) { res.status(401).json({ ok:false, error:"Bad secret" }); return; }

    const body = req.body || await readJson(req);
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const WEBAPP_URL = (process.env.WEBAPP_URL || "").replace(/\/+$/,"");
    const ADMIN_SEED = (process.env.ADMIN_SEED_TELEGRAM_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);

    if (!token) { res.status(500).json({ ok:false, error:"Missing TELEGRAM_BOT_TOKEN" }); return; }

    const msg = body?.message || null;
    const cbq = body?.callback_query || null;

    async function send(chatId, text, extra) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, ...extra })
      });
    }

    function kbStart() {
      return {
        inline_keyboard: [
          [{ text: "📜 Description", callback_data: "open_desc" }],
          [{ text: "❓ FAQ", callback_data: "open_faq" }],
          [{ text: "🛍️ Menu", web_app: { url: WEBAPP_URL ? WEBAPP_URL + "/webapp" : "https://example.com" } }]
        ]
      };
    }

    if (msg?.text) {
      const chatId = msg.chat.id;
      const text = msg.text.trim();

      if (text === "/start" || text === "/menu") {
        await send(chatId, "Bienvenue !", { reply_markup: kbStart() });
        res.status(200).json({ ok:true }); return;
      }

      if (text === "/admin") {
        const uid = String(msg.from.id);
        if (ADMIN_SEED.includes(uid)) {
          await send(chatId, "Panneau administrateur", {
            reply_markup: { inline_keyboard: [[{ text:"🧾 Produits", callback_data:"admin_products" }]] }
          });
        } else {
          await send(chatId, "Accès admin requis.");
        }
        res.status(200).json({ ok:true }); return;
      }

      if (text === "/faq") { await send(chatId, "Questions fréquentes : ..."); res.status(200).json({ ok:true }); return; }
      if (text === "/description") { await send(chatId, "Bienvenue dans votre boutique."); res.status(200).json({ ok:true }); return; }

      await send(chatId, "Commande non reconnue. Utilisez /start.");
      res.status(200).json({ ok:true }); return;
    }

    if (cbq) {
      const chatId = cbq.message.chat.id;
      const data = cbq.data;
      if (data === "open_desc") { await send(chatId, "Bienvenue dans votre boutique."); }
      else if (data === "open_faq") { await send(chatId, "Questions fréquentes : ..."); }
      else { await send(chatId, "OK."); }
      res.status(200).json({ ok:true }); return;
    }

    res.status(200).json({ ok:true });
  } catch (e) {
    try { res.status(500).json({ ok:false, error:String(e?.message||e) }); } catch {}
  }
}

async function readJson(req) {
  const chunks=[]; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(raw); } catch { return {}; }
}
