import { Router } from "express";
import { alunoController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const router = Router();

router.use(authMiddleware);

router.get("/", alunoController.getAlunos);
router.get("/:id", alunoController.getAluno);
router.post("/", alunoController.createAluno);
router.put("/:id", alunoController.updateAluno);
router.delete("/:id", alunoController.deleteAluno);

export default router;
