const API_URL = 'GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT';
let currentUser = null;
let sekolahCache = [];

const $ = id => document.getElementById(id);

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const u = $('username').value.trim(), p = $('password').value;
  try {
    const r = await apiGet('login', {username:u,password:p});
    if (!r.ok) return alert(r.message || 'Login gagal');
    currentUser = r.user;
    sessionStorage.setItem('monrev_user', JSON.stringify(currentUser));
    showApp();
  } catch(err) { alert('Gagal terhubung ke server: ' + err.message); }
});

$('logoutBtn').onclick = () => { sessionStorage.removeItem('monrev_user'); location.reload(); };
$('search').addEventListener('input', renderSekolah);

async function showApp(){
  $('loginView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  $('userLabel').textContent = `${currentUser.nama} · ${currentUser.role}`;
  await loadDashboard();
  await loadSekolah();
}

async function loadDashboard(){
  const d = await apiGet('dashboard');
  if (!d.ok) return alert(d.error || 'Gagal memuat dashboard');
  $('kpi').innerHTML = `
    <div class="card kpi"><div class="muted">Total Satuan</div><b>${d.totalSekolah}</b></div>
    <div class="card kpi"><div class="muted">Rata-rata Progres</div><b>${d.rataRataProgres}%</b></div>
    <div class="card kpi"><div class="muted">Selesai</div><b>${d.status.SELESAI}</b></div>
    <div class="card kpi"><div class="muted">Kendala Aktif</div><b>${d.kendalaAktif}</b></div>`;
  $('statusList').innerHTML = Object.entries(d.status).map(([k,v]) =>
    `<div class="status-row"><span>${k.replaceAll('_',' ')}</span><strong>${v}</strong></div>`).join('');
  $('kendala').innerHTML = `<div class="kpi"><b>${d.kendalaAktif}</b><span class="muted">kendala belum selesai</span></div>`;
}

async function loadSekolah(){ sekolahCache = await apiGet('sekolah'); renderSekolah(); }
function renderSekolah(){
  const q = ($('search').value || '').toLowerCase();
  const rows = sekolahCache.filter(r => JSON.stringify(r).toLowerCase().includes(q));
  $('sekolahBody').innerHTML = rows.map(r => `<tr>
    <td>${r.ID||''}</td><td>${r.NPSN||''}</td><td>${r.NAMA_SATUAN||''}</td>
    <td>${r.KECAMATAN||''}</td><td>${Number(r.ANGGARAN||0).toLocaleString('id-ID')}</td>
    <td><span class="badge">${r.STATUS_AKTIF||''}</span></td></tr>`).join('');
}

async function apiGet(action, params={}){
  const qs = new URLSearchParams({action,...params});
  const res = await fetch(`${API_URL}?${qs.toString()}`);
  return res.json();
}

const saved = sessionStorage.getItem('monrev_user');
if(saved){ currentUser=JSON.parse(saved); showApp(); }
