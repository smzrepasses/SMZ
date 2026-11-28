/* =====================================================================
   SMZ Repasses · NOVO VISUAL
   Camada de apresentação (telas, menu, gráficos). Não contém regra de negócio:
   todos os números vêm das funções que já existem no sistema (patrimonio(),
   caixaSaldo(), vehicle*(), avaliarEspeculacao() etc.) e todas as ações chamam os
   mesmos handlers de antes (openVehicleModal, handleAddContribution, acFecharMes...).
   Login, Supabase, sincronização, backups, migrações e auditoria ficam no index.html.

   Como entra em ação: o index.html chama window.duoInstall() uma única vez, logo antes
   de AC.start(). Daqui em diante render() continua sendo a mesma função de sempre; só as
   funções de desenho (renderTabs, renderHeader, _renderActivePanel, setTab) foram trocadas.
   ===================================================================== */
(function(){
'use strict';

/* ---------- utilidades ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const sum=a=>a.reduce((s,x)=>s+x,0);
const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MESL=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const fm=n=>{n=Math.round((Number(n)||0)*100)/100;return (n<0?'−':'')+'R$ '+Math.abs(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})};
const fK=n=>{const a=Math.abs(n);return a>=1e6?(n<0?'−':'')+'R$ '+(a/1e6).toFixed(2).replace('.',',')+' mi':fm(n)};
const fP=(n,d=1)=>Number(n).toFixed(d).replace('.',',')+'%';
const dBR=iso=>{const [y,m,d]=String(iso||'').split('-');return d?`${d}/${m}`:'—'};
const dLong=iso=>{const [y,m,d]=String(iso||'').split('-');return d?`${+d} de ${MES[+m-1]}`:'—'};
const M=t=>`<span class="m">${t}</span>`;
const E=s=>esc(s);
const ymOf=d=>String(d||'').slice(0,7);
const cap1=s=>s.charAt(0).toUpperCase()+s.slice(1);
const hasAC=()=>typeof AC!=='undefined';

/* ---------- ícones ---------- */
const I={
 users:'<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.8a3 3 0 0 1 0 5.4"/><path d="M17.5 14a5 5 0 0 1 3 5"/>',
 home:'<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5h4v5"/>',
 car:'<path d="M5 16.5v2M19 16.5v2"/><path d="M3.5 16.5h17v-4l-2-5a1.6 1.6 0 0 0-1.5-1H7a1.6 1.6 0 0 0-1.5 1l-2 5z"/><path d="M3.5 12.5h17"/><circle cx="7.5" cy="14.6" r=".5"/><circle cx="16.5" cy="14.6" r=".5"/>',
 wallet:'<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><path d="M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5z"/><circle cx="16" cy="13.5" r="1.1"/>',
 net:'<circle cx="12" cy="6" r="2.4"/><circle cx="5.5" cy="17" r="2.4"/><circle cx="18.5" cy="17" r="2.4"/><path d="M10.8 8 6.8 14.9M13.2 8l4 6.9M8 17h8"/>',
 compass:'<circle cx="12" cy="12" r="8.5"/><path d="m15.8 8.2-2 5.6-5.6 2 2-5.6z"/>',
 duo:'<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
 moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
 eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
 eyeoff:'<path d="M3 3l18 18"/><path d="M10.3 5.7A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.9 3.7M6.6 7.3A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.5 0 2.8-.4 4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 minus:'<path d="M5 12h14"/>',
 up:'<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>',
 down:'<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5"/>',
 alert:'<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 trend:'<path d="M3.5 17 9.5 11l4 4 7-8"/><path d="M15 7h5.5v5.5"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 x:'<path d="m6 6 12 12M18 6 6 18"/>',
 phone:'<path d="M6.5 4h3l1.3 4-2 1.3a11 11 0 0 0 5.9 5.9l1.3-2 4 1.3v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 6a2 2 0 0 1 2-2z"/>',
 chat:'<path d="M20.5 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-4.5A8 8 0 1 1 20.5 11.5z"/>',
 pin:'<path d="M12 21s6.5-5.8 6.5-11a6.5 6.5 0 0 0-13 0c0 5.2 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.2"/>',
 chev:'<path d="m6 9 6 6 6-6"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
 lock:'<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
 spark:'<path d="M12 3.5 13.9 10l6.6 2-6.6 2L12 20.5 10.1 14 3.5 12l6.6-2z"/>',
 tag:'<path d="M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7z"/><circle cx="8" cy="9" r="1.2"/>',
 edit:'<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="m14 6 3 3"/>',
 trash:'<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
 download:'<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 19h14"/>',
 upload:'<path d="M12 15V4"/><path d="m7 8 5-5 5 5"/><path d="M5 19h14"/>',
 bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
 shield:'<path d="M12 3.5 5 6v6c0 4.2 3 7.2 7 8.5 4-1.3 7-4.3 7-8.5V6z"/><path d="m9 12 2.2 2.2L15 10.5"/>',
 logout:'<path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10"/><path d="m15 8 4 4-4 4M19 12H9.5"/>',
 undo:'<path d="M4 10.5h9.5a5.5 5.5 0 0 1 0 11H9"/><path d="M8 5.5 3.5 10.5 8 15.5"/>',
 file:'<path d="M7 3.5h7l4 4V20H7z"/><path d="M14 3.5V8h4"/>'
};
const ic=(n,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${I[n]||''}</svg>`;

/* ---------- estado só da interface ---------- */
const S={lq:'',range:'6M',vf:'todos',vq:'',pf:'Todos',pq:'',radar:'atencao',sim:null,open:{},xopen:{},first:true,climit:200,cq:'',fechAll:false};
const NAV=[
 {id:'dashboard',l:'Painel',ic:'home',t:'Painel',rail:'Painel'},
 {id:'veiculos',l:'Veículos',ic:'car',t:'Veículos',rail:'Veículos'},
 {id:'caixa',l:'Financeiro',ic:'wallet',t:'Financeiro',rail:'Financeiro'},
 {id:'parceiros',l:'Parceiros',ic:'net',t:'Rede de parceiros',rail:'Parceiros'},
 {id:'clientes',l:'Clientes',ic:'users',t:'Clientes',rail:'Clientes'},
 {id:'executiva',l:'Executiva',ic:'compass',t:'Visão executiva',rail:'Visão executiva'},
 {id:'prolabore',l:'Capital',ic:'trend',t:'Aportes e retiradas',rail:'Aportes e retiradas'}
];
const hello=()=>{const h=new Date().getHours();return h<5?'Boa noite':h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'};
const firstName=()=>hasAC()?String(AC.nome||'').trim().split(/\s+/)[0]:'';
const SUB={
 dashboard:()=>`${hello()}${firstName()?', '+firstName():''}. Esta é a situação da operação hoje.`,
 veiculos:()=>'Estoque, preparação e histórico de cada carro.',
 caixa:()=>'Entradas, saídas, metas e fechamento do mês.',
 parceiros:()=>'Quem prepara seus carros e quanto cada um rende.',
 clientes:()=>'Quem já comprou de você, para chamar de novo.',
 executiva:()=>'Para decidir: quanto comprar, o que vender e o que ajustar.',
 prolabore:()=>'O dinheiro que você colocou na operação e o que retirou.'
};

/* ---------- dados derivados (só leitura do estado existente) ---------- */
const stageOf=v=>v.status==='Vendido'?'vendido':isDesistencia(v)?'desist':isEspeculacao(v)?'esp':vehicleEmPreparacao(v)?'prep':'venda';
const nomeV=v=>`${v.marca||''} ${v.modelo||''}`.trim()||'Veículo';
const margemProj=v=>{const l=vehicleLucroProjetado(v),a=Number(v.valorAnunciado||0);return(l!=null&&a>0)?l/a*100:null};
const ativos=()=>veiculosEstoqueAtivo();
const dias_=v=>stageOf(v)==='prep'?vehicleDiasPreparacao(v):vehicleDias(v);
const socios=()=>{const all=state.socios||[],me=hasAC()&&AC.user?AC.user.id:null,o=all.filter(s=>s.id===me);return o.length?o:(me?[{id:me,nome:AC.nome||'Você'}]:all.slice(0,1))};
const sCor=i=>['var(--sa)','var(--sb)','var(--c3)','var(--c4)'][i%4];
const socioIdx=id=>Math.max(0,socios().findIndex(s=>s.id===id));
const socioNome=id=>{const s=socios().find(x=>x.id===id);return s?s.nome:'—'};
function acao(d){return d>META_DIAS_ESTOQUE*2?'Reduza o preço em 3% a 5% e renove o anúncio com fotos novas.':d>META_DIAS_ESTOQUE?'Revise o preço e reforce a divulgação.':'Dentro do prazo.'}
function classif(pct,disp){
  const MP=META_CAPITAL_PARADO_PCT;
  if(disp<=0||pct>MP*2) return {l:'Capital comprometido',t:'neg',d:disp<=0?'Não há capital livre para uma nova compra agora.':`${fP(pct)} do patrimônio está parado em estoque, mais que o dobro da meta de ${MP}%. Venda antes de comprar.`};
  if(pct>MP) return {l:'Capital limitado',t:'warn',d:`${fP(pct)} do patrimônio está parado em estoque, acima da meta de ${MP}%. Compre com seletividade.`};
  return {l:'Capital saudável',t:'pos',d:`Só ${fP(pct)} do patrimônio está parado em estoque, dentro da meta de ${MP}%. Bom momento para comprar.`};
}
const isoOf=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

/* patrimônio semana a semana, reconstruído dos lançamentos reais (caixa + capital em veículos ainda não vendidos) */
function seriesPat(){
  const n=52,today=new Date();today.setHours(0,0,0,0);
  const tx=(state.transactions||[]).filter(t=>t.date).map(t=>({d:t.date,v:Number(t.valor||0),out:t.tipo==='saida',vid:t.vehicleId||null,cat:t.categoria}));
  const cap0=Number(state.capitalInicial||0);
  const veh={};(state.vehicles||[]).forEach(v=>{if(!isDesistencia(v))veh[v.id]=v.status==='Vendido'?(v.dataVenda||'9999'):null});
  const vals=[],labels=[];
  for(let i=0;i<n;i++){
    const d=new Date(today);d.setDate(d.getDate()-(n-1-i)*7);const iso=isoOf(d);
    let caixa=cap0,est=0;
    tx.forEach(t=>{
      if(t.d>iso) return;
      caixa+=t.out?-t.v:t.v;
      if(t.vid&&t.out&&t.cat!=='Comissão'&&Object.prototype.hasOwnProperty.call(veh,t.vid)){
        const sd=veh[t.vid]; if(sd===null||sd>iso) est+=t.v;
      }
    });
    vals.push(caixa+est);labels.push(`${d.getDate()} ${MES[d.getMonth()]}`);
  }
  vals[n-1]=patrimonio();
  return {vals,labels};
}
function monthlyCash(k){ // saldo de caixa ao fim de cada um dos últimos k meses
  const d=new Date(),yms=[];for(let i=k-1;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);yms.push(x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'))}
  const por={};(state.transactions||[]).forEach(t=>{if(!t.date)return;const m=ymOf(t.date);por[m]=(por[m]||0)+(t.tipo==='entrada'?1:-1)*Number(t.valor||0)});
  let acc=Number(state.capitalInicial||0)+Object.keys(por).filter(m=>m<yms[0]).reduce((s,m)=>s+por[m],0);
  return {yms,vals:yms.map(m=>acc+=(por[m]||0)),startOfMonth:acc-(por[yms[k-1]]||0)};
}
function monthlyLucro(k){
  const d=new Date(),out=[];for(let i=k-1;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);out.push(lucroPorMes(x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')))}
  return out;
}
function flowData(){
  const por={};
  (state.transactions||[]).forEach(t=>{if(!t.date)return;const ym=ymOf(t.date),o=por[ym]||(por[ym]={e:0,s:0});if(t.tipo==='entrada')o.e+=Number(t.valor||0);else o.s+=Number(t.valor||0)});
  let yms=Object.keys(por).sort().slice(-8);
  if(!yms.length)yms=[ymNow()];
  while(yms.length<4){const [y,m]=yms[0].split('-').map(Number),d=new Date(y,m-2,1);yms.unshift(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'))}
  return {yms,labels:yms.map(y=>MES[+y.slice(5,7)-1]),ent:yms.map(y=>(por[y]||{e:0}).e),sai:yms.map(y=>(por[y]||{s:0}).s),now:ymNow()};
}
function partnerStats(p){
  const vs=(state.vehicles||[]).filter(v=>v.parceiroId===p.id&&!isEspeculacao(v)&&!isDesistencia(v));
  const sold=vs.filter(v=>v.status==='Vendido');
  return {veic:vs.length,sold:sold.length,gasto:sum(sold.map(vehicleComissao)),lucro:sum(sold.map(v=>vehicleLucroLiquido(v)||0)),prazo:sold.length?sum(sold.map(vehicleDias))/sold.length:null,atual:vs.filter(v=>v.status==='Garagem Parceira')};
}

/* =====================================================================
   tooltip / helpers de gráfico (iguais aos da prévia)
   ===================================================================== */
const tip=()=>$('#tip');
function showTip(html,x,y){const t=tip();if(!t)return;t.innerHTML=html;t.classList.add('on');const w=t.offsetWidth,h=t.offsetHeight;t.style.left=Math.max(8,Math.min(innerWidth-w-8,x-w/2))+'px';let tp=y-h-14;if(tp<8)tp=y+18;t.style.top=tp+'px'}
function hideTip(){const t=tip();if(t)t.classList.remove('on')}
const tipHtml=(h,rows)=>`<div class="h">${h}</div>`+(rows||[]).map(r=>`<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
function smooth(p){if(p.length<3)return 'M'+p.map(a=>a.join(',')).join('L');let d=`M${p[0][0]},${p[0][1]}`;for(let i=0;i<p.length-1;i++){const p0=p[i-1]||p[i],p1=p[i],p2=p[i+1],p3=p[i+2]||p2,t=.17;d+=`C${(p1[0]+(p2[0]-p0[0])*t).toFixed(1)},${(p1[1]+(p2[1]-p0[1])*t).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])*t).toFixed(1)},${(p2[1]-(p3[1]-p1[1])*t).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`}return d}
function polar(cx,cy,r,deg){const a=deg*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]}
function arcPath(cx,cy,r,a0,a1){const [x0,y0]=polar(cx,cy,r,a0),[x1,y1]=polar(cx,cy,r,a1);return`M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${a1-a0>180?1:0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`}
const stColor={pos:'var(--pos)',warn:'var(--warn)',neg:'var(--neg)','':'var(--mut)'};
function gauge({f,target,tone,center,sub,ticks=true,stroke=11}){
  const cx=60,cy=62,r=44,A0=150,SW=240;
  f=Math.max(.008,Math.min(1,f||0));
  let t='';
  if(ticks)for(let i=0;i<=24;i++){const a=A0+SW*i/24,major=i%6===0,[x0,y0]=polar(cx,cy,r+stroke/2+3,a),[x1,y1]=polar(cx,cy,r+stroke/2+(major?8:6),a);t+=`<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="var(--line2)" stroke-width="${major?1.6:1}"/>`}
  let mk='';
  if(target!=null){const a=A0+SW*Math.max(0,Math.min(1,target)),[x0,y0]=polar(cx,cy,r-stroke/2-3,a),[x1,y1]=polar(cx,cy,r+stroke/2+3,a);mk=`<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="var(--tx)" stroke-width="2.4" stroke-linecap="round"/>`}
  return`<svg viewBox="0 0 120 104" role="img" aria-label="${E(center)}">${t}<path d="${arcPath(cx,cy,r,A0,A0+SW)}" fill="none" stroke="var(--s3)" stroke-width="${stroke}" stroke-linecap="round"/><path class="draw" pathLength="1" d="${arcPath(cx,cy,r,A0,A0+SW*f)}" fill="none" stroke="${stColor[tone]||stColor['']}" stroke-width="${stroke}" stroke-linecap="round"/>${mk}<text x="60" y="${sub?60:66}" text-anchor="middle" style="font:800 19px var(--font);letter-spacing:-.03em;fill:var(--tx)">${center}</text>${sub?`<text x="60" y="76" text-anchor="middle" class="ax">${sub}</text>`:''}</svg>`;
}
function spark(vals){
  const w=110,h=30,p=3,mn=Math.min(...vals),mx=Math.max(...vals),sp=(mx-mn)||1;
  const pts=vals.map((v,i)=>[p+i*(w-2*p)/(vals.length-1),h-p-((v-mn)/sp)*(h-2*p)]),l=pts[pts.length-1];
  return`<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${smooth(pts)}" fill="none" stroke="var(--tx2)" stroke-width="2" stroke-linecap="round" opacity=".55"/><circle cx="${l[0]}" cy="${l[1]}" r="4" fill="var(--acc)" stroke="var(--s1)" stroke-width="2"/></svg>`;
}
function drawLine(el,o){
  const W=el.clientWidth||340,H=o.h||190,pt=12,pb=24,n=o.vals.length;
  const mn=Math.min(...o.vals),mx=Math.max(...o.vals),sp=(mx-mn)||1,lo=mn-sp*.28,hi=mx+sp*.1;
  const X=i=>i*W/(n-1),Y=v=>pt+(1-(v-lo)/(hi-lo))*(H-pt-pb);
  const pts=o.vals.map((v,i)=>[X(i),Y(v)]),d=smooth(pts);
  let g='';for(let k=0;k<3;k++){const v=lo+(hi-lo)*(k+.5)/3.0*.9+(hi-lo)*.05,y=Y(v);g+=`<line class="grid-l" x1="0" x2="${W}" y1="${y}" y2="${y}"/><text class="ax" x="20" y="${y-5}">${fK(v)}</text>`}
  const idx=[0,Math.round((n-1)/3),Math.round(2*(n-1)/3),n-1];
  const xl=idx.map((i,k)=>`<text class="ax" x="${k===0?20:k===3?W-20:X(i)}" y="${H-4}" text-anchor="${k===0?'start':k===3?'end':'middle'}">${o.labels[i]}</text>`).join('');
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${E(o.aria||'Gráfico de linha')}"><defs><linearGradient id="g${o.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".22"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>${g}${xl}<path d="${d} L${W},${H-pb} L0,${H-pb}Z" fill="url(#g${o.id})"/><path class="${S.first?'draw':''}" pathLength="1" d="${d}" fill="none" stroke="var(--acc)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><g class="cross"><line x1="0" x2="0" y1="${pt}" y2="${H-pb}" stroke="var(--line2)" stroke-width="1"/><circle r="5.5" fill="var(--acc)" stroke="var(--s1)" stroke-width="2.5"/></g><circle cx="${pts[n-1][0]-2}" cy="${pts[n-1][1]}" r="5" fill="var(--acc)" stroke="var(--s1)" stroke-width="2.5"/><rect class="xh" x="0" y="0" width="${W}" height="${H}" fill="transparent" style="touch-action:pan-y"/></svg>`;
  const svg=$('svg',el),cr=$('.cross',svg),ln=$('line',cr),ci=$('circle',cr),hit=$('.xh',svg);
  const mv=e=>{const r=svg.getBoundingClientRect(),x=(e.clientX-r.left)*(W/r.width),i=Math.max(0,Math.min(n-1,Math.round(x/W*(n-1))));cr.style.opacity=1;ln.setAttribute('x1',X(i));ln.setAttribute('x2',X(i));ci.setAttribute('cx',X(i));ci.setAttribute('cy',Y(o.vals[i]));showTip(tipHtml(o.labels[i],[[o.name||'Valor',fm(o.vals[i])]]),e.clientX,r.top+Y(o.vals[i]))};
  hit.addEventListener('pointermove',mv);hit.addEventListener('pointerdown',mv);hit.addEventListener('pointerleave',()=>{cr.style.opacity=0;hideTip()});
}
function barP(x,y,w,h,up,r=4){
  r=Math.min(r,h/2,w/2);if(h<=0)return'';
  return up?`M${x},${y+h}V${y+r}Q${x},${y} ${x+r},${y}H${x+w-r}Q${x+w},${y} ${x+w},${y+r}V${y+h}Z`:`M${x},${y}V${y+h-r}Q${x},${y+h} ${x+r},${y+h}H${x+w-r}Q${x+w},${y+h} ${x+w},${y+h-r}V${y}Z`;
}
const axLbl=v=>v===0?'0':(v<0?'−':'')+(Math.abs(v)>=1e6?(Math.abs(v)/1e6).toFixed(1).replace('.',',')+' mi':(Math.round(Math.abs(v)/100)/10).toString().replace('.',',')+' mil');
function niceTop(x){if(x<=0)return 10000;const m=Math.pow(10,Math.floor(Math.log10(x))),f=x/m,s=f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10;return s*m}
function drawFlow(el){
  const F=flowData(),n=F.labels.length,W=el.clientWidth||340,H=230,pl=46,pr=4,pt=10,pb=24;
  const mx=Math.max(...F.ent,...F.sai,1),top=niceTop(mx),bot=-Math.max(top*0.7,Math.max(...F.sai)*1.02);
  const Y=v=>pt+(top-v)/(top-bot)*(H-pt-pb),slot=(W-pl-pr)/n,bw=Math.min(24,slot*.46),y0=Y(0);
  let g='';[top,top/2,0,-top/3].forEach(v=>{const y=Y(v);g+=`<line class="grid-l" x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}"/><text class="ax" x="0" y="${y+4}">${axLbl(v)}</text>`});
  let b='';
  for(let i=0;i<n;i++){const cx=pl+slot*(i+.5),e=F.ent[i],s=F.sai[i],res=e-s,parc=F.yms[i]===F.now;
    const tp=tipHtml(`${F.labels[i]}/${F.yms[i].slice(2,4)}${parc?' (parcial)':''}`,[['Entradas',fm(e)],['Saídas',fm(s)],['Resultado',(res>=0?'+':'−')+fm(Math.abs(res))]]);
    b+=`<g class="col" data-tip="${E(tp)}"><rect class="bg" x="${cx-slot/2+2}" y="${pt}" width="${slot-4}" height="${H-pt-pb}" rx="8"/><path d="${barP(cx-bw/2,Y(e),bw,y0-Y(e)-1,true)}" fill="var(--pos)" ${parc?'opacity=".6"':''}/><path d="${barP(cx-bw/2,y0+1,bw,Y(-s)-y0-1,false)}" fill="var(--neg)" ${parc?'opacity=".6"':''}/><text class="ax" x="${cx}" y="${H-5}" text-anchor="middle">${F.labels[i]}</text></g>`}
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Entradas e saídas por mês">${g}${b}<line x1="${pl}" x2="${W-pr}" y1="${y0}" y2="${y0}" stroke="var(--line2)"/></svg>`;
}
function drawSocios(el){
  const W=el.clientWidth||340,H=230,pl=46,pr=4,pt=10,pb=24;
  const d=new Date(),yms=[];for(let i=8;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);yms.push(x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'))}
  const n=yms.length,SO=socios().map((s,i)=>({id:s.id,nome:s.nome,cor:sCor(i)}));
  const known=new Set(SO.map(s=>s.id));
  const col=yms.map(ym=>{const r={ap:{},rt:{}};
    (state.contributions||[]).filter(c=>ymOf(c.date)===ym).forEach(c=>{const k=known.has(c.socioId)?c.socioId:'_';r.ap[k]=(r.ap[k]||0)+Number(c.valor||0)});
    (state.withdrawals||[]).filter(w=>ymOf(w.date)===ym).forEach(w=>{const k=known.has(w.socioId)?w.socioId:'_';r.rt[k]=(r.rt[k]||0)+Number(w.valor||0)});
    return r});
  const SOx=SO.concat([{id:'_',nome:'Sem sócio',cor:'var(--mut)'}]);
  const tot=o=>sum(Object.values(o));
  const top=niceTop(Math.max(...col.map(c=>tot(c.ap)),1)),bot=-Math.max(40000,...col.map(c=>tot(c.rt)))*1.4;
  const Y=v=>pt+(top-v)/(top-bot)*(H-pt-pb),slot=(W-pl-pr)/n,bw=Math.min(24,slot*.5),y0=Y(0);
  let g='';[top,top/2,0].forEach(v=>{const y=Y(v);g+=`<line class="grid-l" x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}"/><text class="ax" x="0" y="${y+4}">${axLbl(v)}</text>`});
  let b='';
  col.forEach((c,i)=>{const cx=pl+slot*(i+.5),x=cx-bw/2,ym=yms[i],lb=MES[+ym.slice(5,7)-1]+'/'+ym.slice(2,4);
    const rows=[];SOx.forEach(s=>{if(c.ap[s.id])rows.push([`${E(s.nome)} · aporte`,fm(c.ap[s.id])])});SOx.forEach(s=>{if(c.rt[s.id])rows.push([`${E(s.nome)} · retirada`,fm(c.rt[s.id])])});
    const tp=rows.length?tipHtml(lb,rows):tipHtml(lb,[['Sem movimento','—']]);
    let up='',acc=0;const ks=SOx.filter(s=>c.ap[s.id]);
    ks.forEach((s,j)=>{const v=c.ap[s.id],last=j===ks.length-1;up+=`<path d="${barP(x,Y(acc+v),bw,Math.max(2,y0-Y(v)-(acc?2:1)),true,last?4:1)}" fill="${s.cor}"/>`;acc+=v});
    let dn='',acd=0;SOx.filter(s=>c.rt[s.id]).forEach(s=>{const v=c.rt[s.id],yy=y0+1+(Y(-acd)-y0)+(acd?2:0);dn+=`<path d="${barP(x,yy,bw,Math.max(2,Y(-v)-y0-(acd?2:1)),false,4)}" fill="${s.cor}" opacity=".55"/>`;acd+=v});
    b+=`<g class="col" data-tip="${E(tp)}"><rect class="bg" x="${cx-slot/2+2}" y="${pt}" width="${slot-4}" height="${H-pt-pb}" rx="8"/>${up}${dn}<text class="ax" x="${cx}" y="${H-5}" text-anchor="middle">${lb}</text></g>`});
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Aportes e retiradas por mês">${g}${b}<line x1="${pl}" x2="${W-pr}" y1="${y0}" y2="${y0}" stroke="var(--line2)"/></svg>`;
}
function drawMatrix(el){
  const W=el.clientWidth||340,H=290,pl=34,pr=10,pt=10,pb=30,xm=50,y0=5,y1=25,MD=META_DIAS_ESTOQUE,MM=META_MARGEM_MINIMA_PCT;
  const X=v=>pl+Math.min(v,xm)/xm*(W-pl-pr),Y=v=>pt+(y1-Math.max(y0,Math.min(y1,v)))/(y1-y0)*(H-pt-pb);
  const xt=X(MD),yt=Y(MM);
  let g=`<rect x="${xt}" y="${pt}" width="${W-pr-xt}" height="${yt-pt}" fill="var(--s2)" rx="10"/><rect x="${xt}" y="${yt}" width="${W-pr-xt}" height="${H-pb-yt}" fill="color-mix(in srgb,var(--warn) 9%,transparent)" rx="10"/>`;
  g+=`<line x1="${xt}" x2="${xt}" y1="${pt}" y2="${H-pb}" stroke="var(--line2)"/><line x1="${pl}" x2="${W-pr}" y1="${yt}" y2="${yt}" stroke="var(--line2)"/>`;
  [0,15,30,45].forEach(v=>g+=`<text class="ax" x="${X(v)}" y="${H-12}" text-anchor="middle">${v} d</text>`);
  [10,15,20,25].forEach(v=>g+=`<text class="ax" x="0" y="${Y(v)+4}">${v}%</text>`);
  g+=`<text class="ax" x="${W-pr-6}" y="${pt+16}" text-anchor="end">Segurar e divulgar</text><text class="ax" x="${W-pr-6}" y="${H-pb-8}" text-anchor="end">Reprecificar</text><text class="ax" x="${pl+6}" y="${pt+16}">No caminho</text><text class="ax" x="${pl+6}" y="${H-pb-8}">Margem baixa</text>`;
  const pts=matrixPts().map(v=>({v,x:dias_(v),y:margemProj(v),r:Math.min(18,6+vehicleTotalInvestido(v)/18000),late:stageOf(v)==='venda'&&vehicleDias(v)>MD}));
  let b='';
  pts.forEach(p=>{const tp=tipHtml(nomeV(p.v),[[stageOf(p.v)==='prep'?'Em preparação':'Dias à venda',p.x+' d'],['Margem projetada',fP(p.y)],['Capital',fm(vehicleTotalInvestido(p.v))]]);
    b+=`<g data-tip="${E(tp)}"><circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${p.r+8}" fill="transparent"/><circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${p.r}" fill="${p.late?'var(--warn)':'var(--acc)'}" fill-opacity=".9" stroke="var(--s1)" stroke-width="2"/></g>`;
    if(p.late)b+=`<text x="${X(p.x)-p.r-6}" y="${Y(p.y)+4}" text-anchor="end" style="font:700 11.5px var(--font);fill:var(--tx)">${E(String(p.v.modelo||p.v.marca||'').split(' ')[0])}</text>`});
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Dias em estoque contra margem projetada de cada veículo">${g}${b}</svg>`;
}
const matrixPts=()=>ativos().filter(v=>margemProj(v)!=null);
const CH={hero:el=>{const s=seriesPat(),k={'3M':13,'6M':26,'1A':52}[S.range];drawLine(el,{id:'h',vals:s.vals.slice(-k),labels:s.labels.slice(-k),name:'Patrimônio',aria:'Evolução do patrimônio'})},flow:drawFlow,socios:drawSocios,matrix:drawMatrix};
function drawCharts(){$$('[data-chart]').forEach(el=>CH[el.dataset.chart]&&CH[el.dataset.chart](el))}
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(drawCharts,120)});
const table=(h,rows)=>`<details class="tbl"><summary>${ic('chev','sm')} Ver como tabela</summary><table><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
const stack=(items,tall)=>{const it=items.filter(i=>i.v>0),t=sum(it.map(i=>i.v));return`<div class="sbar ${tall?'tall':''}" role="img" aria-label="Composição">${t>0?it.map(i=>`<i style="width:${i.v/t*100}%;background:${i.c}" data-tip="${E(tipHtml(i.n,[['Valor',fm(i.v)],['Parte',fP(i.v/t*100)]]))}"></i>`).join(''):''}</div>`};
const legend=(items,withVal)=>`<div class="legend">${items.map(i=>`<span><i style="background:${i.c}"></i>${i.n}${withVal?` <b style="color:var(--tx)">${M(fK(i.v))}</b>`:''}</span>`).join('')}</div>`;
const emptyBox=t=>`<div class="empty">${t}</div>`;

/* =====================================================================
   TELAS
   ===================================================================== */
const V={};

/* ---------- PAINEL ---------- */
V.dashboard=()=>{
  const pat=patrimonio(),ser=seriesPat(),N=ser.vals.length,prev=ser.vals[N-5],delta=prev>0?(pat-prev)/prev*100:null;
  const act=ativos(),st=s=>act.filter(v=>stageOf(v)===s);
  const comp=[{n:'Caixa',v:Math.max(0,caixaSaldo()),c:'var(--c1)'},{n:'Em preparação',v:sum(st('prep').map(vehicleInvestidoRealizado)),c:'var(--c2)'},{n:'À venda',v:sum(st('venda').map(vehicleInvestidoRealizado)),c:'var(--c3)'},{n:'Especulação',v:sum(veiculosEspeculacao().map(v=>Number(v.sinalValor||0)+vehicleCustosRealizados(v))),c:'var(--c4)'}];
  const par=percentualPatrimonioParado(),giro=giroAnualCapital(),marg=margemMedia(),dias=tempoMedioCapitalImobilizado(),vend=veiculosVendidos();
  const MP=META_CAPITAL_PARADO_PCT,MM=META_MARGEM_MINIMA_PCT,MD=META_DIAS_ESTOQUE;
  const stt=(ok,w)=>ok?['pos','Ótimo','check']:w?['warn','Atenção','alert']:['neg','Crítico','x'];
  const nod=['','Sem dados','clock'];
  const G=[
    {n:'Estoque parado',v:fP(par,0),f:par/100,tg:MP/100,s:stt(par<=MP,par<=MP*1.5),m:`Meta: até ${MP}%`},
    {n:'Giro do capital',v:vend.length?giro.toFixed(1).replace('.',',')+'x':'—',f:giro/8,tg:4/8,s:vend.length?stt(giro>=4,giro>=2):nod,m:'Meta: 4x ao ano'},
    {n:'Margem média',v:marg==null?'—':fP(marg,0),f:(marg||0)/30,tg:15/30,s:marg==null?nod:stt(marg>=MM*1.5,marg>=MM),m:`Meta: acima de ${MM}%`},
    {n:'Tempo à venda',v:Math.round(dias)+' d',f:dias/45,tg:MD/45,s:stt(dias<=MD,dias<=MD*2),m:`Meta: até ${MD} dias`}
  ];
  const ym=ymNow(),meta=Number((state.monthlyGoals||{})[ym]||0),real=lucroPorMes(ym),pctM=meta>0?real/meta*100:0;
  const now=new Date(),dm=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),faltam=dm-now.getDate(),proj=real/Math.max(1,now.getDate())*dm;
  const cm=monthlyCash(8),dCash=caixaSaldo()-cm.startOfMonth,lucs=monthlyLucro(8);
  const gTone=meta>0?(pctM>=80?'pos':pctM>=30?'warn':'neg'):'';
  // alertas (mesmas regras de sempre)
  const al=[];const cl=capitalLivreParaCompra();
  if(cl<5000)al.push({t:'neg',ic:'alert',h:'Capital livre baixo para compras',s:`${fm(cl)} livres, já descontados custos previstos. Venda antes de comprar.`});
  act.slice().sort((a,b)=>dias_(b)-dias_(a)).forEach(v=>{const d=dias_(v);
    if(stageOf(v)==='prep'){if(d>ALERTA_DIAS_PREP)al.push({t:'warn',ic:'clock',h:nomeV(v),s:sugestaoAcaoVeiculo(v),r:d+' d'})}
    else if(d>MD)al.push({t:d>MD*2?'neg':'warn',ic:'clock',h:nomeV(v),s:acao(d),r:d+' d'})});
  const sa=act.filter(v=>!v.valorAnunciado||stageOf(v)==='prep').length;
  if(sa)al.push({t:'warn',ic:'tag',h:`${sa} veículo${sa>1?'s':''} sem anúncio definido`,s:'Ainda não anunciado(s) ou sem preço de anúncio.'});
  if(par>MP)al.push({t:'warn',ic:'alert',h:'Capital parado acima da meta',s:`${fP(par)} em estoque. A meta é ${MP}%.`});
  try{(window.SMZ_GESTAO?SMZ_GESTAO.alertas():[]).forEach(a=>al.push(a))}catch(_){}
  if(!al.length)al.push({t:'pos',ic:'check',h:'Nenhum alerta crítico no momento',s:'Operação dentro do esperado.'});
  const un=hasAC()&&typeof acUnread==='function'?acUnread():[];
  const aviso=un.length?`<div class="notice enter">${ic('alert')}<p>${un.length>1?`<b>${un.length} avisos novos.</b> Último: `:`<b>Aviso:</b> `}${M(E(un[un.length-1].texto))}</p><button class="btn sm ghost" data-act="ciente">Estou ciente</button></div>`:'';
  const ult=vend.slice().sort((a,b)=>String(b.dataVenda||'').localeCompare(String(a.dataVenda||''))).slice(0,4);
  return`${aviso}
  <div class="grid g21">
    <section class="card hero enter">
      <div class="in heroTop"><div><div class="k">Patrimônio total</div><div class="big num" id="heroNum">${M(fm(pat))}</div>
        <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">${delta!=null?`<span class="pill ${delta>=0?'pos':'neg'}">${ic(delta>=0?'up':'down','sm')} ${fP(Math.abs(delta))} em 30 dias</span>`:''}<span class="k">caixa + capital em estoque</span></div></div>
        <div class="seg" role="group" aria-label="Período">${['3M','6M','1A'].map(r=>`<button class="${S.range===r?'on':''}" data-act="range" data-r="${r}">${r}</button>`).join('')}</div></div>
      <div class="ch" data-chart="hero"></div>
      <div class="foot">${table(['Semana','Patrimônio'],ser.vals.slice(-6).map((v,i)=>[ser.labels.slice(-6)[i],M(fm(v))]))}</div>
    </section>
    <section class="card enter" style="animation-delay:.05s">
      <div class="chead"><div><h2>Onde está o capital</h2><p class="sub">${fP(par,0)} do patrimônio está em estoque</p></div></div>
      ${stack(comp,true)}${legend(comp,true)}
    </section>
  </div>

  <div class="kpis" style="margin-top:14px">
    <div class="kpi enter"><span class="k">Caixa disponível</span><span class="v num">${M(fm(caixaSaldo()))}</span><span class="d"><b class="${dCash>=0?'pos-t':'neg-t'}">${dCash>=0?'▲':'▼'} ${M(fm(Math.abs(dCash)))}</b> no mês</span>${spark(cm.vals)}</div>
    <div class="kpi enter" style="animation-delay:.04s"><span class="k">Lucro do mês</span><span class="v num">${M(fK(real))}</span><span class="d">${meta>0?fP(pctM,0)+' da meta':'meta não definida'}</span>${spark(lucs)}</div>
    <div class="kpi enter" style="animation-delay:.08s"><span class="k">Em estoque</span><span class="v num">${act.length} veículo${act.length===1?'':'s'}</span><span class="d">${st('prep').length} em preparação</span><div class="meter" style="margin-top:12px"><i style="width:${Math.min(100,par)}%;background:var(--c2)"></i></div></div>
    <div class="kpi enter" style="animation-delay:.12s"><span class="k">Lucro acumulado</span><span class="v num">${M(fK(lucroAcumulado()))}</span><span class="d">desde o início</span></div>
  </div>

  <div class="grid g21" style="margin-top:14px">
    <section class="card enter">
      <div class="chead"><div><h2>Saúde da operação</h2><p class="sub">${G.filter(g=>g.s[0]==='pos').length} de 4 indicadores na meta. A marca branca no arco é a meta.</p></div></div>
      <div class="gauges">${G.map(g=>`<div class="gz">${gauge({f:g.f,target:g.tg,tone:g.s[0],center:g.v})}<div class="gl">${g.n}</div><div class="gm">${g.m}</div><span class="pill ${g.s[0]}">${ic(g.s[2],'sm')} ${g.s[1]}</span></div>`).join('')}</div>
    </section>
    <section class="card enter" style="animation-delay:.05s">
      <div class="chead"><div><h2>Meta de lucro de ${MESL[now.getMonth()]}</h2><p class="sub">${faltam>0?`Faltam ${faltam} dia${faltam>1?'s':''} para fechar o mês`:'Último dia do mês'}</p></div></div>
      <div style="display:flex;align-items:center;gap:6px">
        <div style="width:150px;flex:none">${gauge({f:meta>0?real/meta:0,target:null,tone:gTone,center:meta>0?fP(pctM,0):'—',sub:'da meta'})}</div>
        <div style="min-width:0"><div class="k">Realizado</div><div class="mid num">${M(fK(real))}</div><div class="k" style="margin-top:8px">Meta</div><div style="font-weight:700">${meta>0?M(fK(meta)):'não definida'}</div></div>
      </div>
      ${meta>0?`<div class="verdict ${proj>=meta?'pos':pctM>=30?'warn':'neg'}" style="margin-top:6px">${ic(proj>=meta?'trend':'alert')}<div><b>Projeção de ${M(fK(proj))}</b>${proj>=meta?`No ritmo atual você passa da meta em ${M(fK(proj-meta))}.`:`No ritmo atual você fica ${M(fK(meta-proj))} abaixo da meta.`}</div></div>`
        :`<div class="verdict warn" style="margin-top:6px">${ic('alert')}<div><b>Defina a meta do mês</b>Cadastre a meta em Financeiro para acompanhar o ritmo.</div></div><button class="btn sm ghost" style="margin-top:10px" data-act="meta">Definir meta</button>`}
    </section>
  </div>

  <div class="grid g2" style="margin-top:14px">
    <section class="card enter">
      <div class="chead"><div><h2>Pede atenção</h2><p class="sub">Veículos acima de ${MD} dias e pontos do caixa</p></div></div>
      <div class="rows">${al.map(a=>`<div class="row"><div class="badge ${a.t}">${ic(a.ic)}</div><div class="grow"><div class="t">${a.h}</div><div class="s">${a.s}</div></div>${a.r?`<div class="r"><b class="num ${a.t}-t">${a.r}</b></div>`:''}</div>`).join('')}</div>
    </section>
    <section class="card enter" style="animation-delay:.05s">
      <div class="chead"><div><h2>Últimas vendas</h2><p class="sub">Lucro líquido e margem</p></div><button class="btn sm ghost" data-act="vendidos">Ver todas</button></div>
      <div class="rows">${ult.length?ult.map(v=>{const l=vehicleLucroLiquido(v)||0,mg=vehicleMargem(v);return`<div class="row"><div class="badge ${l>=0?'pos':'neg'}">${ic('tag')}</div><div class="grow"><div class="t">${E(nomeV(v))}</div><div class="s">${dBR(v.dataVenda)} · ${vehicleDias(v)} dias${mg!=null?' · margem '+fP(mg):''}</div></div><div class="r"><b class="num ${l>=0?'pos-t':'neg-t'}">${l>=0?'+':'−'} ${M(fK(Math.abs(l)))}</b></div></div>`}).join(''):emptyBox('Nenhuma venda registrada ainda.')}</div>
    </section>
  </div>`;
};

/* ---------- VEÍCULOS ---------- */
const STG={prep:['Em preparação','acc'],venda:['À venda','pos'],esp:['Especulação','warn'],vendido:['Vendido','pos'],desist:['Não concluído','']};
function vehFilteredNew(){
  const q=_norm(S.vq.trim());
  return state.vehicles.slice().reverse().filter(v=>{
    const s=stageOf(v);
    if(S.vf!=='todos'&&S.vf!==s)return false;
    if(S.vf==='todos'&&s==='desist')return false;
    return!q||_norm([v.marca,v.modelo,v.versao,v.ano,v.placa,v.cor,v.cidade].join(' ')).includes(q);
  });
}
function vActions(v,s){
  const id=E(v.id),b=(a,l,cls='ghost')=>`<button class="btn sm ${cls}" data-act="${a}" data-id="${id}">${l}</button>`;
  const edit=b('vedit','Editar'),del=b('vdel','Excluir','dngb');
  if(isRepasse(v))return edit+b('vboleto',v.boletoPago?'Boleto pago':'Marcar boleto pago',v.boletoPago?'':'')+del;
  if(s==='esp')return edit+b('vbuy','Confirmar compra','')+b('vdesist','Não deu certo','warnb')+del;
  if(s==='prep')return edit+b('vready','Pronto p/ venda','')+b('vsell','Vender')+del;
  if(s==='venda')return edit+b('vsell','Vender','')+b('vcanal','Canal de venda')+b('vprep','Voltar p/ preparação','warnb')+del;
  if(s==='vendido')return edit+b('vundo','Desfazer venda','warnb')+del;
  return edit+b('vreopen','Reabrir','warnb')+del;
}
function custosBlock(v){
  const cs=v.custos||[];if(!cs.length)return'';
  const tot=sum(cs.map(c=>Number(c.valor||0))),pv=sum(cs.filter(c=>!c.realizado).map(c=>Number(c.valor||0)));
  return`<div class="cblock"><div class="ch2"><b>Custos e preparação</b><span class="num">${M(fm(tot))}</span></div>${cs.map(c=>`<div class="ci"><div class="ci-l"><span class="ci-n">${E(c.categoria||'Custo')}</span>${c.descricao?`<span class="ci-d">${E(c.descricao)}</span>`:''}</div><div class="ci-r"><b class="num">${M(fm(c.valor))}</b><span class="pill ${c.realizado?'pos':'warn'}">${c.realizado?'Pago':'Previsto'}</span></div></div>`).join('')}${pv>0?`<div class="ci-foot"><span>Previsto / reservado</span><b class="num">${M(fm(pv))}</b></div>`:''}</div>`;
}

// Linha do tempo do veículo: preparação (sem limite de dias) + tempo de venda (com indicador vs. meta).
function vtimeline(v,s){
  if(s!=='prep'&&s!=='venda'&&s!=='vendido')return'';
  const vend=s==='vendido',MD=META_DIAS_ESTOQUE,disp=v.dataDisponivel||'';
  const prep=vehicleDiasPreparacao(v);
  const venda=vend?vehicleDias(v):(disp?Math.max(0,daysBetween(disp)):0);
  const tot=Math.max(1,prep+venda),pp=prep/tot*100,vp=venda/tot*100;
  const sev=venda>MD*2?'neg':venda>MD?'warn':'pos';
  const seg=(w,cls)=>`<i class="${cls}" style="flex:${Math.max(w,6)} 1 0"></i>`;
  const bar=(prep>0?seg(pp,'tp'):'')+(venda>0?seg(vp,'tv '+sev):'')||'<i class="tp" style="flex:1 1 0;opacity:.35"></i>';
  const cell=(k,v1,v2,cls,cx)=>`<div class="tlc ${cx||''}"><small>${k}</small><b class="num ${cls||''}">${v1}</b><em>${v2||'&nbsp;'}</em></div>`;
  const fimV=vend?dBR(v.dataVenda):'hoje';
  const c1=cell('Compra',dBR(v.dataCompra),M(fm(v.valorCompra)),'','c0');
  const c2=cell('Preparação',prep+' dia(s)',disp?dBR(v.dataCompra)+' → '+dBR(disp):(vend?'sem registro':'em andamento · sem limite'),'warn-t','c1');
  const c3=cell('À venda',disp||vend?venda+' dia(s)':'aguardando',disp?dBR(disp)+' → '+fimV:(vend?dBR(v.dataCompra)+' → '+fimV:'ainda em preparação'),(disp||vend)?sev+'-t':'','c2');
  const c4=vend?cell('Vendido',dBR(v.dataVenda),M(fm(v.valorVendido)),'','c3'):'';
  const ind=(disp||vend)?`<div class="tlnote ${sev}">${vend?'Vendeu em':'À venda há'} <b>${venda} dia(s)</b> · meta: até ${MD} dias${venda>MD?' (acima da meta)':' (dentro da meta)'}</div>`:'';
  return`<div class="tl"><div class="tlbar" role="img" aria-label="Preparação ${prep} dias, à venda ${venda} dias">${bar}</div><div class="tlg ${vend?'g4':'g3'}">${c1}${c2}${c3}${c4}</div>${ind}</div>`;
}

function vcard(v){
  const s=stageOf(v),open=S.open[v.id],lucro=vehicleLucroAtual(v),mp=margemProj(v),cr=(l,x)=>`<div class="cr"><span>${l}</span><b class="num">${x}</b></div>`;
  const showMeter=s==='prep'||s==='venda',dm=showMeter?dias_(v):0,MD=META_DIAS_ESTOQUE,sev=dm>MD*2?'neg':dm>MD?'warn':'pos',pw=Math.min(100,dm/45*100);
  const pill=STG[s];
  const rep_=[cr('Operação',isRepasse(v)?'Repasse':'Compra'),v.fornecedor?cr(isRepasse(v)?'Repassado por':'Comprado de',E(v.fornecedor)):'',v.laudo?cr('Laudo cautelar','Sim'):'',v.acrescimo?cr('Acréscimo',v.acrescimoTipo==='valor'?M(fm(v.acrescimo)):String(v.acrescimo).replace('.',',')+'%'):'',v.comprador?cr('Comprador',E(v.comprador)+(v.compradorTel?' · '+E(v.compradorTel):'')):'',isRepasse(v)?cr('Boleto',v.boletoPago?'<span class="pos-t">Pago</span>':'<span class="warn-t">'+(v.boletoVenc?'vence '+dBR(v.boletoVenc):'a pagar')+'</span>'):''].join('');
  let grid,det='';
  if(s==='vendido'){
    const mg=vehicleMargem(v);
    grid=`<div><small>Venda</small><b class="num">${M(fK(Number(v.valorVendido||0)))}</b></div><div><small>Lucro</small><b class="num ${(lucro||0)>=0?'pos-t':'neg-t'}">${M(fK(lucro||0))}</b></div><div><small>Margem</small><b class="num">${mg!=null?fP(mg):'—'}</b></div>`;
    det=rep_+cr(isRepasse(v)?'Valor original':'Compra',M(fm(v.valorCompra)))+custosBlock(v)+(vehicleComissao(v)>0?cr('Comissão do parceiro',M(fm(vehicleComissao(v)))):'')+cr('Valor vendido',M(fm(v.valorVendido)))+(vehicleROI(v)!=null?cr('ROI',fP(vehicleROI(v))):'');
  }else if(s==='desist'){
    grid=`<div><small>Compra prevista</small><b class="num">${M(fK(Number(v.valorCompra||0)))}</b></div><div><small>Sinal</small><b class="num">${M(fK(Number(v.sinalValor||0)))}</b></div><div><small>Perda</small><b class="num ${desistenciaPerda(v)>0?'neg-t':''}">${M(fK(desistenciaPerda(v)))}</b></div>`;
    det=(v.dataDesistencia?cr('Encerrado em',dBR(v.dataDesistencia)):'')+(v.motivoDesistencia?cr('Motivo',E(v.motivoDesistencia)):'');
  }else{
    grid=`<div><small>Capital</small><b class="num">${M(fK(vehicleCapital(v)))}</b></div><div><small>Anunciado</small><b class="num">${v.valorAnunciado?M(fK(Number(v.valorAnunciado))):'—'}</b></div><div><small>Lucro previsto</small><b class="num ${lucro!=null&&mp!=null&&mp<META_MARGEM_MINIMA_PCT?'warn-t':'pos-t'}">${lucro!=null?M(fK(lucro)):'—'}</b></div>`;
    det=rep_+cr(isRepasse(v)?'Valor original':'Compra'+(s==='esp'?' (prevista)':''),M(fm(v.valorCompra)))+custosBlock(v)+(mp!=null?cr('Margem prevista',`<span class="${mp<META_MARGEM_MINIMA_PCT?'warn-t':''}">${fP(mp)}</span>`):'')+(s==='esp'&&Number(v.sinalValor)>0?cr('Sinal pago',M(fm(v.sinalValor))):'');
    if(s==='venda'||s==='prep'){const pn=vehicleParceiroNome(v);det+=v.status==='Garagem Parceira'?cr('Com o parceiro',E(pn||'Garagem parceira')):(vehicleCanal(v)==='Internet'?cr('Canal de venda','Internet'):'');}
  }
  const meta=[v.origem||'',v.km!==undefined&&v.km!==''&&!isNaN(Number(v.km))?Number(v.km).toLocaleString('pt-BR')+' km':'',v.cor||'',v.cidade||''].filter(Boolean).map(E).join(' · ');
  const link=/^https?:\/\//i.test(v.linkAnuncio||'')?`<a class="lnk" href="${E(v.linkAnuncio)}" target="_blank" rel="noopener">Ver anúncio ↗</a>`:'';
  let ev='';
  if(s==='esp'){try{const a=avaliarEspeculacao(v);ev=`<div class="verdict ${{good:'pos',warn:'warn',bad:'neg'}[a.tone]||''}" style="margin-top:10px"><div><b>${a.veredito}</b>${a.resumo}</div></div><div class="espv">${a.checks.map(c=>`<div>${c.ok?'✅':(c.critical?'❌':'⚠️')} ${c.txt}</div>`).join('')}</div>`}catch(e){}}
  return`<article class="veh enter ${open?'open':''}" data-act="open" data-id="${E(v.id)}" tabindex="0" style="cursor:pointer">
    <div class="h"><div class="mg">${E(String(v.marca||'?').slice(0,2).toUpperCase())}</div><div class="grow" style="flex:1;min-width:0"><div class="t" style="font-weight:800;font-size:16px;letter-spacing:-.01em">${E(nomeV(v))}</div><div style="display:flex;gap:8px;align-items:center;margin-top:4px;flex-wrap:wrap">${v.placa&&String(v.placa).trim()?`<span class="plate"><i>BR</i><b>${E(String(v.placa).trim().toUpperCase())}</b></span>`:''}${v.ano?`<span class="k">${E(v.ano)}</span>`:''}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px"><span class="pill ${pill[1]}">${pill[0]}</span><span class="chev">${ic('chev','sm')}</span></div></div>
    ${vtimeline(v,s)}
    <div class="vgrid">${grid}</div>
    <div class="more">${meta||link?`<div class="meta-l">${meta}${link}</div>`:''}${det}${ev}<div class="vact">${vActions(v,s)}</div></div>
  </article>`;
}
V.veiculos=()=>{
  const act=ativos(),totEst=sum(act.map(vehicleCapital)),proj=sum(act.map(v=>vehicleLucroProjetado(v)||0)),dm=tempoMedioCapitalImobilizado();
  const cnt=k=>k==='todos'?state.vehicles.filter(v=>stageOf(v)!=='desist').length:state.vehicles.filter(v=>stageOf(v)===k).length;
  const fl=[['todos','Todos'],['prep','Em preparação'],['venda','À venda'],['esp','Especulação'],['vendido','Vendidos']];
  if(cnt('desist'))fl.push(['desist','Não concluídos']);
  let list=vehFilteredNew();
  if(S.vf==='vendido')list=list.sort((a,b)=>String(b.dataVenda||'').localeCompare(String(a.dataVenda||'')));
  return`
  <div class="kpis kpis-3" style="margin-bottom:14px">
    <div class="kpi"><span class="k">Capital</span><span class="v num">${M(fK(totEst))}</span></div>
    <div class="kpi"><span class="k">Lucro previsto</span><span class="v num">${M(fK(proj))}</span></div>
    <div class="kpi"><span class="k">Dias médios</span><span class="v num">${Math.round(dm)} d</span></div>
  </div>
  <label class="search">${ic('search','sm')}<input id="vq" type="search" placeholder="Buscar por marca, modelo, placa ou ano" value="${E(S.vq)}" aria-label="Buscar veículo"></label>
  <div class="chips" role="group" aria-label="Filtrar por situação">${fl.map(([k,l])=>`<button class="chip ${S.vf===k?'on':''}" data-act="vf" data-k="${k}">${l}<i>${cnt(k)}</i></button>`).join('')}</div>
  <div class="vlist" style="display:grid;gap:12px;margin-top:12px">${list.length?list.map(vcard).join(''):emptyBox(state.vehicles.length?'Nenhum veículo encontrado.':'Nenhum veículo cadastrado. Toque em "Novo veículo" para começar.')}</div>
  <div class="vmore"><button class="btn ghost sm" data-act="vcsv">${ic('file','sm')} Exportar CSV</button></div>
  <div style="margin-top:14px">${GX('ops')}</div>`;
};

/* ---------- FINANCEIRO ---------- */
V.caixa=()=>{
  const F=flowData(),ci=F.yms.indexOf(F.now),ent=ci>=0?F.ent[ci]:0,sai=ci>=0?F.sai[ci]:0,nm=MESL[new Date().getMonth()];
  const sorted=state.transactions.map((t,i)=>({t,i})).sort((a,b)=>(a.t.date||'').localeCompare(b.t.date||'')||a.i-b.i).map(x=>x.t);
  let run=Number(state.capitalInicial||0);
  let rows=sorted.map(t=>{run+=t.tipo==='entrada'?Number(t.valor||0):-Number(t.valor||0);return{t,s:run}}).reverse();
  const q=S.cq.trim().toLowerCase();
  if(q)rows=rows.filter(r=>((r.t.desc||'')+' '+(r.t.categoria||'')).toLowerCase().includes(q));
  const vis=rows.slice(0,S.climit),resto=rows.length-vis.length,groups={},order=[];
  vis.forEach(r=>{const d=r.t.date||'';if(!groups[d]){groups[d]=[];order.push(d)}groups[d].push(r)});
  const fech=acFechData(),fv=S.fechAll?fech:fech.slice(0,4);
  // metas
  const goals=state.monthlyGoals||{},mset=new Set([...Object.keys(goals).filter(k=>Number(goals[k])>0),ymNow(),...veiculosVendidos().map(v=>ymOf(v.dataVenda)).filter(Boolean)]);
  const mm=Array.from(mset).sort().reverse().slice(0,8);
  return`
  <div class="kpis kpis-2">
    <div class="kpi" style="grid-column:span 2"><span class="k">Saldo em caixa</span><span class="v num big">${M(fm(caixaSaldo()))}</span><span class="d">${totalCustosPrevistos()>0?M(fm(totalCustosPrevistos()))+' em custos previstos já reservados':'sem custos previstos reservados'}</span></div>
    <div class="kpi"><span class="k">Entradas em ${nm}</span><span class="v num pos-t">${M(fm(ent))}</span></div>
    <div class="kpi"><span class="k">Saídas em ${nm}</span><span class="v num neg-t">${M(fm(sai))}</span></div>
  </div>
  <div style="margin-top:14px">${GX('resultado')}</div>
  <div class="grid g21" style="margin-top:14px">
  <section class="card">
    <div class="chead"><div><h2>Entradas e saídas</h2><p class="sub">Últimos ${F.labels.length} meses. Toque na coluna para ver os valores.</p></div><button class="btn sm" data-act="lanc">${ic('plus','sm')} Lançar</button></div>
    <div class="ch" data-chart="flow"></div>
    <div class="legend"><span><i style="background:var(--pos)"></i>Entradas</span><span><i style="background:var(--neg)"></i>Saídas</span><span style="color:var(--mut)">${F.yms.includes(F.now)?cap1(nm)+' ainda em andamento':''}</span></div>
    ${table(['Mês','Entradas','Saídas','Resultado'],F.labels.map((l,k)=>[l,M(fm(F.ent[k])),M(fm(F.sai[k])),M(fm(F.ent[k]-F.sai[k]))]))}
  </section>
  <section class="card">
    <div class="chead"><div><h2>Fechamento mensal</h2><p class="sub">Mês fechado não aceita lançamento</p></div><button class="btn sm ghost" data-act="fechcsv">CSV</button></div>
    <div class="rows">${fv.length?fv.map(d=>{const f=d.fech,ended=acMonthEnded(d.m);return`<div class="row"><div class="badge ${f?'':'acc'}">${ic(f?'lock':'clock')}</div><div class="grow"><div class="t">${cap1(acMonthLabel(d.m))}</div><div class="s">${f?`Fechado por ${E(f.por||'')} em ${new Date(f.em).toLocaleDateString('pt-BR')}`:(ended?'Pronto para fechar':'Fecha após o fim do mês')}</div></div>${f?`<button class="btn sm ghost" data-act="reabrir" data-m="${d.m}">Reabrir</button>`:(ended?`<button class="btn sm" data-act="fechar" data-m="${d.m}">Fechar mês</button>`:`<span class="pill acc">Aberto</span>`)}</div>`}).join(''):emptyBox('Sem movimentações ainda.')}</div>
    ${fech.length>4?`<div class="vmore"><button class="btn sm ghost" data-act="fechall">${S.fechAll?'Mostrar menos':'Ver todos os meses'}</button></div>`:''}
  </section></div>
  <div class="grid g2" style="margin-top:14px">${GX('caixaMin')}${GX('pend')}</div>
  <div style="margin-top:14px">${GX('contas')}</div>
  <section class="card" style="margin-top:14px">
    <div class="chead"><div><h2>Movimentações</h2><p class="sub">Agrupadas por dia, com o saldo ao final de cada lançamento</p></div><button class="btn sm ghost" data-act="csv">Exportar CSV</button></div>
    <label class="search">${ic('search','sm')}<input id="cq" type="search" placeholder="Buscar por descrição ou categoria" value="${E(S.cq)}" aria-label="Buscar movimentação"></label>
    ${order.length?order.map(d=>`<div class="k" style="margin:14px 0 6px;font-weight:700">${dLong(d)}</div><div class="rows">${groups[d].map(r=>{const t=r.t,linked=!!(t.vehicleId||t.contributionId||t.withdrawalId),en=t.tipo==='entrada';return`<div class="row"><div class="badge ${en?'pos':'neg'}">${ic(en?'up':'down')}</div><div class="grow"><div class="t">${E(t.desc||t.categoria||(en?'Entrada':'Saída'))}</div><div class="s">Saldo ${M(fm(r.s))}</div></div><div class="r"><b class="num ${en?'pos-t':'neg-t'}">${en?'+':'−'} ${M(fm(Number(t.valor||0)))}</b></div>${linked?'':`<button class="ico-btn dng" data-act="txdel" data-id="${E(t.id)}" aria-label="Excluir movimentação" title="Excluir">${ic('trash','sm')}</button>`}</div>`}).join('')}</div>`).join(''):emptyBox(state.transactions.length?'Nenhuma movimentação encontrada para essa busca.':'Nenhuma movimentação registrada.')}
    ${resto>0?`<div class="vmore"><button class="btn sm ghost" data-act="more">Ver mais (${resto} restantes)</button></div>`:''}
  </section>
  <section class="card" style="margin-top:14px">
    <div class="chead"><div><h2>Metas de lucro</h2><p class="sub">Realizado contra a meta de cada mês</p></div><button class="btn sm" data-act="meta">${ic('plus','sm')} Definir meta</button></div>
    <div class="rows">${mm.map(ym=>{const meta=Number(goals[ym]||0),real=lucroPorMes(ym),p=meta>0?real/meta*100:null,ok=p!=null&&p>=100,cur=ym===ymNow(),[yy,mo]=ym.split('-');const tone=p==null?'':ok?'pos':cur?'acc':'warn';
      return`<div class="row"><div class="grow"><div style="display:flex;justify-content:space-between;gap:8px"><span class="t">${cap1(MESL[+mo-1])}/${yy}${cur?' · em andamento':''}</span><b class="num">${M(fK(real))} ${meta>0?`<span style="color:var(--mut);font-weight:600">de ${M(fK(meta))}</span>`:''}</b></div><div class="meter"><i style="width:${p==null?0:Math.min(100,Math.max(0,p))}%;background:var(--${ok?'pos':cur?'acc':'warn'})"></i></div></div><span class="pill ${tone}" style="min-width:58px;justify-content:center">${p!=null?fP(p,0):'Sem meta'}</span></div>`}).join('')}</div>
  </section>`;
};

/* ---------- RESULTADO (módulo gestao.js) ---------- */
const GX=k=>{try{return window.SMZ_GESTAO?window.SMZ_GESTAO.sec[k]():''}catch(e){console.warn(e);return''}};

/* ---------- PARCEIROS ---------- */
const PICO={Funilaria:'car',Tapeçaria:'tag',Garagem:'home',Pintura:'spark',Mecânica:'compass',Vidraçaria:'search'};
const digits=s=>String(s||'').replace(/\D/g,'');
const wa=s=>{const d=digits(s);return d?(d.length>=12&&d.startsWith('55')?d:'55'+d):''};

/* ---------- CLIENTES (derivado das vendas: nome + telefone do comprador) ---------- */
const MSG_KEY='smz:msgTpl:v1', MSG_DEF='Olá, {nome}! Tudo bem? Aqui é da SMZ Repasses. Estou com novas opções de veículos. Quer dar uma olhada?';
const msgTpl=()=>{try{return localStorage.getItem(MSG_KEY)||MSG_DEF}catch(_){return MSG_DEF}};
function clientesList(){
  const map=new Map();
  state.vehicles.filter(v=>v.status==='Vendido'&&String(v.comprador||'').trim()).forEach(v=>{
    const key=telDigits(v.compradorTel)||_norm(v.comprador);
    let c=map.get(key);if(!c){c={key,compras:[],total:0};map.set(key,c)}
    c.compras.push(v);c.total+=Number(v.valorVendido||0);
  });
  return [...map.values()].map(c=>{
    c.compras.sort((a,b)=>String(b.dataVenda||'').localeCompare(String(a.dataVenda||'')));
    const l=c.compras[0];c.nome=String(l.comprador).trim();c.tel=l.compradorTel||'';return c;
  }).sort((a,b)=>String(b.compras[0].dataVenda||'').localeCompare(String(a.compras[0].dataVenda||'')));
}
function waUrl(c){
  let d=telDigits(c.tel);if(d.length<10)return '';if(d.length<=11)d='55'+d;
  const txt=msgTpl().replace(/\{nome\}/g,c.nome.split(/\s+/)[0]).replace(/\{ultimo\}/g,nomeV(c.compras[0]));
  return `https://wa.me/${d}?text=${encodeURIComponent(txt)}`;
}
function ccard(c){
  const l=c.compras[0],k=E(c.key);
  return `<article class="card cli enter">
    <div class="cli-h"><div class="mg">${E(c.nome[0].toUpperCase())}</div><div class="grow"><div class="t">${E(c.nome)}</div><div class="s">${c.tel?E(c.tel):'Sem telefone'}</div></div><span class="pill acc">${c.compras.length} compra${c.compras.length>1?'s':''}</span></div>
    <div class="cr"><span>Última compra</span><b class="num">${E(nomeV(l))} · ${dBR(l.dataVenda)}</b></div>
    <div class="cr"><span>Total comprado</span><b class="num">${M(fm(c.total))}</b></div>
    <div class="cli-act"><button class="btn sm" data-act="cwa" data-k="${k}">Chamar no WhatsApp</button><button class="btn sm ghost" data-act="ccopy" data-k="${k}">Copiar telefone</button></div>
  </article>`;
}
V.clientes=()=>{
  const all=clientesList(),q=_norm((S.lq||'').trim());
  const list=all.filter(c=>!q||_norm(c.nome+' '+c.tel).includes(q));
  return `<div class="kpis kpis-3" style="margin-bottom:14px">
    <div class="kpi"><span class="k">Clientes</span><span class="v num">${all.length}</span></div>
    <div class="kpi"><span class="k">Compras feitas</span><span class="v num">${sum(all.map(c=>c.compras.length))}</span></div>
    <div class="kpi"><span class="k">Total vendido</span><span class="v num">${M(fK(sum(all.map(c=>c.total))))}</span></div>
  </div>
  <div style="margin-bottom:14px">${GX('pendRec')}</div>
  <section class="card" style="margin-bottom:14px"><div class="chead"><div><h2>Mensagem padrão</h2><p class="sub">Usada no botão do WhatsApp. <b>{nome}</b> vira o primeiro nome do cliente e <b>{ultimo}</b> o último carro que ele levou. Salva sozinha.</p></div></div>
    <textarea id="msgtpl" rows="3" aria-label="Mensagem padrão">${E(msgTpl())}</textarea></section>
  <label class="search">${ic('search','sm')}<input id="lq" type="search" placeholder="Buscar cliente por nome ou telefone" value="${E(S.lq)}" aria-label="Buscar cliente"></label>
  <div style="display:grid;gap:12px;margin-top:12px">${list.length?list.map(ccard).join(''):emptyBox(all.length?'Nenhum cliente encontrado.':'Os clientes aparecem aqui assim que você registrar a primeira venda, com nome e telefone do comprador.')}</div>`;
};
V.parceiros=()=>{
  const P=state.garagePartners||[],tipos=['Todos',...getPartnerTypesUsed()];
  const q=S.pq.trim().toLowerCase();
  const list=P.slice().reverse().filter(p=>(S.pf==='Todos'||(p.tipo||'').trim()===S.pf)&&(!q||(p.nome||'').toLowerCase().includes(q)||(p.cidade||'').toLowerCase().includes(q)));
  const stats=P.map(p=>({p,st:partnerStats(p)}));
  const rank=stats.filter(x=>x.st.sold>0).sort((a,b)=>b.st.lucro-a.st.lucro),mx=rank.length?Math.max(1,rank[0].st.lucro):1;
  const atend=state.vehicles.filter(v=>v.status==='Garagem Parceira');
  return`
  <div class="kpis kpis-3" style="margin-bottom:14px">
    <div class="kpi"><span class="k">Parceiros</span><span class="v num">${P.length}</span></div>
    <div class="kpi"><span class="k">Comissões pagas</span><span class="v num">${M(fK(sum(stats.map(x=>x.st.gasto))))}</span></div>
    <div class="kpi"><span class="k">Em atendimento</span><span class="v num">${atend.length} carro${atend.length===1?'':'s'}</span></div>
  </div>
  <div class="grid g2">
    <section class="card"><div class="chead"><div><h2>Com quem os carros estão agora</h2><p class="sub">Tempo de cada veículo na garagem parceira</p></div></div>
      <div class="rows">${atend.length?atend.map(v=>`<div class="row"><div class="badge acc">${ic('car')}</div><div class="grow"><div class="t">${E(nomeV(v))}</div><div class="s">${E(vehicleParceiroNome(v)||'Garagem parceira')}</div></div><div class="r"><b class="num">${vehicleDias(v)} d</b><div class="s">de ${META_DIAS_ESTOQUE} d</div></div></div>`).join(''):emptyBox('Nenhum carro em garagem parceira agora.')}</div>
    </section>
    <section class="card"><div class="chead"><div><h2>Quem mais gera lucro</h2><p class="sub">Lucro dos veículos vendidos por cada parceiro</p></div></div>
      ${rank.length?rank.map(({p,st})=>`<div class="hbar" data-tip="${E(tipHtml(E(p.nome),[['Lucro',fm(st.lucro)],['Veículos',st.veic],['Prazo médio',st.prazo!=null?st.prazo.toFixed(1).replace('.',',')+' d':'—']]))}"><div class="nm">${E(p.nome)}</div><div class="tr"><i style="width:${Math.max(0,st.lucro)/mx*56}%"></i><b style="left:calc(${Math.max(0,st.lucro)/mx*56}% )">${M(fK(st.lucro))}</b></div></div>`).join('')+table(['Parceiro','Veículos','Lucro'],rank.map(({p,st})=>[E(p.nome),st.veic,M(fK(st.lucro))])):emptyBox('Ainda não há vendas ligadas a parceiros.')}
    </section>
  </div>
  <div style="margin-top:14px">${GX('pendCom')}</div>
  <div class="ptitle" style="margin:22px 0 12px"><div><h1 style="font-size:21px">Todos os parceiros</h1></div><button class="btn sm" data-act="novoP">${ic('plus','sm')} Novo parceiro</button></div>
  <label class="search">${ic('search','sm')}<input id="pq" type="search" placeholder="Buscar por nome ou cidade" value="${E(S.pq)}" aria-label="Buscar parceiro"></label>
  <div class="chips">${tipos.map(t=>`<button class="chip ${S.pf===t?'on':''}" data-act="pf" data-k="${E(t)}">${E(t)}</button>`).join('')}</div>
  <div class="plist" style="display:grid;gap:12px;margin-top:12px">${list.length?list.map(p=>{const st=partnerStats(p),w=wa(p.telefone),d=digits(p.telefone);return`<article class="pcard enter"><div style="display:flex;gap:12px;align-items:center"><div class="badge acc">${ic(PICO[(p.tipo||'').trim()]||'net')}</div><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:16px">${E(p.nome)}</div><div class="k">${E(p.tipo||'')}${p.responsavel?' · '+E(p.responsavel):''}</div></div></div>
    <div class="pstats"><div><small>Veículos</small><b class="num">${st.veic}</b></div><div><small>Comissão média</small><b class="num">${st.sold&&st.gasto?M(fK(st.gasto/st.sold)):'—'}</b></div><div><small>Prazo médio</small><b class="num">${st.prazo!=null?st.prazo.toFixed(1).replace('.',',')+' d':'—'}</b></div></div>
    <div class="k" style="display:flex;gap:7px;align-items:center;margin-bottom:12px">${ic('pin','sm')} ${E([p.endereco,p.cidade].filter(Boolean).join(' · ')||'Endereço não informado')}</div>
    <div class="pact">${d?`<a class="btn ghost sm" href="tel:+${w}" style="text-decoration:none">${ic('phone','sm')} Ligar</a><a class="btn ghost sm" href="https://wa.me/${w}" target="_blank" rel="noopener" style="text-decoration:none">${ic('chat','sm')} WhatsApp</a>`:''}<button class="btn ghost sm" data-act="pedit" data-id="${E(p.id)}">Editar</button><button class="btn dngb sm" data-act="pdel" data-id="${E(p.id)}">Excluir</button></div></article>`}).join(''):emptyBox(P.length?'Nenhum parceiro encontrado com esse filtro ou busca.':'Nenhum parceiro cadastrado ainda. Toque em "Novo parceiro" para começar.')}</div>`;
};

/* ---------- VISÃO EXECUTIVA ---------- */
function simHtml(){
  const P=S.sim,pat=patrimonio(),novoParado=pat>0?(valorEstoqueLivro()+P)/pat*100:0,sobra=capitalLivreParaCompra()-P,cl=classif(novoParado,sobra);
  const since=new Date();since.setDate(since.getDate()-90);const iso=isoOf(since);
  const saida90=sum((state.transactions||[]).filter(t=>t.tipo==='saida'&&t.date>=iso).map(t=>Number(t.valor||0)));
  const dias=saida90>0?Math.max(0,Math.round((caixaSaldo()-P)/(saida90/90))):null;
  return`<div style="display:flex;align-items:baseline;gap:8px"><div class="big num">${M(fm(P))}</div><span class="k">de compra</span></div>
  <div class="sim"><div><small>Livre depois</small><b class="num ${sobra<0?'neg-t':''}">${M(fm(sobra))}</b></div><div><small>Estoque parado</small><b class="num">${fP(novoParado)}</b></div><div><small>Caixa depois</small><b class="num">${M(fK(caixaSaldo()-P))}</b></div><div><small>Cobre de saídas</small><b class="num">${dias!=null?dias+' dias':'—'}</b></div></div>
  <div class="verdict ${cl.t}">${ic(cl.t==='pos'?'check':cl.t==='warn'?'alert':'x')}<div><b>${cl.l}</b>${cl.t==='pos'?'Pode comprar sem apertar o caixa.':cl.t==='warn'?'Dá para comprar, mas escolha um carro de giro rápido.':'Venda algo antes de comprar.'}</div></div>`;
}
V.executiva=()=>{
  const pct=percentualPatrimonioParado(),disp=capitalLivreParaCompra(),cl=classif(pct,disp);
  const seg=[{n:'Custos previstos',v:capitalComprometido(),c:'var(--c2)'},{n:'Reserva operacional',v:reservaOperacional(),c:'var(--c4)'},{n:'Livre para comprar',v:disp,c:'var(--c3)'}];
  const MD=META_DIAS_ESTOQUE,act=ativos(),vend=veiculosVendidos();
  const vn=v=>E(nomeV(v));
  const radar={
    atencao:{l:'Pedem ação',list:insightsVeiculosParados(MD).slice(0,5).map(v=>[vn(v),`${vehicleDias(v)} dias à venda`,sugestaoAcaoVeiculo(v),vehicleDias(v)>MD*2?'neg':'warn'])},
    tempo:{l:'Mais tempo parado',list:act.filter(v=>!vehicleEmPreparacao(v)).sort((a,b)=>vehicleDias(b)-vehicleDias(a)).slice(0,4).map(v=>[vn(v),`${vehicleDias(v)} dias`,sugestaoAcaoVeiculo(v),vehicleDias(v)>MD*2?'neg':vehicleDias(v)>MD?'warn':'pos'])},
    lpd:{l:'Lucro por dia',list:[...act,...vend].map(v=>({v,x:vehicleLucroPorDia(v)})).filter(x=>x.x!=null).sort((a,b)=>b.x-a.x).slice(0,4).map(({v,x})=>[vn(v),fm(x)+' por dia',v.status==='Vendido'?'Realizado':'Projetado',x>=0?'pos':'neg'])},
    roi:{l:'Maior ROI',list:vend.map(v=>({v,x:vehicleROI(v)})).filter(x=>x.x!=null).sort((a,b)=>b.x-a.x).slice(0,4).map(({v,x})=>[vn(v),'ROI '+fP(x),`Lucro de ${fm(vehicleLucroLiquido(v)||0)}`,x>=0?'pos':'neg'])}
  };
  const R=radar[S.radar];
  const esp=veiculosEspeculacao().map(v=>({v,a:avaliarEspeculacao(v)})).sort((x,y)=>(y.a.roiPct==null?-1e9:y.a.roiPct)-(x.a.roiPct==null?-1e9:x.a.roiPct));
  let espAll='';
  if(esp.length>1){const totRest=sum(esp.map(x=>x.a.restante)),apos=caixaSaldo()-totRest,pat=patrimonio(),parado=pat>0?(valorEstoqueLivro()+totRest)/pat*100:null;
    espAll=`<div class="verdict ${apos<0?'neg':(parado!=null&&parado>META_CAPITAL_PARADO_PCT)||totRest>capitalLivreParaCompra()?'warn':'pos'}" style="margin-top:10px">${ic(apos<0?'x':'alert')}<div><b>Se as ${esp.length} especulações fossem concretizadas</b>${apos<0?`Faltariam ${M(fm(-apos))} no caixa.`:`Caixa após comprar tudo: ${M(fm(apos))}.`}${parado!=null?` Capital parado iria a ${fP(parado)} (meta ${META_CAPITAL_PARADO_PCT}%).`:''}</div></div>`}
  const bm=insightMelhorMarcaROI(),bp=insightMelhorParceiro(),baixa=insightsBaixaMargem(META_MARGEM_MINIMA_PCT),roi=roiMedio(),giro=giroAnualCapital(),cp=insightCapitalParadoMeta(),parados=insightsVeiculosParados(MD);
  const opp=[];
  if(bm)opp.push(`<div class="row"><div class="badge pos">${ic('trend')}</div><div class="grow"><div class="t">${E(bm.marca)} é a marca com maior retorno</div><div class="s">ROI médio de ${fP(bm.roiMedio)} em ${bm.qtd} venda${bm.qtd>1?'s':''}</div></div></div>`);
  if(bp)opp.push(`<div class="row"><div class="badge acc">${ic('net')}</div><div class="grow"><div class="t">${E(bp.nome)} lidera em lucro</div><div class="s">${M(fK(bp.lucro))} em ${bp.qtd} veículo${bp.qtd>1?'s':''}</div></div></div>`);
  baixa.forEach(x=>opp.push(`<div class="row"><div class="badge warn">${ic('alert')}</div><div class="grow"><div class="t">${E(nomeV(x.v))} abaixo de ${META_MARGEM_MINIMA_PCT}% de margem</div><div class="s">${x.tipo==='Vendido'?'Margem realizada':'Margem prevista'} de ${fP(x.margem)}. Avalie o preço antes de baixar mais.</div></div></div>`));
  if(cp.acima)opp.push(`<div class="row"><div class="badge warn">${ic('spark')}</div><div class="grow"><div class="t">Reduza o capital parado</div><div class="s">${fP(cp.pct)} do patrimônio está em estoque (meta ${cp.meta}%). Acelere vendas ou ajuste preços.</div></div></div>`);
  if(roi!=null&&roi<10)opp.push(`<div class="row"><div class="badge warn">${ic('spark')}</div><div class="grow"><div class="t">ROI médio abaixo de 10%</div><div class="s">Revise custos de preparação e negocie melhores condições de compra.</div></div></div>`);
  if(vend.length&&giro<3)opp.push(`<div class="row"><div class="badge warn">${ic('spark')}</div><div class="grow"><div class="t">Giro do capital baixo</div><div class="s">Priorize veículos de maior liquidez para acelerar o ciclo de vendas.</div></div></div>`);
  if(parados.length)opp.push(`<div class="row"><div class="badge warn">${ic('clock')}</div><div class="grow"><div class="t">${parados.length} veículo${parados.length>1?'s':''} há mais de ${MD} dias à venda</div><div class="s">Reforce a divulgação ou reduza o preço.</div></div></div>`);
  if(!opp.length)opp.push(`<div class="row"><div class="badge pos">${ic('check')}</div><div class="grow"><div class="t">A operação está em bom ritmo</div><div class="s">Continue reinvestindo o lucro líquido para acelerar o crescimento do patrimônio.</div></div></div>`);
  const maxSim=Math.max(100000,Math.round(Math.max(0,disp)/10000)*10000);
  if(S.sim==null)S.sim=Math.min(maxSim,Math.max(20000,Math.round(Math.min(150000,disp)/5000)*5000));
  S.sim=Math.min(maxSim,Math.max(20000,S.sim));
  return`
  <section class="card hero2 enter">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div><div class="k">Disponível para nova compra</div><div class="big num" style="margin-top:4px">${M(fm(Math.max(0,disp)))}</div></div><span class="pill ${cl.t}">${ic(cl.t==='pos'?'check':cl.t==='warn'?'alert':'x','sm')} ${cl.l}</span></div>
    <p class="sub" style="margin:10px 0 14px;font-size:13.5px">${cl.d}</p>
    ${stack(seg,true)}
    <div class="legend">${seg.map(s=>`<span><i style="background:${s.c}"></i>${s.n} <b style="color:var(--tx)">${M(fK(s.v))}</b></span>`).join('')}</div>
    <div class="sep"></div>
    <div class="k">Caixa de ${M(fm(caixaSaldo()))} menos custos previstos e reserva operacional</div>
  </section>

  <div class="grid g2" style="margin-top:14px">
  <section class="card" id="simcard">
    <div class="chead"><div><h2>Simulador de compra</h2><p class="sub">Arraste para ver o efeito de um carro novo no caixa e no estoque.</p></div></div>
    <div id="simout">${simHtml()}</div>
    <input class="range" id="simr" type="range" min="20000" max="${maxSim}" step="5000" value="${S.sim}" aria-label="Valor da compra">
    <div class="chips" style="margin-top:6px">${[50000,100000,200000,Math.round(Math.max(0,disp)/10000)*10000].filter((v,i)=>v>=20000||i===3&&v>0).map((v,i,a)=>`<button class="chip" data-act="simv" data-v="${v}">${i===a.length-1&&v===Math.round(Math.max(0,disp)/10000)*10000?'Máximo ':''}${fK(v)}</button>`).join('')}</div>
  </section>
  <section class="card">
    <div class="chead"><div><h2>Mapa de decisão do estoque</h2><p class="sub">Dias à venda contra margem prevista. O tamanho é o capital parado.</p></div></div>
    ${matrixPts().length?`<div class="ch" data-chart="matrix"></div>
    <div class="legend"><span><i style="background:var(--acc);border-radius:50%"></i>Dentro da meta de ${MD} dias</span><span><i style="background:var(--warn);border-radius:50%"></i>Acima da meta</span></div>
    ${table(['Veículo','Dias','Margem'],matrixPts().map(v=>[E(v.modelo||nomeV(v)),dias_(v),fP(margemProj(v))]))}`:emptyBox('Cadastre o valor anunciado dos veículos em estoque para ver o mapa.')}
  </section></div>

  <section class="card" style="margin-top:14px">
    <div class="chead"><div><h2>Radar</h2><p class="sub">O que olhar primeiro hoje</p></div></div>
    <div class="chips" role="tablist">${Object.entries(radar).map(([k,r])=>`<button class="chip ${S.radar===k?'on':''}" data-act="radar" data-k="${k}">${r.l}</button>`).join('')}</div>
    <div class="rows" style="margin-top:12px">${R.list.length?R.list.map(r=>`<div class="row"><div class="badge ${r[3]}">${ic(r[3]==='pos'?'trend':'alert')}</div><div class="grow"><div class="t">${r[0]}</div><div class="s">${r[2]}</div></div><div class="r"><b class="num ${r[3]}-t">${M(r[1])}</b></div></div>`).join(''):emptyBox(S.radar==='atencao'?'Nenhum veículo precisa de atenção agora.':'Sem dados suficientes ainda.')}</div>
  </section>

  <div class="grid g2" style="margin-top:14px">${GX('capital')}${GX('tipos')}</div>
  <div class="grid g2" style="margin-top:14px">
  <section class="card">
    <div class="chead"><div><h2>Especulação</h2><p class="sub">Simule a compra antes de gastar</p></div></div>
    <div class="rows">${esp.length?esp.map(({v,a})=>{const tn={good:'pos',warn:'warn',bad:'neg'}[a.tone]||'',open=S.xopen['e'+v.id];return`<div class="rowx ${open?'open':''}" data-act="xopen" data-id="e${E(v.id)}"><div class="row nb" style="padding-bottom:0;border-bottom:0"><div class="badge warn">${ic('spark')}</div><div class="grow"><div class="t">${E(nomeV(v))}${v.ano?' '+E(v.ano):''} <span class="pill ${tn}" style="height:20px;font-size:11px">${a.veredito}</span></div><div class="s">Capital ${M(fK(a.investimento))} · anúncio ${a.anunciado?M(fK(a.anunciado)):'—'}</div></div><div class="r">${a.lucro!=null?`<b class="num ${a.lucro>=0?'pos-t':'neg-t'}">${a.lucro>=0?'+':'−'} ${M(fK(Math.abs(a.lucro)))}</b><div class="s">${a.margemPct!=null?fP(a.margemPct)+' previsto':''}</div>`:'<div class="s">sem anúncio</div>'}</div></div><div class="more"><div>${a.resumo}</div><div class="espv">${a.checks.map(c=>`<div>${c.ok?'✅':(c.critical?'❌':'⚠️')} ${c.txt}</div>`).join('')}</div></div></div>`}).join('<div class="sep" style="margin:12px 0"></div>')+espAll:emptyBox('Nenhuma especulação. Cadastre um veículo como Especulação para simular a compra aqui.')}</div>
  </section>
  <section class="card">
    <div class="chead"><div><h2>Oportunidades</h2><p class="sub">Padrões que aparecem nas suas vendas</p></div></div>
    <div class="rows">${opp.join('')}</div>
  </section></div>`;
};

/* ---------- SÓCIOS (aportes e pró-labore) ---------- */
V.prolabore=()=>{
  const totAp=totalAportado(),totRt=totalRetirado(),cap0=Number(state.capitalInicial||0);
  const movs=[...(state.contributions||[]).map((c,i)=>({k:'ap',o:c,i})),...(state.withdrawals||[]).map((w,i)=>({k:'rt',o:w,i}))].sort((a,b)=>String(b.o.date||'').localeCompare(String(a.o.date||''))||b.i-a.i);
  return`
  <div class="kpis kpis-3">
    <div class="kpi"><span class="k">Capital colocado</span><span class="v num pos-t">${M(fK(totAp))}</span><span class="d">aportes na operação</span></div>
    <div class="kpi"><span class="k">Já retirado</span><span class="v num neg-t">${M(fK(totRt))}</span><span class="d">pró-labore e retiradas</span></div>
    <div class="kpi"><span class="k">Saldo líquido</span><span class="v num">${M(fK(totAp-totRt))}</span><span class="d">colocado menos retirado</span></div>
  </div>
  <section class="card hero2 enter" style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap"><div><div class="k">Novo lançamento</div><p class="sub" style="margin:4px 0 0">Registre dinheiro que entrou ou saiu do seu bolso para a operação.</p></div><div style="display:flex;gap:8px"><button class="btn pos sm" data-act="mov" data-t="aporte">${ic('plus','sm')} Aporte</button><button class="btn neg sm" data-act="mov" data-t="retirada">${ic('minus','sm')} Retirada</button></div></div>
  </section>
  <div class="grid g21" style="margin-top:14px">
  <section class="card">
    <div class="chead"><div><h2>Movimento por mês</h2><p class="sub">Aportes sobem, retiradas descem</p></div></div>
    <div class="ch" data-chart="socios"></div>
    <div class="legend"><span><i style="background:var(--sa)"></i>Aportes (para cima)</span><span><i style="background:var(--neg)"></i>Retiradas (para baixo)</span></div>
    ${table(['Data','Tipo','Valor'],movs.map(m=>[dBR(m.o.date),m.k==='ap'?'Aporte':'Retirada',M(fK(Number(m.o.valor||0)))]))}
  </section>
  <section class="card">
    <div class="chead"><div><h2>Histórico</h2><p class="sub">Aportes e retiradas lançados</p></div></div>
    <div class="rows">${movs.length?movs.map(m=>{const o=m.o,ap=m.k==='ap',ini=ap&&o.inicial;return`<div class="row hrow"><div class="badge ${ap?'pos':'neg'}">${ic(ap?'up':'down')}</div><div class="grow"><div class="t">${E((ap?o.origem:o.motivo)||(ap?'Aporte':'Pró-labore'))}${ini?' <span class="pill acc" style="height:20px;font-size:11px">inicial</span>':''}</div><div class="s">${dBR(o.date)}</div></div><div class="r"><b class="num ${ap?'pos-t':'neg-t'}">${ap?'+':'−'} ${M(fK(Number(o.valor||0)))}</b></div><button class="ico-btn" data-act="${ap?'apedit':'wdedit'}" data-id="${E(o.id)}" aria-label="Editar" title="Editar">${ic('edit','sm')}</button></div>`}).join(''):emptyBox('Nenhum aporte ou retirada ainda.')}</div>
  </section></div>`;
};

/* =====================================================================
   NAVEGAÇÃO, CABEÇALHO E RENDER
   ===================================================================== */
function buildNav(){
  $('#dock').innerHTML=NAV.map(t=>`<button data-go="${t.id}" class="${t.id===activeTab?'on':''}" aria-label="${t.l}" ${t.id===activeTab?'aria-current="page"':''}>${ic(t.ic)}<span>${t.l}</span></button>`).join('');
  $('#rail').innerHTML=`<div class="rb"><img alt="SMZ Repasses" src="logo-smz.webp"><small>Gestão de repasses</small></div>`+NAV.map(t=>`<button class="nv ${t.id===activeTab?'on':''}" data-go="${t.id}">${ic(t.ic)}${t.rail}</button>`).join('')+`<div class="fill"></div><div class="rf">${hasAC()&&AC.user?`<b>${E(AC.nome||'')}</b><br>`:''}<span id="rail-sync"></span></div>`;
  const rs=$('#rail-sync'),sy=$('#ac-sync');if(rs&&sy)rs.textContent=sy.textContent;
}
function syncRailStatus(){const rs=$('#rail-sync'),sy=$('#ac-sync');if(rs&&sy)rs.textContent=sy.textContent}
function renderView(){
  const t=NAV.find(x=>x.id===activeTab)||NAV[0],v=$('#view');if(!v)return;
  const keep=document.activeElement&&document.activeElement.id,sel=keep&&document.activeElement.selectionStart;
  try{window.SMZ_CHARTS&&SMZ_CHARTS.begin()}catch(_){}
  v.innerHTML=`<div class="ptitle"><div><h1>${t.t}</h1><p>${SUB[t.id]()}</p></div>${t.id==='veiculos'?`<button class="btn" data-act="vnew">${ic('plus','sm')} Novo veículo</button>`:''}</div>`+V[t.id]()+`<p class="foot-note">Dados salvos automaticamente e sincronizados na nuvem.</p>`;
  drawCharts();
  try{window.SMZ_CHARTS&&SMZ_CHARTS.after(t.id)}catch(_){}
  if(t.id==='dashboard'&&S.first)countUp();
  S.first=false;
  const sr=$('#simr');if(sr)sr.addEventListener('input',e=>{S.sim=+e.target.value;$('#simout').innerHTML=simHtml()});
  if(keep&&['vq','cq','pq','lq'].includes(keep)){const n=document.getElementById(keep);if(n){n.focus();try{n.setSelectionRange(sel,sel)}catch(_){}}}
}
function countUp(){const el=$('#heroNum .m');if(!el||matchMedia('(prefers-reduced-motion:reduce)').matches)return;const end=patrimonio(),t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/900),e=1-Math.pow(1-k,3);el.textContent=fm(end*e);if(k<1)requestAnimationFrame(f)})(t0)}

