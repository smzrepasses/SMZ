/* =====================================================================
   SMZ Repasses · RESULTADO DA EMPRESA (módulo de gestão)
   Responde, mês a mês: quanto de lucro entrou de verdade, quanto é de cada sócio,
   quanto precisa ficar no caixa, quais despesas/impostos/custos pesam, quanto capital
   está investido e em risco, e quantos carros saíram, em quanto tempo e com que comissão pendente.

   Não substitui nenhuma regra do sistema: lê veículos, caixa, aportes e retiradas que já
   existem (vehicle*(), caixaSaldo(), patrimonio()...) e acrescenta só o que faltava:
     · state.despesasFixas  [{id, nome, valor, inicio:'AAAA-MM', fim:'AAAA-MM'|'' , pagos:{'AAAA-MM':{em,txId?,manual?}}}]
     · state.gestao         {retencaoPct, impostoPct, impostoBase, impostoDesde, reservaMeses, impPagos:{...}, configurado}
     · veículo: comissaoPaga, aReceber  (ver vehicleComissaoPendente / vehicleAReceber no index.html)
   Lançamentos de despesa fixa e imposto entram no caixa como movimentação manual (sem vehicleId),
   então a auditoria de integridade continua fechando.
   ===================================================================== */
(function(){
'use strict';

/* ---------- utilidades ---------- */
const sum=a=>a.reduce((s,x)=>s+x,0);
const MESL=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const num=(x,d=0)=>{const n=Number(x);return isFinite(n)?n:d};
const R2=n=>Math.round((Number(n)||0)*100)/100;
const fm=n=>{n=R2(n);return (n<0?'−':'')+'R$ '+Math.abs(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})};
const fP=(n,d=1)=>Number(n).toFixed(d).replace('.',',')+'%';
const fK=n=>{const a=Math.abs(n),s=n<0?'−':'';return a>=1e6?s+'R$ '+(a/1e6).toFixed(2).replace('.',',')+' mi':a>=1e4?s+'R$ '+Math.round(a/1e3)+' mil':fm(n)};
const fD=(n,d=1)=>Number(n).toFixed(d).replace('.',',');
const M=t=>`<span class="m">${t}</span>`;
const E=s=>esc(s);
const cap1=s=>s.charAt(0).toUpperCase()+s.slice(1);
const ymOf=d=>String(d||'').slice(0,7);
const isYM=s=>/^\d{4}-(0[1-9]|1[0-2])$/.test(String(s||''));
const ymAdd=(ym,n)=>{const [y,m]=ym.split('-').map(Number);const d=new Date(y,m-1+n,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
const ymLabel=ym=>{const [y,m]=ym.split('-').map(Number);return cap1(MESL[m-1])+' de '+y};
const ymShort=ym=>{const [y,m]=ym.split('-').map(Number);return MESL[m-1].slice(0,3)+'/'+String(y).slice(2)};
const dBR=iso=>{const [y,m,d]=String(iso||'').split('-');return d?`${d}/${m}`:'—'};
const nomeV=v=>`${v.marca||''} ${v.modelo||''}`.trim()||'Veículo';
const MAXMESES=120;

/* ---------- ícones (mesmo traço do visual.js) ---------- */
const P={
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 alert:'<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 edit:'<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="m14 6 3 3"/>',
 car:'<path d="M5 16.5v2M19 16.5v2"/><path d="M3.5 16.5h17v-4l-2-5a1.6 1.6 0 0 0-1.5-1H7a1.6 1.6 0 0 0-1.5 1l-2 5z"/><path d="M3.5 12.5h17"/><circle cx="7.5" cy="14.6" r=".5"/><circle cx="16.5" cy="14.6" r=".5"/>',
 up:'<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>',
 down:'<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5"/>',
 left:'<path d="m14.5 6-6 6 6 6"/>',
 right:'<path d="m9.5 6 6 6-6 6"/>',
 tag:'<path d="M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7z"/><circle cx="8" cy="9" r="1.2"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>',
 shield:'<path d="M12 3.5 5 6v6c0 4.2 3 7.2 7 8.5 4-1.3 7-4.3 7-8.5V6z"/><path d="m9 12 2.2 2.2L15 10.5"/>'
};
const ic=(n,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n]||''}</svg>`;

/* ---------- estado só da interface ---------- */
const G={ym:null,per:1,open:{}};
const mesAtual=()=>ymNow();
const mesSel=()=>{ if(!isYM(G.ym)||G.ym>mesAtual()) G.ym=mesAtual(); return G.ym; };

/* ---------- configuração (valores padrão até o sócio configurar) ---------- */
const CFG_DEF={retencaoPct:30,impostoPct:0,impostoBase:'lucro',reservaMeses:1};
function cfg(){
  const g=(state.gestao&&typeof state.gestao==='object')?state.gestao:{};
  return {
    retencaoPct:Math.min(100,Math.max(0,num(g.retencaoPct,CFG_DEF.retencaoPct))),
    impostoPct:Math.min(100,Math.max(0,num(g.impostoPct,CFG_DEF.impostoPct))),
    impostoBase:g.impostoBase==='receita'?'receita':'lucro',
    impostoDesde:isYM(g.impostoDesde)?g.impostoDesde:'',
    reservaMeses:Math.min(12,Math.max(0,num(g.reservaMeses,CFG_DEF.reservaMeses))),
    controleDesde:isYM(g.controleDesde)?g.controleDesde:'',
    configurado:!!g.configurado
  };
}
function garante(){
  if(!Array.isArray(state.despesasFixas)) state.despesasFixas=[];
  if(!state.gestao||typeof state.gestao!=='object'||Array.isArray(state.gestao)) state.gestao={};
  if(!state.gestao.impPagos||typeof state.gestao.impPagos!=='object') state.gestao.impPagos={};
}

const meuId=()=>null;

/* ---------- classificação dos gastos do carro ----------
   aquisição = o que custa para trazer o carro e regularizá-lo (laudo, transferência, guincho, débitos...)
   venda     = o que custa para vender (anúncio, marketing)
   preparação= o resto (funilaria, pintura, mecânica, pneus, lavagem...)               */
const RX_AQUIS=/laudo|transfer|despach|guincho|remo[cç]|d[eé]bito|ipva|multa|licenci|vistoria|document|cart[oó]rio|taxa/i;
const RX_VENDA=/an[uú]ncio|publicidade|marketing|propaganda|impulsion/i;
function custoTipo(c){
  const cat=String(c.categoria||'');
  if(c.origem==='anuncio'||RX_VENDA.test(cat)) return 'venda';
  if(RX_AQUIS.test(cat)) return 'aquis';
  return 'prep';
}

/* ---------- uma operação (carro vendido) ---------- */
function op(v){
  const rep=isRepasse(v);
  let aq=0,pr=0,vd=0;
  (v.custos||[]).forEach(c=>{const x=num(c.valor);const t=custoTipo(c);if(t==='aquis')aq+=x;else if(t==='venda')vd+=x;else pr+=x;});
  const venda=num(v.valorVendido),compra=num(v.valorCompra);
  const comissao=vehicleComissao(v)||0;
  const lu=vehicleLucroLiquido(v);
  const lucro=lu==null?0:lu;
  const aRec=Math.min(vehicleAReceber(v),Math.max(venda,0));
  const canal=rep?'repasse':((v.canalVenda==='Garagem'||v.parceiroId)?'garagem':'internet');
  const invest=rep?(aq+pr+vd):vehicleTotalInvestido(v);
  return {
    v,id:v.id,nome:nomeV(v),rep,canal,
    dataVenda:v.dataVenda||'',venda,
    receita:rep?venda-compra:venda,        // repasse: o boleto do valor original só passa pela empresa
    custoVeic:rep?0:compra,passa:rep?compra:0,
    aq,pr,vd,comissao,lucro,
    aReceber:aRec,lucroRec:lucro-aRec,
    invest,
    dias:rep?0:num(vehicleDias(v)),
    ciclo:(!rep&&v.dataCompra&&v.dataVenda)?daysBetween(v.dataCompra,v.dataVenda):0,
    comPend:vehicleComissaoPendente(v),
    boletoAberto:(rep&&!v.boletoPago)?compra:0,
    parceiro:vehicleParceiroNome(v)
  };
}
const soldIn=ym=>veiculosVendidos().filter(v=>ymOf(v.dataVenda)===ym);

/* ---------- despesas fixas e impostos ---------- */
function despAtivas(ym){
  return (state.despesasFixas||[]).filter(d=>isYM(d.inicio)&&d.inicio<=ym&&(!isYM(d.fim)||d.fim>=ym));
}
function impostoDe(ops,ym){
  const c=cfg();
  if(!(c.impostoPct>0)) return 0;
  if(c.impostoDesde&&ym<c.impostoDesde) return 0;
  const base=c.impostoBase==='receita'?sum(ops.map(o=>o.receita)):sum(ops.map(o=>o.lucro));
  return R2(Math.max(0,base)*c.impostoPct/100);
}
const despPago=(d,ym)=>!!(d.pagos&&d.pagos[ym]);
const impPago=ym=>!!((state.gestao&&state.gestao.impPagos||{})[ym]);

/* ---------- fechamento de um mês ---------- */
function mes(ym){
  const ops=soldIn(ym).map(op);
  const lucroOps=R2(sum(ops.map(o=>o.lucro)));
  const aRec=R2(sum(ops.map(o=>o.aReceber)));
  const desp=despAtivas(ym);
  const despTotal=R2(sum(desp.map(d=>num(d.valor))));
  const imp=impostoDe(ops,ym);
  return {
    ym,ops,n:ops.length,
    receita:R2(sum(ops.map(o=>o.receita))),
    lucroOps,aRec,recebido:R2(lucroOps-aRec),
    desp,despTotal,imp,
    liquido:R2(lucroOps-despTotal-imp),
    liquidoRec:R2(lucroOps-aRec-despTotal-imp),
    custos:{veic:sum(ops.map(o=>o.custoVeic)),aq:sum(ops.map(o=>o.aq)),pr:sum(ops.map(o=>o.pr)),vd:sum(ops.map(o=>o.vd)),com:sum(ops.map(o=>o.comissao))}
  };
}

function primeiroMes(){
  const now=mesAtual();
  const ms=[now,...veiculosVendidos().map(v=>ymOf(v.dataVenda)).filter(isYM),...(state.despesasFixas||[]).map(d=>d.inicio).filter(isYM)];
  let f=ms.sort()[0];
  const lim=ymAdd(now,-(MAXMESES-1));
  return f<lim?lim:f;
}
/* ---------- obrigações em aberto (despesas fixas e impostos até o mês atual) ---------- */
function obrigacoes(){
  const now=mesAtual(),out=[],lim=ymAdd(now,-(MAXMESES-1));
  (state.despesasFixas||[]).forEach(d=>{
    if(!isYM(d.inicio)) return;
    for(let m=d.inicio<lim?lim:d.inicio;m<=now;m=ymAdd(m,1)){
      if(isYM(d.fim)&&m>d.fim) break;
      if(!despPago(d,m)) out.push({k:'d',id:d.id,ym:m,nome:d.nome,valor:num(d.valor)});
    }
  });
  const c=cfg();
  if(c.impostoPct>0&&c.impostoDesde){
    for(let m=c.impostoDesde<lim?lim:c.impostoDesde;m<=now;m=ymAdd(m,1)){
      const v=impostoDe(soldIn(m).map(op),m);
      if(v>0&&!impPago(m)) out.push({k:'i',id:'imposto',ym:m,nome:'Imposto estimado',valor:v});
    }
  }
  return out;
}

/* ---------- caixa: quanto precisa ficar ---------- */
function caixa(){
  const saldo=caixaSaldo(),aRec=totalAReceber(),real=R2(saldo-aRec);
  const ob=obrigacoes(),obr=R2(sum(ob.map(o=>o.valor)));
  const prev=R2(capitalComprometido()),comP=R2(totalComissoesPendentes());
  const despMes=R2(sum(despAtivas(mesAtual()).map(d=>num(d.valor))));
  const reserva=R2(despMes*cfg().reservaMeses);
  const minimo=R2(obr+prev+comP+reserva);
  return {saldo,aRec,real,obr,nObr:ob.length,prev,comP,despMes,reserva,minimo,folga:R2(real-minimo)};
}

/* ---------- capital investido x em risco ---------- */
function capital(){
  const aportado=R2(num(state.capitalInicial)+totalAportado()),retirado=R2(totalRetirado());
  const ativos=veiculosEstoqueAtivo();
  const prep=R2(sum(ativos.filter(vehicleEmPreparacao).map(vehicleInvestidoRealizado)));
  const venda=R2(sum(ativos.filter(v=>!vehicleEmPreparacao(v)).map(vehicleInvestidoRealizado)));
  const esp=R2(sum(veiculosEspeculacao().map(v=>num(v.sinalValor)+vehicleCustosRealizados(v))));
  const aRec=R2(totalAReceber());
  const estoque=R2(prep+venda+esp);
  const risco=R2(estoque+aRec);
  const caixaReal=R2(caixaSaldo()-aRec);
  const total=Math.max(0,caixaReal)+risco;
  const comP=R2(totalComissoesPendentes());
  const patrLiq=R2(patrimonio()-comP);
  const parados=ativos.map(v=>{
    const prepar=vehicleEmPreparacao(v);
    const dias=prepar?vehicleDiasPreparacao(v):vehicleDias(v);
    const cap=vehicleInvestidoRealizado(v);
    return {v,nome:nomeV(v),cap,dias,prepar,fora:prepar?dias>ALERTA_DIAS_PREP:dias>META_DIAS_ESTOQUE,peso:cap*Math.max(1,dias)};
  }).sort((a,b)=>b.peso-a.peso);
  return {aportado,retirado,prep,venda,esp,aRec,estoque,risco,caixaReal,pctRisco:total>0?risco/total*100:0,
    patrLiq,resultado:R2(patrLiq+retirado-aportado),retorno:aportado>0?(patrLiq+retirado-aportado)/aportado*100:null,parados};
}

/* ---------- o que realmente gera lucro: por tipo de operação ---------- */
const TIPOS=[{k:'repasse',nome:'Repasse'},{k:'internet',nome:'Compra e venda · internet'},{k:'garagem',nome:'Compra e venda · garagem parceira'}];
function porTipo(de,ate){
  const ops=veiculosVendidos().filter(v=>{const y=ymOf(v.dataVenda);return isYM(y)&&y>=de&&y<=ate}).map(op);
  return TIPOS.map(t=>{
    const xs=ops.filter(o=>o.canal===t.k),qtd=xs.length,lucro=R2(sum(xs.map(o=>o.lucro))),inv=sum(xs.map(o=>o.invest));
    const comCap=t.k!=='repasse';
    return {...t,qtd,lucro,porCarro:qtd?lucro/qtd:0,
      retorno:(comCap&&inv>0)?lucro/inv*100:null,
      ciclo:(comCap&&qtd)?sum(xs.map(o=>o.ciclo))/qtd:null,
      porDia:(comCap&&qtd)?lucro/Math.max(1,sum(xs.map(o=>Math.max(1,o.ciclo)))):null,   // lucro por carro por dia
      comissao:sum(xs.map(o=>o.comissao))};
  });
}
const periodoDe=()=>G.per===0?'0000-00':ymAdd(mesSel(),-(G.per-1));

/* ---------- pendências ---------- */
function pendencias(){
  const vs=state.vehicles||[];
  return {
    comPagar:vs.filter(v=>vehicleComissaoPendente(v)>0),
    comVencer:vs.filter(v=>v.status==='Garagem Parceira'&&vehicleComissaoProjetada(v)>0),
    aReceber:vs.filter(v=>vehicleAReceber(v)>0),
    boletos:vs.filter(v=>isRepasse(v)&&v.status==='Vendido'&&!v.boletoPago)
  };
}

/* =====================================================================
   TELA
   ===================================================================== */
const kp=(k,v,d,tone)=>`<div class="kpi"><span class="k">${k}</span><span class="v num ${tone||''}">${v}</span><span class="d">${d||'&nbsp;'}</span></div>`;
const tn=x=>x>0?'pos-t':x<0?'neg-t':'';
const pill=(t,c)=>`<span class="pill ${c||''}" style="height:20px;font-size:11px">${t}</span>`;
const cr=(l,x,c)=>`<div class="cr"><span>${l}</span><b class="num ${c||''}">${x}</b></div>`;
const wf=(l,x,kind,sub)=>`<div class="wf ${kind||''}"><span>${l}${sub?`<small>${sub}</small>`:''}</span><b class="num ${kind==='neg'?'neg-t':''}">${x}</b></div>`;
const stack=items=>{const it=items.filter(i=>i.v>0),t=sum(it.map(i=>i.v));return `<div class="sbar tall" role="img" aria-label="Composição">${t>0?it.map(i=>`<i style="width:${i.v/t*100}%;background:${i.c}"></i>`).join(''):''}</div>`};
const legend=(items,withVal=true)=>`<div class="legend">${items.map(i=>`<span><i style="background:${i.c}"></i>${i.n}${withVal?` <b style="color:var(--tx)">${M(fm(i.v))}</b>`:''}</span>`).join('')}</div>`;
const hint=t=>`<p class="gx-hint">${t}</p>`;
const vinc=(tone,t)=>`<div class="verdict ${tone}"><div>${t}</div></div>`;

/* =====================================================================
   SEÇÕES (cada aba do sistema chama a que faz sentido para ela)
   ===================================================================== */
const CH_=()=>(window.SMZ_CHARTS&&window.SMZ_CHARTS.p)||null;
const ch=(k,...a)=>{const p=CH_();return p?p[k](...a):''};
const mnav=()=>{const ym=mesSel();return `<div class="gx-nav"><button class="iconbtn" data-act="gx-mes" data-n="-1" aria-label="Mês anterior">${ic('left')}</button><div class="gx-mes"><b>${ymLabel(ym)}</b><small>${ym===mesAtual()?'mês em andamento':'mês encerrado'}</small></div><button class="iconbtn" data-act="gx-mes" data-n="1" aria-label="Próximo mês" ${ym>=mesAtual()?'disabled':''}>${ic('right')}</button></div>`};
const nomeMes=ym=>ymLabel(ym).split(' de ')[0].toLowerCase();

/* FINANCEIRO · resultado do mês */
function secResultado(){
  garante();
  const ym=mesSel(),m=mes(ym),mp=mes(ymAdd(ym,-1)),cx=caixa(),c=cfg(),nDesp=(state.despesasFixas||[]).length;
  const kpis=`<div class="kpis">
    ${kp('Lucro das operações',M(fm(m.lucroOps)),`${m.n} carro${m.n===1?'':'s'} vendido${m.n===1?'':'s'}${mp.n||m.n?` · ${m.n-mp.n>=0?'+':'−'}${Math.abs(m.n-mp.n)} que no mês anterior`:''}`,tn(m.lucroOps))}
    ${kp('Lucro já recebido',M(fm(m.recebido)),m.aRec>0?`${M(fm(m.aRec))} ainda a receber`:(m.n?'tudo recebido':'sem vendas no mês'),tn(m.recebido))}
    ${kp('Lucro líquido',M(fm(m.liquidoRec)),'depois de despesas fixas e impostos',tn(m.liquidoRec))}
    ${kp('Caixa livre',M(fm(cx.folga)),cx.folga>=0?`acima do mínimo de ${M(fm(cx.minimo))}`:`faltam para o mínimo de ${M(fm(cx.minimo))}`,tn(cx.folga))}
  </div>`;
  const steps=[{n:'Lucro bruto',v:m.lucroOps,t:'tot'},{n:'Despesas',v:-m.despTotal},{n:'Impostos',v:-m.imp}].concat(m.aRec>0?[{n:'A receber',v:-m.aRec}]:[]).concat([{n:'Líquido',v:m.liquidoRec,t:'tot'}]);
  const neg=m.liquidoRec<=0;
  const wfc=`<section class="card">
    <div class="chead"><div><h2>Do lucro ao líquido</h2><p class="sub">${ymLabel(m.ym)}: o que sobra depois de cada desconto</p></div></div>
    ${(m.despTotal>0||m.imp>0||m.aRec>0)?ch('wfall',{steps}):''}
    <div class="wfl">
      ${wf('Lucro das operações',M(fm(m.lucroOps)),'',`${m.n} carro${m.n===1?'':'s'}, já descontados custos e comissões`)}
      ${wf('Despesas fixas',M('− '+fm(m.despTotal)),'neg',m.desp.length?`${m.desp.length} despesa${m.desp.length===1?'':'s'} no mês`:'nenhuma cadastrada')}
      ${wf('Impostos estimados',M('− '+fm(m.imp)),'neg',c.impostoPct>0?`${fP(c.impostoPct)} sobre o ${c.impostoBase==='receita'?'faturamento':'lucro'}`:'alíquota não configurada')}
      ${m.aRec>0?wf('Ainda não recebido',M('− '+fm(m.aRec)),'neg','venda já no caixa do sistema, dinheiro ainda não entrou'):''}
      ${wf('Lucro líquido recebido',M(fm(m.liquidoRec)),'tot')}
    </div>
    ${neg?vinc('warn',`<b>Sem lucro líquido em ${nomeMes(m.ym)}.</b>As despesas${m.aRec>0?', os impostos e o que ainda falta receber':' e os impostos'} consomem o lucro das operações.`):''}
    ${(!c.configurado||!nDesp)?vinc('warn',`<b>Complete os dados para o líquido ficar certo.</b>${nDesp?'':' Cadastre suas despesas fixas.'}${c.configurado?'':' Configure imposto e reserva em Regras.'} Os dois estão em "Despesas fixas e impostos", mais abaixo.`):''}
  </section>`;
  const ms=[];for(let i=5;i>=0;i--) ms.push(ymAdd(ym,-i));
  const L0=ms.map(mes),L=L0.filter(x=>x.n||x.despTotal||x.imp||x.ym===ym),mx=Math.max(1,...L.map(x=>Math.abs(x.liquidoRec)));
  const hist=`<section class="card">
    <div class="chead"><div><h2>Últimos 6 meses</h2><p class="sub">Só meses com movimento. Toque num mês da lista para abrir os detalhes.</p></div></div>
    ${L.filter(x=>x.lucroOps||x.liquidoRec).length>=2?ch('cols',{labels:L.map(x=>ymShort(x.ym)),vals:L.map(x=>x.liquidoRec),line:L.map(x=>x.lucroOps),lineName:'Lucro bruto',name:'Líquido',color:'var(--pos)',sub:L.map(x=>['Despesas + imposto',fm(x.despTotal+x.imp)])}):''}
    <div class="rows" style="margin-top:8px">${L.slice().reverse().map(x=>`<div class="row" style="cursor:pointer" data-act="gx-mes" data-ym="${x.ym}"><div class="grow"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><span class="t">${ymLabel(x.ym)}${x.ym===ym?' '+pill('aberto','acc'):''}</span><b class="num ${tn(x.liquidoRec)}">${M(fm(x.liquidoRec))}</b></div><div class="meter"><i style="width:${Math.abs(x.liquidoRec)/mx*100}%;background:var(--${x.liquidoRec>=0?'pos':'neg'})"></i></div><div class="s">${x.n} carro${x.n===1?'':'s'} · despesas e impostos ${M(fm(x.despTotal+x.imp))}</div></div></div>`).join('')}</div>
  </section>`;
  return `${mnav()}${kpis}<div class="grid g2" style="margin-top:14px">${wfc}${hist}</div>`;
}

/* FINANCEIRO · quanto precisa ficar no caixa */
function secCaixaMin(){
  const cx=caixa(),c=cfg();
  const items=[{n:'Contas a pagar',v:cx.obr,c:'var(--c2)'},{n:'Custos previstos de carros',v:cx.prev,c:'var(--c4)'},{n:'Comissões a pagar',v:cx.comP,c:'var(--c1)'},{n:'Reserva de segurança',v:cx.reserva,c:'var(--c3)'}];
  const pct=cx.minimo>0?Math.min(100,Math.max(0,cx.real/cx.minimo*100)):100;
  return `<section class="card">
    <div class="chead"><div><h2>Quanto precisa ficar no caixa</h2><p class="sub">Compromissos que o caixa cobre antes de qualquer retirada ou compra</p></div></div>
    <div class="k">Mínimo necessário</div><div class="num gx-big">${M(fm(cx.minimo))}</div>
    ${cx.minimo>0?ch('donut',items,{center:fK(cx.minimo),sub:'mínimo'}):''}
    <div class="k" style="margin:14px 0 6px">Caixa real contra o mínimo</div>
    <div class="meter"><i style="width:${pct}%;background:var(--${cx.folga>=0?'pos':'neg'})"></i></div>
    <div class="rows" style="margin-top:12px">
      <div class="row"><div class="grow"><div class="t">Contas a pagar</div><div class="s">${cx.nObr?`${cx.nObr} item${cx.nObr===1?'':'s'} em aberto (despesas fixas e impostos)`:'nada em aberto'}</div></div><div class="r"><b class="num">${M(fm(cx.obr))}</b></div></div>
      <div class="row"><div class="grow"><div class="t">Custos previstos de carros</div><div class="s">gastos já combinados, ainda não pagos</div></div><div class="r"><b class="num">${M(fm(cx.prev))}</b></div></div>
      <div class="row"><div class="grow"><div class="t">Comissões a pagar</div><div class="s">carros de garagem já vendidos</div></div><div class="r"><b class="num">${M(fm(cx.comP))}</b></div></div>
      <div class="row"><div class="grow"><div class="t">Reserva de segurança</div><div class="s">${fD(c.reservaMeses,c.reservaMeses%1?1:0)} mês${c.reservaMeses===1?'':'es'} de despesas fixas (${M(fm(cx.despMes))}/mês)</div></div><div class="r"><b class="num">${M(fm(cx.reserva))}</b></div></div>
      <div class="row"><div class="grow"><div class="t">Caixa real hoje</div><div class="s">saldo do sistema ${M(fm(cx.saldo))}${cx.aRec>0?` menos ${M(fm(cx.aRec))} ainda não recebidos`:''}</div></div><div class="r"><b class="num">${M(fm(cx.real))}</b></div></div>
    </div>
    ${cx.folga<0?vinc('neg',`<b>Faltam ${M(fm(-cx.folga))} para cobrir os compromissos.</b>Evite novas retiradas e compras até recompor o caixa.`):vinc('pos',`<b>${M(fm(cx.folga))} acima do mínimo.</b>Esse é o teto para retirar ou comprar sem apertar o caixa.`)}
  </section>`;
}

/* FINANCEIRO · despesas fixas e impostos */
function secContas(){
  garante();
  const m=mes(mesSel()),c=cfg(),ym=m.ym,ds=m.desp;
  const st=(pago,k,id)=>pago
    ?`<div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">${pill('pago','pos')}<button class="btn sm ghost" data-act="gx-unpay" data-k="${k}" data-id="${E(id)}" data-ym="${ym}">Desfazer</button></div>`
    :`<div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap"><button class="btn sm" data-act="gx-pay" data-k="${k}" data-id="${E(id)}" data-ym="${ym}">Lançar no caixa</button><button class="btn sm ghost" data-act="gx-paid" data-k="${k}" data-id="${E(id)}" data-ym="${ym}">Já lancei</button></div>`;
  const bars=ds.map(d=>({n:d.nome,v:num(d.valor),c:'var(--c2)',tl:'Por mês'})).concat(m.imp>0?[{n:'Imposto',v:m.imp,c:'var(--c4)',tl:'Estimado'}]:[]);
  return `<section class="card">
    <div class="chead"><div><h2>Despesas fixas e impostos</h2><p class="sub">${ymLabel(ym)}</p></div><div style="display:flex;gap:8px"><button class="btn sm ghost" data-act="gx-cfg">${ic('gear','sm')} Regras</button><button class="btn sm" data-act="gx-desp">${ic('plus','sm')} Despesa</button></div></div>
    <div class="k">Total do mês</div><div class="num gx-big">${M(fm(m.despTotal+m.imp))}</div>
    ${bars.length>1?ch('hbars',bars):''}
    <div class="rows" style="margin-top:8px">
      ${ds.map(d=>`<div class="row"><div class="grow"><div class="t">${E(d.nome)}</div><div class="s">desde ${ymShort(d.inicio)}${isYM(d.fim)?' até '+ymShort(d.fim):''} · <button type="button" class="gx-lnk" data-act="gx-desp" data-id="${E(d.id)}">editar</button></div></div><div class="r"><b class="num">${M(fm(num(d.valor)))}</b>${st(despPago(d,ym),'d',d.id)}</div></div>`).join('')}
      ${ds.length?'':`<div class="empty" style="padding:14px 0">Nenhuma despesa fixa neste mês. Cadastre aluguel, contador, internet, pró-labore fixo...</div>`}
      <div class="row"><div class="grow"><div class="t">Imposto estimado</div><div class="s">${c.impostoPct>0?`${fP(c.impostoPct)} sobre o ${c.impostoBase==='receita'?'faturamento':'lucro das operações'}${c.impostoDesde&&ym<c.impostoDesde?' · conta a partir de '+ymShort(c.impostoDesde):''}`:'<b class="warn-t">alíquota não configurada</b> · toque em Regras'}</div></div><div class="r"><b class="num">${M(fm(m.imp))}</b>${m.imp>0?st(impPago(ym),'i','imposto'):''}</div></div>
    </div>
    ${hint('Estimativa para planejamento. Confirme a alíquota e a base de cálculo com o seu contador.')}
  </section>`;
}

/* PENDÊNCIAS (Financeiro mostra tudo; Parceiros e Clientes mostram a sua parte) */
function secPend(parts,titulo,sub){
  const p=pendencias(),W=parts||['com','rec','bol','venc'];
  const lin=(badge,t,s,r,btn)=>`<div class="row"><div class="badge warn">${ic(badge)}</div><div class="grow"><div class="t">${t}</div><div class="s">${s}</div></div><div class="r"><b class="num">${r}</b>${btn?`<div style="margin-top:6px">${btn}</div>`:''}</div></div>`;
  const b=(a,id,l)=>`<button class="btn sm ghost" data-act="${a}" data-id="${E(id)}">${l}</button>`;
  const h=t=>`<div class="k" style="font-weight:700;color:var(--tx);margin:14px 0 8px">${t}</div>`;
  const tCom=sum(p.comPagar.map(vehicleComissaoPendente)),tRec=sum(p.aReceber.map(vehicleAReceber)),tBol=sum(p.boletos.map(v=>num(v.valorCompra)));
  const tem=(W.includes('com')&&p.comPagar.length)||(W.includes('rec')&&p.aReceber.length)||(W.includes('bol')&&p.boletos.length)||(W.includes('venc')&&p.comVencer.length);
  const ch1=[W.includes('com')&&{n:'Comissões a pagar',v:tCom,c:'var(--c2)'},W.includes('rec')&&{n:'A receber de vendas',v:tRec,c:'var(--c3)'},W.includes('bol')&&{n:'Boletos de repasse',v:tBol,c:'var(--c4)'}].filter(x=>x&&x.v>0);
  return `<section class="card">
    <div class="chead"><div><h2>${titulo||'Pendências'}</h2><p class="sub">${sub||'Dinheiro que você deve ou ainda vai receber'}</p></div></div>
    ${ch1.length?`<div class="kpis" style="grid-template-columns:repeat(${ch1.length},1fr);margin-bottom:6px">${ch1.map(x=>`<div class="kpi"><span class="k">${x.n}</span><span class="v num" style="font-size:17px;color:${x.c}">${M(fK(x.v))}</span></div>`).join('')}</div>`:''}
    ${tem?'':`<div class="empty">Nada pendente.</div>`}
    ${W.includes('com')&&p.comPagar.length?h('Comissões a pagar')+`<div class="rows">${p.comPagar.map(v=>lin('tag',E(nomeV(v)),`${E(vehicleParceiroNome(v)||'garagem parceira')} · vendido em ${dBR(v.dataVenda)}`,M(fm(vehicleComissaoPendente(v))),b('gx-compay',v.id,'Marcar como paga'))).join('')}</div>`:''}
    ${W.includes('rec')&&p.aReceber.length?h('Vendas com valor a receber')+`<div class="rows">${p.aReceber.map(v=>lin('clock',E(nomeV(v)),`vendido em ${dBR(v.dataVenda)}${v.comprador?' para '+E(v.comprador):''}`,M(fm(vehicleAReceber(v))),b('gx-rec',v.id,'Registrar recebimento'))).join('')}</div>`:''}
    ${W.includes('bol')&&p.boletos.length?h('Boletos de repasse em aberto')+`<div class="rows">${p.boletos.map(v=>{const atras=v.boletoVenc&&v.boletoVenc<todayLocal();return lin(atras?'alert':'clock',E(nomeV(v)),`${v.boletoVenc?(atras?'venceu em ':'vence em ')+dBR(v.boletoVenc):'sem vencimento informado'}${atras?' · atrasado':''}`,M(fm(num(v.valorCompra))),`<button class="btn sm ghost" data-act="vboleto" data-id="${E(v.id)}">Marcar boleto pago</button>`)}).join('')}</div>`:''}
    ${W.includes('venc')&&p.comVencer.length?h('Comissões que vencem se vender')+`<div class="rows">${p.comVencer.map(v=>lin('car',E(nomeV(v)),`${E(vehicleParceiroNome(v)||'garagem parceira')} · ainda à venda`,M(fm(vehicleComissaoProjetada(v))),'')).join('')}</div>`:''}
  </section>`;
}

/* VEÍCULOS · para onde foi cada real nas vendas do mês */
function secOps(){
  const ym=mesSel(),m=mes(ym),ops=m.ops.slice().sort((a,b)=>b.lucro-a.lucro);
  const tm=ops.filter(o=>!o.rep),dias=tm.length?sum(tm.map(o=>o.dias))/tm.length:null,ciclo=tm.length?sum(tm.map(o=>o.ciclo))/tm.length:null;
  const tipoPill=o=>o.rep?pill('Repasse','acc'):o.canal==='garagem'?pill('Garagem',''):pill('Internet','');
  const comp=[{n:'Aquisição',v:m.custos.aq,c:'var(--c4)'},{n:'Preparação',v:m.custos.pr,c:'var(--c2)'},{n:'Anúncio e venda',v:m.custos.vd,c:'var(--c3)'},{n:'Comissões',v:m.custos.com,c:'var(--mut)'}];
  const dn=ops.length?ch('donut',comp):'';
  const graf=dn?`<div style="margin:4px 0 10px"><div class="k" style="font-weight:700;color:var(--tx);margin-bottom:8px">Custos além do carro neste mês</div>${dn}</div>`:'';
  return `<section class="card">
    ${mnav()}
    <div class="chead"><div><h2>Vendas de ${nomeMes(ym)}</h2><p class="sub">Toque num carro para ver para onde foi cada real</p></div></div>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
      <div class="kpi"><span class="k">Carros vendidos</span><span class="v num" style="font-size:17px">${m.n}</span></div>
      <div class="kpi"><span class="k">Lucro</span><span class="v num ${tn(m.lucroOps)}" style="font-size:17px">${M(fK(m.lucroOps))}</span></div>
      <div class="kpi"><span class="k">Tempo médio</span><span class="v num ${dias==null?'':dias>META_DIAS_ESTOQUE?'warn-t':'pos-t'}" style="font-size:17px">${dias==null?'—':fD(dias)+' d'}</span></div>
    </div>
    ${graf}
    ${ops.length?`<div class="rows">${ops.map(o=>{
      const open=G.open[o.id],pos=o.lucro>=0;
      const rec=o.aReceber>0?pill(`falta receber ${fm(o.aReceber)}`,'warn'):'';
      const st=[];if(o.comPend>0)st.push(pill('comissão a pagar','warn'));if(o.boletoAberto>0)st.push(pill('boleto em aberto','warn'));
      return `<div class="rowx ${open?'open':''}" data-act="gx-open" data-id="${E(o.id)}"><div class="row nb" style="padding-bottom:0;border-bottom:0"><div class="badge ${pos?'pos':'neg'}">${ic(pos?'up':'down')}</div><div class="grow"><div class="t">${E(o.nome)} ${tipoPill(o)}</div><div class="s">${dBR(o.dataVenda)} · ${o.rep?'repasse no mesmo dia':`vendido em ${o.ciclo} dia${o.ciclo===1?'':'s'}`} ${rec} ${st.join(' ')}</div></div><div class="r"><b class="num ${pos?'pos-t':'neg-t'}">${M(fm(o.lucro))}</b><div class="s">lucro</div></div></div>
      <div class="more">
        ${o.rep?cr('Valor cobrado do cliente',M(fm(o.venda)))+cr('Boleto do valor original (repassado)',M('− '+fm(o.passa)))+cr('Receita da SMZ',M(fm(o.receita)),''):cr('Valor da venda',M(fm(o.venda)))+cr('Custo do veículo',M('− '+fm(o.custoVeic)))}
        ${cr('Custos de aquisição',M('− '+fm(o.aq)))}${cr('Preparação',M('− '+fm(o.pr)))}${cr('Anúncio e venda',M('− '+fm(o.vd)))}${cr('Comissão do parceiro',M('− '+fm(o.comissao))+(o.comPend>0?' (a pagar)':''))}
        ${cr('<b>Lucro da operação</b>',M(fm(o.lucro)),pos?'pos-t':'neg-t')}${cr('Efetivamente recebido',M(fm(o.lucroRec)),o.lucroRec>=0?'':'neg-t')}
        ${o.aReceber>0?`<div style="margin-top:8px"><button class="btn sm ghost" data-act="gx-rec" data-id="${E(o.id)}">Registrar recebimento</button></div>`:''}
        ${o.parceiro&&o.comissao>0?`<div class="s" style="margin-top:6px">Garagem: ${E(o.parceiro)}</div>`:''}
      </div></div>`;}).join('<div class="sep" style="margin:12px 0"></div>')}</div>`:`<div class="empty">Nenhum carro vendido em ${nomeMes(ym)}.</div>`}
    ${hint('Os gastos de cada carro são classificados pela categoria em que foram lançados.')}
  </section>`;
}

/* EXECUTIVA · capital investido e em risco */
function secCapital(){
  const k=capital();
  const items=[{n:'Em preparação',v:k.prep,c:'var(--c2)'},{n:'À venda',v:k.venda,c:'var(--c1)'},{n:'Sinais em especulação',v:k.esp,c:'var(--c4)'},{n:'A receber de vendas',v:k.aRec,c:'var(--c3)'}];
  const tone=k.pctRisco>60?'neg':k.pctRisco>35?'warn':'pos';
  return `<section class="card">
    <div class="chead"><div><h2>Capital investido e em risco</h2><p class="sub">Dinheiro que depende de um carro vender ou de um cliente pagar</p></div></div>
    <div class="rows">
      <div class="row"><div class="grow"><div class="t">Capital colocado na operação</div></div><div class="r"><b class="num">${M(fm(k.aportado))}</b></div></div>
      <div class="row"><div class="grow"><div class="t">Já retirado</div></div><div class="r"><b class="num">${M(fm(k.retirado))}</b></div></div>
      <div class="row"><div class="grow"><div class="t">Resultado acumulado</div><div class="s">patrimônio líquido ${M(fm(k.patrLiq))} + retiradas − capital colocado</div></div><div class="r"><b class="num ${tn(k.resultado)}">${M(fm(k.resultado))}</b>${k.retorno!=null?`<div class="s">${fP(k.retorno)} sobre o capital</div>`:''}</div></div>
    </div>
    <div class="sep" style="margin:14px 0 12px"></div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><div><div class="k">Capital em risco</div><div class="num gx-big">${M(fm(k.risco))}</div></div><div>${pill(fP(k.pctRisco,0)+' do capital total',tone)}</div></div>
    ${k.risco>0?ch('donut',items,{center:fK(k.risco),sub:'em risco'}):''}
    <div class="k" style="margin:16px 0 8px;font-weight:700;color:var(--tx)">Carros que mais prendem capital</div>
    ${k.parados.length?ch('hbars',k.parados.slice(0,6).map(p=>({n:p.nome,v:p.cap,c:p.fora?'var(--warn)':'var(--c1)',tl:'Capital',sub:[p.prepar?'Em preparação há':'À venda há',p.dias+' d'+(p.fora?' · acima do prazo':'')]}))):`<div class="empty">Nenhum carro em estoque.</div>`}
  </section>`;
}

/* EXECUTIVA · o que realmente gera lucro */
function secTipos(){
  const de=periodoDe(),ate=mesSel(),T=porTipo(de,ate),nTot=sum(T.map(t=>t.qtd)),tot=sum(T.map(t=>t.lucro));
  const melhor=T.filter(t=>t.qtd>0).sort((a,b)=>b.lucro-a.lucro)[0];
  const dia=T.filter(t=>t.porDia!=null).sort((a,b)=>b.porDia-a.porDia)[0];
  const seg=(v,l)=>`<button type="button" class="${G.per===v?'on':''}" data-act="gx-per" data-v="${v}">${l}</button>`;
  const mx=Math.max(1,...T.map(t=>Math.abs(t.lucro))),cor={repasse:'var(--c1)',internet:'var(--c3)',garagem:'var(--c4)'};
  const linha=t=>{const s=[`${t.qtd} carro${t.qtd===1?'':'s'}`];if(t.qtd)s.push(`${fm(t.porCarro)} por carro`);
    if(t.k==='repasse'){if(t.qtd)s.push('sem capital próprio');}else if(t.qtd){if(t.retorno!=null)s.push(`retorno ${fP(t.retorno)}`);if(t.ciclo!=null)s.push(`${fD(t.ciclo)} dias até vender`);}
    return `<div class="row"><div class="grow"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><span class="t">${E(t.nome)}</span><b class="num ${tn(t.lucro)}">${M(fm(t.lucro))}</b></div><div class="meter"><i style="width:${t.qtd?Math.max(0,t.lucro)/mx*100:0}%;background:var(--${t.lucro>=0?'pos':'neg'})"></i></div><div class="s">${s.join(' · ')}</div></div></div>`};
  const sub=G.per===0?'Todo o histórico':(G.per===1?`Só ${nomeMes(ate)}`:`Últimos ${G.per} meses, até ${nomeMes(ate)}`);
  return `<section class="card">
    <div class="chead" style="margin-bottom:10px"><div><h2>O que realmente gera lucro</h2><p class="sub">${sub}</p></div></div>
    <div class="seg" style="margin-bottom:14px">${seg(1,'Mês')}${seg(3,'3 meses')}${seg(0,'Tudo')}</div>
    ${nTot?`${ch('donut',T.filter(t=>t.lucro>0).map(t=>({n:t.nome,v:t.lucro,c:cor[t.k]})),{center:fK(tot),sub:'lucro'})}
    ${T.filter(t=>t.qtd).length>=2?`<div class="k" style="margin:14px 0 8px;font-weight:700;color:var(--tx)">Lucro por carro em cada tipo</div>${ch('hbars',T.filter(t=>t.qtd).map(t=>({n:t.nome.replace('Compra e venda · ','C&V · '),v:t.porCarro,c:cor[t.k],f:fm,tl:'Por carro',sub:['Carros',t.qtd]})))}`:''}
    <div class="rows" style="margin-top:8px">${T.map(linha).join('')}</div>`:`<div class="empty">Nenhuma venda no período.</div>`}
    ${melhor?vinc('pos',`<b>${E(melhor.nome)} gerou mais lucro: ${M(fm(melhor.lucro))}${tot>0?` (${fP(melhor.lucro/tot*100,0)} do total)`:''}.</b>${dia?(dia.k!==melhor.k?`Por dia de capital, o melhor foi ${E(dia.nome)}: ${M(fm(dia.porDia))} por carro ao dia.`:`Também é o mais rápido por dia de capital: ${M(fm(dia.porDia))} por carro ao dia.`):'Repasse não usa capital próprio, então fica fora da comparação por dia.'}`):''}
  </section>`;
}

/* PAINEL · alertas vindos das pendências e do caixa mínimo */
function alertas(){
  garante();const a=[],cx=caixa(),p=pendencias();
  if(cx.folga<0)a.push({t:'neg',ic:'alert',h:'Caixa abaixo do mínimo necessário',s:`Faltam ${fm(-cx.folga)} para cobrir contas, custos previstos, comissões e reserva.`});
  const tc=sum(p.comPagar.map(vehicleComissaoPendente));if(tc>0)a.push({t:'warn',ic:'tag',h:`${p.comPagar.length} comissão${p.comPagar.length>1?'ões':''} a pagar`,s:'Garagem parceira já vendeu; falta lançar o pagamento.',r:fm(tc)});
  const tr=sum(p.aReceber.map(vehicleAReceber));if(tr>0)a.push({t:'warn',ic:'clock',h:`${p.aReceber.length} venda${p.aReceber.length>1?'s':''} com valor a receber`,s:'O dinheiro ainda não entrou na conta.',r:fm(tr)});
  const at=p.boletos.filter(v=>v.boletoVenc&&v.boletoVenc<todayLocal());if(at.length)a.push({t:'neg',ic:'alert',h:`${at.length} boleto${at.length>1?'s':''} de repasse atrasado${at.length>1?'s':''}`,s:'Marque como pago quando quitar.',r:fm(sum(at.map(v=>num(v.valorCompra))))});
  if(cx.nObr)a.push({t:'warn',ic:'clock',h:`${cx.nObr} conta${cx.nObr>1?'s':''} fixa${cx.nObr>1?'s':''} em aberto`,s:'Despesas e impostos de meses até agora sem pagamento lançado.',r:fm(cx.obr)});
  return a;
}

/* ----- configuração (imposto e reserva) ----- */
function abrirCfg(){
  garante();
  const c=cfg(),f=document.getElementById('gx-form-cfg');
  f.elements['impostoPct'].value=String(c.impostoPct).replace('.',',');
  f.elements['impostoBase'].value=c.impostoBase;
  f.elements['impostoDesde'].value=c.impostoDesde||mesAtual();
  f.elements['reservaMeses'].value=String(c.reservaMeses).replace('.',',');
  openModalEl('gx-cfg-modal');
}
const pnum=s=>{const n=parseFloat(String(s||'').replace(/\s/g,'').replace('%','').replace(',','.'));return isFinite(n)?n:NaN};
function salvarCfg(ev){
  ev.preventDefault(); garante();
  const f=ev.target,imp=pnum(f.elements['impostoPct'].value),res=pnum(f.elements['reservaMeses'].value),desde=f.elements['impostoDesde'].value;
  if(!(imp>=0&&imp<=100)){showToast('O imposto deve estar entre 0% e 100%');return false;}
  if(!(res>=0&&res<=12)){showToast('A reserva deve estar entre 0 e 12 meses');return false;}
  if(imp>0&&!isYM(desde)){showToast('Informe desde qual mês o imposto conta');return false;}
  Object.assign(state.gestao,{impostoPct:imp,impostoBase:f.elements['impostoBase'].value==='receita'?'receita':'lucro',impostoDesde:imp>0?desde:(isYM(desde)?desde:''),reservaMeses:res,configurado:true});
  closeModalEl('gx-cfg-modal');
  gravar('Regras salvas.');
  return false;
}

/* =====================================================================
   AÇÕES
   ===================================================================== */
const hoje=()=>todayLocal();
const refresh=()=>{ if(typeof render==='function') render(); };
const vById=id=>(state.vehicles||[]).find(x=>x.id===id);

function gravar(okMsg,warn){
  const ok=saveState(); refresh();
  if(ok&&okMsg) showToast(okMsg,warn||'success');
  return ok;
}

function pagarComissao(id){
  const v=vById(id); if(!v||vehicleComissaoPendente(v)<=0) return;
  const val=vehicleComissao(v);
  showConfirm({title:'Marcar comissão como paga',
    message:`Registrar hoje o pagamento de ${fmt(val)} da comissão de ${nomeV(v)} (${vehicleParceiroNome(v)||'garagem parceira'})?\n\nO valor sai do caixa agora.`,
    confirmLabel:'Registrar pagamento',danger:false,
    onConfirm:()=>{
      const x=vById(id); if(!x||x.comissaoPaga!==false) return;
      state.transactions.push({id:uid(),date:hoje(),desc:`Comissão parceiro — ${x.marca} ${x.modelo}`,categoria:'Comissão',tipo:'saida',valor:val,vehicleId:x.id});
      x.comissaoPaga=true; x.comissaoPagaEm=hoje();
      gravar('Comissão paga e lançada no caixa.'+avisoCaixa(),avisoCaixa()?'warn':undefined);
    }});
}

/* ----- recebimento de venda ----- */
function abrirRec(id){
  const v=vById(id); if(!v||vehicleAReceber(v)<=0) return;
  const f=document.getElementById('gx-form-rec');
  f.elements['id'].value=id;
  document.getElementById('gx-rec-info').textContent=`${nomeV(v)} · falta receber ${fmt(vehicleAReceber(v))}`;
  f.elements['valor'].value=toBRL(vehicleAReceber(v));
  openModalEl('gx-rec-modal');
}
function salvarRec(ev){
  ev.preventDefault();
  const f=ev.target,v=vById(f.elements['id'].value); if(!v){closeModalEl('gx-rec-modal');return false;}
  const rec=parseMoney(f.elements['valor'].value);
  if(!(rec>0)){showToast('Informe o valor recebido');return false;}
  const falta=vehicleAReceber(v);
  if(rec>falta+0.004){showToast(`O valor não pode passar do que falta receber (${fmt(falta)}).`);return false;}
  const resto=R2(falta-rec);
  if(resto>0) v.aReceber=resto; else { delete v.aReceber; v.recebidoEm=hoje(); }
  closeModalEl('gx-rec-modal');
  gravar(resto>0?`Recebimento registrado. Ainda faltam ${fmt(resto)}.`:'Venda recebida por completo.');
  return false;
}

/* ----- despesa fixa ----- */
function abrirDesp(id){
  garante();
  const f=document.getElementById('gx-form-desp'); f.reset();
  const d=id?state.despesasFixas.find(x=>x.id===id):null;
  f.elements['id'].value=d?d.id:'';
  document.getElementById('gx-desp-title').textContent=d?'Editar despesa fixa':'Nova despesa fixa';
  f.elements['nome'].value=d?d.nome:'';
  f.elements['valor'].value=d?toBRL(d.valor):'';
  f.elements['inicio'].value=d?d.inicio:mesSel();
  document.getElementById('gx-desp-end').style.display=d&&!isYM(d.fim)?'':'none';
  document.getElementById('gx-desp-del').style.display=d?'':'none';
  openModalEl('gx-desp-modal');
}
function salvarDesp(ev){
  ev.preventDefault(); garante();
  const f=ev.target,nome=String(f.elements['nome'].value||'').trim(),valor=parseMoney(f.elements['valor'].value),inicio=f.elements['inicio'].value,id=f.elements['id'].value;
  if(!nome){showToast('Dê um nome para a despesa');return false;}
  if(!(valor>0)){showToast('Informe o valor mensal');return false;}
  if(!isYM(inicio)){showToast('Informe a partir de qual mês vale');return false;}
  if(id){ const d=state.despesasFixas.find(x=>x.id===id); if(d){d.nome=nome;d.valor=valor;d.inicio=inicio;} }
  else state.despesasFixas.push({id:uid(),nome,valor,inicio,fim:'',pagos:{}});
  closeModalEl('gx-desp-modal');
  gravar(id?'Despesa atualizada.':'Despesa cadastrada.');
  return false;
}
function encerrarDesp(){
  const id=document.getElementById('gx-form-desp').elements['id'].value,d=state.despesasFixas.find(x=>x.id===id); if(!d) return;
  const fim=ymAdd(mesAtual(),-1);
  if(fim<d.inicio){ showToast('Essa despesa começou neste mês. Para tirá-la, use Excluir.'); return; }
  d.fim=fim; closeModalEl('gx-desp-modal');
  gravar(`Despesa encerrada: vale até ${ymShort(fim)}. O histórico não muda.`);
}
function excluirDesp(){
  const id=document.getElementById('gx-form-desp').elements['id'].value,d=state.despesasFixas.find(x=>x.id===id); if(!d) return;
  const n=Object.keys(d.pagos||{}).length;
  closeModalEl('gx-desp-modal');
  showConfirm({title:'Excluir despesa fixa',
    message:`Excluir "${d.nome}"?\n\nEla some de todos os meses.${n?` Os ${n} pagamento${n===1?'':'s'} já lançado${n===1?'':'s'} no caixa continuam lá; apague-os em Financeiro se for o caso.`:''}`,
    confirmLabel:'Excluir',danger:true,
    onConfirm:()=>{ state.despesasFixas=state.despesasFixas.filter(x=>x.id!==id); gravar('Despesa excluída.'); }});
}

/* ----- pagar / marcar / desfazer (despesa fixa e imposto) ----- */
function alvoObrig(k,id,ym){
  garante();
  if(k==='d'){
    const d=state.despesasFixas.find(x=>x.id===id); if(!d) return null;
    if(!d.pagos||typeof d.pagos!=='object') d.pagos={};
    return {nome:d.nome,valor:num(d.valor),cat:'Despesa fixa',key:`desp:${d.id}:${ym}`,get:()=>d.pagos[ym],set:x=>{d.pagos[ym]=x},del:()=>{delete d.pagos[ym]}};
  }
  const g=state.gestao;
  return {nome:'Imposto estimado',valor:impostoDe(soldIn(ym).map(op),ym),cat:'Imposto',key:`imp:${ym}`,get:()=>g.impPagos[ym],set:x=>{g.impPagos[ym]=x},del:()=>{delete g.impPagos[ym]}};
}
function lancarObrig(k,id,ym){
  const a=alvoObrig(k,id,ym); if(!a||!(a.valor>0)||a.get()) return;
  showConfirm({title:'Lançar no caixa',
    message:`Lançar hoje a saída de ${fmt(a.valor)} — ${a.nome} (${ymLabel(ym).toLowerCase()})?\n\nO valor sai do caixa agora.`,
    confirmLabel:'Lançar saída',danger:false,
    onConfirm:()=>{
      const b=alvoObrig(k,id,ym); if(!b||b.get()) return;
      const txId=uid();
      state.transactions.push({id:txId,date:hoje(),desc:`${b.nome} — ${ymShort(ym)}`,categoria:b.cat,tipo:'saida',valor:b.valor,obrigKey:b.key});
      b.set({em:hoje(),txId,valor:b.valor});
      gravar('Saída lançada no caixa.'+avisoCaixa(),avisoCaixa()?'warn':undefined);
    }});
}
function marcarObrig(k,id,ym){
  const a=alvoObrig(k,id,ym); if(!a||a.get()) return;
  showConfirm({title:'Marcar como já lançado',
    message:`Marcar "${a.nome}" de ${ymLabel(ym).toLowerCase()} como pago, sem criar um novo lançamento?\n\nUse quando você já registrou esse pagamento em Financeiro.`,
    confirmLabel:'Marcar como pago',danger:false,
    onConfirm:()=>{ const b=alvoObrig(k,id,ym); if(!b||b.get()) return; b.set({em:hoje(),manual:true,valor:b.valor}); gravar('Marcado como pago.'); }});
}
function desfazerObrig(k,id,ym){
  const a=alvoObrig(k,id,ym); if(!a||!a.get()) return;
  const reg=a.get();
  showConfirm({title:'Desfazer pagamento',
    message:reg.txId?`Desfazer o pagamento de "${a.nome}"?\n\nA saída lançada no caixa será removida e o valor volta ao saldo.`:`Desfazer a marcação de pago de "${a.nome}"?\n\nO lançamento que você fez em Financeiro não é apagado.`,
    confirmLabel:'Desfazer',danger:true,
    onConfirm:()=>{
      const b=alvoObrig(k,id,ym); if(!b||!b.get()) return;
      state.transactions=state.transactions.filter(t=>!(t.obrigKey===b.key||(b.get().txId&&t.id===b.get().txId)));
      b.del(); gravar('Pagamento desfeito.');
    }});
}

/* ----- roteador (chamado pelo visual.js para qualquer data-act="gx-...") ----- */
function act(a,d){
  switch(a){
    case 'gx-mes': { if(d.ym) G.ym=d.ym; else G.ym=ymAdd(mesSel(),Number(d.n)||0); mesSel(); refresh(); break; }
    case 'gx-per': G.per=Number(d.v)||0; refresh(); break;
    case 'gx-open': { G.open[d.id]=!G.open[d.id]; const el=document.querySelector(`.rowx[data-id="${CSS.escape(d.id)}"]`); if(el) el.classList.toggle('open',G.open[d.id]); break; }
    case 'gx-compay': pagarComissao(d.id); break;
    case 'gx-rec': abrirRec(d.id); break;
    case 'gx-desp': abrirDesp(d.id||''); break;
    case 'gx-cfg': abrirCfg(); break;
    case 'gx-pay': lancarObrig(d.k,d.id,d.ym); break;
    case 'gx-paid': marcarObrig(d.k,d.id,d.ym); break;
    case 'gx-unpay': desfazerObrig(d.k,d.id,d.ym); break;
  }
}

/* ----- folhas (modais) ----- */
function instalar(){
  if(document.getElementById('gx-rec-modal')) return;
  const host=document.createElement('div');
  host.innerHTML=`
  <div class="modal-bg" id="gx-rec-modal"><div class="modal"><h3>Registrar recebimento</h3>
    <p id="gx-rec-info" class="sheetnote"></p>
    <form id="gx-form-rec"><input type="hidden" name="id">
      <div class="form-grid"><div style="grid-column:1/-1"><label>Valor recebido agora (R$)</label><input type="text" inputmode="decimal" class="money-input" onblur="formatMoneyOnBlur(event)" name="valor" required></div></div>
      <p class="sheetnote">Isto só atualiza o controle do que falta entrar. O caixa já contou a venda inteira.</p>
      <div class="flex-between" style="margin-top:16px"><button class="btn alt" type="button" data-gx-close="gx-rec-modal">Cancelar</button><button class="btn" type="submit">Registrar</button></div>
    </form></div></div>
  <div class="modal-bg" id="gx-desp-modal"><div class="modal"><h3 id="gx-desp-title">Nova despesa fixa</h3>
    <form id="gx-form-desp"><input type="hidden" name="id">
      <div class="form-grid">
        <div style="grid-column:1/-1"><label>Nome</label><input name="nome" placeholder="Ex: Aluguel do pátio" required maxlength="60"></div>
        <div><label>Valor por mês (R$)</label><input type="text" inputmode="decimal" class="money-input" onblur="formatMoneyOnBlur(event)" name="valor" required placeholder="0,00"></div>
        <div><label>Vale a partir de</label><input type="month" name="inicio" required></div>
      </div>
      <div class="flex-between" style="margin-top:16px"><button class="btn alt" type="button" data-gx-close="gx-desp-modal">Cancelar</button><button class="btn" type="submit">Salvar</button></div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn sm ghost" type="button" id="gx-desp-end" style="flex:1" data-gx-do="end">Encerrar a partir deste mês</button>
        <button class="btn sm ghost" type="button" id="gx-desp-del" style="flex:1" data-gx-do="del">Excluir</button>
      </div>
    </form></div></div>
  <div class="modal-bg" id="gx-cfg-modal"><div class="modal"><h3>Regras: imposto e reserva</h3>
    <form id="gx-form-cfg">
      <div class="vm-sec">Impostos</div>
      <div class="form-grid">
        <div><label>Alíquota estimada (%)</label><input type="text" inputmode="decimal" name="impostoPct" required></div>
        <div><label>Calcular sobre</label><select name="impostoBase"><option value="lucro">Lucro</option><option value="receita">Faturamento</option></select></div>
        <div style="grid-column:1/-1"><label>Conta a partir do mês</label><input type="month" name="impostoDesde"></div>
      </div>
      <p class="sheetnote">Repasse: o faturamento considera só o que a SMZ ganha, não o boleto do valor original. Confirme alíquota e base com o contador.</p>
      <div class="vm-sec">Reserva de segurança</div>
      <div class="form-grid"><div style="grid-column:1/-1"><label>Meses de despesa fixa que ficam guardados no caixa</label><input type="text" inputmode="decimal" name="reservaMeses" required></div></div>
      <div class="flex-between" style="margin-top:16px"><button class="btn alt" type="button" data-gx-close="gx-cfg-modal">Cancelar</button><button class="btn" type="submit">Salvar regras</button></div>
    </form></div></div>`;
  while(host.firstChild) document.body.appendChild(host.firstChild);
  document.getElementById('gx-form-rec').addEventListener('submit',salvarRec);
  document.getElementById('gx-form-desp').addEventListener('submit',salvarDesp);
  document.getElementById('gx-form-cfg').addEventListener('submit',salvarCfg);
  document.addEventListener('click',e=>{
    const c=e.target.closest&&e.target.closest('[data-gx-close]'); if(c){closeModalEl(c.dataset.gxClose);return;}
    const x=e.target.closest&&e.target.closest('[data-gx-do]'); if(x){ if(x.dataset.gxDo==='end') encerrarDesp(); else excluirDesp(); }
  });
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',instalar); else instalar();

window.SMZ_GESTAO={act,alertas,
  sec:{resultado:secResultado,caixaMin:secCaixaMin,contas:secContas,pend:()=>secPend(),
    pendCom:()=>secPend(['com','venc'],'Comissões de parceiros','Comissões já devidas e as que vencem se o carro vender'),
    pendRec:()=>secPend(['rec','bol'],'A receber dos clientes','Vendas com valor pendente e boletos de repasse em aberto'),
    ops:secOps,capital:secCapital,tipos:secTipos},
  calc:{op,mes,caixa,capital,porTipo,pendencias,obrigacoes,custoTipo,cfg,despAtivas,impostoDe,primeiroMes,ymAdd},
  _G:G};
})();
