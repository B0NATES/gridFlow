import { getRelatorios } from "../service/apiService.js";
import { checkAuth } from "./authCheck.js";
checkAuth();


// ===============================
// 💰 Função para formatar valores
// ===============================
const moeda = {
  formatar(valor) {
    if (isNaN(valor)) valor = 0;
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },
  desformatar(texto) {
    if (typeof texto === "number") return texto;
    const limpo = texto?.toString().replace(/\./g, "").replace(",", ".") || "0";
    const n = parseFloat(limpo);
    return isNaN(n) ? 0 : n;
  },
};

// ===============================
// 📦 Atualizar saldo do dia
// ===============================
async function atualizarSaldo() {
  try {
    const dataHoje = new Date();
    const hojeISO = dataHoje.toISOString().split("T")[0];
    const relatorios = await getRelatorios();

    // filtra registros do dia atual
    const relatoriosHoje = relatorios.filter((r) => {
      const dataItem = (r.data || "").split("T")[0];
      return dataItem === hojeISO;
    });

    // calcula total
    const total = relatoriosHoje.reduce(
      (acc, item) => acc + moeda.desformatar(item.valor),
      0
    );

    // atualiza elementos na tela
    const textoSaldo = `R$ ${moeda.formatar(total)}`;
    const saldoDesktop = document.getElementById("pSaldo");
    const saldoMobile = document.getElementById("saldoMobile");

    if (saldoDesktop) saldoDesktop.textContent = textoSaldo;
    if (saldoMobile) saldoMobile.textContent = textoSaldo;

    // efeito sutil de atualização
    [saldoDesktop, saldoMobile].forEach((el) => {
      if (el) {
        el.classList.add("pulse-saldo");
        setTimeout(() => el.classList.remove("pulse-saldo"), 600);
      }
    });
  } catch (error) {
    console.warn("⚠️ Falha ao carregar saldo:", error);
  }
}

// ===============================
// 🔁 Atualização periódica automática
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  atualizarSaldo();

  // atualiza a cada 30 segundos
  setInterval(atualizarSaldo, 30000);
});
