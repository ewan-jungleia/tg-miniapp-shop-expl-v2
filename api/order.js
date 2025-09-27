export default async function handler(req, res) {
  try {
    if ((req.method || "GET") !== "POST") { res.status(405).json({ ok:false, error:"Method Not Allowed" }); return; }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) { res.status(500).json({ ok:false, error:"Missing TELEGRAM_BOT_TOKEN" }); return; }

    const body = req.body || await readJson(req);
    const cart = Array.isArray(body?.cart) ? body.cart : [];
    const payment = body?.payment === "crypto" ? "crypto" : "cash";
    const form = body?.form || {}; // {firstname, lastname, address1, postalCode, city, country}
    const contactId = (process.env.CONTACT_TELEGRAM_ID || "").trim(); // optionnel (numérique recommandé)
    const adminIds = (process.env.ADMIN_SEED_TELEGRAM_IDS || "")
      .split(",").map(s=>s.trim()).filter(Boolean);

    if (!cart.length) { res.status(400).json({ ok:false, error:"Empty cart" }); return; }

    const totals = cart.reduce((acc,it)=>{
      acc.cash  += (Number(it.priceCashCents)||0)   * (Number(it.qty)||0);
      acc.crypto+= (Number(it.priceCryptoCents)||0) * (Number(it.qty)||0);
      return acc;
    }, { cash:0, crypto:0 });

    const orderId = genOrderId();
    const summary = renderSummary({ orderId, cart, totals, payment, form });

    // Envoi Telegram aux admins + (optionnel) contact, sans doublons
    const targets = new Set(adminIds);
    if (contactId && !adminIds.includes(contactId)) targets.add(contactId);

    await Promise.all(Array.from(targets).map(chatId =>
      sendTelegram(token, chatId, summary)
        .catch(()=>null)
    ));

    res.status(200).json({ ok:true, orderId, totals, payment });
  } catch (e) {
    try { res.status(500).json({ ok:false, error:String(e?.message||e) }); } catch {}
  }
}

function genOrderId(){
  const t = Date.now().toString(36).toUpperCase().slice(-6);
  const r = Math.random().toString(36).toUpperCase().slice(2,6);
  return `ORD-${t}-${r}`;
}

function renderSummary({ orderId, cart, totals, payment, form }){
  const lines = cart.map(it =>
    `• ${it.name} — ${it.variantLabel} x${it.qty} = ${(it.priceCashCents*it.qty/100).toFixed(2)}€ cash | ${(it.priceCryptoCents*it.qty/100).toFixed(2)}€ crypto`
  ).join("\n");
  const totalCash = (totals.cash/100).toFixed(2);
  const totalCrypto = (totals.crypto/100).toFixed(2);
  const addr = [
    [form.firstname, form.lastname].filter(Boolean).join(" "),
    form.address1, [form.postalCode, form.city].filter(Boolean).join(" "),
    form.country
  ].filter(Boolean).join("\n");

  return [
    `🧾 Nouvelle commande`,
    `#${orderId}`,
    ``,
    lines,
    ``,
    `Total: ${totalCash}€ cash | ${totalCrypto}€ crypto`,
    `Paiement choisi: ${payment}`,
    ``,
    `Adresse:`,
    addr || "(non renseignée)"
  ].join("\n");
}

async function sendTelegram(token, chatId, text){
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = { chat_id: chatId, text };
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("telegram send "+r.status);
}

async function readJson(req){
  const chunks=[]; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(raw); } catch { return {}; }
}
