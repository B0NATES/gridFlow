import bcrypt from "bcrypt";

const senha = "admin123";

const gerarHash = async () => {
  const hash = await bcrypt.hash(senha, 10);
  console.log("Hash gerado para admin123:\n", hash);
};

gerarHash();
