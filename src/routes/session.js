import { Router } from "express";
import { sessionController } from "../controllers/index.js";
import {
  authLimiterMiddleware,
  authMiddleware,
  validate,
  refreshTokenSchema,
} from "../middlewares/index.js";

const router = Router();

// Aplica limite de tentativas de autenticação no login e na rotação de refresh token
router.post("/", authLimiterMiddleware, sessionController.login);
router.post(
  "/refresh",
  authLimiterMiddleware,
  validate(refreshTokenSchema),
  sessionController.refresh,
);
router.delete("/", authMiddleware, sessionController.logout);
router.get("/", authMiddleware, sessionController.getSession);

export default router;
