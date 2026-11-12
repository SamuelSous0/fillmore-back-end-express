import express from "express";
import { presencaController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const router = express.Router();

// Listar presenças do aluno (Check-list diário)
router.get("/alunos/:alunoId/presencas", authMiddleware, presencaController.getPresencasDoAluno);

// Consultar registro de presença por ID
router.get("/alunos/:alunoId/presencas/:id", authMiddleware, presencaController.getPresenca);

// Registrar presença/embarque
router.post("/alunos/:alunoId/presencas", authMiddleware, presencaController.createPresenca);

// Atualizar registro de presença
router.put("/alunos/:alunoId/presencas/:id", authMiddleware, presencaController.updatePresenca);

// Excluir registro de presença
router.delete("/alunos/:alunoId/presencas/:id", authMiddleware, presencaController.deletePresenca);

export default router;
