// app.js - Robust: only quiz applies overlay/scroll-block; admin/dashboard are overlay-free; login opens dashboard

const QUESTIONS = {
  pre: [
    { id: 'mood', type: 'emojis', title: 'Como você está se sentindo agora?', choices: ['🤩 Muito feliz','🙂 Bem','😐 Neutro','😕 Preocupado','😞 Triste'] },
    { id: 'energy', type: 'slider', title: 'Quanto de energia você tem para a aula?', min:0, max:10, step:1, labels:['Pouca','Média','Muita'] },
    { id: 'motivation', type: 'slider', title: 'Nível de motivação para participar?', min:0, max:10, step:1, labels:['Baixa','Média','Alta'] },
    { id: 'expectation', type: 'text', title: 'O que você espera aprender hoje?' },
    { id: 'concerns', type: 'text', title: 'Tem alguma preocupação ou dificuldade que gostaria que o professor soubesse?' },
    { id: 'confidence', type: 'slider', title: 'Confiança no tema (0-10)', min:0, max:10, step:1 }
  ],
  post: [
    { id: 'mood_after', type: 'emojis', title: 'Como você se sente após a aula?', choices: ['🤩 Motivado','🙂 Satisfeito','😐 Indiferente','😕 Confuso','😞 Frustrado'] },
    { id: 'useful', type: 'slider', title: 'Quanto a aula foi útil para você?', min:0, max:10, step:1, labels:['Nada','Mais ou menos','Muito'] },
    { id: 'clarity', type: 'slider', title: 'Nível de clareza do conteúdo (0-10)', min:0, max:10, step:1 },
    { id: 'feedback', type: 'text', title: 'Comentário rápido sobre a aula' },
    { id: 'next_expectation', type: 'text', title: 'O que você gostaria que viesse nas próximas aulas?' },
    { id: 'suggestion', type: 'text', title: 'Sugestões para melhorar (se tiver)' }
  ]
};

let state = { name: '', mode: '', qlist: [], answers: [], idx: 0 };
let adminLogged = false;
let charts = {};

const $ = id => document.getElementById(id);
const show = id => { const el = $(id); if(el) el.classList.remove('hidden'); };
const hide = id => { const el = $(id); if(el) el.classList.add('hidden'); };

// Utils
function nowISO(){ return new Date().toISOString(); }
function nowLocale(){ return new Date().toLocaleString(); }
function uid(){ return 'id'+Math.random().toString(36).slice(2,9); }

// Start quiz (ONLY place that blocks scroll)
function startQuiz(mode){
  const name = $('studentName') ? $('studentName').value.trim() : '';
  if(!name){ alert('Digite seu nome'); return; }
  state.name = name; state.mode = mode;
  state.qlist = JSON.parse(JSON.stringify(QUESTIONS[mode] || []));
  state.answers = new Array(state.qlist.length).fill(null);
  state.idx = 0;
  if($('quizType')) $('quizType').textContent = mode === 'pre' ? 'Pré-aula' : 'Pós-aula';
  if($('quizDate')) $('quizDate').textContent = nowLocale();
  if($('quizTotal')) $('quizTotal').textContent = state.qlist.length;
  renderQuiz();
  show('quizOverlay');
  // Block background scroll only for quiz
  document.body.style.overflow = 'hidden';
}

