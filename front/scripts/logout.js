document.addEventListener("DOMContentLoaded", () => {
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        if (confirm("Deseja realmente sair?")) {
          localStorage.removeItem("token");
          localStorage.removeItem("usuario");
          window.location.href = "./login.html";
        }
      });
    }
  });
  