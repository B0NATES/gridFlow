// front/scripts/authCheck.js

export function checkAuth() {
  const token = localStorage.getItem("token");

  // Se não houver token, redireciona para login
  if (!token) {
    window.location.href = "login.html";
    return false;
  }

  // Validação simples: verificar formato ou expiração
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp ? payload.exp * 1000 : null;
    const agora = Date.now();

    if (exp && agora > exp) {
      console.warn("⏰ Token expirado, redirecionando...");
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return false;
    }

    return true;
  } catch (err) {
    console.warn("⚠️ Token inválido:", err);
    localStorage.removeItem("token");
    window.location.href = "login.html";
    return false;
  }
}
