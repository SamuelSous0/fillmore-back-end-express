import express from "express";
import { presencaController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const router = express.Router();

router.use(authMiddleware);

// Listar presenças do aluno (Check-list diário)
router.get("/alunos/:alunoId/presencas", presencaController.getPresencasDoAluno);

// Consultar registro de presença por ID
router.get("/alunos/:alunoId/presencas/:id", presencaController.getPresenca);

// Registrar presença/embarque
router.post("/alunos/:alunoId/presencas", presencaController.createPresenca);

// Atualizar registro de presença
router.put("/alunos/:alunoId/presencas/:id", presencaController.updatePresenca);

// Excluir registro de presença
router.delete("/alunos/:alunoId/presencas/:id", presencaController.deletePresenca);

export default router;
