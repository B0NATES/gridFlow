import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./src/routes/authRoutes.js";
import relatorioRoutes from "./src/routes/relatorioRoutes.js";

dotenv.config();

const app = express();

// Middleware global
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/relatorios", relatorioRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "API funcionando 🚀" });
});

// Inicialização
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
