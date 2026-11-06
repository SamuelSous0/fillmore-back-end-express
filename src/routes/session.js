import { Router } from "express";
import { sessionController } from "../controllers/index.js";
import { authLimiterMiddleware, authMiddleware } from "../middlewares/index.js";

const router = Router();

// Aplica limite de tentativas de autenticação apenas no login
router.post("/", authLimiterMiddleware, sessionController.login);
router.delete("/", authMiddleware, sessionController.logout);
router.get("/", authMiddleware, sessionController.getSession);

export default router;
