'use strict';
/* ============================ навигация ============================ */
function go(tab){
  document.querySelectorAll('.navin button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+tab));
  scrollTo({top:0,behavior:RM.matches?'auto':'smooth'});
}
function applyTheme(){
  const r=document.documentElement;
  if(S.theme==='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',S.theme);
  /* статусбар телефона красится этими мета-тегами: в авто их выбирает система,
     при ручной теме нужную включаем сами */
  const l=$('#tc-light'),d=$('#tc-dark');
  if(l&&d){
    l.media=S.theme==='auto'?'(prefers-color-scheme: light)':S.theme==='light'?'all':'not all';
    d.media=S.theme==='auto'?'(prefers-color-scheme: dark)':S.theme==='dark'?'all':'not all';
  }
}
const PANES=['sum','miles','skills','shop'];
function sub(name){
  if(PANES.indexOf(name)<0)return;
  document.querySelectorAll('#growtabs button').forEach(b=>{
    const on=b.dataset.sub===name;
    b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);
  });
  PANES.forEach(n=>{const el=$('#p-'+n);if(el)el.classList.toggle('on',n===name)});
}
function syncStreak(){
  if(!S.lastClosed){S.streak=0;return}
  const gap=dayDiff(S.lastClosed,dkey());
  if(gap>1&&gap-1>S.freeze)S.streak=0;
}

/* ============================ дела дня ============================ */
function toggleQuest(id){
  const r=rec(),q=QUESTS.concat(S.custom).find(x=>x.id===id);
  if(!q)return;
  if(r.done[id]!=null){const g=r.done[id];delete r.done[id];addXP(-g)}
  else{const g=Math.max(1,Math.round(q.xp*mult()));r.done[id]=g;addXP(g)}
}

/* ============================ воронка ============================
   За каждую пройденную стадию XP начисляется один раз, и сколько именно —
   запомнено в самом лиде (l.g). Поэтому шаг назад снимает ровно выданное,
   даже если множитель с тех пор изменился. */
function grant(l,id,xp){
  if(!l.g)l.g={};
  if(l.g[id]!=null)return;
  const n=Math.max(1,Math.round(xp*mult()));
  l.g[id]=n;addXP(n);
}
function ungrant(l,id){
  if(!l.g||l.g[id]==null)return;
  addXP(-l.g[id]);delete l.g[id];
}
/* касание: сообщение одному человеку. Единственное, что двигает норму дня. */
function countTouch(l){
  rec().tap++;
  if(l){l.tap=(l.tap||0)+1;l.last=dkey()}
}
function moveLead(id,dir){
  const l=S.leads.find(x=>x.id===id);
  if(!l)return;
  if(l.st==='no'){
    if(dir<0){ungrant(l,'no');l.st=l.pre||'new';l.pre=null;render()}
    return;
  }
  const i=stIdx(l.st);
  if(dir>0){
    if(i>=ST.length-1)return;
    const s=ST[i+1];
    l.st=s.id;l.last=dkey();
    grant(l,s.id,s.xp);
    if(s.id==='sent')countTouch(l);
    if(s.id==='paid'){
      burst(150);
      modal('<div class="kicker">он заплатил</div><div class="big">'+esc(l.t)+'</div>'+
        '<div class="sub">Заводи заказ на вкладке ЗАКАЗЫ: этапы, срок и цена. Деньги запишешь, когда придут.</div>'+
        '<button class="btn w" data-act="jobfrom" data-id="'+l.id+'">создать заказ</button>'+
        '<button class="btn w gh" style="margin-top:8px" data-act="closemodal">потом</button>');
    }
  }else{
    if(i<=0)return;
    ungrant(l,l.st);
    l.st=ST[i-1].id;
  }
}
function sayNo(id){
  const l=S.leads.find(x=>x.id===id);
  if(!l||l.st==='no')return;
  l.pre=l.st;l.st='no';
  grant(l,'no',NO.xp);
  const n=noCount();
  if(n===20){burst(170);
    modal('<div class="kicker">квота закрыта</div><div class="big">Двадцать отказов</div>'+
      '<div class="sub">Теперь у тебя есть статистика, а не страх. Отметь веху на вкладке РОСТ.</div>'+
      '<button class="btn w" data-act="closemodal">дальше</button>');
  }else toast('отказ записан · +'+(l.g.no||NO.xp)+' XP');
}