function renderChrome(){
  buildNav();
  const nome=hasAC()?String(AC.nome||''):'',ini=(nome[0]||'•').toUpperCase(),n=(typeof acUnread==='function'&&hasAC())?acUnread().length:0;
  const me=$('#me');if(me){me.firstChild.textContent=ini;me.title=nome||'Conta';let b=$('.nbadge',me);if(n){if(!b){b=document.createElement('span');b.className='nbadge';me.appendChild(b)}b.textContent=n}else if(b)b.remove()}
  const an=$('#acc-nome');if(an)an.textContent=nome||'—';
  const ai=$('#acc-av');if(ai)ai.textContent=ini;
  const au=$('#ac-user');if(au)au.textContent=nome;
  try{renderBackupStatus()}catch(_){}
  try{renderAuditBadge()}catch(_){}
  syncRailStatus();
}

/* ---------- formulários em folha (mesmos campos e ids do sistema) ---------- */
function setPick(inputId,val){const i=document.getElementById(inputId);if(i)i.value=val;$$(`[data-pick="${inputId}"]`).forEach(b=>b.classList.toggle('on',b.dataset.v===val))}
function buildSocioPicks(){return;
  [['ap-socio','ap-socio-pick'],['wd-socio','wd-socio-pick']].forEach(([sid,pid])=>{
    const sel=document.getElementById(sid),box=document.getElementById(pid);if(!sel||!box)return;
    box.innerHTML=Array.from(sel.options).map((o,i)=>`<button type="button" class="${o.value===sel.value?'on':''}" data-act="pick" data-s="${sid}" data-v="${E(o.value)}"><span class="dot" style="background:${sCor(i)}"></span>${E(o.text)}</button>`).join('');
  });
}
function syncSocioPicks(){buildSocioPicks()}
function openTx(){const f=$('#form-tx');f.reset();$('#tx-date').value=todayLocal();setPick('tx-tipo','entrada');openModalEl('tx-modal');setTimeout(()=>$('#tx-valor').focus(),300)}
function openMov(tipo){
  const ap=tipo==='aporte';
  if(ap)cancelEditContribution();else cancelEditWithdrawal();
  acRenderPro();buildSocioPicks();
  document.getElementById(ap?'ap-date':'wd-date').value=todayLocal();
  openModalEl(ap?'ap-modal':'wd-modal');
  setTimeout(()=>document.getElementById(ap?'ap-valor':'wd-valor').focus(),300);
}
function openGoal(){const f=$('#form-goal');f.reset();const ym=ymNow();$('#goal-mes').value=ym;const m=Number((state.monthlyGoals||{})[ym]||0);$('#goal-valor').value=m?toBRL(m):'';openModalEl('goal-modal');setTimeout(()=>$('#goal-valor').focus(),300)}
window.duoGoalMonthChange=function(){const ym=$('#goal-mes').value||ymNow(),m=Number((state.monthlyGoals||{})[ym]||0);$('#goal-valor').value=m?toBRL(m):''};
window.duoSaveGoal=function(ev){
  ev.preventDefault();
  const ym=$('#goal-mes').value||ymNow(),valor=parseMoney($('#goal-valor').value);
  state.monthlyGoals=state.monthlyGoals||{};state.monthlyGoals[ym]=valor;
  closeModalEl('goal-modal');
  const ok=saveState();render();
  if(ok)showToast(valor>0?'Meta salva':'Meta removida','success');
  return false;
};