// Render question
function renderQuiz(){
  const q = state.qlist[state.idx];
  if(!$('quizContent') || !q) return;
  if($('quizIdx')) $('quizIdx').textContent = state.idx + 1;
  const pct = Math.round(((state.idx+1)/state.qlist.length)*100);
  if($('quizProgressBar')) $('quizProgressBar').style.width = pct + '%';
  const container = $('quizContent'); container.innerHTML = '';
  const h = document.createElement('h3'); h.className = 'text-lg font-semibold mb-3 text-slate-800'; h.textContent = q.title;
  container.appendChild(h);

  if(q.type === 'emojis'){
    const wrap = document.createElement('div'); wrap.className = 'flex gap-3 justify-center flex-wrap';
    q.choices.forEach((c,i)=>{
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'p-3 bg-slate-50 rounded-2xl text-xl shadow-sm';
      btn.innerText = c;
      btn.addEventListener('click', ()=>{
        state.answers[state.idx] = c;
        Array.from(wrap.children).forEach(ch=> ch.classList.remove('ring-4','ring-indigo-200','bg-indigo-50'));
        btn.classList.add('ring-4','ring-indigo-200','bg-indigo-50');
      });
      wrap.appendChild(btn);
    });
    container.appendChild(wrap);
  } else if(q.type === 'slider'){
    const box = document.createElement('div'); box.className='w-full px-6';
    const lbl = document.createElement('div'); lbl.className='text-slate-600 mb-2'; lbl.textContent = 'Valor: ' + (state.answers[state.idx] ?? Math.round((q.min+q.max)/2));
    const input = document.createElement('input'); input.type='range'; input.min=q.min; input.max=q.max; input.step=q.step || 1;
    input.value = state.answers[state.idx] ?? Math.round((q.min+q.max)/2);
    input.className = 'w-full appearance-none h-2 rounded-full bg-gradient-to-r from-purple-300 to-blue-300';
    input.addEventListener('input', ()=>{ lbl.textContent = 'Valor: ' + input.value; state.answers[state.idx] = input.value; });
    box.appendChild(lbl); box.appendChild(input);
    const labels = document.createElement('div'); labels.className='flex justify-between text-xs text-slate-500 mt-2';
    if(q.labels && q.labels.length>0) labels.innerHTML = q.labels.map(l=>`<div>${l}</div>`).join('');
    else labels.innerHTML = `<div>${q.min}</div><div>${q.max}</div>`;
    box.appendChild(labels);
    container.appendChild(box);
  } else {
    const ta = document.createElement('textarea'); ta.className='w-full rounded-xl border p-3'; ta.placeholder='Escreva aqui...';
    ta.value = state.answers[state.idx] ?? '';
    ta.addEventListener('input', ()=> state.answers[state.idx] = ta.value);
    container.appendChild(ta);
  }

  if($('quizPrev')) $('quizPrev').disabled = state.idx === 0;
  if($('quizNext')) $('quizNext').textContent = state.idx === state.qlist.length -1 ? 'Finalizar' : 'Próxima';
}

// Navigation
function nextQuestion(){
  if(!confirmIfEmpty()) return;
  if(state.idx < state.qlist.length -1){ state.idx++; renderQuiz(); }
  else finalize();
}
function prevQuestion(){ if(state.idx>0){ state.idx--; renderQuiz(); } }
function skipQuestion(){ state.answers[state.idx] = state.answers[state.idx] ?? ''; nextQuestion(); }
function confirmIfEmpty(){ const val = state.answers[state.idx]; if(val === null || val === ''){ return confirm('Você deixou essa pergunta em branco. Continuar?'); } return true; }

function finalize(){
  const rec = { id: uid(), name: state.name, type: state.mode, datetime: nowISO(), exploded: [] };
  state.qlist.forEach((q,i)=> rec.exploded.push({ id: q.id, question: q.title, answer: state.answers[i] ?? '' }));
  const arr = loadAll(); arr.push(rec); localStorage.setItem('feedback_v2', JSON.stringify(arr));
  hide('quizOverlay');
  document.body.style.overflow = 'auto';
  state = { name: '', mode: '', qlist: [], answers: [], idx: 0 };
  refreshUI();
  alert('Resposta salva (localmente). Obrigado!');
}

// Storage & export
function loadAll(){ return JSON.parse(localStorage.getItem('feedback_v2') || '[]'); }
function clearAll(){ if(!confirm('Apagar todas as respostas?')) return; localStorage.removeItem('feedback_v2'); refreshUI(); }

// Export Excel
function exportExcel(){
  const arr = loadAll();
  if(arr.length === 0){ alert('Nada para exportar.'); return; }
  const rows = [];
  arr.forEach(r => r.exploded.forEach(e => rows.push({ Nome: r.name, Tipo: r.type === 'pre' ? 'Pré-aula' : 'Pós-aula', 'Data/Hora': r.datetime, Pergunta: e.question, Resposta: e.answer })));
  const ws = XLSX.utils.json_to_sheet(rows);
  const summary = buildSummary(arr);
  const ws2 = XLSX.utils.json_to_sheet(summary);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Respostas');
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo');
  XLSX.writeFile(wb, 'feedback_export.xlsx');
}

