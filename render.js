'use strict';
/* ============================ эффекты ============================ */
const RM=matchMedia('(prefers-reduced-motion: reduce)');
const CHECK='<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 7.4l3 3 5.8-6.4"/></svg>';
function toast(m){const w=$('#toast'),d=document.createElement('div');d.textContent=m;w.appendChild(d);setTimeout(()=>d.remove(),2800)}
const cv=$('#fx'),cx=cv.getContext('2d');let parts=[],raf=0;
function fit(){cv.width=innerWidth*devicePixelRatio;cv.height=innerHeight*devicePixelRatio;
  cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';
  cx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
addEventListener('resize',fit);fit();
function burst(n){
  if(RM.matches)return; n=n||70;
  const cols=['#0C8A62','#1F63D6','#B87708','#35CE9B','#6BA0FF'];
  for(let i=0;i<n;i++)parts.push({x:innerWidth/2+(Math.random()-.5)*120,y:innerHeight*.44,
    vx:(Math.random()-.5)*10,vy:-Math.random()*12-3,g:.34+Math.random()*.2,r:3+Math.random()*4,
    c:cols[i%cols.length],a:1,rot:Math.random()*6,vr:(Math.random()-.5)*.3});
  if(!raf)raf=requestAnimationFrame(tick);
}
function tick(){
  cx.clearRect(0,0,innerWidth,innerHeight);
  parts=parts.filter(p=>p.a>0&&p.y<innerHeight+50);
  parts.forEach(p=>{p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.a-=.0055;
    cx.save();cx.globalAlpha=Math.max(0,p.a);cx.translate(p.x,p.y);cx.rotate(p.rot);
    cx.fillStyle=p.c;cx.fillRect(-p.r,-p.r*.6,p.r*2,p.r*1.2);cx.restore()});
  if(parts.length)raf=requestAnimationFrame(tick);else{raf=0;cx.clearRect(0,0,innerWidth,innerHeight)}
}
const isOpen=()=>!$('#modal').classList.contains('hide');
function modal(h){const m=$('#modal');m.innerHTML='<div class="mbox">'+h+'</div>';m.classList.remove('hide')}
function closeModal(){const m=$('#modal');m.classList.add('hide');m.innerHTML=''}

/* ============================ XP ============================ */
function addXP(n,day){
  if(!n)return;
  const was=rankOf(S.xp).lvl;
  S.xp=Math.max(0,S.xp+n);
  if(day!==false){const r=rec();r.xp=Math.max(0,r.xp+n)}
  const now=rankOf(S.xp);
  if(now.lvl>was){
    burst(110);
    if(isOpen())toast('новый уровень: '+now.name);
    else modal('<div class="kicker">новый уровень</div><div class="big">'+esc(now.name)+'</div>'+
      '<div class="sub">Уровень '+now.lvl+'. Ровно из таких мелочей он и набирается.</div>'+
      '<button class="btn w" data-act="closemodal">дальше</button>');
  }
}
const opt=(list,sel)=>list.map(x=>'<option value="'+esc(x)+'"'+(x===sel?' selected':'')+'>'+esc(x)+'</option>').join('');

/* ============================ бэкап ============================ */
const bkAge=()=>S.lastBackup?dayDiff(S.lastBackup,dkey()):null;
function bkNeeded(){
  if(S.xp<=0&&!S.leads.length)return false;
  if(S.bkSnooze&&dayDiff(S.bkSnooze,dkey())<7)return false;
  const a=bkAge();
  if(a===null)return S.xp>=300||S.leads.length>=5;
  return a>=30;
}
function renderWarn(){
  const box=$('#warn');
  if(!box)return;
  let h='';
  if(!storeOk())
    h='<div class="note crit"><b>Прогресс не сохраняется</b>'+
      '<p>Браузер не даёт писать в хранилище: приватное окно или кончилось место. Сними бэкап, пока вкладка '+
      'открыта, иначе вся воронка исчезнет при закрытии.</p>'+
      '<button class="btn sm" data-act="bkfile">скачать бэкап</button></div>';
  else if(bkNeeded()){
    const a=bkAge();
    h='<div class="note"><b>'+(a===null?'Бэкапа ещё не было':'Бэкапа не было '+a+' '+plural(a,'день','дня','дней'))+'</b>'+
      '<p>Воронка и касса лежат только в этом браузере. Чистка данных сайта, новый телефон — и клиенты '+
      'пропадут вместе с историей. Файл занимает секунду.</p>'+
      '<div class="row" style="gap:8px"><button class="btn sm" data-act="bkfile">скачать файлом</button>'+
      '<button class="btn sm gh" data-act="snoozebk">потом</button></div></div>';
  }
  box.innerHTML=h;
}
function renderBk(){
  const box=$('#bkstate');
  if(!box)return;
  const a=bkAge();
  const when=a===null?'Бэкапа ещё не было'
    :a===0?'Бэкап снят сегодня'
    :'Последний бэкап — '+dparse(S.lastBackup).toLocaleDateString('ru-RU',{day:'numeric',month:'long'})+
     ', '+a+' '+plural(a,'день','дня','дней')+' назад';
  box.innerHTML='<div class="bkline'+(bkNeeded()?' warn':'')+'"><b>'+when+'</b>'+
    '<span>'+(storeOk()?'браузер сохраняет прогресс нормально':'браузер сейчас не сохраняет прогресс')+'</span></div>';
}

/* ============================ шапка ============================ */
function renderHead(){
  const r=rankOf(S.xp),C=2*Math.PI*19;
  $('#lvlnum').textContent=r.lvl;
  $('#rankname').textContent=r.name;
  $('#rankxp').textContent=r.cur+' / '+r.need+' XP';
  $('#ringp').style.strokeDashoffset=String(C*(1-clamp(r.cur/r.need,0,1)));
  $('#streaknum').textContent=S.streak;
  $('#toknum').textContent=S.tok;
  const day=document.querySelector('.navin button[data-tab="day"]');
  const bdg=day.querySelector('.bdg');
  const r0=rec(),q=quota();
  const need=S.spins>0||(!r0.closed&&r0.tap>=q)||stale().length>0;
  if(need&&!bdg){const s=document.createElement('span');s.className='bdg';day.appendChild(s)}
  if(!need&&bdg)bdg.remove();
}

/* ============================ СЕГОДНЯ ============================ */
function renderDay(){
  const t=dkey(),r=rec(t),d=new Date(),q=quota(t),p=plan();
  $('#dow').textContent=d.toLocaleDateString('ru-RU',{weekday:'long'});
  $('#dnum').textContent=d.toLocaleDateString('ru-RU',{day:'numeric',month:'long'})+(S.boost===t?'  ·  ×2 XP':'');
  $('#taptoday').textContent=r.tap;
  $('#tapgoal').textContent=q;
  $('#tapword').textContent=plural(q,'касание','касания','касаний');
  const pr=q?clamp(r.tap/q,0,1):(r.tap>0||r.xp>0?1:0),bar=$('#gbar');
  bar.classList.toggle('full',pr>=1);
  bar.firstElementChild.style.width=(pr*100)+'%';
  $('#daystate').innerHTML=r.closed?'день закрыт,<br>серия идёт'
    :!q?'выходной —<br>норма не действует'
    :pr>=1?'норма взята —<br>закрывай день'
    :'осталось '+(q-r.tap)+' '+plural(q-r.tap,'касание','касания','касаний');
  const btn=$('#closeday'),ok=!!closable(t);
  btn.disabled=!!r.closed||!ok;
  btn.textContent=r.closed?'день закрыт':ok?'закрыть день'
    :r.tap<q?'нужно ещё '+(q-r.tap):'отметь хоть одно дело';
  /* забыла нажать вечером: норма за вчера сделана, а день не закрыт */
  const y=shift(t,-1),yr=S.days[y];
  $('#yday').innerHTML=(yr&&closable(y)&&(!S.lastClosed||S.lastClosed<y))
    ? '<button class="btn sm gh w" style="margin-top:8px" data-act="closeday" data-id="'+y+'">'+
      'закрыть вчерашний день · '+yr.tap+' '+plural(yr.tap,'касание','касания','касаний')+'</button>'
    : (!r.closed&&!ok&&q&&S.tok>=1&&buyLeft()>0
      ? '<button class="btn sm gh w" style="margin-top:8px" data-act="buyout">'+
        'откупить день за ◆ 1 · осталось '+buyLeft()+'</button>' : '');
  $('#freezes').textContent='серия '+S.streak+' '+plural(S.streak,'день','дня','дней')+
    '  ·  рекорд '+S.best+'  ·  заморозки '+S.freeze+'/'+freezeCap()+'  ·  множитель ×'+mult().toFixed(2);

  /* почему именно столько касаний */
  $('#whybox').innerHTML='<div class="card" style="margin-top:13px;background:var(--card2)">'+
    '<div class="tiny" style="color:var(--ink2)">'+(q
      ? '<b>'+q+' '+plural(q,'касание','касания','касаний')+'</b> — столько нужно в день, чтобы цели на '+
        rub(p.needMon)+' в месяц закрылись в срок.'
      : '<b>Сегодня выходной.</b> В будни норма — '+p.daily+' '+
        plural(p.daily,'касание','касания','касаний')+' в день: цели требуют '+rub(p.needMon)+' в месяц.')+
    ' Разбор цепочки — на вкладке ДЕНЬГИ.</div></div>';

  $('#spinbox').innerHTML=S.spins>0?'<div class="spin" style="margin-top:13px">'+
    '<div class="txt">Крутилка заряжена: '+S.spins+' '+plural(S.spins,'попытка','попытки','попыток')+'</div>'+
    '<button class="btn sm" data-act="spin">крутить</button></div>':'';

  const sel=$('#tp-c');
  if(sel&&!sel.options.length)sel.innerHTML=opt(CH,CH[0]);

  /* остыли: живая стадия и три дня тишины */
  const cold=stale();
  $('#coldbox').innerHTML=cold.length?'<div class="h">Остыли <em>без тебя</em> <small>'+cold.length+'</small></div>'+
    '<div class="stack">'+cold.slice(0,6).map(l=>{
      const dd=dayDiff(l.last,dkey());
      return '<div class="coldline"><div class="t">'+esc(l.t)+
        '<span>'+STMAP[l.st].t+'  ·  тишина '+dd+' '+plural(dd,'день','дня','дней')+'</span></div>'+
        '<button class="btn xs" data-act="ping" data-id="'+l.id+'">напомнила</button></div>';
    }).join('')+'</div>'+
    '<div class="tiny" style="margin-top:8px">Напоминание о себе стоит дешевле нового холодного касания '+
    'и срабатывает чаще. Молчание — это не «нет».</div>':'';

  /* активные заказы: следующий этап в один тап */
  const live=S.jobs.filter(j=>!j.dead);
  $('#jobbox').innerHTML=live.length?'<div class="h">В <em>работе</em></div><div class="stack">'+
    live.slice(0,4).map(j=>'<div class="coldline" style="border-color:var(--line);background:var(--card)">'+
      '<div class="t">'+esc(j.t)+'<span>'+j.done+' / '+j.n+' этапов  ·  '+
      (STAGES[j.done]?esc(STAGES[j.done]):'сдача')+'</span></div>'+
      '<button class="btn xs" data-act="stage" data-id="'+j.id+'" data-n="1">этап</button></div>').join('')+
    '</div>':'';

  let h='';
  CATS.forEach(c=>{
    const list=allQuests().filter(q2=>q2.c===c);
    if(!list.length)return;
    h+='<div class="qgrp"><div class="qlab"><b>'+c+'</b><span>'+CATNOTE[c]+'</span></div>';
    list.forEach(q2=>{
      const on=r.done[q2.id]!=null;
      h+='<div class="q'+(on?' on':'')+'">'+
         '<button class="qhit" data-act="q" data-id="'+q2.id+'" aria-pressed="'+on+'">'+
           '<span class="bx">'+CHECK+'</span><span class="t">'+esc(q2.t)+'</span>'+
           '<span class="xp">'+(on?'+'+r.done[q2.id]:q2.xp)+'</span></button>'+
         '<button class="del" data-act="offq" data-id="'+q2.id+'" title="убрать дело" aria-label="Убрать дело">×</button></div>';
    });
    h+='</div>';
  });
  if(S.off.length){
    h+='<div class="qgrp"><div class="qlab">убранные</div><div class="row" style="flex-wrap:wrap;gap:6px">';
    S.off.forEach(id=>{
      const q2=QUESTS.concat(S.custom).find(x=>x.id===id);
      if(!q2)return;
      const mine=S.custom.some(c=>c.id===id);
      h+='<span class="chipwrap"><button class="chip" data-act="onq" data-id="'+id+'">↺ '+esc(q2.t)+'</button>'+
         (mine?'<button class="del" data-act="delq" data-id="'+id+'" title="удалить насовсем" '+
               'aria-label="Удалить дело насовсем">×</button>':'')+'</span>';
    });
    h+='</div></div>';
  }
  $('#quests').innerHTML=h;

  /* норма: от целей или руками */
  const auto=S.quota==null;
  $('#quotabox').innerHTML=
    '<div class="row" style="flex-wrap:wrap;gap:7px">'+
      '<button class="btn sm'+(auto?'':' gh')+'" data-act="qauto">от целей · '+p.daily+'</button>'+
      '<button class="btn sm'+(auto?' gh':'')+'" data-act="qhand">руками</button>'+
    '</div>'+
    (auto?'':'<div class="row" style="margin-top:9px"><input type="number" id="qset" min="0" max="30" value="'+
      S.quota+'"><button class="btn sm gh" data-act="setquota">сохранить</button></div>')+
    '<div class="row" style="margin-top:9px">'+
      '<button class="btn sm'+(S.weekend?'':' gh')+'" data-act="weekend">'+
      (S.weekend?'выходные свободны':'без выходных')+'</button></div>'+
    '<div class="tiny" style="margin-top:9px">День не закрывается, пока норма не сделана — в этом весь смысл. '+
    'На больные дни есть откуп за жетон, два раза в месяц. '+(S.weekend?'Суббота и воскресенье без нормы.':
    'Норма действует все семь дней.')+'</div>';

  $('#hintbox').innerHTML=S.seen?'':'<div class="h">Как это <em>устроено</em></div><div class="hint">'+
    '<ol><li>Вписываешь цели в рублях — приложение считает, сколько касаний в день нужно, чтобы успеть.</li>'+
    '<li>Касание — одно сообщение одному человеку. Норма на день — единственное, что обязательно.</li>'+
    '<li>Люди живут в воронке: написала → ответил → обсуждаем → счёт → оплатил. Отказ тоже даёт XP.</li>'+
    '<li>Оплатил — заводи заказ. Сдала — записывай деньги в кассу, цели двигаются сами.</li></ol>'+
    '<button class="btn sm gh w" style="margin-top:12px" data-act="hidehint">поняла</button></div>';
}

/* ============================ ЛЮДИ ============================ */
function renderLeads(){
  const sel=$('#nl-c');
  if(sel&&!sel.options.length)sel.innerHTML=opt(CH,CH[0]);
  const live=S.leads.filter(l=>l.st!=='no'&&l.st!=='paid').length;
  $('#leadcount').textContent=S.leads.length?live+' в работе из '+S.leads.length:'пока никого';

  /* воронка: сколько людей дошло до каждой стадии хотя бы раз */
  const reach=ST.map((s,i)=>S.leads.filter(l=>l.st!=='no'&&stIdx(l.st)>=i).length);
  const top=Math.max(1,reach[0],noCount());
  $('#funnel').innerHTML='<div class="fn">'+ST.map((s,i)=>
    '<div class="r'+(s.id==='paid'?' paid':'')+'"><div class="nm">'+s.t+'</div>'+
    '<div class="bar"><i style="width:'+(reach[i]/top*100).toFixed(1)+'%"></i></div>'+
    '<div class="n">'+reach[i]+'</div></div>').join('')+
    '<div class="r no"><div class="nm">отказ</div><div class="bar"><i style="width:'+
    (noCount()/top*100).toFixed(1)+'%"></i></div><div class="n">'+noCount()+'</div></div></div>'+
    '<div class="tiny" style="margin-top:11px">Считаются люди, которые дошли до стадии хотя бы раз. '+
    'Широкий верх и пустой низ — это нормально в начале: низ наполняется только из верха.</div>';

  /* квота отказов: двадцать «нет» как отдельная цель */
  const n=noCount(),goalN=20;
  $('#nobox').innerHTML='<div class="mline"><b>'+n+'</b><span>из '+goalN+' отказов собрано<br>'+
    (n>=goalN?'квота взята — теперь писать почти не страшно':'каждое «нет» даёт +'+NO.xp+' XP')+'</span></div>'+
    '<div class="mbar"><i style="width:'+clamp(n/goalN*100,0,100).toFixed(1)+'%"></i></div>'+
    '<div class="tiny">Отказ — не провал, а единица статистики. Пока «нет» считается как результат, '+
    'писать незнакомым людям перестаёт быть страшно. Это единственная цель, которую можно выполнить '+
    'даже в самый неудачный месяц.</div>';

  const order=l=>l.st==='no'?3:l.st==='paid'?2:1;
  const list=S.leads.slice().sort((a,b)=>order(a)-order(b)||stIdx(b.st)-stIdx(a.st)||(a.last<b.last?1:-1));
  $('#leads').innerHTML=list.length?list.map(l=>{
    const i=stIdx(l.st),dd=dayDiff(l.last,dkey());
    const cold=STALL.indexOf(l.st)>=0&&dd>=3;
    const next=i>=0&&i<ST.length-1?ST[i+1]:null;
    return '<div class="lead'+(l.st==='paid'?' won':l.st==='no'?' lost':cold?' cold':'')+'">'+
      '<div class="top"><div class="nm">'+esc(l.t)+'</div>'+
      '<span class="pill '+(l.st==='paid'?'ok':l.st==='no'?'no':'on')+'">'+STMAP[l.st].t+'</span></div>'+
      '<div class="meta">'+esc(l.ch||'другое')+(l.sum?'  ·  '+rub(l.sum):'')+
        '  ·  касаний '+(l.tap||0)+'  ·  '+(dd===0?'сегодня':dd+' '+plural(dd,'день','дня','дней')+' назад')+'</div>'+
      (l.note?'<div class="note2 note-x" style="font-size:12.5px;color:var(--ink2);margin-top:5px">'+esc(l.note)+'</div>':'')+
      '<div class="ctl">'+
        (next?'<button class="btn xs" data-act="move" data-id="'+l.id+'" data-n="1">'+next.t+'</button>':'')+
        (STALL.indexOf(l.st)>=0?'<button class="btn xs gh" data-act="ping" data-id="'+l.id+'">напомнила</button>':'')+
        (l.st!=='no'&&l.st!=='paid'?'<button class="btn xs gh" data-act="sayno" data-id="'+l.id+'">отказ</button>':'')+
        '<span class="sp">'+
          (i>0||l.st==='no'?'<button class="btn xs gh" data-act="move" data-id="'+l.id+'" data-n="-1" title="назад">↺</button>':'')+
          '<button class="del" data-act="dellead" data-id="'+l.id+'" aria-label="Удалить">×</button>'+
        '</span></div></div>';
  }).join(''):'<div class="card muted">Пока никого. Открой инстаграм мелкого салона рядом с домом — '+
    'и первый человек появится через минуту.</div>';
}

/* ============================ ЗАКАЗЫ ============================ */
function renderJobs(){
  const t=dkey();
  const live=S.jobs.filter(j=>!j.dead).length;
  $('#jobcount').textContent=S.jobs.length?(live?live+' в работе':'все сданы'):'заказов ещё не было';
  const list=S.jobs.slice().sort((a,b)=>(a.dead?1:0)-(b.dead?1:0)||
    String(a.due||'9999').localeCompare(String(b.due||'9999')));
  $('#jobs').innerHTML=list.length?list.map(j=>{
    const p=clamp(j.done/j.n,0,1),dd=j.due?dayDiff(t,j.due):null;
    const due=j.due?(dd<0?'просрочен':dd===0?'сегодня':'через '+dd+' '+plural(dd,'день','дня','дней')):'без даты';
    return '<div class="job'+(j.dead?' dead':'')+'">'+
      '<div class="top"><div class="nm">'+esc(j.t)+'</div>'+
        '<div class="fee">'+(j.fee?rub(j.fee):'без цены')+'</div></div>'+
      '<div class="due'+(!j.dead&&dd!==null&&dd<4?' soon':'')+'">'+
        (j.due?dshort(j.due)+'  ·  '+due:'без даты')+(j.paid?'  ·  оплачен':'')+'</div>'+
      '<div class="hp"><i style="width:'+(p*100)+'%"></i><b>'+j.done+' / '+j.n+' этапов</b></div>'+
      (j.dead?'':'<div class="stg">дальше: <b>'+(STAGES[j.done]?esc(STAGES[j.done]):'сдача и оплата')+'</b></div>')+
      (j.dead
        ? '<div class="ctl"><div class="muted" style="flex:1;color:var(--done);font-weight:700">'+
          (j.paid?'сдан и оплачен':'сдан, деньги не записаны')+'</div>'+
          (j.paid?'':'<button class="btn sm" data-act="paid" data-id="'+j.id+'">записать оплату</button>')+
          '<button class="btn sm gh" data-act="stage" data-id="'+j.id+'" data-n="-1">вернуть</button>'+
          '<button class="btn sm gh" data-act="deljob" data-id="'+j.id+'">×</button></div>'
        : '<div class="ctl"><button class="btn sm" data-act="stage" data-id="'+j.id+'" data-n="1">этап сделан</button>'+
          '<span class="sp"><button class="btn sm gh" data-act="stage" data-id="'+j.id+'" data-n="-1" title="отменить">↺</button>'+
          '<button class="btn sm gh" data-act="deljob" data-id="'+j.id+'" title="удалить">×</button></span></div>')+
      '</div>';
  }).join(''):'<div class="card muted">Заказов нет. Первый появится из воронки: когда человек на стадии '+
    '«оплатил», заводи его здесь.</div>';

  /* прайс-лестница */
  const up=nextUp(),done=paidJobs().length;
  $('#pricehint').textContent=done?'сдано и оплачено: '+done:'';
  $('#price').innerHTML=SRV.map(s=>'<div class="prc"><div class="t">'+s.t+'</div>'+
    '<input type="number" id="pr-'+s.id+'" value="'+S.price[s.id]+'" min="1" max="100000"></div>').join('')+
    '<div class="row" style="margin-top:11px;flex-wrap:wrap;gap:8px">'+
      '<button class="btn sm gh" data-act="setprice">сохранить прайс</button>'+
      (up<=0?'<button class="btn sm" data-act="raise">поднять на 25%</button>':'')+
    '</div>'+
    '<div class="tiny" style="margin-top:9px">'+
    (up<=0?'<b style="color:var(--markd)">Пора поднимать.</b> Два заказа по текущей цене сделаны — '+
      'значит, цена больше не страшная. Новая цена: лендинг '+rub(Math.round(S.price.land*UPMUL))+'.'
      :'Следующее повышение — после '+up+' '+plural(up,'оплаченного заказа','оплаченных заказов','оплаченных заказов')+
      '. Цену поднимают не когда «стало не стыдно», а по счётчику.')+
    ' Поднимали уже '+S.upN+' '+plural(S.upN,'раз','раза','раз')+'.</div>';
}

/* ============================ ДЕНЬГИ ============================ */
function renderMoney(){
  const p=plan(),q=quota();
  const c=p.conv,perOrd=Math.round(1/Math.max(.002,c.v));
  /* если цели требуют невозможного, честно считаем, какой чек это исправит */
  const feeFix=Math.ceil(p.needMon/Math.max(1,8*(S.weekend?22:30)*c.v)/10)*10;
  $('#planbox').innerHTML=
    '<div class="kick">обратный счёт</div>'+
    '<div class="fin"><b>'+p.daily+'</b><span>'+plural(p.daily,'касание','касания','касаний')+' в день<br>'+
      (q?'на сегодня норма '+q:'сегодня выходной')+'</span></div>'+
    '<div class="chain">'+
      '<div class="st"><div class="k">Разовые цели: собрать ещё</div><div class="v">'+rub(p.left)+'</div></div>'+
      (p.onceMon?'<div class="st"><div class="k">Разбить по срокам — в месяц</div><div class="v">'+
        rub(p.onceMon)+'</div></div>':'')+
      (p.mon?'<div class="st"><div class="k">Плюс каждый месяц: аренда, подписки</div><div class="v">'+
        rub(p.mon)+'</div></div>':'')+
      (p.soon?'<div class="st"><div class="k">Ближайший срок — через</div><div class="v">'+
        p.soon+' '+plural(p.soon,'день','дня','дней')+'</div></div>':'')+
      '<div class="st acc"><div class="k">Значит, нужно в месяц</div><div class="v">'+rub(p.needMon)+'</div></div>'+
      '<div class="st"><div class="k">Средний чек'+(paidJobs().length>=2?' (по своим заказам)':' (по прайсу)')+
        '</div><div class="v">'+rub(p.fee)+'</div></div>'+
      '<div class="st"><div class="k">Заказов в месяц</div><div class="v">'+Math.ceil(p.jobs)+'</div></div>'+
      '<div class="st"><div class="k">Касаний на один заказ'+
        (c.hand?' (поставила руками)':c.own?' (своя статистика)':' (по умолчанию)')+
        '</div><div class="v">'+perOrd+'</div></div>'+
      '<div class="st acc"><div class="k">Касаний в месяц</div><div class="v">'+Math.ceil(p.touch)+'</div></div>'+
    '</div>'+
    (p.hard?'<div class="warnl"><b>Столько не бывает.</b> Цели требуют '+Math.ceil(p.raw)+
      ' касаний в день — это не план, это выгорание за неделю. Работают два рычага: отодвинуть срок '+
      'или поднять чек. При чеке '+rub(feeFix)+' хватило бы восьми касаний в день.</div>'
      :'<div class="tiny" style="margin-top:11px">Цепочка пересчитывается сама: поменяла цель или срок — '+
       'поменялась норма на сегодня. Это и есть план: не «накопить», а написать '+p.daily+' '+
       plural(p.daily,'человеку','людям','людям')+' сегодня.</div>')+
    (c.need?'<div class="tiny" style="margin-top:7px">Конверсия пока взята по умолчанию: один заказ на '+
      Math.round(1/CONV0)+' касаний. Ещё '+c.need+' '+plural(c.need,'касание','касания','касаний')+
      ' — и приложение начнёт считать по твоим цифрам.</div>':'');

  const got=p.got,need=p.needMon,left=Math.max(0,need-got);
  $('#monthbox').innerHTML='<div class="mline"><b>'+Math.round(got).toLocaleString('ru-RU')+'</b>'+
    '<span>р. пришло в '+monthIn()+'<br>'+
    (left?'до нормы месяца не хватает '+rub(left):'норма месяца взята')+'</span></div>'+
    '<div class="mbar"><i style="width:'+(need?clamp(got/need*100,0,100).toFixed(1):0)+'%"></i></div>'+
    '<div class="tiny">Ушло за месяц '+rub(p.spent)+'  ·  в кассе '+rub(S.bal)+
    '  ·  нужно в месяц '+rub(need)+'</div>';

  const act=S.goals.filter(g=>!g.done).length;
  $('#goalcount').textContent=S.goals.length?act+' в работе из '+S.goals.length:'целей нет';
  $('#goals').innerHTML=S.goals.length?S.goals.slice().sort((a,b)=>
    (a.done?1:0)-(b.done?1:0)||String(a.due||'9999').localeCompare(String(b.due||'9999'))).map(g=>{
    const pr=g.sum?clamp(g.got/g.sum,0,1):0,dd=g.due?dayDiff(dkey(),g.due):null;
    return '<div class="gcard'+(g.done?' done':'')+'">'+
      '<div class="top"><div class="nm">'+esc(g.t)+'</div>'+
        '<div class="sum">'+rub(g.sum)+(g.per==='month'?' / мес':'')+'</div></div>'+
      (g.per==='once'?'<div class="pb"><i style="width:'+(pr*100)+'%"></i></div>':'<div style="height:9px"></div>')+
      '<div class="ln">'+[
        g.per==='once'?'собрано '+rub(g.got)+' из '+rub(g.sum):'каждый месяц',
        g.done?'':'нужно '+rub(goalMon(g))+'/мес',
        dd===null?'':(dd<0?'срок прошёл':dd===0?'срок сегодня':'через '+dd+' '+plural(dd,'день','дня','дней'))
      ].filter(Boolean).join('  ·  ')+'</div>'+
      '<div class="gact">'+
        (g.per==='once'&&!g.done?'<button class="btn xs gh" data-act="fill" data-id="'+g.id+'">внести</button>':'')+
        '<button class="btn xs gh" data-act="goaldone" data-id="'+g.id+'">'+(g.done?'вернуть':'готово')+'</button>'+
        '<button class="del" data-act="delgoal" data-id="'+g.id+'" aria-label="Удалить">×</button>'+
      '</div></div>';
  }).join(''):'<div class="card muted">Целей нет — и тогда норма касаний минимальная. Впиши хотя бы одну: '+
    'приложение считает план только от целей.</div>';

  $('#balhint').textContent=S.tx.length?S.tx.length+' '+plural(S.tx.length,'запись','записи','записей'):'';
  const tail=S.tx.slice().sort((a,b)=>a.d<b.d?1:-1).slice(0,8);
  $('#cash').innerHTML='<div class="mline"><b>'+Math.round(S.bal).toLocaleString('ru-RU')+'</b>'+
    '<span>р. в кассе<br>пришло всего '+rub(S.tx.filter(x=>x.k==='in').reduce((a,x)=>a+x.sum,0))+
      '<br>себе отложено '+rub(S.mine)+'</span></div>'+
    (tail.length?'<table class="gtab" style="margin-top:12px">'+tail.map(x=>
      '<tr><td>'+esc(x.t||'без подписи')+'<br><span class="tiny">'+dshort(x.d)+
        (x.alloc&&x.alloc.length?'  ·  в цель':'')+'</span></td>'+
      '<td class="m '+(x.k==='in'?'hi':'lo')+'">'+(x.k==='in'?'+':'−')+rub(x.sum)+'</td>'+
      '<td class="x"><button class="del" data-act="deltx" data-id="'+x.id+'" aria-label="Удалить">×</button></td></tr>'
      ).join('')+'</table>'
    :'<div class="tiny" style="margin-top:10px">Записей нет. Первая появится, когда сдашь первый заказ.</div>');
}

/* ============================ РОСТ ============================ */
const WD=['пн','вт','ср','чт','пт','сб','вс'];
function renderGrow(){
  const t=dkey(),c=convRate();
  const tapAll=S.leads.reduce((a,l)=>a+(l.tap||0),0);
  let tap7=0,days=[];
  for(let i=6;i>=0;i--){const k=shift(t,-i),r=S.days[k];
    days.push({k:k,tap:r?r.tap:0,cl:!!(r&&r.closed)});tap7+=r?r.tap:0}
  const earned=S.tx.filter(x=>x.k==='in').reduce((a,x)=>a+x.sum,0);
  const rep=S.leads.filter(l=>stIdx(l.st)>=2).length;
  $('#facts').innerHTML=
    '<div class="fact"><div class="k">Касаний всего</div><div class="v hi">'+tapAll+'</div></div>'+
    '<div class="fact"><div class="k">Касаний за семь дней</div><div class="v">'+tap7+'</div></div>'+
    '<div class="fact"><div class="k">Ответили</div><div class="v">'+rep+'</div></div>'+
    '<div class="fact"><div class="k">Отказов</div><div class="v">'+noCount()+'</div></div>'+
    '<div class="fact"><div class="k">Конверсия'+(c.own?' — своя':c.hand?' — руками':' — по умолчанию')+
      '</div><div class="v">1 из '+Math.round(1/Math.max(.002,c.v))+'</div></div>'+
    '<div class="fact"><div class="k">Средний чек</div><div class="v">'+rub(avgFee())+'</div></div>'+
    '<div class="fact"><div class="k">Заказов сдано</div><div class="v">'+S.jobs.filter(j=>j.dead).length+'</div></div>'+
    '<div class="fact"><div class="k">Заработано всего</div><div class="v hi">'+rub(earned)+'</div></div>'+
    '<div class="fact"><div class="k">Серия · рекорд</div><div class="v">'+S.streak+' · '+S.best+'</div></div>'+
    '<div class="tiny" style="margin-top:10px">Конверсия считается как оплаты на число людей, которым написала. '+
    'Пока касаний меньше '+CONVMIN+', приложение берёт среднюю по рынку — своей статистики ещё нет.</div>';

  const q=S.quota!=null?S.quota:plan().daily;
  const topv=Math.max.apply(null,days.map(d=>d.tap).concat([q,1]));
  const H=82;
  $('#weekname').textContent=tap7+' '+plural(tap7,'касание','касания','касаний')+' за неделю';
  $('#week').innerHTML='<div class="kpi">'+
      '<div><b>'+tap7+'</b><span>касаний за неделю</span></div>'+
      '<div><b>'+days.filter(d=>d.cl).length+'/7</b><span>дней закрыто</span></div>'+
      '<div><b>'+(tap7/7).toFixed(1).replace('.',',')+'</b><span>касаний в день</span></div></div>'+
    '<div class="plot"><div class="gline" style="bottom:'+Math.round(q/topv*H)+'px"><b>норма '+q+'</b></div>'+
    days.map(d=>{
      const hh=Math.round(d.tap/topv*H);
      return '<button class="bar7'+(d.cl?' cl':'')+'" data-act="dayinfo" data-id="'+d.k+'" title="'+d.tap+'">'+
        (d.tap>0&&d.tap===topv?'<u style="bottom:'+(hh+3)+'px">'+d.tap+'</u>':'')+
        (d.tap>0?'<i style="height:'+hh+'px"></i>':'')+'</button>';
    }).join('')+'</div>'+
    '<div class="wdrow">'+days.map(d=>'<span class="'+(d.k===t?'now':'')+'">'+
      WD[(dparse(d.k).getDay()+6)%7]+'</span>').join('')+'</div>';

  const mdone=Object.keys(S.miles).length;
  $('#milecount').textContent=mdone+' / '+MILES.length;
  $('#miles').innerHTML=MILES.map(m=>{
    const on=!!S.miles[m.id],rdy=!on&&mReady(m.id);
    return '<div class="mile'+(on?' on':'')+'">'+
      '<button class="top" data-act="mile" data-id="'+m.id+'" aria-pressed="'+on+'">'+
        '<span class="bx">'+CHECK+'</span><span class="t">'+esc(m.t)+'</span>'+
        '<span class="xp">'+(on?'✓ ':'')+m.xp+' XP · ◆'+m.tok+'</span></button>'+
      (on?'':'<div class="why">'+esc(m.h)+'</div>')+
      (rdy?'<span class="rdy">похоже, готово</span>':'')+'</div>';
  }).join('');

  $('#treecount').textContent=S.skills.length+' / '+TREEN+' открыто  ·  +'+(S.skills.length*2)+'% XP';
  $('#tree').innerHTML=TREE.map(b=>{
    const openN=b.nodes.filter(n=>S.skills.indexOf(n.id)>=0).length;
    return '<div class="branch"><div class="bhead"><span class="dot" style="background:'+b.color+'"></span>'+
      '<b>'+b.name+'</b><small>'+openN+' / '+b.nodes.length+'</small></div><div class="nodes">'+
      b.nodes.map((n,i)=>{
        const open=S.skills.indexOf(n.id)>=0;
        const prev=i===0||S.skills.indexOf(b.nodes[i-1].id)>=0;
        const cls=open?'open':(prev?'next':'lock');
        return '<div class="node '+cls+'"><div class="nt"><b>'+esc(n.t)+'</b>'+
          (open?'<span class="cost" style="color:var(--done)">открыт</span>':'<span class="cost">◆ '+n.cost+'</span>')+'</div>'+
          '<div class="task">'+esc(n.task)+'</div>'+
          (open?'<span class="perk">+2% XP навсегда</span>'
               :(prev?'<button class="btn sm w" data-act="unlock" data-id="'+n.id+'"'+(S.tok<n.cost?' disabled':'')+'>'+
                 (S.tok<n.cost?'нужно ◆ '+n.cost:'открыть за ◆ '+n.cost)+'</button>'
                     :'<div class="tiny" style="margin-top:6px">откроется после «'+esc(b.nodes[i-1].t)+'»</div>'))+
          '</div>';
      }).join('')+'</div></div>';
  }).join('');

  renderMine();
}

/* ---------- себе: доля с прихода и хотелки за свои ---------- */
function renderMine(){
  $('#minenum').textContent=Math.round(S.mine).toLocaleString('ru-RU');
  const got=inMonth(),cutGot=Math.round(got*S.cut/100);
  $('#cutbox').innerHTML=
    '<div class="row" style="flex-wrap:wrap;gap:7px">'+[10,20,30,50].map(v=>
      '<button class="btn sm'+(S.cut===v?'':' gh')+'" data-act="setcut" data-id="'+v+'">'+v+'%</button>').join('')+
    '</div>'+
    '<div class="tiny" style="margin-top:10px">С каждого прихода <b style="color:var(--markd)">'+S.cut+
    '%</b> уходит себе, остальное — в цели. Это не транжирство, а единственный способ '+
    'увидеть деньги от работы раньше, чем через полгода. '+
    (got?'В этом месяце пришло '+rub(got)+', из них себе — '+rub(cutGot)+'.'
        :'Начнёт копиться с первого заказа.')+'</div>';

  const can=S.wants.filter(w=>S.mine>=w.c).length;
  $('#wantcount').textContent=S.wants.length?(can?can+' по карману':'копится')+' из '+S.wants.length:'';
  $('#wants').innerHTML=S.wants.length?S.wants.slice().sort((a,b)=>a.c-b.c).map(w=>{
    const ok=S.mine>=w.c,need=w.c-S.mine,j=jobsFor(w.c);
    return '<div class="item"><div class="t">'+esc(w.t)+'<small>'+rub(w.c)+'  ·  '+
      (ok?(j<1?'меньше заказа':Math.ceil(j)+' '+plural(Math.ceil(j),'заказ','заказа','заказов'))
         :'ещё '+rub(need))+'</small></div>'+
      '<button class="btn sm'+(ok?'':' gh')+'" data-act="buywant" data-id="'+w.id+'"'+(ok?'':' disabled')+'>купить</button>'+
      '<button class="del" data-act="delwant" data-id="'+w.id+'" aria-label="Удалить">×</button></div>';
  }).join(''):'<div class="tiny">Пусто. Впиши хоть одну мелочь: цель на год не тянет, '+
    'а маникюр через неделю — тянет.</div>';
  if(S.wants.some(w=>w.ex))
    $('#wants').insertAdjacentHTML('beforeend',
      '<div class="tiny">Список — пример. Замени на то, чего хочется тебе, и поставь свои цены.</div>');

  const bought=S.tx.filter(x=>x.k==='out'&&x.want).sort((a,b)=>a.d<b.d?1:-1);
  $('#boughtcount').textContent=bought.length?bought.length+' шт.':'';
  $('#boughtbox').innerHTML=bought.length
    ?'<table class="gtab">'+bought.slice(0,10).map(x=>
      '<tr><td>'+esc(x.t)+'<br><span class="tiny">'+dshort(x.d)+'</span></td>'+
      '<td class="m">'+rub(x.sum)+'</td></tr>').join('')+'</table>'+
      '<div class="tiny" style="margin-top:10px">Всё это куплено на деньги, которых год назад не было. '+
      'Удалить покупку можно в кассе на вкладке ДЕНЬГИ — вернётся и в кассу, и себе.</div>'
    :'<div class="tiny">Пока ничего. Первая покупка за свои — момент, ради которого всё это и затевалось.</div>';
}

function render(){renderHead();renderDay();renderLeads();renderJobs();renderMoney();renderGrow();
  save();renderWarn();renderBk()}
