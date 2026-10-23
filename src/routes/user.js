import { Router } from "express";
import { userController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const router = Router();

// Sign up é rota pública
router.post("/", userController.createUser);

// Rotas protegidas por autenticação
router.get("/", authMiddleware, userController.getUsers);
router.get("/:userId", authMiddleware, userController.getUser);
router.put("/:userId", authMiddleware, userController.updateUser);
router.delete("/:userId", authMiddleware, userController.deleteUser);

export default router;
