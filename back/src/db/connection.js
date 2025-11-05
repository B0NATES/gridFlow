import knex from "knex";
import knexfile from "../../knexfile.js";  // Importa as configurações do knexfile

const db = knex(knexfile.development);  // Usa as configurações do ambiente de desenvolvimento

export default db;  // Exporta o db configurado
