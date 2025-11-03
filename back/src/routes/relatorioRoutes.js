import express from 'express';
import { getRelatorios, addRelatorio, getSaldo } from '../controllers/relatorioController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rota para listar relatórios (protegida)
router.get('/', authMiddleware, getRelatorios);

// Rota para adicionar relatório (protegida)
router.post('/', authMiddleware, addRelatorio);

// Nova rota: obter saldo do usuário autenticado
router.get('/saldo', authMiddleware, getSaldo);

export default router;
