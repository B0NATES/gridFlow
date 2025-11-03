// front/scripts/index.js
import { getRelatorios } from "../api/apiService.js";

function formatarMoedaNumero(valor) {
  const num = Number(valor);
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function buscarSaldoDaApi() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token ausente");

  const res = await fetch("http://localhost:4000/api/relatorios/saldo", {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => null);
    const msg = text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return res.json(); // { saldo: number }
}

async function atualizarSaldo() {
  const el = document.getElementById("saldo");
  if (!el) return;

  try {
    // Tenta buscar saldo pelo endpoint novo
    const data = await buscarSaldoDaApi();
    el.textContent = formatarMoedaNumero(data.saldo);
  } catch (apiError) {
    console.warn("Falha ao buscar saldo da API:", apiError);

    // Fallback: tenta calcular localmente a partir dos relatórios
    try {
      const relatorios = await getRelatorios();
      const total = (relatorios || []).reduce((acc, item) => {
        const v = Number(item.valor || 0);
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
      el.textContent = formatarMoedaNumero(total);
    } catch (fallbackError) {
      console.warn("Falha no fallback de saldo:", fallbackError);
      el.textContent = "R$ 0,00";
    }
  }
}

document.addEventListener("DOMContentLoaded", atualizarSaldo);
