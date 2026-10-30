import { Router } from "express";
import {
  validate,
  createMessageSchema,
  messageIdParamSchema,
} from "../middlewares/index.js";

const router = Router();

router.post("/", validate(createMessageSchema), (req, res) => {
  return res.status(201).send({
    status: "success",
    message: "Mensagem criada com sucesso.",
    data: req.body,
  });
});

router.get("/:messageId", validate(messageIdParamSchema), (req, res) => {
  return res.status(200).send({
    status: "success",
    data: { messageId: req.params.messageId },
  });
});

router.put("/:messageId", validate(messageIdParamSchema), (req, res) => {
  return res.status(200).send({
    status: "success",
    data: { messageId: req.params.messageId },
  });
});

router.delete("/:messageId", validate(messageIdParamSchema), (req, res) => {
  return res.status(204).send();
});

export default router;
