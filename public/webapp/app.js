const API = "/api/products";  // <-- relative path pour Vercel
const CART_KEY = "shopv2.cart";

function €(cents){ return (cents/100).toFixed(2).replace('.',',')+"€"; }

function loadCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)||"[]"); }catch{ return []; } }
function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function cartCount(cart){ return cart.reduce((a,it)=>a+it.qty,0); }
function updateCartBadge(){
  const btn=document.getElementById("cartBtn"); const n=cartCount(loadCart());
  btn.textContent = `Panier (${n})`;
}

function addToCart(product, variant, qty){
  const cart = loadCart();
  const key = product.id + "::" + variant.id;
  const idx = cart.findIndex(it => it.key === key);
  if(idx>=0){ cart[idx].qty += qty; } else {
    cart.push({ key, productId: product.id, name: product.name, variantId: variant.id,
      variantLabel: variant.label, priceCashCents: variant.priceCashCents,
      priceCryptoCents: variant.priceCryptoCents, qty });
  }
  saveCart(cart); updateCartBadge();
  alert("Ajouté au panier ✔️");
}

function render(products, settings){
  document.getElementById("shopName").textContent = settings.shopName || "Boutique";
  const root = document.getElementById("root"); root.innerHTML = "";

  products.forEach(p=>{
    const card = document.createElement("div"); card.className = "card";
    const title = document.createElement("h3"); title.textContent = p.name;
    const desc = document.createElement("p"); desc.className="muted"; desc.textContent = p.description || "";

    const sel = document.createElement("select");
    p.variants.forEach(v=>{
      const opt=document.createElement("option");
      opt.value = v.id;
      opt.textContent = `${v.label} — ${€(v.priceCashCents)} cash / ${€(v.priceCryptoCents)} crypto`;
      sel.appendChild(opt);
    });

    const qty = document.createElement("input"); qty.type="number"; qty.min="1"; qty.value="1";
    const add = document.createElement("button"); add.textContent = "Ajouter au panier";
    add.onclick = ()=>{
      const v = p.variants.find(x=>x.id===sel.value) || p.variants[0];
      addToCart(p, v, Math.max(1,parseInt(qty.value||"1",10)));
    };

    const row1=document.createElement("div"); row1.className="row"; row1.appendChild(sel);
    const row2=document.createElement("div"); row2.className="row"; row2.appendChild(qty); row2.appendChild(add);

    card.appendChild(title); card.appendChild(desc); card.appendChild(row1); card.appendChild(row2);
    root.appendChild(card);
  });
}

async function main(){
  try{
    const r = await fetch(API,{headers:{accept:"application/json"}});
    const data = await r.json();
    render(data.products||[], data.settings||{});
  }catch(e){ alert("Erreur catalogue: "+e.message); }
  updateCartBadge();
}

document.getElementById("cartBtn").onclick = ()=>{
  const cart = loadCart();
  if(!cart.length){ alert("Panier vide."); return; }
  const lines = cart.map(it=> `• ${it.name} / ${it.variantLabel} x${it.qty}\n   = ${€(it.priceCashCents*it.qty)} cash | ${€(it.priceCryptoCents*it.qty)} crypto`);
  alert("Panier:\n\n"+lines.join("\n"));
};
main();
