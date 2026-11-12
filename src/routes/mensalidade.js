
import express from "express";
import { mensalidadeController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const router = express.Router();

// Listar mensalidades de um aluno
router.get(
  "/alunos/:alunoId/mensalidades",
  authMiddleware,
  mensalidadeController.getMensalidadesDoAluno,
);

// Consultar uma mensalidade específica
router.get(
  "/alunos/:alunoId/mensalidades/:mensalidadeId",
  authMiddleware,
  mensalidadeController.getMensalidade,
);

// Criar mensalidade
router.post(
  "/alunos/:alunoId/mensalidades",
  authMiddleware,
  mensalidadeController.createMensalidade,
);

// Registrar pagamento
router.patch(
  "/alunos/:alunoId/mensalidades/:mensalidadeId/pagamento",
  authMiddleware,
  mensalidadeController.registrarPagamento,
);

// Atualizar mensalidade
router.put(
  "/alunos/:alunoId/mensalidades/:mensalidadeId",
  authMiddleware,
  mensalidadeController.updateMensalidade,
);

// Excluir mensalidade
router.delete(
  "/alunos/:alunoId/mensalidades/:mensalidadeId",
  authMiddleware,
  mensalidadeController.deleteMensalidade,
);

// Mensalidades pendentes de um responsável
router.get(
  "/responsaveis/:responsavelId/mensalidades/pendentes",
  authMiddleware,
  mensalidadeController.getMensalidadesPendentesDoResponsavel,
);

export default router;