/* ============================ день ============================ */
function closeDay(k){
  const t=k||dkey(),r=rec(t);
  if(!closable(t))return;
  if(t>dkey())return;
  if(S.lastClosed&&dayDiff(S.lastClosed,t)<=0)return;
  r.closed=1;
  const gap=S.lastClosed?dayDiff(S.lastClosed,t):1;
  let saved=0;
  if(gap===1)S.streak++;
  else if(gap>1){
    const miss=gap-1;
    if(miss<=S.freeze){S.freeze-=miss;S.streak++;saved=miss}
    else S.streak=1;
  }else S.streak=Math.max(1,S.streak);
  S.lastClosed=t;S.best=Math.max(S.best,S.streak);
  S.tok++;S.spins++;
  addXP(35,false);
  let bonus='';
  if(S.streak%7===0){S.tok+=2;S.freeze=Math.min(freezeCap(),S.freeze+1);
    bonus='Семь дней подряд: сверху ещё ◆ 2 и заморозка. '}
  if(saved)bonus+='Заморозка закрыла '+saved+' пропущенн'+(saved===1?'ый день':'ых дня')+' — серия цела. ';
  burst(120);
  modal('<div class="kicker">серия '+S.streak+' '+plural(S.streak,'день','дня','дней')+'</div>'+
    '<div class="big">'+(t===dkey()?'День закрыт':'Вчера закрыто')+'</div>'+
    '<div class="sub">+35 XP, ◆ 1 и одна крутилка. '+bonus+'</div>'+
    '<button class="btn w" data-act="spin">крутить сейчас</button>'+
    '<button class="btn w gh" style="margin-top:8px" data-act="closemodal">потом</button>');
}

/* ============================ заказы ============================ */
function stage(id,n){
  const j=S.jobs.find(x=>x.id===id);
  if(!j)return;
  const before=j.done;
  j.done=clamp(j.done+n,0,j.n);
  const diff=j.done-before;
  if(!diff)return;
  const gain=Math.round(18*diff*mult());
  j.hx=(j.hx||0)+gain;
  addXP(gain);
  if(j.done>=j.n&&!j.dead){
    j.dead=1;
    const xp=j.n*12,tok=clamp(Math.round(j.n/3),1,6);
    j.rw={xp:xp,tok:tok};
    addXP(xp,false);S.tok+=tok;burst(150);
    modal('<div class="kicker">заказ сдан</div><div class="big">'+esc(j.t)+'</div>'+
      '<div class="sub">+'+xp+' XP и ◆ '+tok+'. '+(j.fee&&!j.paid?'Осталось записать оплату — '+rub(j.fee)+
      ' пойдут в кассу и в цели.':'Попроси отзыв сразу, пока он доволен.')+'</div>'+
      (j.fee&&!j.paid?'<button class="btn w" data-act="paid" data-id="'+j.id+'">записать оплату</button>'+
        '<button class="btn w gh" style="margin-top:8px" data-act="closemodal">потом</button>'
        :'<button class="btn w" data-act="closemodal">дальше</button>'));
  }else if(j.done<j.n&&j.dead){
    j.dead=0;
    if(j.rw){addXP(-j.rw.xp,false);S.tok=Math.max(0,S.tok-j.rw.tok);j.rw=null}
  }
  if(j.hx<0)j.hx=0;
}
/* приход раскидывается по разовым целям: сначала та, у которой срок ближе.
   Что именно куда ушло — пишем в саму запись, чтобы удаление откатилось точно. */
