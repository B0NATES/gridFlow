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

function parseDataParaDate(dataStr) {
  if (!dataStr) return null;
  if (dataStr.includes("/")) {
    const [d, m, a] = dataStr.split("/");
    return new Date(a, m - 1, d);
  } else if (dataStr.includes("-")) {
    const [a, m, d] = dataStr.split("-");
    return new Date(a, m - 1, d);
  }
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

// ----------------- filtrar (síncrono, recebe lista) -----------------
function filtrarListaPorIntervalo(lista, inicioStr, fimStr) {
  if (!inicioStr && !fimStr) return [];
  const inicio = parseDataParaDate(inicioStr);
  const fim = parseDataParaDate(fimStr);
  if (inicio) inicio.setHours(0, 0, 0, 0);
  if (fim) fim.setHours(23, 59, 59, 999);

  return lista.filter(item => {
    const dataItem = parseDataParaDate(item.data);
    if (!dataItem) return false;
    dataItem.setHours(12, 0, 0, 0);
    if (inicio && dataItem < inicio) return false;
    if (fim && dataItem > fim) return false;
    return true;
  });
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
});
