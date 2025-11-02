// front/api/apiService.js

const API_BASE_URL = "http://localhost:4000"; // ajustaremos se o back usar outra porta

// Buscar todos os relatórios
export async function getRelatorios() {
  const response = await fetch(`${API_BASE_URL}/relatorios`);
  if (!response.ok) throw new Error("Erro ao buscar relatórios");
  return response.json();
}

// Adicionar novo relatório (registro)
export async function addRelatorio(dados) {
  const response = await fetch(`${API_BASE_URL}/relatorios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados)
  });
  if (!response.ok) throw new Error("Erro ao adicionar relatório");
  return response.json();
}

// Deletar relatório específico (opcional)
export async function deleteRelatorio(id) {
  const response = await fetch(`${API_BASE_URL}/relatorios/${id}`, {
    method: "DELETE"
  });
  if (!response.ok) throw new Error("Erro ao deletar relatório");
  return response.json();
}
