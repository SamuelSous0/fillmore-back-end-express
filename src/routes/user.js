import { Router } from "express";
import { userController } from "../controllers/index.js";
import {
  authMiddleware,
  validate,
  createUserSchema,
  userIdParamSchema,
} from "../middlewares/index.js";

const router = Router();

// Sign up é rota pública
router.post("/", validate(createUserSchema), userController.createUser);

// Rotas protegidas por autenticação
router.get("/", authMiddleware, userController.getUsers);
router.get(
  "/:userId",
  validate(userIdParamSchema),
  authMiddleware,
  userController.getUser,
);
router.put(
  "/:userId",
  validate(userIdParamSchema),
  authMiddleware,
  userController.updateUser,
);
router.delete(
  "/:userId",
  validate(userIdParamSchema),
  authMiddleware,
  userController.deleteUser,
);

export default router;
