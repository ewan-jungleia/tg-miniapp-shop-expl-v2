const LEGACY_URL = process.env.LEGACY_PRODUCTS_URL || 'https://tg-miniapp-shop-template-black.vercel.app/api/products';

export default async function handler(req, res) {
  try {
    const r = await fetch(LEGACY_URL, { headers: { 'accept': 'application/json' } });
    if (!r.ok) throw new Error('legacy fetch ' + r.status);
    const legacy = await r.json();

    const settings = {
      shopName: legacy?.settings?.shopName || 'Your Store v2',
      description: legacy?.settings?.description || 'Bienvenue dans votre boutique.',
      faq: legacy?.settings?.faq || 'Questions fréquentes : ...',
      contactUsername: legacy?.settings?.contactUsername || '@contact',
      logoUrl: legacy?.settings?.logoUrl || '',
      bgUrl: legacy?.settings?.bgUrl || ''
    };

    const products = (legacy?.products || []).map(p => {
      // si le legacy a déjà des variantes (au cas où), on les réutilise
      if (Array.isArray(p.variants) && p.variants.length) {
        return {
          id: String(p.id || p._id || cryptoRandom('p')),
          name: String(p.name || 'Produit'),
          description: String(p.description || ''),
          media: Array.isArray(p.media) ? p.media : [],
          variants: p.variants.map(v => ({
            id: String(v.id || cryptoRandom('v')),
            label: String(v.label || ''),
            priceCashCents: toCents(v.priceCashCents ?? v.price_cash ?? 0),
            priceCryptoCents: toCents(v.priceCryptoCents ?? v.price_crypto ?? 0),
            stock: v.stock ?? null,
            active: v.active ?? true
          })),
          active: p.active ?? true
        };
      }
      // sinon on convertit unit/price_* → une variante par défaut
      const label = (p.unit && String(p.unit)) || 'default';
      return {
        id: String(p.id || p._id || cryptoRandom('p')),
        name: String(p.name || 'Produit'),
        description: String(p.description || ''),
        media: Array.isArray(p.media) ? p.media : [],
        variants: [
          {
            id: cryptoRandom('v'),
            label,
            priceCashCents: toCents(p.price_cash ?? 0),
            priceCryptoCents: toCents(p.price_crypto ?? 0),
            stock: null,
            active: true
          }
        ],
        active: true
      };
    });

    res.setHeader('content-type', 'application/json');
    res.status(200).end(JSON.stringify({ settings, products }));
  } catch (e) {
    res.status(200).json({ settings: fallbackSettings(), products: [], error: String(e?.message || e) });
  }
}

function toCents(x) {
  const n = Number(x);
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

function cryptoRandom(prefix) {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}

function fallbackSettings() {
  return {
    shopName: 'Your Store v2',
    description: 'Bienvenue dans votre boutique.',
    faq: 'Questions fréquentes : ...',
    contactUsername: '@contact',
    logoUrl: '',
    bgUrl: ''
  };
}
