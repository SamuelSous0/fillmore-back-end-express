import express from "express";
import { viagemController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const router = express.Router();

router.use(authMiddleware);

// Listar cancelamentos de viagem do aluno
router.get("/alunos/:alunoId/viagens", viagemController.getViagensDoAluno);

// Consultar cancelamento por ID
router.get("/alunos/:alunoId/viagens/:id", viagemController.getViagem);

// Registrar cancelamento de viagem pelo responsável
router.post("/alunos/:alunoId/viagens", viagemController.createViagem);

// Atualizar cancelamento de viagem
router.put("/alunos/:alunoId/viagens/:id", viagemController.updateViagem);

// Excluir cancelamento de viagem (desfaz o cancelamento)
router.delete("/alunos/:alunoId/viagens/:id", viagemController.deleteViagem);

export default router;
