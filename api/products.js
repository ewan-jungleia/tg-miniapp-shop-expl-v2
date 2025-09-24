export default async function handler(req, res) {
  res.setHeader("content-type", "application/json");
  const settings = {
    shopName: "Your Store v2",
    description: "Bienvenue dans votre boutique.",
    faq: "Questions fréquentes : ...",
    contactUsername: "@contact",
    logoUrl: "",
    bgUrl: ""
  };

  const products = [
    {
      id: "p1",
      name: "Produit démo",
      description: "Avec variantes",
      media: [],
      variants: [
        { id: "v1", label: "10g",  priceCashCents: 500,  priceCryptoCents: 500 },
        { id: "v2", label: "50g",  priceCashCents: 2000, priceCryptoCents: 2000 }
      ]
    }
  ];

  res.status(200).end(JSON.stringify({ settings, products }));
}
