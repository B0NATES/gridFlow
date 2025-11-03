import db from '../db/connection.js';

// 🧾 Lista relatórios (retorna campos explícitos)
export async function getRelatorios(req, res) {
  try {
    const data = await db('relatorios')
      .select(
        'id',
        'user_id',
        'data',
        'placa',
        'kwh',
        'refrigerante',
        'valor',
        'forma_pagamento',
        'created_at'
      )
      .orderBy('created_at', 'desc');

    // 🔍 LOG DE DEBUG NO BACKEND
    console.log('📦 [DEBUG] Dados brutos do banco (relatorios):');
    console.table(data);

    // 🔢 Converte "valor" e "kwh" para número
    const parsedData = data.map((item) => ({
      ...item,
      valor: Number(item.valor),
      kwh: item.kwh ? Number(item.kwh) : 0,
      refrigerante: item.refrigerante ? Number(item.refrigerante) : 0,
    }));

    console.log('✅ [DEBUG] Dados enviados ao front (parseados):');
    console.table(parsedData);

    res.json(parsedData);
  } catch (error) {
    console.error('❌ Erro ao buscar relatórios:', error);
    res.status(500).json({ error: 'Erro ao buscar relatórios' });
  }
}

// ➕ Adiciona relatório
export async function addRelatorio(req, res) {
  const { data, placa, kwh, refrigerante, valor, forma_pagamento } = req.body;

  if (!data || !placa || !valor || !forma_pagamento) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  try {
    const [novo] = await db('relatorios')
      .insert({
        data,
        placa,
        kwh,
        refrigerante,
        valor,
        forma_pagamento,
        user_id: req.user.id,
      })
      .returning([
        'id',
        'user_id',
        'data',
        'placa',
        'kwh',
        'refrigerante',
        'valor',
        'forma_pagamento',
        'created_at',
      ]);

    console.log('🆕 [DEBUG] Novo relatório inserido:', novo);

    // Garante retorno numérico
    const parsedNovo = {
      ...novo,
      valor: Number(novo.valor),
      kwh: novo.kwh ? Number(novo.kwh) : 0,
      refrigerante: novo.refrigerante ? Number(novo.refrigerante) : 0,
    };

    res.json(parsedNovo);
  } catch (error) {
    console.error('❌ Erro ao inserir relatório:', error);
    res.status(500).json({ error: 'Erro interno ao salvar relatório' });
  }
}

// 💰 Calcula o saldo total do usuário
export async function getSaldo(req, res) {
  try {
    const [{ total }] = await db('relatorios')
      .where({ user_id: req.user.id })
      .sum('valor as total');

    const saldo = Number(total) || 0;

    console.log(`💵 [DEBUG] Saldo calculado para user_id=${req.user.id}: R$ ${saldo}`);

    res.json({ saldo });
  } catch (error) {
    console.error('❌ Erro ao calcular saldo:', error);
    res.status(500).json({ error: 'Erro ao calcular saldo' });
  }
}
