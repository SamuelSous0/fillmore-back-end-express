import { Router } from "express";
import { alunoController } from "../controllers/index.js";
import { authMiddleware, isAlunoOwner } from "../middlewares/index.js";

const router = Router();

router.use(authMiddleware);

router.get("/", alunoController.getAlunos);
router.get("/:id", isAlunoOwner, alunoController.getAluno);
router.post("/", alunoController.createAluno);
router.put("/:id", isAlunoOwner, alunoController.updateAluno);
router.delete("/:id", isAlunoOwner, alunoController.deleteAluno);

export default router;