function allocIn(sum){
  const alloc=[];
  let rest=sum;
  S.goals.filter(g=>!g.done&&g.per==='once'&&g.got<g.sum)
    .sort((a,b)=>{const ad=a.due||'9999-99-99',bd=b.due||'9999-99-99';return ad<bd?-1:ad>bd?1:0})
    .forEach(g=>{
      if(rest<=0)return;
      const take=Math.min(rest,g.sum-g.got);
      g.got+=take;rest-=take;alloc.push({g:g.id,sum:take});
    });
  return alloc;
}
function addTx(t,sum,kind,job){
  sum=Math.max(0,Math.round(sum));
  if(!sum)return null;
  const x={id:uid(),d:dkey(),t:t,sum:sum,k:kind};
  if(kind==='in'){S.bal+=sum;x.alloc=allocIn(sum);if(job)x.job=job}
  else S.bal-=sum;
  S.tx.push(x);
  return x;
}
function delTx(id){
  const x=S.tx.find(v=>v.id===id);
  if(!x)return;
  if(!confirm('Удалить запись «'+(x.t||'без подписи')+'» на '+rub(x.sum)+'?'))return;
  if(x.k==='in'){
    S.bal-=x.sum;
    (x.alloc||[]).forEach(a=>{const g=S.goals.find(v=>v.id===a.g);if(g)g.got=Math.max(0,g.got-a.sum)});
    if(x.job){const j=S.jobs.find(v=>v.id===x.job);if(j)j.paid=0}
  }else S.bal+=x.sum;
  S.tx=S.tx.filter(v=>v.id!==id);
}

/* ============================ крутилка ============================ */
function doSpin(){
  if(S.spins<1){toast('крутилок нет — закрой день');return}
  S.spins--;
  let r=Math.random()*PRIZES.reduce((a,p)=>a+p.w,0),prize=PRIZES[PRIZES.length-1];
  for(const p of PRIZES){if(r<p.w){prize=p;break}r-=p.w}
  modal('<div class="kicker">крутилка</div><div class="big">…</div>'+
    '<div class="slot" id="slot">&nbsp;</div><div class="sub" style="margin-top:12px">за закрытый день</div>');
  let i=0;const n=RM.matches?1:15;
  const iv=setInterval(()=>{
    const s=$('#slot');
    if(!s){clearInterval(iv);givePrize(prize);return}
    s.textContent=PRIZES[i++%PRIZES.length].t;
    if(i>n){clearInterval(iv);givePrize(prize)}
  },RM.matches?20:75);
}
function givePrize(p){
  let extra='';
  if(p.k==='xp')addXP(p.v,false);
  else if(p.k==='tok')S.tok+=p.v;
  else if(p.k==='fz'){S.freeze=Math.min(freezeCap(),S.freeze+1);extra='Один пропущенный день теперь не убьёт серию.'}
  else if(p.k==='boost'){S.boost=shift(dkey(),1);extra='Завтра каждое дело приносит вдвое больше.'}
  else{S.owned.push({id:uid(),t:p.v,d:dkey(),leg:p.k==='leg'?1:0});extra='Купон лежит в лавке. Предъявлять — ему.'}
  burst(p.k==='leg'?180:50);
  render();
  modal('<div class="kicker">'+(p.k==='leg'?'легендарка':'выпало')+'</div>'+
    '<div class="big" style="color:'+(p.k==='leg'?'var(--sun)':'var(--mark)')+'">'+esc(p.t)+'</div>'+
    '<div class="sub">'+esc(extra)+'</div><button class="btn w" data-act="closemodal">забрать</button>');
}

/* ============================ бэкап ============================ */
const b64=s=>btoa(unescape(encodeURIComponent(s)));
const unb64=s=>decodeURIComponent(escape(atob(s)));
const bkName=()=>'svoe-delo-'+dkey()+'.json';
function markBackup(){S.lastBackup=dkey();S.bkSnooze=null;save();render()}
function parseBackup(str){
  str=String(str||'').trim();
  if(!str)return null;
  let o=null;
  try{o=JSON.parse(str)}catch(e){try{o=JSON.parse(unb64(str))}catch(e2){o=null}}
  return o&&typeof o==='object'&&typeof o.xp==='number'?o:null;
}
function applyBackup(o){
  if(!confirm('Заменить весь текущий прогресс тем, что в бэкапе?'))return false;
  S=Object.assign(DEF(),o);fix();applyTheme();save();render();toast('восстановлено');
  return true;
}
function saveBackupFile(){
  try{
    const url=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}));
    const a=document.createElement('a');
    a.href=url;a.download=bkName();a.style.display='none';
    document.body.appendChild(a);a.click();
    setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},2000);
    markBackup();toast('файл сохранён: '+bkName());
  }catch(e){toast('файл не сохранился — возьми бэкап строкой')}
}

