'use strict';
/* ============================================================
   Своё дело — движок. Всё состояние в localStorage.
   Главная мысль файла: цели в рублях пересчитываются в число
   касаний на сегодня. Считает это plan() в конце файла.
   ============================================================ */
const KEY='delo-v1';
const $=(s,r)=>(r||document).querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const uid=()=>Math.random().toString(36).slice(2,9);
const dkey=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dparse=k=>{const p=String(k).split('-');return new Date(+p[0],+p[1]-1,+p[2])};
const dayDiff=(a,b)=>Math.round((dparse(b)-dparse(a))/864e5);
const shift=(k,n)=>{const d=dparse(k);d.setDate(d.getDate()+n);return dkey(d)};
const plural=(n,a,b,c)=>{const m=Math.abs(n)%100,e=m%10;return m>10&&m<20?c:e>1&&e<5?b:e===1?a:c};
const mkey=k=>String(k||dkey()).slice(0,7);
const dshort=k=>dparse(k).toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
/* «пришло в сентябре», а не «в сентябрь»: предложный падеж браузер не даёт */
const MONP=['январе','феврале','марте','апреле','мае','июне','июле','августе','сентябре','октябре','ноябре','декабре'];
const monthIn=d=>MONP[(d||new Date()).getMonth()];
/* деньги показываем без копеек: копейки тут только шумят */
const rub=n=>Math.round(n||0).toLocaleString('ru-RU')+' р.';

/* ---------- ранги: путь от нуля клиентов ---------- */
const RANKS=[[0,'Ноль клиентов'],[400,'Первые касания'],[1000,'Не боится писать'],[2000,'Первые деньги'],
  [3400,'Фрилансер'],[5200,'Берёт дороже'],[7500,'Очередь заявок'],[10500,'Поток'],
  [14000,'Своё дело'],[18500,'Студия']];
function rankOf(xp){
  let i=0; for(let k=0;k<RANKS.length;k++) if(xp>=RANKS[k][0]) i=k;
  if(i===RANKS.length-1){
    const over=xp-RANKS[i][0],step=5000,m=Math.floor(over/step);
    return {lvl:10+m,name:m?'Студия · уровень '+m:'Студия',cur:over-m*step,need:step};
  }
  return {lvl:i+1,name:RANKS[i][1],cur:xp-RANKS[i][0],need:RANKS[i+1][0]-RANKS[i][0]};
}

/* ---------- воронка ----------
   Стадии идут по порядку, отказ стоит отдельно. XP даётся за переход вперёд
   и снимается при откате — поэтому в самом лиде хранится, что уже начислено. */
const ST=[{id:'new',t:'нашла',xp:5,note:'нашла, но ещё не писала'},
  {id:'sent',t:'написала',xp:25,note:'касание сделано'},
  {id:'rep',t:'ответил',xp:20,note:'ответил хоть что-то'},
  {id:'talk',t:'обсуждаем',xp:40,note:'созвон, вопросы, ТЗ'},
  {id:'bill',t:'счёт',xp:60,note:'смета отправлена'},
  {id:'paid',t:'оплатил',xp:150,note:'деньги пришли'}];
const NO={id:'no',t:'отказ',xp:15,note:'сказал нет — это тоже результат'};
const STALL=['sent','rep','talk','bill'];          /* стадии, которые остывают без напоминания */
const STMAP={}; ST.forEach((s,i)=>STMAP[s.id]={...s,idx:i}); STMAP.no={...NO,idx:-1};
const stIdx=id=>STMAP[id]?STMAP[id].idx:0;
/* сумма XP за все стадии до включительно — чтобы откат снимал ровно начисленное */
const stSum=id=>id==='no'?NO.xp:ST.slice(0,stIdx(id)+1).reduce((a,s)=>a+s.xp,0);

const CH=['инстаграм','телеграм','куфар','знакомые','чат фрилансеров','рекомендация','почта','другое'];

/* ---------- услуги и прайс-лестница ---------- */
const SRV=[{id:'land',t:'лендинг на Tilda',v:300},{id:'multi',t:'сайт на несколько страниц',v:600},
  {id:'quiz',t:'квиз на Marquiz',v:150},{id:'fix',t:'правки и доработка',v:60}];
