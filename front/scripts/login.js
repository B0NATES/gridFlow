const API_BASE_URL = "https://gridflow-api.onrender.com";

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const erroMsg = document.getElementById("erro-msg");

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Credenciais inválidas");

    localStorage.setItem("token", data.token);
    window.location.href = "relatorios.html";
  } catch (error) {
    erroMsg.style.display = "block";
    erroMsg.textContent = error.message;
  }
});
