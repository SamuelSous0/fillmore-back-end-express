import { Router } from "express";
import { rotaController, alunoController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const router = Router();

router.use(authMiddleware);

router.get("/", rotaController.getRotas);
router.get("/:id", rotaController.getRota);
router.post("/", rotaController.createRota);
router.put("/:id", rotaController.updateRota);
router.delete("/:id", rotaController.deleteRota);

// Rota Inteligente: Otimização de paradas (Vizinho Mais Próximo + exclusão de viagens canceladas)
router.post("/:id/otimizar", rotaController.otimizarRota);
router.get("/:id/trajeto", rotaController.getTrajetoOtimizado);

// Relacionamento 1 (URL Composta): Rota <-> Alunos
router.get("/:rotaId/alunos", alunoController.getAlunosDaRota);
router.post("/:rotaId/alunos", alunoController.vincularAlunoNaRota);
router.delete("/:rotaId/alunos/:alunoId", alunoController.removerAlunoDaRota);

export default router;
