// front/api/apiService.js

const API_BASE_URL = "http://localhost:4000/api";

// 🔹 Login do usuário
export async function login(email, senha) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erro ao fazer login");
  }

  // ✅ Salva token e usuário localmente
  localStorage.setItem("token", data.token);
  localStorage.setItem("usuario", JSON.stringify(data.usuario));

  return data;
}

// 🔹 Buscar relatórios
export async function getRelatorios() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/relatorios`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Erro ao buscar relatórios");
  return response.json();
}

// 🔹 Adicionar relatório
export async function addRelatorio(dados) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/relatorios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dados),
  });
  if (!response.ok) throw new Error("Erro ao adicionar relatório");
  return response.json();
}

// 🔹 Deletar relatório
export async function deleteRelatorio(id) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/relatorios/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Erro ao deletar relatório");
  return response.json();
}
