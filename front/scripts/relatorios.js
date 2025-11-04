// front/scripts/relatorios.js
import { getRelatorios } from "../api/apiService.js";

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
    if (err.message.includes("401")) {
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
        `→ ${item.placa || "(sem placa)"} | ${item.data} → ${
          dentro ? "✅ dentro" : "❌ fora"
        }`
      );
    }

    return dentro;
  });

  if (debug) {
    console.log(`📊 Total de registros filtrados: ${filtrados.length}`);
  }

  return filtrados;
}

// ----------------- construir tabela -----------------
function construirTabela(dados) {
  if (!dados || dados.length === 0) return "<p>Nenhum dado encontrado.</p>";

  let html = `
    <table class="table-relatorio">
      <thead>
        <tr>
          <th>Data</th>
          <th>Placa</th>
          <th>Kwh</th>
          <th>Refrigerante</th>
          <th>Valor</th>
          <th>Forma de Pagamento</th>
        </tr>
      </thead>
      <tbody>
  `;

  let totalGeral = 0, totalDinheiro = 0, totalPix = 0, totalCartao = 0;
  let totalKwh = 0, totalBebidas = 0;

  dados.forEach(item => {
    const valor = moedaDesformatar(item.valor);
    const forma = (item.forma_pagamento || "—").trim();
    const formaLower = forma.toLowerCase();
    const kwh = parseFloat(item.kwh) || 0;
    const refri = parseFloat(item.refrigerante) || 0;

    totalGeral += valor;
    totalKwh += kwh;
    totalBebidas += refri;

    if (formaLower === "dinheiro") totalDinheiro += valor;
    else if (formaLower === "pix") totalPix += valor;
    else if (formaLower === "cartao" || formaLower === "cartão") totalCartao += valor;

    html += `
      <tr>
        <td>${formatarDataBR(item.data)}</td>
        <td>${item.placa}</td>
        <td>${kwh.toFixed(2)}</td>
        <td>${formatarMoedaNumero(refri)}</td>
        <td>${formatarMoedaNumero(valor)}</td>
        <td>${forma}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2"><strong>Totais:</strong></td>
          <td>${totalKwh.toFixed(2)}</td>
          <td>${formatarMoedaNumero(totalBebidas)}</td>
          <td>${formatarMoedaNumero(totalGeral)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  `;

  // atualiza totais na UI
  $("#total-geral").text(formatarMoedaNumero(totalGeral));
  $("#total-especie").text(formatarMoedaNumero(totalDinheiro));
  $("#total-pix").text(formatarMoedaNumero(totalPix));
  $("#total-cartao").text(formatarMoedaNumero(totalCartao));

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
async function renderTudo(inicio, fim) {
  $("#relatorio-container").html("<p>🔄 Carregando dados...</p>");
  const todos = await carregarDadosDoServidorOuLocal();
  const filtrados = filtrarListaPorIntervalo(todos, inicio, fim);

  if (!inicio || !fim || filtrados.length === 0) {
    $("#relatorio-container").html("<p>Nenhum dado encontrado.</p>");
    $("#resumo-consumo").html("");
    $("#total-geral, #total-especie, #total-pix, #total-cartao").text("R$ 0,00");
    return;
  }

  $("#relatorio-container").html(construirTabela(filtrados));
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

    // Número de dias no intervalo (mínimo 1)
    const dias = Math.max(1, Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24)) + 1);

    // 🔹 Agora calculamos a média
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
    await renderTudo(inicio, fim);
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
    await renderTudo(toInputDate(inicio), toInputDate(fim));
  });

  $("#btn-limpar").on("click", function () {
    $("#data-inicial, #data-final").val("");
    $("#relatorio-container, #resumo-consumo").html("");
    $("#total-geral, #total-especie, #total-pix, #total-cartao").text("R$ 0,00");
  });

  // 🔄 Atualiza tabela de análise automaticamente ao carregar
  atualizarAnalisePorPeriodo();
});
