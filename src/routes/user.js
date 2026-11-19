import { Router } from "express";
import { userController } from "../controllers/index.js";
import {
  authMiddleware,
  isUserOwner,
  validate,
  createUserSchema,
  userIdParamSchema,
} from "../middlewares/index.js";

const router = Router();

// Sign up é rota pública
router.post("/", validate(createUserSchema), userController.createUser);

// Rotas protegidas por autenticação e validação de propriedade (ownership)
router.get("/", authMiddleware, userController.getUsers);
router.get(
  "/:userId",
  validate(userIdParamSchema),
  authMiddleware,
  isUserOwner,
  userController.getUser,
);
router.put(
  "/:userId",
  validate(userIdParamSchema),
  authMiddleware,
  isUserOwner,
  userController.updateUser,
);
router.delete(
  "/:userId",
  validate(userIdParamSchema),
  authMiddleware,
  isUserOwner,
  userController.deleteUser,
);

export default router;
