import bcrypt from 'bcrypt';
import db from '../db/connection.js';
import { generateToken } from '../utils/token.js';

export async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Preencha todos os campos.' });

  const existing = await db('users').where({ email }).first();
  if (existing) return res.status(400).json({ error: 'E-mail já registrado.' });

  const hash = await bcrypt.hash(password, 10);

  const [user] = await db('users')
    .insert({ name, email, password_hash: hash })
    .returning(['id', 'name', 'email', 'role']);

  const token = generateToken(user);
  res.json({ user, token });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await db('users').where({ email }).first();
  if (!user) return res.status(400).json({ error: 'Usuário não encontrado.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(400).json({ error: 'Senha incorreta.' });

  const token = generateToken(user);
  res.json({ user, token });
}
