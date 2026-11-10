
import express from "express";
import { mensalidadeController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const router = express.Router();

router.use(authMiddleware);

// Listar mensalidades de um aluno
router.get(
  "/alunos/:alunoId/mensalidades",
  mensalidadeController.getMensalidadesDoAluno,
);

// Consultar uma mensalidade específica
router.get(
  "/alunos/:alunoId/mensalidades/:mensalidadeId",
  mensalidadeController.getMensalidade,
);

// Criar mensalidade
router.post(
  "/alunos/:alunoId/mensalidades",
  mensalidadeController.createMensalidade,
);

// Registrar pagamento
router.patch(
  "/alunos/:alunoId/mensalidades/:mensalidadeId/pagamento",
  mensalidadeController.registrarPagamento,
);

// Atualizar mensalidade
router.put(
  "/alunos/:alunoId/mensalidades/:mensalidadeId",
  mensalidadeController.updateMensalidade,
);

// Excluir mensalidade
router.delete(
  "/alunos/:alunoId/mensalidades/:mensalidadeId",
  mensalidadeController.deleteMensalidade,
);

// Mensalidades pendentes de um responsável
router.get(
  "/responsaveis/:responsavelId/mensalidades/pendentes",
  mensalidadeController.getMensalidadesPendentesDoResponsavel,
);

export default router;
