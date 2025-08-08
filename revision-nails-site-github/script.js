
// --- services ---
const SERVICES = [
  { id: "gel_basic", name: "ジェル（ワンカラー）", price: 6500, durationMin: 90 },
  { id: "gel_design", name: "デザインジェル", price: 8500, durationMin: 120 },
  { id: "care_only", name: "ケアのみ", price: 4000, durationMin: 60 },
  { id: "fill_in", name: "フィルイン", price: 7500, durationMin: 120 },
];
const LS = { BOOKINGS: "revision_nails_bookings", CUSTOMERS: "revision_nails_customers" };
const money = n => n.toLocaleString("ja-JP");
function load(key, fallback){ try{ const v = localStorage.getItem(key); return v? JSON.parse(v): fallback; }catch{ return fallback; } }
function save(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch{} }
function uid(prefix="id"){ return `${prefix}_` + Math.random().toString(36).slice(2, 9); }
function todayISO(){ const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
function addMinutes(date, minutes){ return new Date(date.getTime() + minutes*60000); }

// nav mobile
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
hamburger.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));

// menu cards
const menuCards = document.getElementById("menuCards");
menuCards.innerHTML = SERVICES.map(s => `
  <div class="card">
    <h3>${s.name}</h3>
    <div>所要時間：約${s.durationMin}分</div>
    <div class="muted">¥${money(s.price)}</div>
    <a class="btn" href="#booking">予約する</a>
  </div>
`).join("");

// booking form
const sel = document.getElementById("serviceId");
sel.innerHTML = SERVICES.map(s => `<option value="${s.id}">${s.name}（¥${money(s.price)} / ${s.durationMin}分）</option>`).join("");
document.getElementById("date").value = todayISO();

document.getElementById("bookingForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  const serviceId = document.getElementById("serviceId").value;
  const service = SERVICES.find(s=>s.id===serviceId);
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value || "10:00";
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const lineId = document.getElementById("lineId").value.trim();
  const note = document.getElementById("note").value.trim();
  if(!name){ alert("お名前を入力してください"); return; }
  const start = new Date(`${date}T${time}:00`);
  const end = addMinutes(start, service.durationMin);
  const booking = { id: uid("bk"), serviceId, serviceName: service.name, price: service.price, date, time, start, end, name, phone, lineId, note, status:"pending", createdAt: new Date().toISOString() };
  const bookings = load(LS.BOOKINGS, []); bookings.push(booking); save(LS.BOOKINGS, bookings);
  const customers = load(LS.CUSTOMERS, []);
  const ex = customers.find(c => c.phone === phone && phone);
  if(ex){ ex.lastVisit = date; ex.totalSpent = (ex.totalSpent||0)+service.price; ex.visitCount = (ex.visitCount||0)+1; ex.lineId = lineId || ex.lineId; ex.note = note || ex.note; }
  else { customers.push({ id: uid("cs"), name, phone, lineId, note, firstVisit: date, lastVisit: date, totalSpent: service.price, visitCount: 1 }); }
  save(LS.CUSTOMERS, customers);

  document.getElementById("bookingForm").reset();
  document.getElementById("bookingThanks").classList.remove("hidden");
  setTimeout(()=> document.getElementById("bookingThanks").classList.add("hidden"), 6000);
});

// admin
document.getElementById("openAdmin").addEventListener("click", ()=>{
  const pass = prompt("管理パスワードを入力してください");
  if(pass === "revision"){
    document.getElementById("admin").classList.remove("hidden");
    renderAdmin();
    window.location.hash = "#admin";
  } else {
    alert("パスワードが違います");
  }
});

const tabButtons = document.querySelectorAll(".tabs button");
tabButtons.forEach(btn=> btn.addEventListener("click", ()=>{
  tabButtons.forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
}));

function renderAdmin(){ renderBookings(); renderCustomers(); renderAnalytics(); }
function statusLabel(s){ return s==="confirmed" ? "確定" : s==="canceled" ? "キャンセル" : "仮"; }

function renderBookings(){
  const el = document.getElementById("tab-bookings");
  const bookings = load(LS.BOOKINGS, []).sort((a,b)=> new Date(a.start) - new Date(b.start));
  if(bookings.length===0){ el.innerHTML = `<p class="muted">予約はまだありません。</p>`; return; }
  el.innerHTML = `<table class="table">
    <thead><tr><th>日時</th><th>お客様</th><th>メニュー</th><th>金額</th><th>状態</th><th></th></tr></thead>
    <tbody>
      ${bookings.map(b => `<tr>
        <td>${b.date} ${b.time}</td>
        <td>${b.name} <div class="small muted">${b.phone||""} ${b.lineId?"/ "+b.lineId:""}</div></td>
        <td>${b.serviceName}</td>
        <td>¥${money(b.price)}</td>
        <td><span class="badge ${b.status}">${statusLabel(b.status)}</span></td>
        <td>
          <button class="btn" data-action="confirm" data-id="${b.id}">確定</button>
          <button class="btn" data-action="cancel" data-id="${b.id}">キャンセル</button>
        </td>
      </tr>`).join("")}
    </tbody>
  </table>`;
  el.querySelectorAll("button[data-action]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const bookings = load(LS.BOOKINGS, []);
      const idx = bookings.findIndex(x=>x.id===id);
      if(idx>=0){
        bookings[idx].status = action === "confirm" ? "confirmed" : "canceled";
        save(LS.BOOKINGS, bookings);
        renderBookings(); renderAnalytics();
      }
    });
  });
}

function renderCustomers(){
  const el = document.getElementById("tab-customers");
  const cs = load(LS.CUSTOMERS, []);
  if(cs.length===0){ el.innerHTML = `<p class="muted">顧客データはまだありません。</p>`; return; }
  el.innerHTML = `<table class="table">
    <thead><tr><th>名前</th><th>連絡先</th><th>来店回数</th><th>累計</th><th>初回</th><th>最終</th></tr></thead>
    <tbody>
      ${cs.map(c => `<tr>
        <td>${c.name}</td>
        <td class="small muted">${c.phone||""} ${c.lineId?"/ "+c.lineId:""}</td>
        <td>${c.visitCount||0} 回</td>
        <td>¥${money(c.totalSpent||0)}</td>
        <td>${c.firstVisit||"-"}</td>
        <td>${c.lastVisit||"-"}</td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

function renderAnalytics(){
  const el = document.getElementById("tab-analytics");
  const bks = load(LS.BOOKINGS, []);
  const revenue = bks.filter(b=>b.status!=="canceled").reduce((s,b)=>s+(b.price||0),0);
  const confirmed = bks.filter(b=>b.status==="confirmed").length;
  const pending = bks.filter(b=>b.status==="pending").length;
  const canceled = bks.filter(b=>b.status==="canceled").length;
  el.innerHTML = `
    <div class="cards">
      <div class="card"><div class="small muted">総予約数</div><h3>${bks.length} 件</h3></div>
      <div class="card"><div class="small muted">確定予約</div><h3>${confirmed} 件</h3></div>
      <div class="card"><div class="small muted">キャンセル</div><h3>${canceled} 件</h3></div>
      <div class="card"><div class="small muted">推定売上</div><h3>¥${money(revenue)}</h3></div>
    </div>
  `;
}