// Summary
function buildSummary(arr){
  const total = arr.length;
  const sliders = {}; const moodPre = {}; const moodPost = {}; const wordCounts = {};
  arr.forEach(r => { r.exploded.forEach(e => {
    const num = parseFloat(e.answer);
    if(!isNaN(num)){ sliders[e.id]=sliders[e.id]||[]; sliders[e.id].push(num); }
    if(e.id.includes('mood')){ if(r.type==='pre') moodPre[e.answer]=(moodPre[e.answer]||0)+1; else moodPost[e.answer]=(moodPost[e.answer]||0)+1; }
    if(typeof e.answer === 'string' && e.answer.length>2){ e.answer.split(/\s+/).forEach(w=>{ w=w.replace(/[^\wÀ-ú]/g,'').toLowerCase(); if(w.length>3) wordCounts[w]=(wordCounts[w]||0)+1; }); }
  }); });
  const avg={}; for(const k in sliders){ const a=sliders[k]; avg[k]=(a.reduce((s,v)=>s+v,0)/a.length).toFixed(2); }
  const rows=[]; rows.push({ chave:'total_respostas', valor: total }); for(const k in avg) rows.push({ chave:'avg_'+k, valor: avg[k] }); rows.push({ chave:'mood_pre_counts', valor: JSON.stringify(moodPre) }); rows.push({ chave:'mood_post_counts', valor: JSON.stringify(moodPost) }); const words = Object.entries(wordCounts).sort((a,b)=>b[1]-a[1]).slice(0,20).map(x=>x.join(':')); rows.push({ chave:'top_words', valor: words.join(', ') });
  return rows;
}

// Dashboard & charts
function openDashboard(){
  // ensure admin is logged
  if(!adminLogged){
    // If quiz overlay is open for some reason, hide it to avoid visual conflicts
    hide('quizOverlay'); document.body.style.overflow = 'auto';
    show('adminModal');
    return;
  }
  renderSaved();
  computeCharts();
  show('dashboardModal');
}

function computeCharts(){
  const arr = loadAll();
  const preCounts = {}; const postCounts = {}; const sliderSums = {}; const sliderCounts = {};
  arr.forEach(r=> r.exploded.forEach(e=>{
    if(e.id.includes('mood')){ if(r.type==='pre') preCounts[e.answer]=(preCounts[e.answer]||0)+1; else postCounts[e.answer]=(postCounts[e.answer]||0)+1; }
    else if(!isNaN(parseFloat(e.answer))){ sliderSums[e.question] = (sliderSums[e.question]||0) + parseFloat(e.answer); sliderCounts[e.question] = (sliderCounts[e.question]||0) + 1; }
  }));
  const sliderLabels = Object.keys(sliderSums); const sliderVals = sliderLabels.map(l => (sliderSums[l]/sliderCounts[l]).toFixed(2));
  try {
    if($('chartMoodPre') && $('chartMoodPre').getContext){
      const ctxPre = $('chartMoodPre').getContext('2d'); if(charts.pre) charts.pre.destroy();
      charts.pre = new Chart(ctxPre, { type:'pie', data:{ labels: Object.keys(preCounts), datasets:[{ data: Object.values(preCounts), backgroundColor:['#60a5fa','#34d399','#fbbf24','#fb7185','#c084fc'] }] } });
    }
    if($('chartMoodPost') && $('chartMoodPost').getContext){
      const ctxPost = $('chartMoodPost').getContext('2d'); if(charts.post) charts.post.destroy();
      charts.post = new Chart(ctxPost, { type:'pie', data:{ labels: Object.keys(postCounts), datasets:[{ data: Object.values(postCounts), backgroundColor:['#60a5fa','#34d399','#fbbf24','#fb7185','#c084fc'] }] } });
    }
    if($('chartSliders') && $('chartSliders').getContext){
      const ctxSl = $('chartSliders').getContext('2d'); if(charts.sl) charts.sl.destroy();
      charts.sl = new Chart(ctxSl, { type:'bar', data:{ labels: sliderLabels, datasets:[{ label:'Média', data: sliderVals, backgroundColor:'#7c3aed' }] }, options:{ scales:{ y:{ beginAtZero:true } } } });
    }
  } catch(e){
    console.warn('Erro ao renderizar charts:', e);
  }
  const sum = buildSummary(arr);
  if($('summaryTable')) $('summaryTable').innerHTML = '<pre class="text-xs">' + JSON.stringify(Object.fromEntries(sum.map(s=>[s.chave,s.valor])), null, 2) + '</pre>';
}

