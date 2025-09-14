const STORAGE_KEY = 'utangTracker_v1';
let items = [];
const listEl = document.getElementById('list');
const totalsEl = document.getElementById('totalsArea');
const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function saveToStorage(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function loadFromStorage(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch{ return [] } }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// CRUD
function addItem(obj){ items.unshift(obj); saveToStorage(); render(); }
function updateItem(id, updates){ const i=items.findIndex(x=>x.id===id); if(i>=0){ items[i]={...items[i],...updates}; saveToStorage(); render(); } }
function removeItem(id){ items=items.filter(x=>x.id!==id); saveToStorage(); render(); }
function togglePaid(id){ const it=items.find(x=>x.id===id); if(!it)return; it.paid=!it.paid; it.paidAt=it.paid?new Date().toISOString():null; saveToStorage(); render(); }

// Render
function renderTotals(arr){
  const sumOwesMe=arr.filter(x=>!x.paid&&x.direction==='owed_to_me').reduce((s,x)=>s+Number(x.amount),0);
  const sumIOwe=arr.filter(x=>!x.paid&&x.direction==='i_owe').reduce((s,x)=>s+Number(x.amount),0);
  const total=arr.reduce((s,x)=>s+Number(x.amount),0);
  totalsEl.innerHTML=`
    <div>Owes me: <b>${currency.format(sumOwesMe)}</b></div>
    <div>I owe: <b>${currency.format(sumIOwe)}</b></div>
    <div>All entries: <b>${currency.format(total)}</b></div>`;
}

function render(){
  const q=document.getElementById('q').value.toLowerCase();
  const status=document.getElementById('filterStatus').value;
  const dir=document.getElementById('filterDirection').value;
  let arr=items.slice();
  if(status==='paid') arr=arr.filter(x=>x.paid);
  if(status==='unpaid') arr=arr.filter(x=>!x.paid);
  if(dir!=='all') arr=arr.filter(x=>x.direction===dir);
  if(q) arr=arr.filter(x=>(x.who||'').toLowerCase().includes(q)||(x.note||'').toLowerCase().includes(q));
  renderTotals(arr);

  listEl.innerHTML=arr.length? '' : '<div class="muted">No entries</div>';
  arr.forEach(it=>{
    const div=document.createElement('div');
    div.className='item '+(it.paid?'paid':'owed');
    div.innerHTML=`
      <div>
        <div><b>${escapeHtml(it.who)}</b> — ${currency.format(it.amount)}</div>
        <div class="meta">${it.direction==='owed_to_me'?'Owes me':'I owe'} • ${it.due||'no due'} • ${escapeHtml(it.note||'')}</div>
      </div>
      <div>
        <button onclick="togglePaid('${it.id}')">${it.paid?'Unpay':'Pay'}</button>
        <button onclick="populateForm('${it.id}')">Edit</button>
        <button onclick="removeItem('${it.id}')">Del</button>
      </div>`;
    listEl.appendChild(div);
  });
}

// Form
document.getElementById('entryForm').addEventListener('submit', e=>{
  e.preventDefault();
  const id=document.getElementById('editId').value;
  const who=document.getElementById('who').value.trim();
  const amount=parseFloat(document.getElementById('amount').value);
  if(!who||isNaN(amount)||amount<=0){ alert('Invalid input'); return; }
  const obj={
    id:id||uid(),
    who,
    amount:+amount.toFixed(2),
    direction:document.getElementById('direction').value,
    due:document.getElementById('due').value||null,
    note:document.getElementById('note').value.trim(),
    paid:false,
    createdAt:new Date().toISOString(),
    paidAt:null
  };
  if(id){ updateItem(id,obj); resetForm(); } else { addItem(obj); e.target.reset(); }
});

function populateForm(id){
  const it=items.find(x=>x.id===id); if(!it) return;
  document.getElementById('editId').value=it.id;
  document.getElementById('who').value=it.who;
  document.getElementById('amount').value=it.amount;
  document.getElementById('direction').value=it.direction;
  document.getElementById('due').value=it.due||'';
  document.getElementById('note').value=it.note||'';
  window.scrollTo({top:0,behavior:'smooth'});
}
function resetForm(){ document.getElementById('entryForm').reset(); document.getElementById('editId').value=''; }
document.getElementById('resetForm').addEventListener('click', resetForm);

// Filters
document.getElementById('q').addEventListener('input', render);
document.getElementById('filterStatus').addEventListener('change', render);
document.getElementById('filterDirection').addEventListener('change', render);

// CSV export/import
document.getElementById('exportCsv').addEventListener('click',()=>{
  if(!items.length){alert('No data');return;}
  const header=['id','who','amount','direction','due','note','paid','createdAt','paidAt'];
  const rows=items.map(it=>header.map(h=>JSON.stringify(it[h]||'')).join(','));
  const csv=[header.join(','),...rows].join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='utang.csv'; a.click();
});
document.getElementById('importFile').addEventListener('change',async e=>{
  const f=e.target.files[0]; if(!f)return;
  const text=await f.text();
  const [head,...lines]=text.split(/\r?\n/);
  const keys=head.split(',');
  lines.forEach(l=>{
    if(!l.trim())return;
    const vals=l.split(',');
    const obj={}; keys.forEach((k,i)=>obj[k]=JSON.parse(vals[i]||'""'));
    obj.id=obj.id||uid();
    items.push(obj);
  });
  saveToStorage(); render();
});

// Print
document.getElementById('printBtn').addEventListener('click',()=>window.print());

// Quick actions
document.getElementById('markAllPaid').addEventListener('click',()=>{ items=items.map(x=>({...x,paid:true})); saveToStorage(); render(); });
document.getElementById('markAllUnpaid').addEventListener('click',()=>{ items=items.map(x=>({...x,paid:false})); saveToStorage(); render(); });
document.getElementById('clearBtn').addEventListener('click',()=>{ if(confirm('Clear all?')){ items=[]; saveToStorage(); render(); } });

// Init
function init(){ items=loadFromStorage(); render(); }
init();
