// front/scripts/relatorios.js
import { getRelatorios } from "../api/apiService.js";

// ----------------- helpers -----------------
function formatarMoedaNumero(valor) {
  return "R$ " + Number(valor).toFixed(2).replace(".", ",");
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
  const clean = texto.toString().replace(/\./g, "").replace(",", ".");
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
    console.warn("Não foi possível carregar do servidor, usando localStorage:", err);
    const local = localStorage.getItem("registros");
    return local ? JSON.parse(local) : [];
  }
}

// ----------------- filtrar (síncrono, recebe lista) -----------------
function filtrarListaPorIntervalo(lista, inicioStr, fimStr) {
  if (!inicioStr && !fimStr) return []; // sem filtro = vazio (comportamento desejado)
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
    const forma = (item.formaPagamento || "").toLowerCase().trim();
    const kwh = (parseFloat(item.kwh) || 0) / 2;
    const refri = parseFloat(item.refrigerante) || 0;

    totalGeral += valor;
    totalKwh += kwh;
    totalBebidas += refri;

    if (forma === "dinheiro") totalDinheiro += valor;
    else if (forma === "pix") totalPix += valor;
    else if (forma === "cartao" || forma === "cartão") totalCartao += valor;

    html += `
      <tr>
        <td>${item.data}</td>
        <td>${item.placa}</td>
        <td>${kwh}</td>
        <td>${formatarMoedaNumero(refri)}</td>
        <td>${formatarMoedaNumero(valor)}</td>
        <td>${item.formaPagamento}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2"><strong>Totais:</strong></td>
          <td>${totalKwh}</td>
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
      <p>⚡ <strong>Energia Total:</strong> ${kwh} kWh</p>
      <p>🥤 <strong>Valor Total em Bebidas:</strong> ${formatarMoedaNumero(bebidas)}</p>
      <p>💰 <strong>Receita Total:</strong> ${formatarMoedaNumero(receita)}</p>
    </div>
  `;
  $("#resumo-consumo").html(html);
}

function renderAnalisePorPeriodos(lista) {
  // cria períodos baseados em hoje
  const agora = new Date();
  const hojeStr = agora.toLocaleDateString("pt-BR");

  const periodos = {
    diario: { inicio: hojeStr, fim: hojeStr },
    semanal: { inicio: toInputDate(addDays(agora, -6)), fim: toInputDate(agora) },
    mensal: { inicio: toInputDate(addMonths(agora, -1)), fim: toInputDate(agora) },
    anual: { inicio: toInputDate(addYears(agora, -1)), fim: toInputDate(agora) }
  };

  let html = `
    <h3>📈 Análise de Consumo por Período</h3>
    <table class="tabela-analise">
      <thead>
        <tr>
          <th>Período</th><th>Energia (kWh)</th><th>Bebidas (R$)</th><th>Receita (R$)</th>
        </tr>
      </thead>
      <tbody>
  `;

  Object.keys(periodos).forEach(chave => {
    const { inicio, fim } = periodos[chave];
    const arr = filtrarListaPorIntervalo(lista, inicio, fim);
    let kwh = 0, bebidas = 0, receita = 0;
    arr.forEach(item => {
      kwh += (parseFloat(item.kwh) || 0) / 2;
      bebidas += parseFloat(item.refrigerante) || 0;
      receita += moedaDesformatar(item.valor);
    });
    html += `
      <tr>
        <td>${chave.charAt(0).toUpperCase() + chave.slice(1)}</td>
        <td>${kwh}</td>
        <td>${formatarMoedaNumero(bebidas)}</td>
        <td>${formatarMoedaNumero(receita)}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  $("#analise-consumo").html(html);
}

// ----------------- util datas -----------------
function toInputDate(d) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
function addDays(d, n) { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }
function addMonths(d, n) { const nd = new Date(d); nd.setMonth(nd.getMonth() + n); return nd; }
function addYears(d, n) { const nd = new Date(d); nd.setFullYear(nd.getFullYear() + n); return nd; }

// ----------------- render geral (async) -----------------
async function renderTudo(inicio, fim) {
  const todos = await carregarDadosDoServidorOuLocal();
  const filtrados = filtrarListaPorIntervalo(todos, inicio, fim);

  if (!inicio || !fim || filtrados.length === 0) {
    $("#relatorio-container").html("<p>Nenhum dado encontrado.</p>");
    $("#analise-consumo").html("");
    $("#resumo-consumo").html("");
    $("#total-geral, #total-especie, #total-pix, #total-cartao").text("R$ 0,00");
    return;
  }

  $("#relatorio-container").html(construirTabela(filtrados));
  renderAnalisePorPeriodos(filtrados);
}

// ----------------- eventos e inicialização -----------------
$(document).ready(function () {
  // cria containers se não existirem
  if (!$("#analise-consumo").length)
    $("<div id='analise-consumo'></div>").insertBefore("#relatorio-container");
  if (!$("#resumo-consumo").length)
    $("<div id='resumo-consumo'></div>").insertAfter("#totais-container");

  // mensagem inicial
  $("#relatorio-container").html(`
    <div class="sem-dados">
      <i>📊</i>
      <p>Nenhum dado encontrado. <br>Selecione um período para gerar o relatório.</p>
    </div>
  `);

  // filtro
  $("#btn-filtrar").on("click", async function () {
    const inicio = $("#data-inicial").val();
    const fim = $("#data-final").val();
    if (!inicio || !fim) {
      alert("⚠ Selecione data inicial e final!");
      return;
    }
    await renderTudo(inicio, fim);
  });

  // filtros rápidos
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
    $("#data-inicial").val('');
    $("#data-final").val('');
    $("#relatorio-container").html("");
    $("#analise-consumo").html("");
    $("#resumo-consumo").html("");
    $("#total-geral, #total-especie, #total-pix, #total-cartao").text("R$ 0,00");
  });
});
