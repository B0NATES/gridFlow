// front/scripts/script.js
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
    // busca novamente (o endpoint retorna todos os registros)
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
// 💰 Objeto para formatação de moeda
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
    // aceita número ou string formatada (ex: "1.234,56")
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
  if (data) array = JSON.parse(data);
  else array = [];
}

// =======================
// 🧾 Renderizar tabela
// =======================
function renderizarTabela() {
  const tbody = $("#table tbody");
  tbody.empty();

  array.forEach((item) => {
    const linha = `
      <tr>
        <td>${item.data}</td>
        <td>${item.placa}</td>
        <td>${item.kwh}</td>
        <td>${item.refrigerante}</td>
        <td>${item.valor}</td>
        <td>${item.formaPagamento}</td>
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
  // Atualiza campo de data
  function atualizarData() {
    const date = new Date().toLocaleDateString("pt-BR");
    $("#data").val(date);
  }

  // --- Controle do botão enviar ---
  $("#enviar").prop("disabled", true);
  setTimeout(() => $("#enviar").prop("disabled", false), 1000);

  // ===========================
  // 🧩 Controle do Modal (usa classe .mostrar do CSS)
  // ===========================
  const modal = $("#modal-adicionar");
  const body = $("body");

  $("#bnt-adicionar-fila, #btn-adicionar-fila, #btn-adicionar-fila-alt").on("click", function () {
    // aceitamos alguns ids por compatibilidade (se houver variação)
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
    $("#kwh").val("");
    $("#txt_consumo").val("");
    $("#placa").val("");
    $("#relf").val("");
    $("#valor").val("");
    $("#formaPagamento").val("");
    fecharModal();
  });

  $(window).click(function (e) {
    if ($(e.target).is("#modal-adicionar")) {
      fecharModal();
    }
  });

  $(document).keydown(function (e) {
    if (e.key === "Escape" && modal.is(":visible")) {
      fecharModal();
    }
  });

  // ===========================
  // ⚡ Lógica dos campos (kwh / consumo / valor)
  // ===========================
  $("#kwh").on({
    blur: () => {
      let val = $("#kwh").val();
      let valNum = moeda.desformatar(val);
      $("#kwh").val(moeda.formatar(valNum));

      let consumo = moeda.desformatar($("#txt_consumo").val()) || 0;
      let total = valNum * 2 + consumo; // sua regra: kwh * 2 + consumo
      $("#valor").val(moeda.formatar(total));
    },
  });

  $("#txt_consumo").on({
    blur: () => {
      let consumoTxt = $("#txt_consumo").val();
      let consumoNum = moeda.desformatar(consumoTxt);
      $("#txt_consumo").val(moeda.formatar(consumoNum));

      let kwhTxt = $("#kwh").val();
      let valorTxt = $("#valor").val();

      if (kwhTxt === "" || moeda.desformatar(kwhTxt) === 0) {
        $("#valor").val(moeda.formatar(consumoNum));
      } else if (valorTxt !== "") {
        let valorAtualNum = moeda.desformatar(valorTxt);
        let total = valorAtualNum + consumoNum;
        $("#valor").val(moeda.formatar(total));
      }
    },
  });

  $("#relf").change(() => {
    let val = $("#relf").val() ? $("#relf").val().toString().toUpperCase() : "";
    if (val === "SIM") {
      $("#txt_valorRefrigerante").css("display", "block");
    } else {
      $("#txt_valorRefrigerante").css("display", "none");
      $("#txt_consumo").val("");
    }
  });

  // ===========================
  // 🧾 Envio do formulário — AGORA AWAIT adiciona e atualiza saldo corretamente
  // ===========================
  $("#enviar").off("click").on("click", async () => {
    let data = $("#data").val();
    let placa = $("#placa").val();

    let kwhTxt = $("#kwh").val();
    let kwhNum = moeda.desformatar(kwhTxt) * 2; // regra kwh * 2

    let refVal = $("#relf").val();
    let consumoTxt = $("#txt_consumo").val();
    let consumoNum = moeda.desformatar(consumoTxt);

    let valorTxt = $("#valor").val();
    let valorNum = moeda.desformatar(valorTxt);

    let formaPagamento = $("#formaPagamento").val();

    // refrigerante
    let refrigerante = "";
    if (refVal && refVal.toString().toUpperCase() === "SIM" && consumoNum > 0) {
      refrigerante = moeda.formatar(consumoNum);
    } else {
      refrigerante = "NÃO";
    }

    // validação
    if (!placa || kwhNum <= 0 || valorNum <= 0 || !formaPagamento) {
      alert("⚠️ Preencha todos os campos obrigatórios!");
      return;
    }

    // prepara objeto (note: estamos guardando os valores formatados em strings — consistente com o que você tinha)
    const novo = {
      data,
      placa,
      kwh: moeda.formatar(kwhNum),
      refrigerante,
      valor: moeda.formatar(valorNum),
      formaPagamento,
    };

    // chama adicionarRegistro e espera a atualização (importante)
    await adicionarRegistro(novo);

    // fecha e limpa
    fecharModal();
    $("#placa, #kwh, #valor, #relf, #txt_consumo, #formaPagamento").val("");
    atualizarData();
    salvarArrayNoLocalStorage();
  });

  // Inicializa data, dados e saldo
  atualizarData();
  carregarArray();
});