// Render saved responses (modal)
function renderSaved(){
  const area = $('savedContent'); if(!area) return;
  area.innerHTML = '';
  const arr = loadAll().slice().reverse();
  if(arr.length === 0){ area.innerHTML = '<div class="text-slate-500">Nenhuma resposta.</div>'; return; }
  arr.forEach(r=>{
    const card = document.createElement('div'); card.className = 'p-3 rounded-lg border border-slate-100';
    let html = `<div class="flex justify-between"><div><strong>${r.name}</strong><div class="text-xs text-slate-500">${new Date(r.datetime).toLocaleString()}</div></div>`;
    html += `<div class="text-xs text-slate-500">${r.type === 'pre' ? 'Pré-aula' : 'Pós-aula'}</div></div><div class="mt-2 space-y-1">`;
    r.exploded.forEach(e=> html += `<div class="text-sm"><em class="text-slate-500">${e.question}</em><div>${escapeHtml(e.answer) || '<i class="text-slate-400">vazio</i>'}</div></div>`);
    html += '</div>';
    card.innerHTML = html; area.appendChild(card);
  });
  // update recent list on main page
  const recent = $('recentList'); if(recent){ recent.innerHTML = ''; loadAll().slice(-5).reverse().forEach(r => {
    const d = document.createElement('div'); d.className='text-sm p-2 rounded-md bg-slate-50';
    d.innerHTML = `<strong>${r.name}</strong> • <span class="text-xs text-slate-500">${new Date(r.datetime).toLocaleString()}</span> • <span class="text-xs text-slate-500">${r.type}</span>`;
    recent.appendChild(d);
  }); }
  if($('savedCount')) $('savedCount').textContent = 'Respostas: ' + loadAll().length;
}

// Admin auth
function openAdmin(){
  // explicitly hide quiz overlay if visible to avoid visual conflict
  hide('quizOverlay'); document.body.style.overflow = 'auto';
  show('adminModal');
}
function adminLogin(){
  const user = $('adminUser') ? $('adminUser').value.trim() : '';
  const pass = $('adminPass') ? $('adminPass').value : '';
  if(user === 'admin' && pass === '1234'){
    adminLogged = true;
    hide('adminModal');
    // open dashboard directly
    renderSaved(); computeCharts(); show('dashboardModal');
  } else {
    alert('Credenciais inválidas (demo: admin / 1234)');
  }
}

// Helpers
function escapeHtml(text){ if(!text) return ''; return String(text).replace(/[&<>\"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]; }); }
function refreshUI(){ renderSaved(); if($('savedCount')) $('savedCount').textContent = 'Respostas: ' + loadAll().length; }

// Wiring
window.addEventListener('DOMContentLoaded', ()=>{
  // quiz
  const pre = $('btnPre'); if(pre) pre.addEventListener('click', ()=> startQuiz('pre'));
  const post = $('btnPost'); if(post) post.addEventListener('click', ()=> startQuiz('post'));
  const qNext = $('quizNext'); if(qNext) qNext.addEventListener('click', nextQuestion);
  const qPrev = $('quizPrev'); if(qPrev) qPrev.addEventListener('click', prevQuestion);
  const qSkip = $('quizSkip'); if(qSkip) qSkip.addEventListener('click', skipQuestion);
  // saved modal
  const viewSaved = $('btnViewSaved'); if(viewSaved) viewSaved.addEventListener('click', ()=>{ renderSaved(); show('savedModal'); });
  const savedClose = $('savedClose'); if(savedClose) savedClose.addEventListener('click', ()=> hide('savedModal'));
  const savedClear = $('savedClear'); if(savedClear) savedClear.addEventListener('click', ()=>{ if(confirm('Limpar tudo?')){ clearAll(); renderSaved(); } });
  // export
  const btnExport = $('btnExport'); if(btnExport) btnExport.addEventListener('click', exportExcel);
  // admin / dashboard
  const btnOpenAdmin = $('openAdmin'); if(btnOpenAdmin) btnOpenAdmin.addEventListener('click', openAdmin);
  const adminCancel = $('adminCancel'); if(adminCancel) adminCancel.addEventListener('click', ()=> hide('adminModal'));
  const adminLoginBtn = $('adminLoginBtn'); if(adminLoginBtn) adminLoginBtn.addEventListener('click', adminLogin);
  const btnOpenDash = $('btnOpenDashboard'); if(btnOpenDash) btnOpenDash.addEventListener('click', ()=> { if(adminLogged) { renderSaved(); computeCharts(); show('dashboardModal'); } else openAdmin(); });
  const closeDash = $('closeDashboard'); if(closeDash) closeDash.addEventListener('click', ()=> hide('dashboardModal'));
  const applyFilters = $('applyFilters'); if(applyFilters) applyFilters.addEventListener('click', ()=> { computeCharts(); alert('Filtros aplicados (placeholder).'); });
  // close quiz by clicking backdrop area
  const quizOverlay = $('quizOverlay'); if(quizOverlay) quizOverlay.addEventListener('click', (e)=>{ if(e.target === quizOverlay){ hide('quizOverlay'); document.body.style.overflow = 'auto'; state = { name:'', mode:'', qlist:[], answers:[], idx:0 }; } });
  // initial UI
  refreshUI();
});
