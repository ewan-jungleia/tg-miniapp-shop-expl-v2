const API = "/api/products";
const CART_KEY = "shopv2.cart";

function fmtEuro(cents){ return (cents/100).toFixed(2).replace('.',',') + "€"; }
function loadCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)||"[]"); }catch{ return []; } }
function saveCart(v){ localStorage.setItem(CART_KEY, JSON.stringify(v)); }
function cartCount(v){ return v.reduce((a,it)=>a+it.qty,0); }
function updateCartBadge(){ const b=document.getElementById("cartBtn"); if(b){ b.textContent=`Panier (${cartCount(loadCart())})`; } }

function addToCart(p,v,q){
  const cart = loadCart();
  const key = p.id+"::"+v.id;
  const i = cart.findIndex(x=>x.key===key);
  if(i>=0) cart[i].qty += q;
  else cart.push({ key, productId:p.id, name:p.name, variantId:v.id, variantLabel:v.label,
                   priceCashCents:v.priceCashCents, priceCryptoCents:v.priceCryptoCents, qty:q });
  saveCart(cart); updateCartBadge(); alert("Ajouté au panier ✔️");
}

function render(products, settings){
  const shop = document.getElementById("shopName");
  if (shop) shop.textContent = (settings && settings.shopName) || "Boutique";

  const root = document.getElementById("root");
  if(!root) return;

  if(!Array.isArray(products) || !products.length){
    root.innerHTML = "<p class='muted'>Aucun produit à afficher.</p>";
    return;
  }

  root.innerHTML = "";
  products.forEach(p=>{
    const card = document.createElement("div"); card.className="card";
    const h3 = document.createElement("h3"); h3.textContent = p.name || "Produit";
    const desc = document.createElement("p"); desc.className="muted"; desc.textContent = p.description || "";

    const sel = document.createElement("select");
    (p.variants||[]).forEach(v=>{
      const opt=document.createElement("option");
      opt.value=v.id; opt.textContent=`${v.label} — ${fmtEuro(v.priceCashCents)} cash / ${fmtEuro(v.priceCryptoCents)} crypto`;
      sel.appendChild(opt);
    });

    const qty=document.createElement("input"); qty.type="number"; qty.min="1"; qty.value="1";
    const add=document.createElement("button"); add.textContent="Ajouter au panier";
    add.onclick=()=>{
      const v=(p.variants||[]).find(x=>x.id===sel.value) || (p.variants||[])[0];
      const q=Math.max(1, parseInt(qty.value||"1",10));
      if(v) addToCart(p,v,q);
    };

    const row1=document.createElement("div"); row1.className="row"; row1.appendChild(sel);
    const row2=document.createElement("div"); row2.className="row"; row2.appendChild(qty); row2.appendChild(add);

    card.appendChild(h3); card.appendChild(desc); card.appendChild(row1); card.appendChild(row2);
    root.appendChild(card);
  });
}

async function main(){
  try{
    const r = await fetch(API, {headers:{accept:"application/json"}});
    const txt = await r.text();
    try {
      const data = JSON.parse(txt);
      render((data && data.products) || [], (data && data.settings) || {});
    } catch(e) {
      document.getElementById("root").innerHTML =
        "<pre style='white-space:pre-wrap;color:#900'>Erreur JSON:\\n"+txt+"</pre>";
    }
  }catch(e){
    document.getElementById("root").innerHTML =
      "<pre style='white-space:pre-wrap;color:#900'>Erreur fetch: "+String(e)+"</pre>";
  }
  updateCartBadge();
}

document.addEventListener("DOMContentLoaded", ()=>{
  const btn=document.getElementById("cartBtn");
  if(btn){
    btn.onclick=()=>{
      const cart = loadCart();
      if(!cart.length){ alert("Panier vide."); return; }
      const lines = cart.map(it=> `• ${it.name} / ${it.variantLabel} x${it.qty}
   = ${fmtEuro(it.priceCashCents*it.qty)} cash | ${fmtEuro(it.priceCryptoCents*it.qty)} crypto`);
      alert("Panier:\\n\\n"+lines.join("\\n"));
    };
  }
  main();
});