/* ============================ действия ============================ */
function act(a,id,el){
  switch(a){
    case 'theme':
      S.theme=S.theme==='auto'?'light':S.theme==='light'?'dark':'auto';
      applyTheme();toast('тема: '+({auto:'как в системе',light:'светлая',dark:'тёмная'})[S.theme]);break;

    /* ---- дела дня ---- */
    case 'q':toggleQuest(id);break;
    case 'offq':if(S.off.indexOf(id)<0){if(rec().done[id]!=null)toggleQuest(id);S.off.push(id)}break;
    case 'onq':S.off=S.off.filter(x=>x!==id);break;
    case 'delq':{
      const q=S.custom.find(x=>x.id===id);
      if(!q)return;
      if(!confirm('Удалить дело «'+q.t+'» насовсем?'))return;
      if(rec().done[id]!=null)toggleQuest(id);
      S.custom=S.custom.filter(x=>x.id!==id);
      S.off=S.off.filter(x=>x!==id);break;
    }
    case 'addquest':{
      const t=$('#nq-t').value.trim();
      if(!t){toast('впиши название');return}
      S.custom.push({id:uid(),c:$('#nq-c').value,t:t,xp:clamp(parseInt($('#nq-x').value,10)||15,5,60)});
      $('#nq-t').value='';toast('дело добавлено');break;
    }

    /* ---- норма и день ---- */
    case 'qauto':S.quota=null;toast('норму считаю от целей');break;
    case 'qhand':if(S.quota==null)S.quota=plan().daily;break;
    case 'setquota':{
      const el2=$('#qset');
      if(el2)S.quota=clamp(parseInt(el2.value,10)||0,0,30);
      toast('норма: '+S.quota+' '+plural(S.quota,'касание','касания','касаний'));break;
    }
    case 'weekend':S.weekend=S.weekend?0:1;
      toast(S.weekend?'выходные свободны':'норма все семь дней');break;
    case 'closeday':closeDay(id);break;
    case 'buyout':{
      if(S.tok<1){toast('нет жетона');return}
      if(buyLeft()<=0){toast('откуп уже использован дважды в этом месяце');return}
      if(!confirm('Откупить день за ◆ 1? Серия не прервётся, но касаний не добавится.'))return;
      S.tok--;S.buy[dkey()]=1;toast('день откуплен — можно закрывать');break;
    }

    /* ---- люди ---- */
    case 'touch':{
      const t=$('#tp-t').value.trim();
      if(!t){toast('впиши, кому написала');return}
      const l={id:uid(),t:t,ch:$('#tp-c').value,st:'new',sum:0,note:'',last:dkey(),tap:0,g:{}};
      S.leads.push(l);
      grant(l,'new',ST[0].xp);
      l.st='sent';grant(l,'sent',ST[1].xp);countTouch(l);
      $('#tp-t').value='';
      const r=rec(),q=quota();
      toast('касание записано · '+r.tap+(q?' из '+q:''));
      if(q&&r.tap===q)burst(90);
      break;
    }
    case 'addlead':{
      const t=$('#nl-t').value.trim();
      if(!t){toast('впиши, кто это');return}
      const l={id:uid(),t:t,ch:$('#nl-c').value,st:'new',
        sum:Math.max(0,parseInt($('#nl-s').value,10)||0),note:$('#nl-n').value.trim(),
        last:dkey(),tap:0,g:{}};
      S.leads.push(l);
      grant(l,'new',ST[0].xp);
      if(id==='sent'){l.st='sent';grant(l,'sent',ST[1].xp);countTouch(l)}
      $('#nl-t').value='';$('#nl-s').value='';$('#nl-n').value='';
      toast(id==='sent'?'касание записано':'человек добавлен');break;
    }
    case 'move':moveLead(id,parseInt(el.dataset.n,10));break;
    case 'sayno':sayNo(id);break;
    case 'ping':{
      const l=S.leads.find(x=>x.id===id);
      if(!l)return;
      countTouch(l);
      addXP(Math.max(1,Math.round(15*mult())));
      const r=rec(),q=quota();
      toast('напомнила · касаний '+r.tap+(q?' из '+q:''));
      if(q&&r.tap===q)burst(90);
      break;
    }
    case 'dellead':{
      const l=S.leads.find(x=>x.id===id);
      if(!l)return;
      const xp=leadXP(l);
      if(!confirm('Удалить «'+l.t+'»?'+(xp?'\nНачисленные '+xp+' XP спишутся.':'')))return;
      if(xp)addXP(-xp,false);
      S.leads=S.leads.filter(x=>x.id!==id);break;
    }

    /* ---- заказы ---- */
    case 'addjob':{
      const t=$('#nj-t').value.trim();
      if(!t){toast('впиши название заказа');return}
      S.jobs.push({id:uid(),t:t,n:clamp(parseInt($('#nj-n').value,10)||8,1,40),done:0,
        fee:Math.max(0,parseInt($('#nj-f').value,10)||0),due:$('#nj-d').value||''});
      $('#nj-t').value='';$('#nj-f').value='';
      toast('заказ создан');break;
    }
    case 'jobfrom':{
      const l=S.leads.find(x=>x.id===id);
      closeModal();
      if(!l)return;
      S.jobs.push({id:uid(),t:l.t,n:STAGES.length,done:0,fee:l.sum||S.price.land,due:'',lead:l.id});
      go('jobs');toast('заказ создан — проверь цену и срок');break;
    }
    case 'stage':stage(id,parseInt(el.dataset.n,10));break;
    case 'paid':{
      const j=S.jobs.find(x=>x.id===id);
      closeModal();
      if(!j)return;
      if(j.paid){toast('оплата уже записана');return}
      let sum=j.fee;
      if(!sum){
        const raw=prompt('Сколько заплатили?');
        if(raw===null)return;
        sum=Math.max(0,parseInt(String(raw).replace(/[^\d]/g,''),10)||0);
        if(!sum){toast('сумма не понята');return}
        j.fee=sum;
      }else if(!confirm('Записать приход '+rub(sum)+' в кассу?'))return;
      j.paid=1;
      addTx(j.t,sum,'in',j.id);
      burst(140);
      toast('+'+rub(sum)+' в кассу');break;
    }
    case 'deljob':{
      const j=S.jobs.find(x=>x.id===id);
      if(!j)return;
      const xp=(j.hx||0)+(j.dead&&j.rw?j.rw.xp:0),tok=(j.dead&&j.rw?j.rw.tok:0);
      if(!confirm('Удалить «'+j.t+'»?'+(xp||tok?'\nНачисленные за него '+xp+' XP'+
        (tok?' и ◆ '+tok:'')+' спишутся.':'')+'\nЗаписи в кассе останутся.'))return;
      if(xp)addXP(-xp,false);
      if(tok)S.tok=Math.max(0,S.tok-tok);
      S.jobs=S.jobs.filter(x=>x.id!==id);break;
    }
    case 'setprice':{
      SRV.forEach(s=>{const el2=$('#pr-'+s.id);
        if(el2)S.price[s.id]=clamp(parseInt(el2.value,10)||s.v,1,100000)});
      toast('прайс сохранён');break;
    }
    case 'raise':{
      if(nextUp()>0){toast('сначала два заказа по текущей цене');return}
      if(!confirm('Поднять весь прайс на 25%? Лендинг станет '+rub(Math.round(S.price.land*UPMUL))+'.'))return;
      SRV.forEach(s=>{S.price[s.id]=Math.max(1,Math.round(S.price[s.id]*UPMUL/10)*10)});
      S.upN++;burst(110);
      modal('<div class="kicker">цена поднята</div><div class="big">'+rub(S.price.land)+'</div>'+
        '<div class="sub">Новая цена лендинга. Следующим двум клиентам называешь её, не извиняясь. '+
        'Норма касаний пересчитается сама — её станет меньше.</div>'+
        '<button class="btn w" data-act="closemodal">дальше</button>');break;
    }

    /* ---- цели и касса ---- */
    case 'addgoal':{
      const t=$('#ng-t').value.trim();
      const sum=Math.max(0,parseInt($('#ng-s').value,10)||0);
      if(!t){toast('впиши, на что');return}
      if(!sum){toast('впиши сумму');return}
      S.goals.push({id:uid(),t:t,sum:sum,got:0,per:$('#ng-p').value==='month'?'month':'once',
        due:$('#ng-d').value||''});
      $('#ng-t').value='';$('#ng-s').value='';
      toast('цель добавлена — норма пересчитана');break;
    }
    case 'fill':{
      const g=S.goals.find(x=>x.id===id);
      if(!g)return;
      const raw=prompt('Сколько на эту цель уже собрано? Сейчас '+rub(g.got),String(g.got));
      if(raw===null)return;
      g.got=clamp(Math.round(parseFloat(String(raw).replace(',','.'))||0),0,g.sum);
      toast('поправлено: '+rub(g.got));break;
    }
    case 'goaldone':{
      const g=S.goals.find(x=>x.id===id);
      if(!g)return;
      g.done=g.done?0:1;
      if(g.done){burst(130);toast('цель закрыта — норма пересчитана')}
      break;
    }
    case 'delgoal':{
      const g=S.goals.find(x=>x.id===id);
      if(!g)return;
      if(!confirm('Удалить цель «'+g.t+'»?'+(g.got?'\nОтметка о собранных '+rub(g.got)+' исчезнет, '+
        'но деньги в кассе останутся.':'')))return;
      S.goals=S.goals.filter(x=>x.id!==id);break;
    }
    case 'addtx':{
      const t=$('#nt-t').value.trim();
      const sum=Math.max(0,parseInt($('#nt-s').value,10)||0);
      if(!sum){toast('впиши сумму');return}
      const k=$('#nt-k').value==='out'?'out':'in';
      const x=addTx(t||(k==='in'?'приход':'расход'),sum,k);
      $('#nt-t').value='';$('#nt-s').value='';
      if(x&&k==='in'){
        const toGoal=(x.alloc||[]).reduce((a,v)=>a+v.sum,0);
        burst(100);
        toast('+'+rub(sum)+(toGoal?' · в цели ушло '+rub(toGoal):''));
      }else toast('−'+rub(sum));
      break;
    }
    case 'deltx':delTx(id);break;

    /* ---- вехи, навыки, лавка ---- */
    case 'mile':{
      const m=MILES.find(x=>x.id===id);
      if(!m)return;
      if(S.miles[id]){
        delete S.miles[id];addXP(-m.xp,false);S.tok=Math.max(0,S.tok-m.tok);
      }else{
        S.miles[id]=dkey();addXP(m.xp,false);S.tok+=m.tok;burst(160);
        modal('<div class="kicker">веха взята</div><div class="big">'+esc(m.t)+'</div>'+
          '<div class="sub">+'+m.xp+' XP и ◆ '+m.tok+'. Это случается один раз за всю историю.</div>'+
          '<button class="btn w" data-act="closemodal">дальше</button>');
      }break;
    }
    case 'unlock':{
      const n=NODEMAP[id];
      if(!n||S.skills.indexOf(id)>=0)return;
      if(S.tok<n.cost){toast('не хватает жетонов');return}
      S.tok-=n.cost;S.skills.push(id);burst(90);
      modal('<div class="kicker">навык открыт</div><div class="big">'+esc(n.t)+'</div>'+
        '<div class="sub">'+esc(n.task)+'<br><br>Множитель XP теперь ×'+(1+0.02*S.skills.length).toFixed(2)+'.</div>'+
        '<button class="btn w" data-act="closemodal">дальше</button>');break;
    }
    case 'buy':{
      const it=S.shop.find(x=>x.id===id);
      if(!it)return;
      if(S.tok<it.c){toast('не хватает жетонов');return}
      if(!confirm('Купить «'+it.t+'» за ◆ '+it.c+'?'))return;
      S.tok-=it.c;S.owned.push({id:uid(),t:it.t,d:dkey(),leg:0});burst(80);
      toast('куплено — предъяви ему');break;
    }
    case 'usecoupon':{
      const c=S.owned.find(x=>x.id===id);
      if(c&&!confirm('Использовать «'+c.t+'»? Купон исчезнет.'))return;
      S.owned=S.owned.filter(x=>x.id!==id);toast('использовано');break;
    }
    case 'addshop':{
      const t=$('#ns-t').value.trim();
      if(!t){toast('впиши награду');return}
      S.shop.push({id:uid(),t:t,c:clamp(parseInt($('#ns-c').value,10)||10,1,200)});
      $('#ns-t').value='';break;
    }
    case 'delshop':S.shop=S.shop.filter(x=>x.id!==id);break;

    /* ---- прочее ---- */
    case 'spin':closeModal();doSpin();return;
    case 'bkfile':saveBackupFile();return;
    case 'backup':
      modal('<div class="kicker">бэкап</div><div class="big">одной строкой</div>'+
        '<div class="sub">скопируй и брось себе в заметки</div>'+
        '<textarea readonly rows="4" id="bk">'+esc(b64(JSON.stringify(S)))+'</textarea>'+
        '<button class="btn w" style="margin-top:12px" data-act="copybk">скопировать</button>'+
        '<button class="btn w gh" style="margin-top:8px" data-act="closemodal">закрыть</button>');return;
    case 'copybk':{
      const ta=$('#bk');
      if(!ta)return;
      ta.select();
      if(navigator.clipboard)navigator.clipboard.writeText(ta.value)
        .then(()=>{markBackup();toast('скопировано')},()=>toast('выдели и скопируй руками'));
      else toast('выдели и скопируй руками — и это тоже считается бэкапом');
      return;
    }
    case 'loadfile':{const f=$('#bkfile');if(f)f.click();return}
    case 'restore':{
      const raw=prompt('Вставь строку бэкапа');
      if(raw===null||!raw.trim())return;
      const o=parseBackup(raw);
      if(!o){toast('строка не читается');return}
      applyBackup(o);return;
    }
    case 'snoozebk':S.bkSnooze=dkey();break;
    case 'reset':
      if(!confirm('Стереть весь прогресс?'))return;
      if(!confirm('Точно? Воронка, заказы, касса и цели исчезнут навсегда.'))return;
      S=DEF();applyTheme();toast('всё сброшено');break;
    case 'dayinfo':{
      const r=S.days[id];
      const d=dparse(id).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
      toast(d+': '+(r?r.tap+' '+plural(r.tap,'касание','касания','касаний')+', '+r.xp+' XP'+
        (r.closed?', день закрыт':''):'ничего не было'));
      return;
    }
    case 'hidehint':S.seen=1;break;
    case 'closemodal':closeModal();return;
    default:return;
  }
  render();
}

document.addEventListener('click',e=>{
  const tab=e.target.closest('[data-tab]');
  if(tab){go(tab.dataset.tab);return}
  const pane=e.target.closest('[data-sub]');
  if(pane){sub(pane.dataset.sub);return}
  const el=e.target.closest('[data-act]');
  if(!el){if(e.target.id==='modal')closeModal();return}
  act(el.dataset.act,el.dataset.id,el);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen())closeModal()});

const bkinput=$('#bkfile');
if(bkinput)bkinput.addEventListener('change',e=>{
  const f=e.target.files&&e.target.files[0];
  e.target.value='';
  if(!f)return;
  const r=new FileReader();
  r.onload=()=>{const o=parseBackup(r.result);if(!o){toast('файл не читается');return}applyBackup(o)};
  r.onerror=()=>toast('файл не открылся');
  r.readAsText(f);
});

/* ============================ старт ============================ */
load();applyTheme();syncStreak();askPersist();
render();
if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0)
  navigator.serviceWorker.register('sw.js').catch(()=>{});
let curDay=dkey();
function rollover(){if(dkey()!==curDay){curDay=dkey();syncStreak();render()}}
setInterval(rollover,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)rollover()});