const PRICE0=()=>{const o={};SRV.forEach(s=>o[s.id]=s.v);return o};
const UPSTEP=2;    /* сколько оплаченных заказов по текущей цене — и можно поднимать */
const UPMUL=1.25;  /* на сколько поднимаем */

/* ---------- этапы заказа: из них собирается полоса HP ---------- */
const STAGES=['созвон и ТЗ','структура и текст','дизайн первого экрана','остальные блоки',
  'адаптив под телефон','формы и заявки','правки','сдача и оплата'];

/* ---------- вехи: разовые, с большой наградой ----------
   hint — условие, при котором приложение подсказывает «похоже, готово».
   Отмечает всё равно она сама: так веху всегда можно снять обратно. */
const MILES=[
  {id:'m1',t:'Три работы в портфолио на Tilda',xp:300,tok:2,h:'Можно учебные: салон, кофейня, мастер маникюра. Главное — показать, а не ждать заказа.'},
  {id:'m2',t:'Оффер написан в одно сообщение',xp:200,tok:1,h:'Кто ты, что делаешь, за сколько, за какой срок. Четыре строки, без «здравствуйте, меня зовут».'},
  {id:'m3',t:'Прайс написан и не стыдно назвать',xp:200,tok:1,h:'Цена вслух, без «ну, это зависит». Занеси её в ЗАКАЗЫ → прайс.'},
  {id:'m4',t:'Пять мест, где искать клиентов, выбраны',xp:150,tok:1,h:'Куфар, чаты фрилансеров, инстаграм мелких салонов, знакомые, старые одногруппники.'},
  {id:'m5',t:'Первое касание сделано',xp:250,tok:2,h:'Один человек, одно сообщение. Всё остальное приложение посчитает само.'},
  {id:'m6',t:'Первый ответ получен',xp:200,tok:1,h:'Ответ — ещё не заказ, но уже доказательство, что тебя читают.'},
  {id:'m7',t:'Двадцать отказов собрано',xp:400,tok:3,h:'Двадцать «нет» — это статистика, а не приговор. После них писать почти не страшно.'},
  {id:'m8',t:'ПЕРВЫЙ ПЛАТНЫЙ ЗАКАЗ',xp:1000,tok:8,h:'Всё, что было до этого, было подготовкой. Дальше ты уже не ищешь первого клиента.'},
  {id:'m9',t:'Первый отзыв на руках',xp:400,tok:3,h:'Проси сразу после сдачи, пока он доволен. Скриншот переписки тоже считается.'},
  {id:'m10',t:'Повторный клиент',xp:600,tok:5,h:'Второй заказ от того же человека стоит дешевле всех холодных касаний вместе.'},
  {id:'m11',t:'Квиз на Marquiz продан как допуслуга',xp:500,tok:4,h:'Лендинг плюс квиз — это тот же клиент и плюс половина чека.'},
  {id:'m12',t:'Чек поднят дважды',xp:700,tok:5,h:'Не «когда буду готова», а после каждых двух заказов. Приложение напомнит.'},
  {id:'m13',t:'Клиент пришёл сам, по рекомендации',xp:900,tok:6,h:'Первый признак, что это уже дело, а не подработка.'},
  {id:'m14',t:'Месяц с доходом больше 1000 р.',xp:1200,tok:8,h:'Месяц, а не разовый заказ. Значит, поток держится.'}
];

