import { Router } from "express";
import { sessionController } from "../controllers/index.js";
import { authLimiterMiddleware, authMiddleware } from "../middlewares/index.js";

const router = Router();

// Aplica limite rígido de 5 tentativas por 15 minutos nas rotas de sessão
router.use(authLimiterMiddleware);

router.post("/", sessionController.login);
router.delete("/", authMiddleware, sessionController.logout);
router.get("/", authMiddleware, sessionController.getSession);

export default router;