/* o sistema fecha as folhas quando o salvamento dá certo (os handlers originais continuam os mesmos) */
function wrapSubmit(name,modalId,okFn){
  const orig=window[name];if(typeof orig!=='function')return;
  window[name]=function(ev){const before=okFn();const r=orig.call(this,ev);if(okFn()!==before)closeModalEl(modalId);return r};
}
const cntTx=()=>(state.transactions||[]).length;
const apSig=()=>(state.contributions||[]).length+'|'+(editingContributionId||'')+'|'+JSON.stringify(state.contributions||[]).length;
const wdSig=()=>(state.withdrawals||[]).length+'|'+(editingWithdrawalId||'')+'|'+JSON.stringify(state.withdrawals||[]).length;

/* ---------- ações ---------- */
function act(a,d){
  switch(a){
    case 'ciente': acAvisoOk(); render(); break;
    case 'range': S.range=d.r;S.first=false;renderView(); break;
    case 'vf': S.vf=d.k;renderView(); break;
    case 'vendidos': S.vf='vendido';S.vq='';setTab('veiculos');window.scrollTo({top:0}); break;
    case 'pf': S.pf=d.k;renderView(); break;
    case 'radar': S.radar=d.k;renderView(); break;
    case 'open': {S.open[d.id]=!S.open[d.id];const el=document.querySelector(`article[data-id="${CSS.escape(d.id)}"]`);if(el)el.classList.toggle('open',S.open[d.id]);break}
    case 'xopen': {S.xopen[d.id]=!S.xopen[d.id];const el=document.querySelector(`.rowx[data-id="${CSS.escape(d.id)}"]`);if(el)el.classList.toggle('open',S.xopen[d.id]);break}
    case 'simv': {S.sim=Math.max(20000,+d.v);const r=$('#simr');if(r)r.value=S.sim;$('#simout').innerHTML=simHtml();break}
    case 'meta': openGoal(); break;
    case 'lanc': openTx(); break;
    case 'csv': exportCaixaCSV(); break;
    case 'more': S.climit+=200;renderView(); break;
    case 'txdel': deleteTransaction(d.id); break;
    case 'fechar': acFecharMes(d.m); break;
    case 'reabrir': acReabrirMes(d.m); break;
    case 'fechcsv': acExportFech(); break;
    case 'fechall': S.fechAll=!S.fechAll;renderView(); break;
    case 'vnew': openVehicleModal(); break;
    case 'cwa': { const c=clientesList().find(x=>x.key===d.k), u=c&&waUrl(c); if(u) window.open(u,'_blank','noopener'); else showToast('Este cliente está sem telefone cadastrado.'); break; }
    case 'ccopy': { const c=clientesList().find(x=>x.key===d.k); if(c&&c.tel&&navigator.clipboard){ navigator.clipboard.writeText(c.tel).then(()=>showToast('Telefone copiado')); } break; }
    case 'vedit': openVehicleModal(d.id); break;
    case 'vsell': openSaleModal(d.id); break;
    case 'vbuy': openPurchaseModal(d.id); break;
    case 'vdesist': openDesistModal(d.id); break;
    case 'vreopen': reabrirNegociacao(d.id); break;
    case 'vundo': desfazerVenda(d.id); break;
    case 'vboleto': { const v=state.vehicles.find(x=>x.id===d.id); if(v){ v.boletoPago=!v.boletoPago; v.boletoPagoEm=v.boletoPago?todayLocal():''; saveState(); render(); } break; }
    case 'vdel': deleteVehicle(d.id); break;
    case 'vready': toggleDisponivel(d.id,true); break;
    case 'vprep': toggleDisponivel(d.id,false); break;
    case 'vcanal': openAvailModal(d.id); break;
    case 'vcsv': exportVeiculosCSV(); break;
    case 'novoP': openPartnerModal(); break;
    case 'pedit': openPartnerModal(d.id); break;
    case 'pdel': deletePartner(d.id); break;
    case 'mov': openMov(d.t); break;
    case 'medit': if(d.k==='ap'){acRenderPro();buildSocioPicks();editContribution(d.id);buildSocioPicks();openModalEl('ap-modal')}else{acRenderPro();buildSocioPicks();editWithdrawal(d.id);buildSocioPicks();openModalEl('wd-modal')} break;
    case 'mdel': if(d.k==='ap')deleteContribution(d.id);else deleteWithdrawal(d.id); break;
    case 'pick': {const sel=document.getElementById(d.s);if(sel){sel.value=d.v;buildSocioPicks()}break}
    case 'pickt': setPick(d.i,d.v); break;
    case 'hist': acShowHistory(); break;
    case 'account': renderChrome();openModalEl('account-modal'); break;
    case 'acc-aporte': closeModalEl('account-modal');openOnboardingModal(); break;
    case 'acc-export': exportBackup(); break;
    case 'acc-import': document.getElementById('importBackupInput').click(); break;
    case 'acc-hist': closeModalEl('account-modal');acShowHistory(); break;
    case 'acc-avisos': closeModalEl('account-modal');acShowAvisos(true); break;
    case 'acc-audit': closeModalEl('account-modal');showAuditReport(); break;
    case 'acc-sair': closeModalEl('account-modal');AC.logout(); break;
    default: if(String(a).indexOf('gx-')===0&&window.SMZ_GESTAO) window.SMZ_GESTAO.act(a,d);
  }
}
function wire(){
  document.addEventListener('click',e=>{
    const g=e.target.closest('[data-go]');if(g){setTab(g.dataset.go);window.scrollTo({top:0});return}
    const a=e.target.closest('[data-act]');if(a)act(a.dataset.act,a.dataset);
  });
  document.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('article.veh')){e.preventDefault();act('open',e.target.dataset)}
  });
  document.addEventListener('input',e=>{
    const t=e.target;
    if(t.id==='vq'){S.vq=t.value;renderView()}
    if(t.id==='lq'){S.lq=t.value;renderView()}
    if(t.id==='msgtpl'){try{localStorage.setItem(MSG_KEY,t.value)}catch(_){}}
    else if(t.id==='cq'){S.cq=t.value;S.climit=200;renderView()}
    else if(t.id==='pq'){S.pq=t.value;renderView()}
  });
  document.addEventListener('pointermove',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t&&!t.closest('.noTip'))showTip(t.dataset.tip,e.clientX,e.clientY);else if(!e.target.closest('.xh'))hideTip()});
  document.addEventListener('scroll',hideTip,{passive:true});
  const eye=$('#eye'),th=$('#theme');
  const icons=()=>{const dark=document.documentElement.dataset.theme==='dark';th.innerHTML=ic(dark?'sun':'moon');eye.innerHTML=ic(document.body.classList.contains('hide')?'eyeoff':'eye')};
  th.addEventListener('click',()=>{const r=document.documentElement,n=r.dataset.theme==='dark'?'light':'dark';r.dataset.theme=n;try{localStorage.setItem('smz-theme',n)}catch(_){}const m=document.querySelector('meta[name=theme-color]');if(m)m.content=n==='dark'?'#05070C':'#F2F3F7';icons();drawCharts()});
  eye.addEventListener('click',()=>{document.body.classList.toggle('hide');try{localStorage.setItem('smz-hide',document.body.classList.contains('hide')?'1':'0')}catch(_){}icons()});
  try{if(localStorage.getItem('smz-hide')==='1')document.body.classList.add('hide')}catch(_){}
  icons();
  $('#me').addEventListener('click',()=>act('account',{}));
  // atualiza o texto de sincronização no menu lateral quando o sistema muda o status
  const sy=$('#ac-sync');if(sy&&window.MutationObserver)new MutationObserver(syncRailStatus).observe(sy,{childList:true,characterData:true,subtree:true});
}