/* ---------- навыки: что учить, чтобы брать дороже ---------- */
const TREE=[
  {id:'ti',name:'Tilda',color:'var(--mark)',nodes:[
    {id:'ti1',t:'Зеро-блок',task:'Собрать первый экран в зеро-блоке, не из готовых плашек',cost:2},
    {id:'ti2',t:'Адаптив руками',task:'Починить телефонную версию так, чтобы ничего не разъезжалось',cost:3},
    {id:'ti3',t:'Анимация',task:'Появление по скроллу и наведение — аккуратно, без цирка',cost:4},
    {id:'ti4',t:'Связки',task:'Форма с сайта падает в телегу или таблицу, а не в никуда',cost:6}]},
  {id:'mq',name:'Marquiz',color:'var(--mint)',nodes:[
    {id:'mq1',t:'Первый квиз',task:'Квиз из пяти вопросов с расчётом цены на выходе',cost:2},
    {id:'mq2',t:'Ветвления',task:'Разные ветки вопросов под разные ответы',cost:3},
    {id:'mq3',t:'Квиз в лендинге',task:'Квиз встроен в сайт и собирает заявки оттуда',cost:4},
    {id:'mq4',t:'Цифры',task:'Показать клиенту, сколько заявок принёс квиз за месяц',cost:6}]},
  {id:'sl',name:'Продажи',color:'var(--sun)',nodes:[
    {id:'sl1',t:'Оффер',task:'Сообщение, после которого отвечают. Проверено на десяти касаниях',cost:2},
    {id:'sl2',t:'Смета',task:'Счёт с составом работ, сроком и предоплатой 50%',cost:3},
    {id:'sl3',t:'Созвон',task:'Провести созвон и выйти из него с согласованным ТЗ',cost:4},
    {id:'sl4',t:'Дороже',task:'Назвать цену вдвое выше первой и получить да',cost:6}]},
  {id:'fl',name:'Поток',color:'var(--ink2)',nodes:[
    {id:'fl1',t:'Портфолио',task:'Своя страница с тремя кейсами и кнопкой «написать»',cost:2},
    {id:'fl2',t:'Кейсы',task:'Кейс по схеме: что было, что сделала, что стало',cost:3},
    {id:'fl3',t:'Рекомендации',task:'Попросить клиентов передать тебя дальше — и получить заявку',cost:4},
    {id:'fl4',t:'Постоянный',task:'Договориться на поддержку сайта с оплатой каждый месяц',cost:6}]}
];
const NODEMAP={}; TREE.forEach(b=>b.nodes.forEach((n,i)=>NODEMAP[n.id]={...n,branch:b.id,idx:i}));
const TREEN=TREE.reduce((a,b)=>a+b.nodes.length,0);

/* ---------- дела дня ---------- */
const QUESTS=[
  {id:'q1',c:'поиск',t:'Пять новых людей найдено и записано',xp:20},
  {id:'q2',c:'поиск',t:'Посмотрела, что пишут в чатах и на куфаре',xp:10},
  {id:'q3',c:'поиск',t:'Напомнила о себе тем, кто остыл',xp:20},
  {id:'d1',c:'дело',t:'Час работы по активному заказу',xp:25},
  {id:'d2',c:'дело',t:'Кусок портфолио: один блок, один экран',xp:20},
  {id:'d3',c:'дело',t:'Тридцать минут учёбы по Tilda или Marquiz',xp:20},
  {id:'g1',c:'голова',t:'План на завтра написан вечером',xp:10},
  {id:'g2',c:'голова',t:'Легла до 00:30',xp:10},
  {id:'g3',c:'голова',t:'Вышла из дома и подвигалась',xp:15}
];
const CATS=['поиск','дело','голова'];
const CATNOTE={'поиск':'единственное, что приносит клиентов',
  'дело':'то, за что платят, и то, что можно показать',
  'голова':'чтобы хватило не на неделю, а на год'};

/* ---------- лавка: платит он ---------- */
const SHOP0=[{id:'h1',t:'Кофе и сырник, платит он',c:5},{id:'h2',t:'Доставка вечером',c:12},
  {id:'h3',t:'Вечер без ноутбука и без чувства вины',c:8},{id:'h4',t:'Все дела по дому на нём',c:10},
  {id:'h5',t:'Он пишет текст для лендинга',c:14},{id:'h6',t:'Что-то из вишлиста',c:25},
  {id:'h7',t:'Поездка на выходные',c:60}];
const PRIZES=[
  {w:22,t:'+30 XP',k:'xp',v:30},
  {w:14,t:'+70 XP',k:'xp',v:70},
  {w:20,t:'+1 жетон',k:'tok',v:1},
  {w:10,t:'+2 жетона',k:'tok',v:2},
  {w:10,t:'Заморозка серии',k:'fz',v:1},
  {w:7,t:'×2 XP на завтра',k:'boost',v:1},
  {w:7,t:'Купон: он ищет десять клиентов за тебя',k:'coup',v:'Он ищет десять клиентов за тебя'},
  {w:5,t:'Купон: он пишет текст для лендинга',k:'coup',v:'Он пишет текст для лендинга'},
  {w:4,t:'Купон: свидание по твоему сценарию',k:'coup',v:'Свидание по твоему сценарию'},
  {w:1,t:'ЛЕГЕНДАРКА: подарок из вишлиста',k:'leg',v:'Подарок из вишлиста'}
];

