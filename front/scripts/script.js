import { getRelatorios, addRelatorio } from "../service/apiService.js";
import { checkAuth } from "./authCheck.js";
checkAuth();


let array = [];

/* =======================
   Util — Escape HTML
   ======================= */
function escapeHTML(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* =======================
   📅 Funções de data
   ======================= */
function getDataHojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarData(dataISO) {
  if (!dataISO) return "-";
  // Lida com '2025-11-04T...' ou '2025-11-04' já no front
  if (dataISO.includes("T")) {
    const date = new Date(dataISO);
    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
  if (dataISO.includes("-")) {
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  return dataISO;
}

/* =======================
   💰 Formatação de moeda
   ======================= */
const moeda = {
  formatar(valor) {
    if (valor === undefined || valor === null) valor = 0;
    if (typeof valor === "string") {
      // tenta desformatar se for string
      valor = this.desformatar(valor);
    }
    if (isNaN(valor)) valor = 0;
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },
  desformatar(texto) {
    if (texto === undefined || texto === null) return 0;
    if (typeof texto === "number") return texto;
    const clean = texto.toString().replace(/\./g, "").replace(",", ".");
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  },
};

/* =======================
   💾 LocalStorage helpers
   ======================= */
function salvarArrayNoLocalStorage() {
  localStorage.setItem("registros", JSON.stringify(array));
}

function carregarArrayDoLocalStorage() {
  const data = localStorage.getItem("registros");
  array = data ? JSON.parse(data) : [];
}

/* =======================
   🧾 Renderizar tabela (fallback)
   ======================= */
function renderizarTabela() {
  const tbody = $("#table tbody");
  if (!tbody.length) return; // tabela inexistente -> ignora

  tbody.empty();

  if (!array.length) {
    tbody.append("<tr><td colspan='6' class='text-center py-4 text-muted'>Nenhum registro de hoje.</td></tr>");
    return;
  }

  array.forEach((item) => {
    const dataFormatada = escapeHTML(formatarData(item.data));
    const placa = escapeHTML(item.placa || "-");
    const kwhFmt = moeda.formatar(item.kwh);
    const ref = item.refrigerante
      ? (isNaN(item.refrigerante) ? escapeHTML(String(item.refrigerante)) : moeda.formatar(item.refrigerante))
      : "0,00";
    const valorFmt = `R$ ${moeda.formatar(item.valor)}`;
    const formaPagRaw = item.forma_pagamento || item.formaPagamento || "-";
    const formaPag = escapeHTML(formaPagRaw.charAt ? (formaPagRaw.charAt(0).toUpperCase() + formaPagRaw.slice(1)) : formaPagRaw);

    const linha = `
      <tr class="linha-tabela">
        <td>${dataFormatada}</td>
        <td>${placa}</td>
        <td>${kwhFmt}</td>
        <td>${ref}</td>
        <td>${valorFmt}</td>
        <td>${formaPag}</td>
      </tr>
    `;
    tbody.append(linha);
  });

  // animação sutil (usando CSS transform via JS)
  $(".linha-tabela").css({ opacity: 0, transform: "translateY(8px)" }).each(function (i) {
    $(this).delay(i * 60).animate({ opacity: 1, top: 0 }, 200);
    // depois reset transform (para não afetar hover)
    setTimeout(() => $(this).css({ transform: "" }), i * 60 + 220);
  });
}

/* =======================
   🧾 Renderizar Cards (PRINCIPAL)
   ======================= */
function renderizarCards() {
  const container = $("#cards-container");
  // se não existir container (por versão antiga), ignora silenciosamente
  if (!container.length) return;

  container.empty();

  if (!array.length) {
    container.append("<div class='cards-empty text-center w-100 py-4 text-muted'>Nenhum registro de hoje.</div>");
    return;
  }

  // pegamos os últimos 5 registros (mais recentes)
  const ultimos = array.slice(-5).reverse();

  ultimos.forEach((item, i) => {
    const dataFmt = escapeHTML(formatarData(item.data));
    const placa = escapeHTML(item.placa || "-");
    const kwhFmt = moeda.formatar(item.kwh);
    const refrigeranteFmt = moeda.formatar(item.refrigerante || 0);
    const valorFmt = `R$ ${moeda.formatar(item.valor)}`;
    const formaPag = escapeHTML(item.forma_pagamento || item.formaPagamento || "-");

    // estrutura do card — mantém dados simples e legíveis
    const card = $(`
      <article class="card-registro" role="article" aria-label="Registro ${placa}">
        <div class="card-registro-top d-flex justify-content-between align-items-start">
          <div class="data">${dataFmt}</div>
          <div class="placa chip">${placa}</div>
        </div>

        <div class="card-registro-body mt-2">
          <div class="kwh"><strong>⚡ KWh:</strong> ${kwhFmt}</div>
          <div class="refrigerante"><strong>🥤 Refrigerante:</strong> ${refrigeranteFmt}</div>
        </div>

        <div class="card-registro-footer mt-2 d-flex justify-content-between align-items-center">
          <div class="valor">${valorFmt}</div>
          <div class="forma-pagamento">${formaPag}</div>
        </div>
      </article>
    `);

    // delay da animação via style inline (controlado pelo CSS)
    card.css("animation-delay", `${i * 80}ms`);
    container.append(card);
  });
}

/* =======================
   💰 Atualizar saldo
   ======================= */
function atualizarSaldo() {
  const total = array.reduce((acc, item) => acc + moeda.desformatar(item.valor), 0);
  const texto = `R$ ${moeda.formatar(total)}`;
  $("#pSaldo").text(texto);
  const saldoMobile = $("#saldoMobile");
  if (saldoMobile.length) saldoMobile.text(texto);
}

/* =======================
   ⚙️ Carregar registros (inicial e refresh)
   ======================= */
async function carregarArray() {
  try {
    const dados = await getRelatorios();
    // espera que getRelatorios retorne array; caso contrário, fallback
    array = Array.isArray(dados) ? dados : [];
  } catch (err) {
    // fallback local
    carregarArrayDoLocalStorage();
  }

  // filtra apenas os registros do dia atual
  const hoje = getDataHojeISO();
  array = array.filter(item => {
    const data = (item.data || "").split("T")[0];
    return data === hoje;
  });

  // Atualiza tela: tanto a tabela (se existir) quanto os cards
  renderizarTabela();
  renderizarCards();
  atualizarSaldo();
}

/* =======================
   ⚙️ Lógica da interface / Eventos
   ======================= */
$(document).ready(function () {
  const modal = $("#modal-adicionar");
  const body = $("body");
  const menu = $("#menu-lateral");
  const btnMenu = $("#btn-menu");

  /* --- Atualizar data do formulário --- */
  function atualizarData() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const ano = hoje.getFullYear();
    $("#data").val(`${dia}/${mes}/${ano}`);
  }

  /* --- Abrir modal (captura variantes de id) --- */
  $(document).on("click", "#bnt-adicionar-fila, #btn-adicionar-fila, #btn-adicionar-fila-alt", function () {
    atualizarData();
    modal.addClass("mostrar");
    body.css("overflow", "hidden");
    // reset pequenos campos
    $("#kwh, #txt_consumo, #valor").val("");
  });

  function fecharModal() {
    modal.removeClass("mostrar");
    body.css("overflow", "");
  }

  // botões de fechar / cancelar
  $(document).on("click", "#btn-fechar-modal, #btn-cancelar", fecharModal);

  // limpar e fechar no cancelar
  $(document).on("click", "#btn-cancelar", function () {
    $("#kwh, #txt_consumo, #placa, #relf, #valor, #formaPagamento").val("");
    fecharModal();
  });

  // fechar ao clicar no backdrop
  $(window).on("click", function (e) {
    if ($(e.target).is("#modal-adicionar")) fecharModal();
  });

  // fechar com ESC
  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && modal.is(":visible")) fecharModal();
  });

  /* --- Cálculo automático de valor --- */
  $(document).on("blur", "#kwh, #txt_consumo", function () {
    const kwhNum = moeda.desformatar($("#kwh").val()) || 0;
    const consumoNum = moeda.desformatar($("#txt_consumo").val()) || 0;
    $("#kwh").val(moeda.formatar(kwhNum));
    $("#txt_consumo").val(moeda.formatar(consumoNum));
    $("#valor").val(moeda.formatar(kwhNum * 2 + consumoNum));
  });

  // mostrar campo de consumo se refrigerante = SIM
  $(document).on("change", "#relf", function () {
    const val = $("#relf").val()?.toString().toUpperCase() || "";
    if (val === "SIM") $("#txt_valorRefrigerante").fadeIn(200);
    else {
      $("#txt_valorRefrigerante").fadeOut(200);
      $("#txt_consumo").val("");
    }
  });

  /* --- Envio de registro --- */
  $(document).on("click", "#enviar", async function (e) {
    e.preventDefault();

    const data = $("#data").val();
    const placa = $("#placa").val();
    const kwhNum = moeda.desformatar($("#kwh").val());
    const consumoNum = moeda.desformatar($("#txt_consumo").val());
    const formaPagamento = $("#formaPagamento").val();
    const valorTotal = kwhNum * 2 + consumoNum;

    if (!placa || kwhNum <= 0 || valorTotal <= 0 || !formaPagamento) {
      // UX: manter alert por enquanto, mas pode trocar por toast
      alert("⚠️ Preencha todos os campos obrigatórios!");
      return;
    }

    const [dia, mes, ano] = data.split("/");
    const dataFormatada = `${ano}-${mes}-${dia}`;

    const novo = {
      data: dataFormatada,
      placa,
      kwh: parseFloat(kwhNum.toFixed(2)),
      refrigerante: parseFloat(consumoNum.toFixed(2)) || 0,
      valor: parseFloat(valorTotal.toFixed(2)),
      forma_pagamento: formaPagamento,
    };

    try {
      await addRelatorio(novo);
      // Recarrega do backend para manter fonte da verdade
      await carregarArray();
    } catch (err) {
      console.warn("Falha ao enviar para o backend, salvando localmente.", err);
      // salva localmente como fallback
      array.push(novo);
      salvarArrayNoLocalStorage();
      carregarArray();
    }

    fecharModal();
    // limpa campos do form
    $("#placa, #kwh, #valor, #relf, #txt_consumo, #formaPagamento").val("");
    atualizarData();
  });

  /* --- Menu responsivo --- */
  btnMenu.on("click", function () {
    menu.toggleClass("aberto");
    body.toggleClass("menu-aberto");

    if (menu.hasClass("aberto")) {
      menu.css("box-shadow", "2px 0 12px rgba(0,0,0,0.2)");
    } else {
      setTimeout(() => menu.css("box-shadow", ""), 300);
    }
  });

  // fecha menu ao clicar fora (mobile)
  $(window).on("click", function (e) {
    if (!$(e.target).closest("#menu-lateral, #btn-menu").length) {
      menu.removeClass("aberto");
      body.removeClass("menu-aberto");
    }
  });

  /* --- Inicialização --- */
  atualizarData();
  carregarArray();
});
