const API_URL='https://script.google.com/macros/s/AKfycby3oOaHap0Z-WkUtlxJgRKeowY5j7qCH12BbeTZd6TlpC7svLze46PPE4NZaZHZKY3b/exec';
let user=null,data={},schema={};
const cfg={
  sekolah:{title:'Data Satuan PAUD',sheet:'SEKOLAH',key:'ID'},
  mingguan:{title:'Monitoring Mingguan',sheet:'MONITORING_MINGGUAN',key:'ID_LAPORAN'},
  bulanan:{title:'Monitoring Bulanan',sheet:'MONITORING_BULANAN',key:'ID_LAPORAN'},
  indikator:{title:'Indikator Monev',sheet:'INDIKATOR_MONEV',key:'ID_CHECK'},
  kendala:{title:'Kendala',sheet:'KENDALA',key:'ID_KENDALA'},
  dokumentasi:{title:'Dokumentasi',sheet:'DOKUMENTASI',key:'ID_DOK'},
  dokumen:{title:'Dokumen PAUD',sheet:'DOKUMEN_PAUD',key:'ID_DOKUMEN'},
  users:{title:'Pengguna',sheet:'USERS',key:'ID_USER'}
};
const $=x=>document.getElementById(x);
const esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function jsonp(action,params={}){
  return new Promise((resolve,reject)=>{
    const cb='monrev_cb_'+Date.now()+'_'+Math.floor(Math.random()*100000);
    const url=new URL(API_URL);
    url.searchParams.set('action',action);
    url.searchParams.set('callback',cb);
    Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,typeof v==='string'?v:JSON.stringify(v)));
    const script=document.createElement('script');
    const timer=setTimeout(()=>{cleanup();reject(new Error('Request timeout ke Apps Script.'))},20000);
    function cleanup(){clearTimeout(timer);delete window[cb];script.remove()}
    window[cb]=result=>{cleanup();resolve(result)};
    script.onerror=()=>{cleanup();reject(new Error('Apps Script tidak dapat diakses.'))};
    script.src=url.toString();
    document.body.appendChild(script);
  });
}
const get=jsonp;

async function mutate(action,payload){
  return jsonp(action,{...payload,role:user.role});
}

function toast(t,ok=true){
  const x=$('toast');
  x.textContent=t;
  x.className=ok?'show ok':'show bad';
  setTimeout(()=>x.className='',2800);
}

$('loginForm').onsubmit=async e=>{
  e.preventDefault();
  try{
    const r=await get('login',{username:$('username').value,password:$('password').value});
    if(!r.ok)return toast(r.message||r.error||'Login gagal.',false);
    user=r.user;
    sessionStorage.user=JSON.stringify(user);
    await boot();
  }catch(err){toast(err.message,false)}
};

$('logoutBtn').onclick=()=>{sessionStorage.removeItem('user');location.reload()};
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>show(b.dataset.page));

async function boot(){
  try{
    $('loginView').classList.add('hidden');
    $('appView').classList.remove('hidden');
    $('userLabel').textContent=user.nama+' · '+user.role;
    const [s,d]=await Promise.all([get('schema'),get('allData')]);
    if(!s.ok)throw new Error(s.error||'Schema gagal dimuat.');
    if(!d.ok)throw new Error(d.error||'Data gagal dimuat.');
    schema=s.sheets||{};
    data=d.data||{};
    Object.keys(schema).forEach(k=>{if(!Array.isArray(data[k]))data[k]=[]});
    show('dashboard');
  }catch(err){
    $('loginView').classList.remove('hidden');
    $('appView').classList.add('hidden');
    toast(err.message,false);
  }
}

function show(p){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active-page'));
  $(p).classList.add('active-page');
  document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===p));
  render(p);
}

async function refresh(){
  const r=await get('allData');
  if(!r.ok)return toast(r.error||'Gagal memperbarui data.',false);
  data=r.data||{};
  const active=document.querySelector('.active-page');
  if(active)render(active.id);
  toast('Data diperbarui');
}

