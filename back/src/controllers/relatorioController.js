import db from '../db/connection.js';

export async function getRelatorios(req, res) {
  const data = await db('relatorios').select('*').orderBy('created_at', 'desc');
  res.json(data);
}

export async function addRelatorio(req, res) {
  const { data, placa, kwh, refrigerante, valor, forma_pagamento } = req.body;

  if (!data || !placa || !valor || !forma_pagamento)
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });

  const [novo] = await db('relatorios')
    .insert({
      data,
      placa,
      kwh,
      refrigerante,
      valor,
      forma_pagamento,
      user_id: req.user.id
    })
    .returning('*');

  res.json(novo);
}
