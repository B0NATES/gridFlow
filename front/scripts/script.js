// Declara o array global
var array = [];

// Exemplo: sempre que o array mudar
function salvarArrayNoLocalStorage() {
  localStorage.setItem("dadosSistema", JSON.stringify(array));
  console.log("Dados salvos no localStorage");
}

// Exemplo: após adicionar um novo registro
function adicionarRegistro(novoItem) {
  array.push(novoItem);
  salvarArrayNoLocalStorage();
}

// --- Objeto para formatação de moeda ---
const moeda = {
  formatar(valor) {
    if (isNaN(valor)) valor = 0;
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  desformatar(texto) {
    if (!texto) return 0;
    return parseFloat(
      texto
        .replace(/\./g, '')  // remove pontos de milhar
        .replace(',', '.')   // troca vírgula por ponto decimal
    ) || 0;
  }
};

$(document).ready(function () {

  // --- Atualiza campo de data ---
  function atualizarData() {
    const date = new Date().toLocaleDateString('pt-BR');
    $("#data").val(date);
  }

  // --- Renderiza a tabela ---
  function renderizarTabela() {
    const tbody = $("#table tbody");
    tbody.empty();

    array.forEach(item => {
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

  // --- Controle do botão enviar ---
  $("#enviar").prop("disabled", true);
  setTimeout(() => $("#enviar").prop("disabled", false), 1000);

  // --- Ações do Modal ---
  $('#bnt-adicionar-fila').click(function () {
    atualizarData();
    $('#modal-adicionar').fadeIn();
  });

  $('#btn-cancelar').click(function () {
    $("#kwh").val('');
    $("#txt_consumo").val('');
    $("#placa").val('');
    $("#relf").val('');
    $("#valor").val('');
    $("#formaPagamento").val('');
  });

  $("#btn-fechar-modal").click(() => {
    $('#modal-adicionar').fadeOut();
  });

  $(window).click(function (e) {
    if ($(e.target).is('#modal-adicionar')) {
      $('#modal-adicionar').fadeOut();
    }
  });

  // --- Manipulação do campo #kwh ---
  $("#kwh").on({
    "blur": () => {
      let val = $("#kwh").val();
      let valNum = moeda.desformatar(val);
      $("#kwh").val(moeda.formatar(valNum));

      let valorAtual = $("#valor").val();
      let consumo = moeda.desformatar($("#txt_consumo").val()) || 0;

      if (valorAtual === '') {
        let total = valNum * 2;
        $("#valor").val(moeda.formatar(total));
      } else {
        let total = valNum * 2 + consumo;
        $("#valor").val(moeda.formatar(total));
      }
    }
  });

  // --- Manipulação do campo #txt_consumo ---
  $("#txt_consumo").on({
    "blur": () => {
      let consumoTxt = $("#txt_consumo").val();
      let consumoNum = moeda.desformatar(consumoTxt);
      $("#txt_consumo").val(moeda.formatar(consumoNum));

      let kwhTxt = $("#kwh").val();
      let valorTxt = $("#valor").val();

      if (kwhTxt === '' || moeda.desformatar(kwhTxt) === 0) {
        $("#valor").val(moeda.formatar(consumoNum));
      } else if (valorTxt !== '') {
        let valorAtualNum = moeda.desformatar(valorTxt);
        let total = valorAtualNum + consumoNum;
        $("#valor").val(moeda.formatar(total));
      }
    }
  });

  // --- Manipula exibição do campo de consumo de bebidas ---
  $("#relf").change(() => {
    let val = $("#relf").val().toUpperCase();
    if (val === "SIM") {
      $("#txt_valorRefrigerante").css('display', 'block');
    } else {
      $("#txt_valorRefrigerante").css('display', 'none');
      $("#txt_consumo").val('');
    }
  });

  // --- Captura dos dados e adição ao array ---
  $("#enviar").click(() => {
    let data = $("#data").val();
    let placa = $("#placa").val();

    let kwhTxt = $("#kwh").val();
    let kwhNum = moeda.desformatar(kwhTxt) *2;

    let refVal = $("#relf").val();
    let consumoTxt = $("#txt_consumo").val();
    let consumoNum = moeda.desformatar(consumoTxt);

    let valorTxt = $("#valor").val();
    let valorNum = moeda.desformatar(valorTxt);

    let formaPagamento = $("#formaPagamento").val();

    // --- Lógica do refrigerante ---
    let refrigerante = '';
    if (refVal.toUpperCase() === 'SIM' && consumoNum > 0) {
      refrigerante = moeda.formatar(consumoNum);
    } else {
      refrigerante = 'NÃO';
    }

    // --- Validação ---
    if (!placa || kwhNum <= 0 || valorNum <= 0 || !formaPagamento) {
      alert("⚠️ Preencha todos os campos obrigatórios!");
      return;
    }

    // --- Adiciona o objeto ao array ---
    array.push({
      data,
      placa,
      kwh: moeda.formatar(kwhNum),
      refrigerante,
      valor: moeda.formatar(valorNum),
      formaPagamento
    });

    console.log('✅ Dados adicionados ao array:', array);

    // Atualiza a tabela
    renderizarTabela();

    // Fecha o modal
    $('#modal-adicionar').fadeOut();

    // Limpa os campos
    $("#placa").val('');
    $("#kwh").val('');
    $("#valor").val('');
    $("#relf").val('');
    $("#txt_consumo").val('');
    $("#formaPagamento").val('');

    atualizarData();
    salvarArrayNoLocalStorage();

  });

  // --- Soma geral e exibe saldo ---
  $("#enviar").click(() => {
    let totalS = 0;
    for (let i = 0; i < array.length; i++) {
      const index = moeda.desformatar(array[i].valor);
      totalS += index;
    }
    console.log("TOTAL FINAL: " + totalS);
    $("#pSaldo").text(`R$ ${moeda.formatar(totalS)}`);
  });

  // Define a data inicial
  atualizarData();
});



