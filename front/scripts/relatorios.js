// front/scripts/relatorios.js
import { getRelatorios } from "../api/apiService.js";

// PAGINAÇÃO: controle global
const cardsPorPagina = 5;
let paginaAtual = 1;
let dadosFiltradosGlobais = [];


// ----------------- helpers -----------------
function formatarMoedaNumero(valor) {
  const numero = parseFloat(valor) || 0;
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataBR(dataStr) {
  if (!dataStr) return "—";
  const data = new Date(dataStr);
  if (isNaN(data)) return "—";
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// ----------------- PARSE DE DATA ROBUSTO -----------------
function parseDataParaDate(dataStr) {
  if (!dataStr) return null;
  const str = dataStr.toString().trim();

  // Caso venha no formato ISO (ex: 2025-11-03T00:00:00Z)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [a, m, d] = str.substring(0, 10).split("-");
    return new Date(a, m - 1, d);
  }

  // Caso venha no formato brasileiro (ex: 03/11/2025)
  if (str.includes("/")) {
    const [d, m, a] = str.split("/");
    return new Date(a, m - 1, d);
  }

  // Caso já seja Date
  if (str instanceof Date) return str;

  return null;
}

function moedaDesformatar(texto) {
  if (!texto) return 0;
  if (typeof texto === "number") return texto;
  const clean = texto.toString().replace(/[R$\s\.]/g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

// ----------------- load data with fallback -----------------
async function carregarDadosDoServidorOuLocal() {
  try {
    const dados = await getRelatorios();
    if (Array.isArray(dados)) return dados;
    return [];
  } catch (err) {
    console.warn("Não foi possível carregar do servidor:", err);

    // se token expirou → redireciona
    if (err && err.message && err.message.includes && err.message.includes("401")) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return [];
    }

    const local = localStorage.getItem("registros");
    return local ? JSON.parse(local) : [];
  }
}

// ----------------- FILTRO COM DEBUG -----------------
function filtrarListaPorIntervalo(lista, inicioStr, fimStr, debug = true) {
  if (!inicioStr && !fimStr) {
    if (debug) console.log("⚠ Nenhum intervalo aplicado — retornando lista completa.");
    return lista;
  }

  const inicio = parseDataParaDate(inicioStr);
  const fim = parseDataParaDate(fimStr);

  if (inicio) inicio.setHours(0, 0, 0, 0);
  if (fim) fim.setHours(23, 59, 59, 999);

  if (debug) {
    console.log("🗓️ Intervalo selecionado:");
    console.log("  Início:", inicio ? inicio.toLocaleDateString("pt-BR") : "(sem)");
    console.log("  Fim:", fim ? fim.toLocaleDateString("pt-BR") : "(sem)");
  }

  const filtrados = lista.filter(item => {
    const dataItem = parseDataParaDate(item.data);
    if (!dataItem) return false;

    const dentro =
      (!inicio || dataItem >= inicio) && (!fim || dataItem <= fim);

    if (debug) {
      console.log(
        `→ ${item.placa || "(sem placa)"} | ${item.data} → ${dentro ? "✅ dentro" : "❌ fora"}`
      );
    }

    return dentro;
  });

  if (debug) {
    console.log(`📊 Total de registros filtrados: ${filtrados.length}`);
  }

  return filtrados;
}

// ----------------- construir CARDS (com paginação) -----------------
// ----------------- construir CARDS (corrigido: totais globais + paginação) -----------------
function construirCards(dados, pagina = 1) {
  if (!dados || dados.length === 0) return "<p>Nenhum dado encontrado.</p>";

  // calculo de totais a partir do conjunto completo (dados)
  let totalGeral = 0, totalDinheiro = 0, totalPix = 0, totalCartao = 0;
  let totalKwh = 0, totalBebidas = 0;

  dados.forEach(item => {
    const valorNum = moedaDesformatar(item.valor);
    const formaRaw = (item.forma_pagamento || item.formaPagamento || "").toString().trim().toLowerCase();
    const kwh = parseFloat(item.kwh) || 0;
    const refri = moedaDesformatar(item.refrigerante || item.refrigerante_valor || 0);

    totalGeral += valorNum;
    totalKwh += kwh;
    totalBebidas += refri;

    if (formaRaw === "dinheiro") totalDinheiro += valorNum;
    else if (formaRaw === "pix") totalPix += valorNum;
    else if (formaRaw === "cartao" || formaRaw === "cartão") totalCartao += valorNum;
  });

  // fatia de dados para a página atual
  const inicioIdx = (pagina - 1) * cardsPorPagina;
  const fimIdx = inicioIdx + cardsPorPagina;
  const paginaDados = dados.slice(inicioIdx, fimIdx);

  // montar html dos cards
  let html = `<div class="cards-container">`;

  paginaDados.forEach(item => {
    const valorNum = moedaDesformatar(item.valor);
    const formaRaw = (item.forma_pagamento || item.formaPagamento || "—").toString();
    const forma = formaRaw.trim().toLowerCase();
    const kwh = parseFloat(item.kwh) || 0;
    const refri = moedaDesformatar(item.refrigerante || item.refrigerante_valor || 0);

    let icone = "🧾";
    if (forma === "pix") icone = "⚡";
    else if (forma === "dinheiro") icone = "💵";
    else if (forma === "cartao" || forma === "cartão") icone = "💳";

    html += `
      <div class="card-registro" data-pagamento="${forma}">
        <div class="card-header">
          <div class="icone">${icone}</div>
          <h3>Relatório de Consumo</h3>
        </div>
        <div class="card-body">
          <p><span>Data</span><span>${formatarDataBR(item.data)}</span></p>
          <p><span>Placa</span><span>${item.placa || "—"}</span></p>
          <p><span>Kwh</span><span>${kwh.toFixed(2)}</span></p>
          <p><span>Refrigerante</span><span>${formatarMoedaNumero(refri)}</span></p>
          <p class="valor"><span>Valor</span><span>${formatarMoedaNumero(valorNum)}</span></p>
          <span class="forma-pagamento">${formaRaw}</span>
        </div>
      </div>
    `;
  });

  html += `</div>`;

  // PAGINAÇÃO
  const totalPaginas = Math.ceil(dados.length / cardsPorPagina);
  if (totalPaginas > 1) {
    html += `
      <div class="paginacao" style="display:flex;gap:12px;align-items:center;justify-content:center;margin-top:18px;">
        <button id="btn-prev" ${pagina === 1 ? "disabled" : ""}>Anterior</button>
        <span> Página ${pagina} de ${totalPaginas} </span>
        <button id="btn-next" ${pagina === totalPaginas ? "disabled" : ""}>Próximo</button>
      </div>
    `;
  }

  // atualizar totais na UI com os valores globais corretos (do conjunto filtrado)
  $("#total-geral").text(formatarMoedaNumero(totalGeral));
  $("#total-especie").text(formatarMoedaNumero(totalDinheiro));
  $("#total-pix").text(formatarMoedaNumero(totalPix));
  $("#total-cartao").text(formatarMoedaNumero(totalCartao));

  // atualiza resumo com totais globais
  renderResumo(totalKwh, totalBebidas, totalGeral);

  return html;
}



// ----------------- resumo e analise -----------------
function renderResumo(kwh, bebidas, receita) {
  const html = `
    <div class="resumo-container">
      <h3>📊 Resumo do Consumo</h3>
      <p>⚡ <strong>Energia Total:</strong> ${kwh.toFixed(2)} kWh</p>
      <p>🥤 <strong>Valor Total em Bebidas:</strong> ${formatarMoedaNumero(bebidas)}</p>
      <p>💰 <strong>Receita Total:</strong> ${formatarMoedaNumero(receita)}</p>
    </div>
  `;
  $("#resumo-consumo").html(html);
}

// ----------------- relatório do período (novo) -----------------
// ----------------- relatório do período (simplificado) -----------------
function renderRelatorioPeriodo(inicioStr, fimStr, dados) {
  const inicioTxt = inicioStr ? formatarDataBR(inicioStr) : "—";
  const fimTxt = fimStr ? formatarDataBR(fimStr) : "—";
  const totalRegistros = Array.isArray(dados) ? dados.length : 0;

  return `
    <br><div id="relatorio-periodo" style="background:#fff;border-radius:10px;padding:12px 16px;margin-bottom:14px;box-shadow:0 6px 18px rgba(0,0,0,0.04);">
      <strong>Relatório do Período</strong>
      <p style="margin:.25rem 0 0;color:#374151">
        Entre <strong>${inicioTxt}</strong> e <strong>${fimTxt}</strong> foram encontrados <strong>${totalRegistros}</strong> registros.
      </p>
    </div>
  `;
}



// ----------------- util datas -----------------
function toInputDate(d) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }
function addMonths(d, n) { const nd = new Date(d); nd.setMonth(nd.getMonth() + n); return nd; }
function addYears(d, n) { const nd = new Date(d); nd.setFullYear(nd.getFullYear() + n); return nd; }

// ----------------- render geral (async) -----------------
async function renderTudo(inicio, fim, pagina = 1) {
  $("#relatorio-container").html("<p>🔄 Carregando dados...</p>");
  const todos = await carregarDadosDoServidorOuLocal();
  const filtrados = filtrarListaPorIntervalo(todos, inicio, fim);

  // guarda globalmente para navegação de páginas
  dadosFiltradosGlobais = filtrados;
  paginaAtual = pagina;

  if (!inicio || !fim || filtrados.length === 0) {
    $("#relatorio-container").html(`
      <div class="sem-dados">
        <i>📊</i>
        <p>Nenhum dado encontrado. <br>Selecione um período para gerar o relatório.</p>
      </div>
    `);
    $("#resumo-consumo").html("");
    $("#total-geral, #total-especie, #total-pix, #total-cartao").text("R$ 0,00");
    return;
  }

    // primeiro monta o resumo de período (novo) e depois os cards
    const relPeriodoHtml = renderRelatorioPeriodo(inicio, fim, filtrados);
    $("#relatorio-container").html(relPeriodoHtml + construirCards(filtrados));
  

  // eventos da paginação (reescrever sempre que renderiza para garantir binding)
  $("#btn-prev").off("click").on("click", () => {
    if (paginaAtual > 1) renderTudo(inicio, fim, paginaAtual - 1);
  });
  $("#btn-next").off("click").on("click", () => {
    const totalPaginas = Math.ceil(filtrados.length / cardsPorPagina);
    if (paginaAtual < totalPaginas) renderTudo(inicio, fim, paginaAtual + 1);
  });
}


// ----------------- análise por período -----------------
async function atualizarAnalisePorPeriodo() {
  const todos = await carregarDadosDoServidorOuLocal();
  if (!todos || todos.length === 0) {
    $("#tabela-analise td[id]").text("R$ 0,00");
    $("#tabela-analise td[id$='kwh']").text("0");
    return;
  }

  const hoje = new Date();
  const periodos = {
    diario: { inicio: addDays(hoje, -0), fim: hoje },
    semanal: { inicio: addDays(hoje, -6), fim: hoje },
    mensal: { inicio: addMonths(hoje, -1), fim: hoje },
    anual: { inicio: addYears(hoje, -1), fim: hoje },
  };

  Object.entries(periodos).forEach(([nome, { inicio, fim }]) => {
    const filtrados = filtrarListaPorIntervalo(todos, toInputDate(inicio), toInputDate(fim), false);

    let totalKwh = 0, totalBebidas = 0, totalReceita = 0;
    filtrados.forEach(item => {
      totalKwh += parseFloat(item.kwh) || 0;
      totalBebidas += moedaDesformatar(item.refrigerante);
      totalReceita += moedaDesformatar(item.valor);
    });

    const dias = Math.max(1, Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)) + 1);
    const mediaKwh = totalKwh / dias;
    const mediaBebidas = totalBebidas / dias;
    const mediaReceita = totalReceita / dias;

    $(`#analise-${nome}-kwh`).text(mediaKwh.toFixed(2));
    $(`#analise-${nome}-bebidas`).text(formatarMoedaNumero(mediaBebidas));
    $(`#analise-${nome}-receita`).text(formatarMoedaNumero(mediaReceita));
  });
}