/* ---------- цели по умолчанию: правятся сразу, это просто пример ---------- */
const GOAL0=()=>[
  {id:uid(),t:'Переезд: залог и первый месяц',sum:2500,got:0,per:'once',due:shift(dkey(),180),ex:1},
  {id:uid(),t:'Аренда',sum:1100,got:0,per:'month',due:'',ex:1},
  {id:uid(),t:'Claude Max',sum:650,got:0,per:'month',due:'',ex:1},
  {id:uid(),t:'Мак парню',sum:5000,got:0,per:'once',due:shift(dkey(),365),ex:1}
];

/* конверсия по умолчанию, пока своей статистики мало: один заказ на 25 касаний */
const CONV0=1/25;
const CONVMIN=20;   /* столько касаний нужно, чтобы верить своей конверсии */

/* ---------- состояние ---------- */
const DEF=()=>({v:1,xp:0,tok:0,streak:0,best:0,freeze:2,lastClosed:null,lastBackup:null,bkSnooze:null,
  bal:50,tx:[],goals:GOAL0(),leads:[],jobs:[],price:PRICE0(),upN:0,miles:{},skills:[],
  custom:[],off:[],days:{},quota:null,weekend:1,buy:{},spins:0,boost:null,conv:null,
  shop:SHOP0.slice(),owned:[],theme:'auto',seen:0});
let S=DEF();

/* 0 — пишем нормально, 1 — localStorage отказал (приватный режим, кончилось место) */
let storeBroken=0;
const storeOk=()=>!storeBroken;
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(S));storeBroken=0}
  catch(e){
    if(!storeBroken&&typeof toast==='function')toast('браузер не сохраняет прогресс — сделай бэкап');
    storeBroken=1;
  }
}
function load(){
  try{const raw=localStorage.getItem(KEY); if(!raw){save();fix();return}
    const o=JSON.parse(raw); if(o&&typeof o==='object') S=Object.assign(DEF(),o);
  }catch(e){}
  fix();
}
/* просим браузер не вычищать хранилище: без этого Safari стирает данные
   сайта после недели без визитов, а вместе с ними — всю воронку */