function render(p){
  if(p==='dashboard')return dash();
  if(p==='rekap')return rekap();
  if(p==='petunjuk')return info();
  if(cfg[p])return table(p);
}

function dash(){
  const s=(data.SEKOLAH||[]).filter(x=>String(x.STATUS_AKTIF).toUpperCase()==='YA');
  const m=data.MONITORING_MINGGUAN||[];
  const nums=m.map(x=>+x.REALISASI_PROGRES).filter(Number.isFinite);
  const avg=nums.length?(nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(1):0;
  const k=(data.KENDALA||[]).filter(x=>!['SELESAI','DITUTUP','CLOSED'].includes(String(x.STATUS).toUpperCase())).length;
  const st={SELESAI:0,BERJALAN:0,TERLAMBAT:0,BELUM_MULAI:0};
  s.forEach(x=>{const rows=m.filter(y=>String(y.ID_SEKOLAH)===String(x.ID));const q=rows[rows.length-1];const z=q?String(q.STATUS).toUpperCase():'BELUM_MULAI';if(st[z]!==undefined)st[z]++;else st.BERJALAN++});
  const kec={};s.forEach(x=>{const a=x.KECAMATAN||'Lainnya';kec[a]=(kec[a]||0)+1});
  $('dashboard').innerHTML=`<div class="hero"><div><div class="eyebrow">CONTROL CENTER</div><h1>Dashboard Monev</h1><p>Pantau progres revitalisasi PAUD Wonogiri secara ringkas dan terukur.</p></div><div class="hero-actions"><button class="ghost" onclick="refresh()">↻ Refresh</button><button class="gold-btn" onclick="show('rekap')">▥ Rekap Sekolah</button></div></div><div class="stats"><div class="stat glass"><span>Satuan Aktif</span><b>${s.length}</b></div><div class="stat glass"><span>Rata-rata Progres</span><b>${avg}%</b></div><div class="stat glass"><span>Monitoring Mingguan</span><b>${m.length}</b></div><div class="stat glass"><span>Kendala Aktif</span><b>${k}</b></div></div><div class="grid2"><div class="panel glass"><div class="panel-head"><div><h2>Status Terakhir</h2><small>Distribusi berdasarkan monitoring terakhir tiap sekolah</small></div></div><div class="status-grid"><div><b>${st.SELESAI}</b><span>Selesai</span></div><div><b>${st.BERJALAN}</b><span>Berjalan</span></div><div><b>${st.TERLAMBAT}</b><span>Terlambat</span></div><div><b>${st.BELUM_MULAI}</b><span>Belum Mulai</span></div></div></div><div class="panel glass"><div class="panel-head"><div><h2>Akses Cepat</h2><small>Menu yang sering digunakan</small></div></div><div class="quick-grid"><button onclick="show('sekolah')">Satuan PAUD</button><button onclick="show('mingguan')">Monitoring Mingguan</button><button onclick="show('bulanan')">Monitoring Bulanan</button><button onclick="show('kendala')">Kendala</button><button onclick="show('rekap')">Rekap Sekolah</button></div></div></div><div class="panel glass"><div class="panel-head"><div><h2>Sebaran Satuan per Kecamatan</h2><small>Jumlah satuan PAUD aktif</small></div></div><div class="bars">${Object.entries(kec).map(([a,b])=>`<div class="bar-row"><span>${esc(a)}</span><div><i style="width:${s.length?Math.max(4,b/s.length*100):0}%"></i></div><b>${b}</b></div>`).join('')||'<em>Belum ada data.</em>'}</div></div>`;
}

function table(p){
  const c=cfg[p],rows=data[c.sheet]||[];
  $(''+p).innerHTML=`<div class="hero"><div><div class="eyebrow">MODUL</div><h1>${c.title}</h1><p>${rows.length} data tersimpan.</p></div><div class="hero-actions"><button class="ghost" onclick="refresh()">↻ Refresh</button><button class="gold-btn" onclick="form('${p}')">＋ Tambah Data</button></div></div><div class="panel glass"><div class="toolbar"><input id="q_${p}" placeholder="Cari data..." oninput="filter('${p}')"></div><div class="table-wrap"><table id="t_${p}"><thead><tr>${(schema[c.sheet]||[]).map(h=>`<th>${esc(h)}</th>`).join('')}<th>Aksi</th></tr></thead><tbody>${rows.map((r,i)=>`<tr>${(schema[c.sheet]||[]).map(h=>`<td>${cell(r[h],h)}</td>`).join('')}<td><button class="mini" onclick="form('${p}',${i})">Edit</button><button class="mini danger" onclick="del('${p}',${i})">Hapus</button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function cell(v,h){if(v===''||v==null)return'<span class="muted">—</span>';if(String(h).includes('URL')||String(h).includes('FILE_URL'))return`<a href="${esc(v)}" target="_blank">Buka ↗</a>`;return esc(v)}
function filter(p){const q=$('q_'+p).value.toLowerCase();document.querySelectorAll(`#t_${p} tbody tr`).forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?'':'none')}

function inp(k,label,v='',type='text',extra=''){return`<label>${esc(label)}<input id="f_${esc(k)}" type="${type}" value="${esc(v)}" ${extra}></label>`}
function select(k,label,v,opts){return`<label>${esc(label)}<select id="f_${esc(k)}"><option value="">Pilih...</option>${opts.map(o=>`<option value="${esc(o)}" ${String(o)===String(v)?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`}
function schoolSelect(k,v){
  const schools=(data.SEKOLAH||[]).filter(x=>String(x.STATUS_AKTIF).toUpperCase()==='YA');
  return`<label>Satuan PAUD<select id="f_${k}"><option value="">Pilih satuan...</option>${schools.map(x=>{const val=x.ID;return`<option value="${esc(val)}" ${String(val)===String(v)?'selected':''}>${esc(x.NAMA_SATUAN)} — ${esc(x.ID)}</option>`}).join('')}</select></label>`;
}

function specialFields(p,r){
  if(p==='sekolah')return [inp('ID','ID',r.ID||crypto.randomUUID()),inp('NPSN','NPSN',r.NPSN),inp('NAMA_SATUAN','Nama Satuan',r.NAMA_SATUAN),select('JENIS','Jenis',r.JENIS,['TK','KB','SPS','TPA','Lainnya']),inp('KECAMATAN','Kecamatan',r.KECAMATAN),inp('DESA','Desa/Kelurahan',r.DESA),inp('MENU_REVIT','Menu Revitalisasi',r.MENU_REVIT),inp('ANGGARAN','Anggaran',r.ANGGARAN,'number'),inp('TARGET_SELESAI','Target Selesai',r.TARGET_SELESAI,'date'),select('STATUS_AKTIF','Status Aktif',r.STATUS_AKTIF,['YA','TIDAK'])].join('');
  if(p==='mingguan')return [inp('ID_LAPORAN','ID Laporan',r.ID_LAPORAN||crypto.randomUUID()),schoolSelect('ID_SEKOLAH',r.ID_SEKOLAH),inp('NAMA_SATUAN','Nama Satuan',r.NAMA_SATUAN,'text','readonly'),inp('MINGGU_KE','Minggu Ke',r.MINGGU_KE,'number'),inp('TANGGAL_MULAI','Tanggal Mulai',r.TANGGAL_MULAI,'date'),inp('TANGGAL_AKHIR','Tanggal Akhir',r.TANGGAL_AKHIR,'date'),inp('RENCANA_PROGRES','Rencana Progres (%)',r.RENCANA_PROGRES,'number','min="0" max="100" step="0.01"'),inp('REALISASI_PROGRES','Realisasi Progres (%)',r.REALISASI_PROGRES,'number','min="0" max="100" step="0.01"'),select('STATUS','Status',r.STATUS,['BELUM_MULAI','BERJALAN','TERLAMBAT','SELESAI']),inp('KETERANGAN','Keterangan',r.KETERANGAN),inp('TINDAK_LANJUT','Tindak Lanjut',r.TINDAK_LANJUT),inp('PELAPOR','Pelapor',r.PELAPOR||user.nama)].join('');
  if(p==='bulanan')return [inp('ID_LAPORAN','ID Laporan',r.ID_LAPORAN||crypto.randomUUID()),schoolSelect('ID_SEKOLAH',r.ID_SEKOLAH),inp('NAMA_SATUAN','Nama Satuan',r.NAMA_SATUAN,'text','readonly'),select('BULAN','Bulan',r.BULAN,['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']),inp('TAHUN','Tahun',r.TAHUN||2026,'number'),inp('RENCANA_PROGRES','Rencana Progres (%)',r.RENCANA_PROGRES,'number'),inp('REALISASI_PROGRES','Realisasi Progres (%)',r.REALISASI_PROGRES,'number'),select('STATUS','Status',r.STATUS,['BELUM_MULAI','BERJALAN','TERLAMBAT','SELESAI']),inp('KETERANGAN','Keterangan',r.KETERANGAN),inp('TINDAK_LANJUT','Tindak Lanjut',r.TINDAK_LANJUT),inp('PELAPOR','Pelapor',r.PELAPOR||user.nama)].join('');
  if(p==='kendala')return [inp('ID_KENDALA','ID Kendala',r.ID_KENDALA||crypto.randomUUID()),schoolSelect('ID_SEKOLAH',r.ID_SEKOLAH),inp('NAMA_SATUAN','Nama Satuan',r.NAMA_SATUAN,'text','readonly'),inp('TANGGAL','Tanggal',r.TANGGAL,'date'),select('KATEGORI','Kategori',r.KATEGORI,['Teknis','Administrasi','Anggaran','SDM','Pengadaan','Cuaca','Lainnya']),inp('URAIAN','Uraian Kendala',r.URAIAN),select('PRIORITAS','Prioritas',r.PRIORITAS,['Rendah','Sedang','Tinggi','Darurat']),select('STATUS','Status',r.STATUS,['OPEN','BERJALAN','SELESAI']),inp('TINDAK_LANJUT','Tindak Lanjut',r.TINDAK_LANJUT),inp('TARGET_SELESAI','Target Selesai',r.TARGET_SELESAI,'date'),inp('PIC','PIC',r.PIC)].join('');
  if(p==='indikator')return [inp('ID_CHECK','ID Check',r.ID_CHECK||crypto.randomUUID()),schoolSelect('ID_SEKOLAH',r.ID_SEKOLAH),inp('NAMA_SATUAN','Nama Satuan',r.NAMA_SATUAN,'text','readonly'),inp('TANGGAL','Tanggal',r.TANGGAL,'date'),select('PEKERJAAN_SESUAI_RENCANA','Pekerjaan Sesuai Rencana',r.PEKERJAAN_SESUAI_RENCANA,['YA','TIDAK']),select('PROGRES_FISIK','Progres Fisik',r.PROGRES_FISIK,['BAIK','CUKUP','KURANG']),select('ADMINISTRASI','Administrasi',r.ADMINISTRASI,['LENGKAP','SEBAGIAN','BELUM']),select('DOKUMENTASI','Dokumentasi',r.DOKUMENTASI,['LENGKAP','SEBAGIAN','BELUM']),select('PENGGUNAAN_ANGGARAN','Penggunaan Anggaran',r.PENGGUNAAN_ANGGARAN,['SESUAI','PERLU_REVIEW','TIDAK_SESUAI']),select('KESELAMATAN_KERJA','Keselamatan Kerja',r.KESELAMATAN_KERJA,['BAIK','PERLU_PERBAIKAN','KRITIS']),inp('CATATAN','Catatan',r.CATATAN),inp('PETUGAS','Petugas',r.PETUGAS||user.nama)].join('');
  if(p==='users')return [inp('ID_USER','ID User',r.ID_USER||crypto.randomUUID()),inp('USERNAME','Username',r.USERNAME),inp('PASSWORD','Password',r.PASSWORD,'password'),inp('NAMA','Nama',r.NAMA),select('ROLE','Role',r.ROLE,['ADMIN','PIMPINAN']),inp('ID_SEKOLAH','ID Sekolah',r.ID_SEKOLAH),select('STATUS','Status',r.STATUS,['AKTIF','NONAKTIF'])].join('');
  return (schema[cfg[p].sheet]||[]).map(h=>inp(h,h,r[h])).join('');
}

function form(p,i=null){
  const r=i==null?{}:data[cfg[p].sheet][i];
  const fields=specialFields(p,r);
  $('toast').innerHTML=`<div class="modal"><div class="modal-card glass"><div class="modal-head"><div><div class="eyebrow">FORM DATA</div><h2>${i==null?'Tambah':'Edit'} ${cfg[p].title}</h2></div><button class="x" onclick="closeModal()">×</button></div><div class="form-grid">${fields}</div><div class="modal-actions"><button class="ghost" onclick="closeModal()">Batal</button><button class="gold-btn" onclick="save('${p}',${i==null?'null':i})">Simpan Data</button></div></div></div>`;
}

async function save(p,i){
  try{
    const c=cfg[p],headers=schema[c.sheet]||[];
    let values=headers.map(h=>{const el=$('f_'+h);return el?el.value:''});
    if(['mingguan','bulanan','kendala','indikator'].includes(p)){
      const sid=$('f_ID_SEKOLAH')?.value||'';
      const school=(data.SEKOLAH||[]).find(x=>String(x.ID)===String(sid));
      const ni=headers.indexOf('ID_SEKOLAH'),nn=headers.indexOf('NAMA_SATUAN');
      if(ni>=0)values[ni]=sid;
      if(nn>=0)values[nn]=school?.NAMA_SATUAN||'';
    }
    if(p==='mingguan'||p==='bulanan'){
      const rr=headers.indexOf('DEVIASI'),rp=headers.indexOf('RENCANA_PROGRES'),re=headers.indexOf('REALISASI_PROGRES');
      if(rr>=0&&rp>=0&&re>=0)values[rr]=(Number(values[re]||0)-Number(values[rp]||0)).toFixed(2);
    }
    const result=i==null
      ? await mutate('saveRow',{sheet:c.sheet,values:JSON.stringify(values)})
      : await mutate('updateRow',{sheet:c.sheet,keyField:c.key,key:String(data[c.sheet][i][c.key]),values:JSON.stringify(values)});
    if(!result.ok)return toast(result.error||result.message||'Gagal menyimpan.',false);
    closeModal();await refresh();toast(result.message||'Data berhasil disimpan.');
  }catch(err){toast(err.message,false)}
}

async function del(p,i){
  if(!confirm('Hapus data ini?'))return;
  try{
    const c=cfg[p];
    const result=await mutate('deleteRow',{sheet:c.sheet,keyField:c.key,key:String(data[c.sheet][i][c.key])});
    if(!result.ok)return toast(result.error||'Gagal menghapus.',false);
    await refresh();toast(result.message||'Data dihapus.');
  }catch(err){toast(err.message,false)}
}

function closeModal(){document.querySelector('.modal')?.remove();$('toast').className=''}
function info(){$('petunjuk').innerHTML=`<div class="hero"><div><div class="eyebrow">PANDUAN</div><h1>Petunjuk Sistem</h1><p>Gunakan navigasi untuk mengelola proses monitoring.</p></div></div><div class="panel glass info">${(data.PETUNJUK||[]).map(r=>`<p>${Object.values(r).map(esc).join(' — ')}</p>`).join('')||'<p>Petunjuk belum tersedia.</p>'}</div>`}

function rekap(){
  const schools=(data.SEKOLAH||[]).filter(x=>String(x.STATUS_AKTIF).toUpperCase()==='YA');
  $('rekap').innerHTML=`<div class="hero"><div><div class="eyebrow">MONITORING DETAIL</div><h1>Rekap per Sekolah</h1><p>Pilih satuan PAUD untuk melihat ringkasan progres, monitoring, kendala, indikator, dan dokumen.</p></div><div class="hero-actions"><button class="ghost" onclick="refresh()">↻ Refresh</button></div></div><div class="panel glass"><div class="rekap-select"><label>Pilih Satuan PAUD<select id="rekapSchool" onchange="renderRekapSchool()"><option value="">Pilih sekolah...</option>${schools.map(x=>`<option value="${esc(x.ID)}">${esc(x.NAMA_SATUAN)} — ${esc(x.ID)}</option>`).join('')}</select></label></div><div id="rekapContent"><div class="empty">Silakan pilih satuan PAUD.</div></div></div>`;
}

function renderRekapSchool(){
  const id=$('rekapSchool')?.value;
  const target=$('rekapContent');
  if(!id){target.innerHTML='<div class="empty">Silakan pilih satuan PAUD.</div>';return}
  const school=(data.SEKOLAH||[]).find(x=>String(x.ID)===String(id));
  if(!school){target.innerHTML='<div class="empty">Data sekolah tidak ditemukan.</div>';return}
  const weekly=(data.MONITORING_MINGGUAN||[]).filter(x=>String(x.ID_SEKOLAH)===String(id));
  const monthly=(data.MONITORING_BULANAN||[]).filter(x=>String(x.ID_SEKOLAH)===String(id));
  const kendala=(data.KENDALA||[]).filter(x=>String(x.ID_SEKOLAH)===String(id));
  const indikator=(data.INDIKATOR_MONEV||[]).filter(x=>String(x.ID_SEKOLAH)===String(id));
  const dokumentasi=(data.DOKUMENTASI||[]).filter(x=>String(x.ID_SEKOLAH)===String(id));
  const dokumen=(data.DOKUMEN_PAUD||[]).filter(x=>String(x.ID_SEKOLAH)===String(id));
  const latest=weekly.length?weekly[weekly.length-1]:null;
  const latestMonthly=monthly.length?monthly[monthly.length-1]:null;
  const avg=weekly.length?weekly.map(x=>Number(x.REALISASI_PROGRES)).filter(Number.isFinite):[];
  const avgValue=avg.length?(avg.reduce((a,b)=>a+b,0)/avg.length).toFixed(1):'0';
  const activeKendala=kendala.filter(x=>!['SELESAI','DITUTUP','CLOSED'].includes(String(x.STATUS).toUpperCase())).length;
  target.innerHTML=`<div class="school-profile"><div><div class="eyebrow">SATUAN PAUD</div><h2>${esc(school.NAMA_SATUAN||'-')}</h2><p>${esc(school.ID||'')} · NPSN ${esc(school.NPSN||'-')} · ${esc(school.JENIS||'-')}</p><p>${esc(school.DESa||school.DESA||'-')}, Kec. ${esc(school.KECAMATAN||'-')}</p></div><div class="school-meta"><span>Status <b>${esc(school.STATUS_AKTIF||'-')}</b></span><span>Menu Revitalisasi <b>${esc(school.MENU_REVIT||'-')}</b></span><span>Target <b>${esc(school.TARGET_SELESAI||'-')}</b></span></div></div><div class="stats compact"><div class="stat"><span>Progres Rata-rata</span><b>${avgValue}%</b></div><div class="stat"><span>Monitoring Mingguan</span><b>${weekly.length}</b></div><div class="stat"><span>Kendala Aktif</span><b>${activeKendala}</b></div><div class="stat"><span>Dokumentasi</span><b>${dokumentasi.length}</b></div></div><div class="grid2"><div class="panel nested"><h3>Monitoring Mingguan Terakhir</h3>${latest?`<div class="detail-grid"><span>Status<strong>${esc(latest.STATUS||'-')}</strong></span><span>Progres<strong>${esc(latest.REALISASI_PROGRES||0)}%</strong></span><span>Minggu<strong>${esc(latest.MINGGU_KE||'-')}</strong></span><span>Deviasi<strong>${esc(latest.DEVIASI||'-')}</strong></span><span>Tanggal<strong>${esc(latest.TANGGAL_AKHIR||'-')}</strong></span></div><p>${esc(latest.KETERANGAN||'Tidak ada keterangan.')}</p>`:'<div class="empty">Belum ada monitoring mingguan.</div>'}</div><div class="panel nested"><h3>Monitoring Bulanan Terakhir</h3>${latestMonthly?`<div class="detail-grid"><span>Periode<strong>${esc(latestMonthly.BULAN||'-')} ${esc(latestMonthly.TAHUN||'')}</strong></span><span>Status<strong>${esc(latestMonthly.STATUS||'-')}</strong></span><span>Progres<strong>${esc(latestMonthly.REALISASI_PROGRES||0)}%</strong></span><span>Deviasi<strong>${esc(latestMonthly.DEVIASI||'-')}</strong></span></div><p>${esc(latestMonthly.KETERANGAN||'Tidak ada keterangan.')}</p>`:'<div class="empty">Belum ada monitoring bulanan.</div>'}</div></div><div class="grid2"><div class="panel nested"><h3>Kendala</h3>${kendala.length?`<div class="mini-list">${kendala.slice(-8).reverse().map(x=>`<div><b>${esc(x.PRIORITAS||'-')}</b> · ${esc(x.STATUS||'-')}<p>${esc(x.URAIAN||'-')}</p><small>${esc(x.TINDAK_LANJUT||'')}</small></div>`).join('')}</div>`:'<div class="empty">Belum ada kendala.</div>'}</div><div class="panel nested"><h3>Indikator Monev Terakhir</h3>${indikator.length?`<div class="detail-grid"><span>Sesuai Rencana<strong>${esc(indikator[indikator.length-1].PEKERJAAN_SESUAI_RENCANA||'-')}</strong></span><span>Progres Fisik<strong>${esc(indikator[indikator.length-1].PROGRES_FISIK||'-')}</strong></span><span>Administrasi<strong>${esc(indikator[indikator.length-1].ADMINISTRASI||'-')}</strong></span><span>Dokumentasi<strong>${esc(indikator[indikator.length-1].DOKUMENTASI||'-')}</strong></span><span>Anggaran<strong>${esc(indikator[indikator.length-1].PENGGUNAAN_ANGGARAN||'-')}</strong></span><span>K3<strong>${esc(indikator[indikator.length-1].KESELAMATAN_KERJA||'-')}</strong></span></div><p>${esc(indikator[indikator.length-1].CATATAN||'Tidak ada catatan.')}</p>`:'<div class="empty">Belum ada indikator monev.</div>'}</div></div><div class="grid2"><div class="panel nested"><h3>Dokumentasi</h3>${dokumentasi.length?`<div class="mini-list">${dokumentasi.slice(-8).reverse().map(x=>`<div><b>${esc(x.TAHAP||'-')}</b> · ${esc(x.TANGGAL||'-')} ${x.URL_FOTO?`· <a href="${esc(x.URL_FOTO)}" target="_blank">Buka foto ↗</a>`:''}<p>${esc(x.KETERANGAN||'')}</p></div>`).join('')}</div>`:'<div class="empty">Belum ada dokumentasi.</div>'}</div><div class="panel nested"><h3>Dokumen PAUD</h3>${dokumen.length?`<div class="mini-list">${dokumen.slice(-8).reverse().map(x=>`<div><b>${esc(x.JENIS_DOKUMEN||'-')}</b> · ${esc(x.TAHUN||'-')} ${x.FILE_URL?`· <a href="${esc(x.FILE_URL)}" target="_blank">Buka dokumen ↗</a>`:''}<p>${esc(x.NAMA_FILE||'')}</p></div>`).join('')}</div>`:'<div class="empty">Belum ada dokumen.</div>'}</div></div>`;
}

const saved=sessionStorage.user;
if(saved){try{user=JSON.parse(saved);boot()}catch(e){sessionStorage.removeItem('user')}}
