import { Router } from "express";
import { rotaController, alunoController } from "../controllers/index.js";
import { authMiddleware, restrictTo } from "../middlewares/index.js";

const router = Router();

router.use(authMiddleware);

router.get("/", restrictTo("MOTORISTA"), rotaController.getRotas);
router.get("/:id", restrictTo("MOTORISTA"), rotaController.getRota);
router.post("/", restrictTo("MOTORISTA"), rotaController.createRota);
router.put("/:id", restrictTo("MOTORISTA"), rotaController.updateRota);
router.delete("/:id", restrictTo("MOTORISTA"), rotaController.deleteRota);

// Rota Inteligente: Otimização de paradas (Vizinho Mais Próximo + exclusão de viagens canceladas)
router.post("/:id/otimizar", restrictTo("MOTORISTA"), rotaController.otimizarRota);
router.get("/:id/trajeto", rotaController.getTrajetoOtimizado);

// Relacionamento 1 (URL Composta): Rota <-> Alunos
router.get("/:rotaId/alunos", alunoController.getAlunosDaRota);
router.post("/:rotaId/alunos", restrictTo("MOTORISTA"), alunoController.vincularAlunoNaRota);
router.delete(
  "/:rotaId/alunos/:alunoId",
  restrictTo("MOTORISTA"),
  alunoController.removerAlunoDaRota,
);

export default router;
