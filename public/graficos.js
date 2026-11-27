/* SMZ Repasses · GRÁFICOS (camada visual extra). Só lê o estado existente; mesmas cores do sistema. */
(function(){
'use strict';
const sum=a=>a.reduce((s,x)=>s+x,0),N=x=>Number(x)||0,MS=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const fm=n=>{n=Math.round(N(n)*100)/100;return(n<0?'−':'')+'R$ '+Math.abs(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})};
const fK=n=>{const a=Math.abs(n),s=n<0?'−':'';return a>=1e6?s+'R$ '+(a/1e6).toFixed(2).replace('.',',')+' mi':a>=1e4?s+'R$ '+Math.round(a/1e3)+' mil':fm(n)};
const fP=(n,d=0)=>Number(n).toFixed(d).replace('.',',')+'%';
const ax=v=>v===0?'0':(v<0?'−':'')+(Math.abs(v)>=1e6?(Math.abs(v)/1e6).toFixed(1).replace('.',',')+' mi':Math.abs(v)>=1e3?(Math.round(Math.abs(v)/100)/10).toString().replace('.',',')+' mil':Math.round(Math.abs(v)));
const M=t=>`<span class="m">${t}</span>`,E=s=>esc(String(s==null?'':s));
const ymOf=d=>String(d||'').slice(0,7);
const lastYms=k=>{const d=new Date(),o=[];for(let i=k-1;i>=0;i--){const x=new Date(d.getFullYear(),d.getMonth()-i,1);o.push(x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'))}return o};
const ymL=y=>MS[+y.slice(5,7)-1];
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const COR=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--acc)','var(--mut)'];
const tp=(h,rows)=>E(`<div class="h">${E(h)}</div>`+rows.map(r=>`<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join(''));
const nomeV=v=>`${v.marca||''} ${v.modelo||''}`.trim()||'Veículo';
const vend=()=>veiculosVendidos();
const lucroV=v=>vehicleLucroLiquido(v)||0;
const niceTop=x=>{if(x<=0)return 10000;const m=Math.pow(10,Math.floor(Math.log10(x))),f=x/m;return(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*m};
const card=(h,s,body,cls)=>!body?'':`<section class="card enter ${cls||''}"><div class="chead"><div><h2>${h}</h2><p class="sub">${s||''}</p></div></div>${body}</section>`;
const empty=t=>`<div class="empty">${t}</div>`;
const legend=it=>`<div class="legend">${it.map(i=>`<span><i style="background:${i.c}"></i>${i.n}</span>`).join('')}</div>`;

/* ---------- primitivas (desenhadas na largura real do cartão) ---------- */
const REG=[];const mk=(fn,o)=>{REG.push([fn,o]);return`<div class="ch" data-gx="${REG.length-1}"></div>`};
const cols=o=>mk(colsSvg,o),area=o=>mk(areaSvg,o),wfall=o=>mk(wfSvg,o);
function colsSvg({labels,vals,colors,color='var(--c1)',line,lineName='Meta',name='Valor',fmt=fm,sub,lbl=ax},W){
  const H=190,pl=38,pr=4,pt=12,pb=22,n=labels.length;
  const mx=Math.max(...vals,...(line||[]).map(N),1),mn=Math.min(0,...vals);
  const top=niceTop(mx*1.05),bot=mn<0?-niceTop(-mn*1.1):0;
  const Y=v=>pt+(top-v)/(top-bot)*(H-pt-pb),slot=(W-pl-pr)/n,bw=Math.min(28,slot*.58),y0=Y(0);
  let g='';[top,top/2,0].concat(bot<0?[bot]:[]).forEach(v=>{g+=`<line class="grid-l" x1="${pl}" x2="${W-pr}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="0" y="${Y(v)+4}">${ax(v)}</text>`});
  let b='';
  vals.forEach((v,i)=>{const cx=pl+slot*(i+.5),h=Math.abs(Y(v)-y0),y=v>=0?Y(v):y0,c=(colors&&colors[i])||(v<0?'var(--neg)':color);
    const rows=[[name,fmt(v)]];if(line)rows.push([lineName,fmt(line[i])]);if(sub&&sub[i])rows.push(sub[i]);
    b+=`<g data-tip="${tp(labels[i],rows)}"><rect x="${cx-slot/2+1}" y="${pt}" width="${slot-2}" height="${H-pt-pb}" fill="transparent"/>${v?`<rect x="${cx-bw/2}" y="${y}" width="${bw}" height="${Math.max(2,h)}" rx="5" fill="${c}"/>`:''}${v&&slot>34?`<text class="ax" x="${cx}" y="${v>=0?y-4:y+h+11}" text-anchor="middle" style="font-weight:700;fill:var(--tx2)">${lbl(v)}</text>`:''}<text class="ax" x="${cx}" y="${H-6}" text-anchor="middle">${labels[i]}</text></g>`});
  let l='';
  if(line){const p=line.map((v,i)=>[pl+slot*(i+.5),Y(N(v))]);l=`<path d="M${p.map(a=>a.join(',')).join('L')}" fill="none" stroke="var(--tx)" stroke-width="1.8" stroke-dasharray="4 4" opacity=".75"/>`+p.map(a=>`<circle cx="${a[0]}" cy="${a[1]}" r="3" fill="var(--s1)" stroke="var(--tx)" stroke-width="1.6"/>`).join('')}
  return`<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${E(name)}">${g}<line x1="${pl}" x2="${W-pr}" y1="${y0}" y2="${y0}" stroke="var(--line2)"/>${b}${l}</svg>`;
}
function hbars(items,{fmt=fK,max,min=1}={}){
  items=items.filter(i=>i&&isFinite(i.v));if(items.length<min)return'';
  const mx=max||Math.max(...items.map(i=>Math.abs(i.v)),1);
  return`<div class="gxh">${items.map(i=>`<div class="gxr" data-tip="${tp(i.n,[[i.tl||'Valor',(i.f||fmt)(i.v)]].concat(i.sub?[i.sub]:[]))}"><span class="nm">${E(i.n)}</span><div class="tr"><i style="width:${Math.max(1.5,Math.abs(i.v)/mx*100)}%;background:${i.c||(i.v<0?'var(--neg)':'var(--c1)')}"></i></div><b class="num">${M((i.f||fmt)(i.v))}</b></div>`).join('')}</div>`;
}
function donut(items,{center,sub,fmt=fK}={}){
  items=items.filter(i=>i.v>0);const t=sum(items.map(i=>i.v));if(items.length<2)return'';
  let off=0,seg='';
  items.forEach(i=>{const p=i.v/t*100,d=Math.max(.4,p-(items.length>1?.8:0));seg+=`<circle data-tip="${tp(i.n,[['Valor',fmt(i.v)],['Parte',fP(p,1)]])}" cx="60" cy="60" r="44" fill="none" stroke="${i.c}" stroke-width="16" pathLength="100" stroke-dasharray="${d} ${100-d}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;off+=p});
  return`<div class="gxd"><svg viewBox="0 0 120 120" role="img"><circle cx="60" cy="60" r="44" fill="none" stroke="var(--s3)" stroke-width="16"/>${seg}<text x="60" y="${sub?58:65}" text-anchor="middle" style="font:800 15px var(--font);letter-spacing:-.03em;fill:var(--tx)">${center||fmt(t)}</text>${sub?`<text x="60" y="74" text-anchor="middle" class="ax">${sub}</text>`:''}</svg>
  <div class="gxl">${items.map(i=>`<div><i style="background:${i.c}"></i><span>${E(i.n)}</span><b class="num">${fP(i.v/t*100)}</b></div>`).join('')}</div></div>`;
}
function wfSvg({steps},W){
  const H=210,pl=6,pr=6,pt=24,pb=34,n=steps.length;let run=0;
  const B=steps.map(s=>{if(s.t==='tot'){run=s.v;return{a:0,b:s.v,s}}const a=run;run+=s.v;return{a,b:run,s}});
  const all=B.flatMap(b=>[b.a,b.b,0]),mx=Math.max(...all),mn=Math.min(...all),sp=(mx-mn)||1,Y=v=>pt+(mx-v)/sp*(H-pt-pb),slot=(W-pl-pr)/n,bw=Math.min(58,slot*.64);
  let o=`<line x1="${pl}" x2="${W-pr}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line2)"/>`;
  B.forEach((b,i)=>{const x=pl+slot*i+(slot-bw)/2,y=Y(Math.max(b.a,b.b)),h=Math.max(2,Math.abs(Y(b.a)-Y(b.b))),tot=b.s.t==='tot',c=tot?(b.b>=0?'var(--acc)':'var(--neg)'):(b.s.v<0?'var(--neg)':'var(--pos)'),nx=B[i+1];
    o+=`<g data-tip="${tp(b.s.n,[[tot?'Total':'Variação',fm(b.s.v)]])}"><rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="6" fill="${c}"/><text class="ax" x="${x+bw/2}" y="${y-5}" text-anchor="middle" style="font-weight:700;fill:var(--tx2)">${(b.s.v<0?'−':'')+fK(Math.abs(b.s.v)).replace('−','')}</text><text class="ax" x="${x+bw/2}" y="${H-10}" text-anchor="middle">${b.s.n}</text></g>`;
    if(nx)o+=`<line x1="${x+bw}" x2="${pl+slot*(i+1)+(slot-bw)/2}" y1="${Y(b.b)}" y2="${Y(b.b)}" stroke="var(--mut)" stroke-dasharray="3 3" opacity=".6"/>`});
  return`<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Cascata do lucro ao líquido">${o}</svg>`;
}
function areaSvg({vals,labels,color='var(--acc)',id},W){
  const H=180,pl=38,pt=12,pb=22,n=vals.length;
  const mn=Math.min(...vals),mx=Math.max(...vals),sp=(mx-mn)||1,lo=mn-sp*.15,hi=mx+sp*.1;
  const X=i=>pl+i*(W-pl-4)/(n-1),Y=v=>pt+(1-(v-lo)/(hi-lo))*(H-pt-pb),p=vals.map((v,i)=>[X(i),Y(v)]);
  let g='';[0,.5,1].forEach(k=>{const v=lo+(hi-lo)*k,y=Y(v);g+=`<line class="grid-l" x1="${pl}" x2="${W-4}" y1="${y}" y2="${y}"/><text class="ax" x="0" y="${y+4}">${ax(v)}</text>`});
  const d='M'+p.map(a=>a[0].toFixed(1)+','+a[1].toFixed(1)).join('L'),sw=(W-pl)/n;
  const hit=vals.map((v,i)=>`<rect data-tip="${tp(labels[i],[['Valor',fm(v)]])}" x="${X(i)-sw/2}" y="${pt}" width="${sw}" height="${H-pt-pb}" fill="transparent"/>`).join('');
  const im=vals.indexOf(mx),iN=vals.indexOf(mn);
  return`<svg viewBox="0 0 ${W} ${H}" height="${H}"><defs><linearGradient id="ga${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${g}<path d="${d}L${X(n-1)},${H-pb}L${X(0)},${H-pb}Z" fill="url(#ga${id})"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="${p[im][0]}" cy="${p[im][1]}" r="4" fill="var(--pos)" stroke="var(--s1)" stroke-width="2"/><circle cx="${p[iN][0]}" cy="${p[iN][1]}" r="4" fill="var(--neg)" stroke="var(--s1)" stroke-width="2"/><circle cx="${p[n-1][0]}" cy="${p[n-1][1]}" r="5" fill="${color}" stroke="var(--s1)" stroke-width="2.5"/><text class="ax" x="${pl}" y="${H-5}">${labels[0]}</text><text class="ax" x="${W-4}" y="${H-5}" text-anchor="end">${labels[n-1]}</text>${hit}</svg>`;
}
function heatSvg({weeks},W){
  const map={};vend().forEach(v=>{if(!v.dataVenda)return;const o=map[v.dataVenda]||(map[v.dataVenda]={n:0,l:0,t:[]});o.n++;o.l+=lucroV(v);o.t.push(nomeV(v))});
  const t=new Date();t.setHours(12,0,0,0);const st=new Date(t);st.setDate(st.getDate()-st.getDay()-(weeks-1)*7);
  const gp=3,c=Math.max(10,Math.min(26,(W-22)/weeks-gp));let cells='';
  for(let w=0;w<weeks;w++)for(let d=0;d<7;d++){const x=new Date(st);x.setDate(st.getDate()+w*7+d);if(x>t)continue;const k=iso(x),o=map[k];    const a=o?Math.min(100,45+o.n*25):0,f=o?`color-mix(in srgb,var(--pos) ${a}%,var(--s3))`:'var(--s3)';
    cells+=`<rect data-tip="${tp(x.getDate()+' de '+MS[x.getMonth()],o?[['Vendas',o.n],['Lucro',fm(o.l)],['Carros',E(o.t.join(', '))]]:[['Vendas','nenhuma']])}" x="${22+w*(c+gp)}" y="${d*(c+gp)}" width="${c}" height="${c}" rx="5" fill="${f}"/>`}
  const dl=['D','S','T','Q','Q','S','S'].map((s,i)=>i%2?`<text class="ax" x="0" y="${i*(c+gp)+13}">${s}</text>`:'').join('');
  return`<svg viewBox="0 0 ${W} ${7*(c+gp)}" height="${7*(c+gp)}" role="img" aria-label="Calendário de vendas">${dl}${cells}</svg>`;
}
const heat=(weeks=15)=>{const t=new Date();t.setHours(12,0,0,0);const i0=new Date(t);i0.setDate(i0.getDate()-i0.getDay()-(weeks-1)*7);return{html:mk(heatSvg,{weeks}),tot:vend().filter(v=>v.dataVenda>=iso(i0)).length}};
const hist=(vals,edges,labs,colors)=>edges.map((e,i)=>vals.filter(v=>v>=e&&v<(edges[i+1]==null?1e9:edges[i+1])).length);

/* ---------- cartões por tela ---------- */
const ativosL=()=>veiculosEstoqueAtivo();
const diasA=v=>vehicleEmPreparacao(v)?vehicleDiasPreparacao(v):vehicleDias(v);
const cashDaily=k=>{const t=new Date();t.setHours(12,0,0,0);const by={};let base=N(state.capitalInicial);const s0=new Date(t);s0.setDate(s0.getDate()-k+1);const i0=iso(s0);
  (state.transactions||[]).forEach(x=>{if(!x.date)return;const v=(x.tipo==='entrada'?1:-1)*N(x.valor);if(x.date<i0)base+=v;else by[x.date]=(by[x.date]||0)+v});
  const vals=[],labels=[];for(let i=0;i<k;i++){const d=new Date(s0);d.setDate(s0.getDate()+i);base+=by[iso(d)]||0;vals.push(base);labels.push(d.getDate()+' '+MS[d.getMonth()])}return{vals,labels}};
const firstYm=()=>vend().map(v=>ymOf(v.dataVenda)).filter(Boolean).sort()[0]||null;
const monthsF=(max=8)=>{const f=firstYm(),all=lastYms(max);if(!f)return all.slice(-3);const i=all.findIndex(m=>m>=f);return all.slice(Math.min(i<0?all.length-1:i,all.length-3))};
const live=a=>a.filter(x=>x).length>=2;
const parc=()=>(state.garagePartners||[]).map(p=>{const s=vend().filter(v=>v.parceiroId===p.id);return{p,com:sum(s.map(v=>vehicleComissao(v)||0)),lu:sum(s.map(lucroV)),n:s.length,pz:s.length?sum(s.map(vehicleDias))/s.length:null}}).filter(x=>x.n);
const dias1=x=>x+' carro'+(x===1?'':'s');
const CARDS={
dashboard:[
 ()=>{const y=monthsF(8),v=y.map(m=>lucroPorMes(m));if(!live(v))return'';const g=y.map(m=>N((state.monthlyGoals||{})[m]));
   return card('Lucro por mês','Barras: lucro realizado. Linha tracejada: meta do mês.',cols({labels:y.map(ymL),vals:v,line:g.some(x=>x>0)?g:null,name:'Lucro'})+legend([{n:'Lucro',c:'var(--c1)'},{n:'Prejuízo',c:'var(--neg)'}]))},
 ()=>{const a=ativosL();if(a.length<2)return'';const d=a.map(diasA),MD=META_DIAS_ESTOQUE,e=[0,Math.round(MD/2),MD,MD*2],l=['0–'+(e[1]-1)+' d',e[1]+'–'+(MD-1)+' d',MD+'–'+(MD*2-1)+' d',MD*2+'+ d'];
   return card('Idade do estoque',`Quantos carros estão em cada faixa de dias. A meta é vender em até ${MD} dias.`,cols({labels:l,vals:hist(d,e),colors:['var(--pos)','var(--c1)','var(--warn)','var(--neg)'],name:'Veículos',fmt:dias1}))}
],
caixa:[
 ()=>{const c=cashDaily(120);if(Math.max(...c.vals)===Math.min(...c.vals))return'';return card('Saldo do caixa dia a dia','Últimos 120 dias. Verde é o maior saldo e vermelho o menor.',area({...c,id:'c'}))},
 ()=>{const t=new Date();t.setDate(t.getDate()-90);const i0=iso(t),ex=['Compra de veículo','Pagamento repasse','Retirada Pró-labore','Transferência','Aporte'],by={};
   (state.transactions||[]).filter(x=>x.tipo==='saida'&&x.date>=i0&&!ex.includes(x.categoria)).forEach(x=>{const k=x.categoria||'Outros';by[k]=(by[k]||0)+N(x.valor)});
   const l=Object.entries(by).sort((a,b)=>b[1]-a[1]),rest=sum(l.slice(5).map(x=>x[1])),it=l.slice(0,5).map((x,i)=>({n:x[0],v:x[1],c:COR[i]}));if(rest>0)it.push({n:'Outros',v:rest,c:'var(--mut)'});
   return card('Para onde vai o dinheiro','Custos e despesas dos últimos 90 dias, sem compra de carro e sem retiradas.',donut(it))}
],
veiculos:[
 ()=>{const s=vend().slice().sort((a,b)=>lucroV(b)-lucroV(a)).slice(0,8);return card('Lucro por veículo vendido','Os maiores resultados, desde o início.',hbars(s.map(v=>({n:nomeV(v),v:lucroV(v),c:lucroV(v)<0?'var(--neg)':'var(--pos)',tl:'Lucro',sub:['Margem',vehicleMargem(v)==null?'—':fP(vehicleMargem(v),1)]})),{min:2}))},
 ()=>{const by={};ativosL().forEach(v=>{const k=v.marca||'Outras';by[k]=(by[k]||0)+vehicleCapital(v)});const l=Object.entries(by).sort((a,b)=>b[1]-a[1]);
   return card('Capital em estoque por marca','Onde está parado o dinheiro dos carros ainda não vendidos.',donut(l.slice(0,5).map((x,i)=>({n:x[0],v:x[1],c:COR[i]})).concat(l.length>5?[{n:'Outras',v:sum(l.slice(5).map(x=>x[1])),c:'var(--mut)'}]:[])))},
 ()=>{const c=vend().filter(v=>v.dataCompra&&v.dataVenda&&!isRepasse(v)).map(v=>daysBetween(v.dataCompra,v.dataVenda));if(c.length<3)return'';
   return card('Quanto demora para vender','Dias entre a compra e a venda (sem repasse, que vende no mesmo dia).',cols({labels:['até 15 d','16–30 d','31–45 d','46–60 d','60+ d'],vals:hist(c,[0,16,31,46,61]),colors:['var(--pos)','var(--c1)','var(--c4)','var(--warn)','var(--neg)'],name:'Vendas',fmt:dias1}))}
],
parceiros:[
 ()=>{const r=parc();return card('Comissão paga por parceiro','Quanto cada garagem custou em comissão.',donut(r.filter(x=>x.com>0).map((x,i)=>({n:x.p.nome,v:x.com,c:COR[i%6]}))))+
   card('Lucro que cada parceiro trouxe','Lucro líquido dos carros vendidos.',hbars(r.sort((a,b)=>b.lu-a.lu).map(x=>({n:x.p.nome,v:x.lu,c:'var(--c3)',tl:'Lucro',sub:['Vendas',x.n]})),{min:2}))+
   card('Quem vende mais rápido','Prazo médio em dias, do carro disponível até a venda.',hbars(r.filter(x=>x.pz!=null).sort((a,b)=>a.pz-b.pz).map(x=>({n:x.p.nome,v:x.pz,c:x.pz>META_DIAS_ESTOQUE?'var(--warn)':'var(--pos)',f:v=>v.toFixed(1).replace('.',',')+' d',tl:'Prazo'})),{min:2}),'span2')}
],
clientes:[
 ()=>{const y=monthsF(8),v=y.map(m=>sum(vend().filter(x=>ymOf(x.dataVenda)===m).map(x=>N(x.valorVendido))));if(!live(v))return'';return card('Faturamento de vendas por mês','Valor vendido a clientes.',cols({labels:y.map(ymL),vals:v,name:'Vendido',color:'var(--c3)'}))},
 ()=>{const m={};vend().filter(v=>String(v.comprador||'').trim()).forEach(v=>{const k=telDigits(v.compradorTel)||String(v.comprador).toLowerCase();const c=m[k]||(m[k]={nome:String(v.comprador).trim(),n:0,t:0});c.n++;c.t+=N(v.valorVendido)});
   const l=Object.values(m),rec=l.filter(c=>c.n>1).length;
   return card('Novos e recorrentes',`${rec} de ${l.length} cliente${l.length===1?'':'s'} já comprou mais de uma vez.`,donut([{n:'Compraram 1 vez',v:l.length-rec,c:'var(--c1)'},{n:'Recorrentes',v:rec,c:'var(--pos)'}],{center:l.length+'',sub:'clientes',fmt:x=>x+''}))
   +card('Quem mais comprou','Total comprado por cliente.',hbars(l.sort((a,b)=>b.t-a.t).slice(0,6).map(c=>({n:c.nome,v:c.t,c:'var(--c1)',tl:'Total',sub:['Compras',c.n]})),{min:2}))}
],
executiva:[
 ()=>{const y=monthsF(8),v=y.map(m=>{const s=vend().filter(x=>ymOf(x.dataVenda)===m).map(vehicleMargem).filter(x=>x!=null);return s.length?sum(s)/s.length:0});if(!live(v))return'';
   return card('Margem média por mês',`A linha é a margem mínima desejada (${META_MARGEM_MINIMA_PCT}%).`,cols({labels:y.map(ymL),vals:v,line:y.map(()=>META_MARGEM_MINIMA_PCT),name:'Margem',lineName:'Mínima',fmt:x=>fP(x,1),lbl:x=>fP(x,1),color:'var(--c1)'}))},
 ()=>{const by={};vend().forEach(v=>{const k=v.marca||'Outras';by[k]=(by[k]||0)+lucroV(v)});const l=Object.entries(by).sort((a,b)=>b[1]-a[1]);
   return card('Lucro por marca','De onde vem o dinheiro das vendas.',donut(l.filter(x=>x[1]>0).slice(0,5).map((x,i)=>({n:x[0],v:x[1],c:COR[i]}))))}
],
prolabore:[]};
const SUBT={dashboard:'Lucro, estoque e caixa em gráficos',caixa:'Fluxo e despesas',veiculos:'Resultado dos carros',parceiros:'Desempenho das garagens',clientes:'Quem compra de você',executiva:'Retorno e margem',prolabore:'Aportes e retiradas'};
const draw=()=>document.querySelectorAll('[data-gx]').forEach(el=>{const r=REG[+el.dataset.gx];if(!r)return;const W=Math.max(280,Math.round(el.clientWidth||340));try{el.innerHTML=r[0](r[1],W)}catch(e){console.warn('gráfico',e)}});
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(draw,150)});
window.SMZ_CHARTS={p:{cols,area,donut,hbars,wfall},begin(){REG.length=0},after(tab){
  const v=document.getElementById('view'),L=CARDS[tab];if(!v||!L)return;
  const h=L.map(f=>{try{return f()}catch(e){console.warn('gráfico',tab,e);return''}}).join('');if(!h.trim())return;
  const open=!['veiculos','clientes'].includes(tab);
  const box=`<details class="gx-an" ${open?'open':''}><summary><b>Análises em gráficos</b><span>${SUBT[tab]||''}</span></summary><div class="grid g2" style="margin-top:12px">${h}</div></details>`;
  const k=v.querySelector('.kpis'),f=v.querySelector('.foot-note');
  if(!open&&k)k.insertAdjacentHTML('afterend',box);else if(f)f.insertAdjacentHTML('beforebegin',box);else v.insertAdjacentHTML('beforeend',box);
  draw();
}};
})();