/* =====================================================================
   INSTALAÇÃO — troca as funções de desenho do sistema pelas novas
   ===================================================================== */
window.duoInstall=function(){
  window.acSocioOptions=function(sel){return socios().map(s=>`<option value="${esc(s.id)}" ${s.id===sel?'selected':''}>${esc(s.nome)}</option>`).join('')};
  window.renderTabs=function(){buildNav()};
  window.renderHeader=function(){renderChrome()};
  window._renderActivePanel=function(){try{acRenderPro();buildSocioPicks()}catch(_){}renderView()};
  window.setTab=function(id){activeTab=id;renderChrome();renderView()};
  // funções antigas de desenho que outros trechos ainda podem chamar (ex.: depois de salvar): redesenham a tela atual
  ['renderVehicles','renderPartners','renderCaixa','renderMensal','renderCapital','renderDashboard','renderVendas','renderExecutiva','acRenderFechamento','renderFluxoMensal','renderVehSummary'].forEach(n=>{window[n]=function(){renderView()}});
  window.onVehFilter=function(){renderView()};
  window.onPartnerSearch=function(t){S.pq=t||'';renderView()};
  window.setPartnerFilter=function(t){S.pf=t;renderView()};
  window.onCaixaSearch=function(t){S.cq=t||'';renderView()};
  window.caixaVerMais=function(){S.climit+=200;renderView()};
  wrapSubmit('handleAddTransaction','tx-modal',cntTx);
  wrapSubmit('handleAddContribution','ap-modal',apSig);
  wrapSubmit('handleAddWithdrawal','wd-modal',wdSig);
  // "Cancelar edição" também fecha a folha
  ['cancelEditContribution:ap-modal','cancelEditWithdrawal:wd-modal'].forEach(p=>{const [n,m]=p.split(':'),o=window[n];window[n]=function(){const r=o.apply(this,arguments);if(arguments.length&&arguments[0]==='close')closeModalEl(m);return r}});
  wire();
  const h=(location.hash||'').slice(1);if(NAV.some(t=>t.id===h))activeTab=h;
  buildNav();
};
})();