function askPersist(){
  try{
    if(!navigator.storage||!navigator.storage.persist)return;
    navigator.storage.persisted().then(p=>{if(!p)return navigator.storage.persist()}).catch(()=>{});
  }catch(e){}
}
/* старый или битый снимок не должен ронять отрисовку */
const isKey=k=>typeof k==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(k);
const num=(v,d)=>{const n=parseFloat(v);return isFinite(n)?n:d};
function fix(){
  ['tx','goals','leads','jobs','skills','custom','off','shop','owned'].forEach(k=>{
    if(!Array.isArray(S[k]))S[k]=k==='shop'?SHOP0.slice():k==='goals'?GOAL0():[]});
  ['days','miles','buy','price'].forEach(k=>{if(!S[k]||typeof S[k]!=='object')S[k]=k==='price'?PRICE0():{}});
  ['xp','tok','streak','best','freeze','spins','upN'].forEach(k=>{S[k]=Math.max(0,parseInt(S[k],10)||0)});
  S.bal=Math.round(num(S.bal,0));
  if(typeof S.theme!=='string'||['auto','light','dark'].indexOf(S.theme)<0)S.theme='auto';
  ['lastClosed','lastBackup','boost','bkSnooze'].forEach(k=>{if(!isKey(S[k]))S[k]=null});
  S.weekend=S.weekend?1:0;
  S.seen=S.seen?1:0;
  S.quota=S.quota==null?null:clamp(parseInt(S.quota,10)||0,0,30);
  S.conv=S.conv==null?null:clamp(num(S.conv,0),.002,1)||null;
  SRV.forEach(s=>{S.price[s.id]=clamp(Math.round(num(S.price[s.id],s.v)),1,100000)});
  /* множитель XP считается по длине списка навыков — чужие id накрутили бы его молча */
  S.skills=S.skills.filter((id,i)=>NODEMAP[id]&&S.skills.indexOf(id)===i);
  S.freeze=Math.min(S.freeze,freezeCap());
  const knownM={}; MILES.forEach(m=>knownM[m.id]=1);
  Object.keys(S.miles).forEach(id=>{if(!knownM[id])delete S.miles[id]});
  S.tx=S.tx.filter(x=>x&&typeof x==='object'&&x.id&&isKey(x.d)).map(x=>{
    x.sum=Math.max(0,Math.round(num(x.sum,0)));x.k=x.k==='out'?'out':'in';return x});
  S.goals=S.goals.filter(g=>g&&typeof g==='object'&&g.id).map(g=>{
    g.sum=clamp(Math.round(num(g.sum,0)),0,10000000);g.got=clamp(Math.round(num(g.got,0)),0,g.sum);
    g.per=g.per==='month'?'month':'once';if(!isKey(g.due))g.due='';return g});
  S.leads=S.leads.filter(l=>l&&typeof l==='object'&&l.id).map(l=>{
    if(!STMAP[l.st])l.st='new';
    if(!isKey(l.last))l.last=dkey();
    l.sum=Math.max(0,Math.round(num(l.sum,0)));
    l.tap=Math.max(0,parseInt(l.tap,10)||0);
    /* g — сколько XP уже начислено за каждую пройденную стадию.
       Храним в самом лиде, чтобы откат снимал ровно выданное. */
    if(!l.g||typeof l.g!=='object')l.g={};
    Object.keys(l.g).forEach(k=>{
      if(!STMAP[k])delete l.g[k];else l.g[k]=Math.max(0,parseInt(l.g[k],10)||0)});
    if(!STMAP[l.pre])l.pre=null;
    return l});
  S.jobs=S.jobs.filter(j=>j&&typeof j==='object'&&j.id).map(j=>{
    j.n=clamp(parseInt(j.n,10)||1,1,40);j.done=clamp(parseInt(j.done,10)||0,0,j.n);
    j.fee=Math.max(0,Math.round(num(j.fee,0)));j.hx=parseInt(j.hx,10)||0;
    if(!isKey(j.due))j.due='';return j});
  ['custom','shop','owned'].forEach(k=>{S[k]=S[k].filter(x=>x&&typeof x==='object'&&x.id)});
  S.custom=S.custom.map(q=>{q.xp=clamp(parseInt(q.xp,10)||15,5,60);
    if(CATS.indexOf(q.c)<0)q.c='дело';return q});
}
const rec=k=>{k=k||dkey(); if(!S.days[k]) S.days[k]={tap:0,done:{},xp:0,closed:0}; return S.days[k]};
const allQuests=()=>QUESTS.concat(S.custom).filter(q=>S.off.indexOf(q.id)<0);
const freezeCap=()=>clamp(2+Math.floor(S.skills.length/6),2,4);
const mult=()=>(1+0.02*S.skills.length)*(S.boost===dkey()?2:1);

/* ============================================================
   Деньги и обратный счёт
   ============================================================ */
const inMonth=m=>S.tx.filter(x=>x.k==='in'&&mkey(x.d)===(m||mkey())).reduce((a,x)=>a+x.sum,0);
const outMonth=m=>S.tx.filter(x=>x.k==='out'&&mkey(x.d)===(m||mkey())).reduce((a,x)=>a+x.sum,0);
const paidJobs=()=>S.jobs.filter(j=>j.paid&&j.fee>0);

/* средний чек: по своим оплаченным заказам, пока их мало — по прайсу */
function avgFee(){
  const p=paidJobs();
  if(p.length>=2)return p.reduce((a,j)=>a+j.fee,0)/p.length;
  if(p.length===1)return (p[0].fee+S.price.land)/2;
  return S.price.land;
}
/* конверсия: сколько касаний приходится на один заказ.
   Своим цифрам верим только после CONVMIN касаний, иначе считаем по умолчанию. */
