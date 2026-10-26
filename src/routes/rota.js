import { Router } from "express";
import { rotaController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const router = Router();

router.use(authMiddleware);

router.get("/", rotaController.getRotas);
router.get("/:id", rotaController.getRota);
router.post("/", rotaController.createRota);
router.put("/:id", rotaController.updateRota);
router.delete("/:id", rotaController.deleteRota);

export default router;