// ----------------- eventos e inicialização -----------------
$(document).ready(function () {
  // mensagem inicial
  $("#relatorio-container").html(`
    <div class="sem-dados">
      <i>📊</i>
      <p>Nenhum dado encontrado. <br>Selecione um período para gerar o relatório.</p>
    </div>
  `);

  $("#btn-filtrar").on("click", async function () {
    const inicio = $("#data-inicial").val();
    const fim = $("#data-final").val();
    if (!inicio || !fim) {
      alert("⚠ Selecione data inicial e final!");
      return;
    }

await renderTudo(inicio, fim, 1);

  });

  $(".filtro-rapido").on("click", async function () {
    const periodo = $(this).data("periodo");
    const hoje = new Date();
    let inicio, fim = hoje;

    if (periodo === "diario") inicio = hoje;
    else if (periodo === "semanal") inicio = addDays(hoje, -6);
    else if (periodo === "mensal") inicio = addMonths(hoje, -1);
    else if (periodo === "anual") inicio = addYears(hoje, -1);

    $("#data-inicial").val(toInputDate(inicio));
    $("#data-final").val(toInputDate(fim));
    await renderTudo(toInputDate(inicio), toInputDate(fim), 1);
  });

  $("#btn-limpar").on("click", function () {
    $("#data-inicial, #data-final").val("");
    $("#relatorio-container, #resumo-consumo").html("");
    $("#total-geral, #total-especie, #total-pix, #total-cartao").text("R$ 0,00");
  });

  atualizarAnalisePorPeriodo();
});
