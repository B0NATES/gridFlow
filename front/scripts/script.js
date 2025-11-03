import { getRelatorios, addRelatorio } from "../api/apiService.js";

let array = [];

// =======================
// 📦 Funções principais
// =======================
async function carregarArray() {
  try {
    array = await getRelatorios();
  } catch {
    carregarArrayDoLocalStorage(); // usa o localStorage se o back estiver off
  }
  renderizarTabela();
  atualizarSaldo();
}

async function adicionarRegistro(novoItem) {
  try {
    await addRelatorio(novoItem);
    array = await getRelatorios();
  } catch (err) {
    console.warn("⚠️ Falha ao enviar para o servidor, salvando localmente.");
    array.push(novoItem);
    salvarArrayNoLocalStorage();
  }
  renderizarTabela();
  atualizarSaldo();
}

// =======================
// 💰 Formatação de moeda
// =======================
const moeda = {
  formatar(valor) {
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

// =======================
// 💾 LocalStorage helpers
// =======================
function salvarArrayNoLocalStorage() {
  localStorage.setItem("registros", JSON.stringify(array));
}

function carregarArrayDoLocalStorage() {
  const data = localStorage.getItem("registros");
  array = data ? JSON.parse(data) : [];
}

// =======================
// 🗓️ Função de formatação de data
// =======================
function formatarData(dataISO) {
  if (!dataISO) return "-";

  // Se vier em formato ISO com 'T'
  if (dataISO.includes("T")) {
    const date = new Date(dataISO);
    const dia = String(date.getDate()).padStart(2, "0");
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  // Se vier no formato "YYYY-MM-DD"
  if (dataISO.includes("-")) {
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  return dataISO;
}

// =======================
// 🧾 Renderizar tabela
// =======================
function renderizarTabela() {
  const tbody = $("#table tbody");
  tbody.empty();

  array.forEach((item) => {
    const dataFormatada = formatarData(item.data);

    const formaPag = item.forma_pagamento || item.formaPagamento || "-";
    const ref = item.refrigerante
      ? (isNaN(item.refrigerante)
          ? item.refrigerante
          : moeda.formatar(item.refrigerante))
      : "0,00";

    const valorFmt = `R$ ${moeda.formatar(item.valor)}`;

    const linha = `
      <tr>
        <td>${dataFormatada}</td>
        <td>${item.placa || "-"}</td>
        <td>${moeda.formatar(item.kwh)}</td>
        <td>${ref}</td>
        <td>${valorFmt}</td>
        <td>${formaPag.charAt(0).toUpperCase() + formaPag.slice(1)}</td>
      </tr>
    `;
    tbody.append(linha);
  });
}

// =======================
// 💰 Atualizar saldo
// =======================
function atualizarSaldo() {
  let totalS = 0;
  for (let i = 0; i < array.length; i++) {
    totalS += moeda.desformatar(array[i].valor);
  }
  $("#pSaldo").text(`R$ ${moeda.formatar(totalS)}`);
}

// =======================
// ⚙️ Lógica da interface
// =======================
$(document).ready(function () {
  // Atualiza campo de data (formato DD/MM/YYYY)
  function atualizarData() {
    const dataAtual = new Date();
    const dia = String(dataAtual.getDate()).padStart(2, "0");
    const mes = String(dataAtual.getMonth() + 1).padStart(2, "0");
    const ano = dataAtual.getFullYear();
    $("#data").val(`${dia}/${mes}/${ano}`);
  }

  // --- Controle do botão enviar ---
  $("#enviar").prop("disabled", true);
  setTimeout(() => $("#enviar").prop("disabled", false), 1000);

  // ===========================
  // 🧩 Controle do Modal
  // ===========================
  const modal = $("#modal-adicionar");
  const body = $("body");

  $("#bnt-adicionar-fila, #btn-adicionar-fila, #btn-adicionar-fila-alt").on("click", function () {
    atualizarData();
    modal.addClass("mostrar");
    body.css("overflow", "hidden");
  });

  function fecharModal() {
    modal.removeClass("mostrar");
    body.css("overflow", "");
  }

  $("#btn-fechar-modal").click(fecharModal);

  $("#btn-cancelar").click(function () {
    $("#kwh, #txt_consumo, #placa, #relf, #valor, #formaPagamento").val("");
    fecharModal();
  });

  $(window).click(function (e) {
    if ($(e.target).is("#modal-adicionar")) fecharModal();
  });

  $(document).keydown(function (e) {
    if (e.key === "Escape" && modal.is(":visible")) fecharModal();
  });

  // ===========================
  // ⚡ Lógica dos campos
  // ===========================
  $("#kwh").on("blur", () => {
    let val = moeda.desformatar($("#kwh").val());
    $("#kwh").val(moeda.formatar(val));
    let consumo = moeda.desformatar($("#txt_consumo").val()) || 0;
    let total = val * 2 + consumo; // regra de cálculo
    $("#valor").val(moeda.formatar(total));
  });

  $("#txt_consumo").on("blur", () => {
    let consumoNum = moeda.desformatar($("#txt_consumo").val());
    $("#txt_consumo").val(moeda.formatar(consumoNum));
    let kwhNum = moeda.desformatar($("#kwh").val());
    let total = kwhNum * 2 + consumoNum;
    $("#valor").val(moeda.formatar(total));
  });

  $("#relf").change(() => {
    let val = $("#relf").val()?.toString().toUpperCase() || "";
    if (val === "SIM") $("#txt_valorRefrigerante").show();
    else {
      $("#txt_valorRefrigerante").hide();
      $("#txt_consumo").val("");
    }
  });

  // ===========================
  // 🧾 Envio do formulário
  // ===========================
  $("#enviar").off("click").on("click", async () => {
    let data = $("#data").val();
    let placa = $("#placa").val();

    let kwhNum = moeda.desformatar($("#kwh").val());
    let consumoNum = moeda.desformatar($("#txt_consumo").val());
    let valorTotal = kwhNum * 2 + consumoNum;
    let formaPagamento = $("#formaPagamento").val();

    if (!placa || kwhNum <= 0 || valorTotal <= 0 || !formaPagamento) {
      alert("⚠️ Preencha todos os campos obrigatórios!");
      return;
    }

    // Converte data para formato ISO (YYYY-MM-DD)
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

    await adicionarRegistro(novo);

    fecharModal();
    $("#placa, #kwh, #valor, #relf, #txt_consumo, #formaPagamento").val("");
    atualizarData();
    salvarArrayNoLocalStorage();
  });

  // Lógica para abrir e fechar o menu lateral
  $("#btn-menu").on("click", function () {
    const menu = $("#menu-lateral");

    if (menu.hasClass("aberto")) {
      menu.removeClass("aberto");
      $("body").removeClass("menu-aberto"); // Remove a sobrecapa
    } else {
      menu.addClass("aberto");
      $("body").addClass("menu-aberto"); // Adiciona a sobrecapa
    }
  });

  // Lógica para fechar o menu quando clicar fora
  $(window).click(function (e) {
    if (!$(e.target).closest("#menu-lateral").length && !$(e.target).is("#btn-menu")) {
      $("#menu-lateral").removeClass("aberto");
      $("body").removeClass("menu-aberto");
    }
  });

  // Inicializa data, dados e saldo
  atualizarData();
  carregarArray();
});
