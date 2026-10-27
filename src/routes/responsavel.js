import { Router } from "express";
import { alunoController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const router = Router();

router.use(authMiddleware);

// Sub-rota para Responsável: Alunos do responsável
router.get("/:responsavelId/alunos", alunoController.getAlunosDoResponsavel);

export default router;
