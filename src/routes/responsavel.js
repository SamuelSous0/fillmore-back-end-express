import { Router } from "express";
import { alunoController } from "../controllers/index.js";
import { authMiddleware, isResponsavelOwner } from "../middlewares/index.js";

const router = Router();

router.use(authMiddleware);

// Sub-rota para Responsável: Alunos do responsável (protegido por validação de propriedade)
router.get(
  "/:responsavelId/alunos",
  isResponsavelOwner,
  alunoController.getAlunosDoResponsavel,
);

export default router;
