import express from "express";
import { viagemController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const router = express.Router();

// Listar cancelamentos de viagem do aluno
router.get("/alunos/:alunoId/viagens", authMiddleware, viagemController.getViagensDoAluno);

// Consultar cancelamento por ID
router.get("/alunos/:alunoId/viagens/:id", authMiddleware, viagemController.getViagem);

// Registrar cancelamento de viagem pelo responsável
router.post("/alunos/:alunoId/viagens", authMiddleware, viagemController.createViagem);

// Atualizar cancelamento de viagem
router.put("/alunos/:alunoId/viagens/:id", authMiddleware, viagemController.updateViagem);

// Excluir cancelamento de viagem (desfaz o cancelamento)
router.delete("/alunos/:alunoId/viagens/:id", authMiddleware, viagemController.deleteViagem);

export default router;
