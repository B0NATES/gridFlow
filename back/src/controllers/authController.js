import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import db from "../db/connection.js"; // usa knex

const JWT_SECRET = process.env.JWT_SECRET || "segredo_super_secreto";

export const login = async (req, res) => {
  const { email, senha } = req.body;

  try {
    const usuario = await db("users").where({ email }).first();

    if (!usuario) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    console.log("Usuário encontrado:", usuario);

    const senhaCorreta = await bcrypt.compare(senha, usuario.password_hash);

    if (!senhaCorreta) {
      console.log("Senha incorreta para:", email);
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, role: usuario.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      message: "Login realizado com sucesso!",
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.name,
        email: usuario.email,
        role: usuario.role
      }
    });
  } catch (error) {
    console.error("Erro ao realizar login:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};