function convRate(){
  const sent=S.leads.filter(l=>stIdx(l.st)>=1||l.st==='no').length;
  const won=S.leads.filter(l=>l.st==='paid').length;
  if(S.conv)return {v:S.conv,own:0,hand:1,sent:sent,won:won,need:0};
  if(sent>=CONVMIN&&won>=1)return {v:won/sent,own:1,hand:0,sent:sent,won:won,need:0};
  return {v:CONV0,own:0,hand:0,sent:sent,won:won,need:Math.max(0,CONVMIN-sent)};
}
/* ---------- главное: цели → рубли в месяц → заказы → касания → сегодня ----------
   Каждая разовая цель делится на свой срок: мак на год и переезд на три месяца
   дают разную нагрузку. Цель без срока считаем на три месяца вперёд, цель
   с прошедшим сроком — на полмесяца, чтобы она давила, но не до абсурда. */
function plan(){
  const t=dkey();
  let perMon=0,left=0,soon=0,mon=0;
  S.goals.filter(g=>!g.done).forEach(g=>{
    if(g.per==='month'){perMon+=g.sum;mon+=g.sum;return}
    const rest=Math.max(0,g.sum-g.got);
    left+=rest;
    const d=g.due?dayDiff(t,g.due):0;
    perMon+=rest/(g.due?Math.max(.5,d/30):3);
    if(g.due&&d>0&&(!soon||d<soon))soon=d;
  });
  const needMon=perMon;
  const fee=Math.max(1,avgFee());
  const jobs=needMon/fee;
  const c=convRate();
  const touch=jobs/Math.max(.002,c.v);
  const wd=S.weekend?22:30;
  const raw=touch/wd;
  return {left:left,mon:mon,onceMon:needMon-mon,soon:soon,needMon:needMon,fee:fee,jobs:jobs,
    touch:touch,conv:c,raw:raw,daily:clamp(Math.ceil(raw),1,12),hard:raw>12,
    got:inMonth(),spent:outMonth()};
}
/* сколько эта цель требует в месяц — та же арифметика, но по одной цели */
function goalMon(g){
  if(g.done)return 0;
  if(g.per==='month')return g.sum;
  const rest=Math.max(0,g.sum-g.got);
  const d=g.due?dayDiff(dkey(),g.due):0;
  return rest/(g.due?Math.max(.5,d/30):3);
}
const isWeekend=k=>{const g=dparse(k||dkey()).getDay();return g===0||g===6};
/* норма касаний на день: ручная, если задана, иначе из обратного счёта */
function quota(k){
  k=k||dkey();
  if(S.weekend&&isWeekend(k))return 0;
  return S.quota!=null?S.quota:plan().daily;
}
/* можно ли закрывать день: норма сделана, или день откуплен.
   В выходной нормы нет, но совсем пустой день закрывать не за что. */
function closable(k){
  k=k||dkey();
  const r=rec(k),q=quota(k);
  if(r.closed)return 0;
  if(bought(k))return 1;
  if(r.tap<q)return 0;
  return q>0||r.xp>0?1:0;
}
const bought=k=>!!S.buy[k||dkey()];
const buyLeft=()=>{const m=mkey();return 2-Object.keys(S.buy).filter(k=>mkey(k)===m).length};
/* кто остыл: живая стадия и три дня без касания */
const stale=()=>S.leads.filter(l=>STALL.indexOf(l.st)>=0&&dayDiff(l.last,dkey())>=3)
  .sort((a,b)=>a.last<b.last?-1:1);
const noCount=()=>S.leads.filter(l=>l.st==='no').length;
const nextUp=()=>{const n=paidJobs().length-S.upN*UPSTEP;return UPSTEP-n};

/* ---------- когда по цифрам похоже, что веха взята ----------
   Отмечает всё равно она: подсказка не ставит галку, только светится. */
const MREADY={
  m5:()=>S.leads.some(l=>stIdx(l.st)>=1||l.st==='no'),
  m6:()=>S.leads.some(l=>stIdx(l.st)>=2),
  m7:()=>noCount()>=20,
  m8:()=>paidJobs().length>=1,
  m12:()=>S.upN>=2,
  m14:()=>{const m={};S.tx.forEach(x=>{if(x.k==='in')m[mkey(x.d)]=(m[mkey(x.d)]||0)+x.sum});
    return Object.keys(m).some(k=>m[k]>=1000)}
};
const mReady=id=>MREADY[id]?!!MREADY[id]():false;

/* XP, начисленный за лида целиком — нужен при удалении */
const leadXP=l=>l.g?Object.keys(l.g).reduce((a,k)=>a+l.g[k],0):0;
