import express from 'express';
import { getRelatorios, addRelatorio } from '../controllers/relatorioController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getRelatorios);
router.post('/', authMiddleware, addRelatorio);

export default router;
