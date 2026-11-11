import express from "express";
import { notificacaoController } from "../controllers/index.js";
import { authMiddleware } from "../middlewares/index.js";

const router = express.Router();

router.use(authMiddleware);

// Listar notificações do aluno
router.get(
  "/alunos/:alunoId/notificacoes",
  notificacaoController.getNotificacoesDoAluno,
);

// Consultar notificação específica
router.get(
  "/alunos/:alunoId/notificacoes/:id",
  notificacaoController.getNotificacao,
);

// Criar notificação para o aluno (Aviso emitido)
router.post(
  "/alunos/:alunoId/notificacoes",
  notificacaoController.createNotificacao,
);

// Atualizar notificação
router.put(
  "/alunos/:alunoId/notificacoes/:id",
  notificacaoController.updateNotificacao,
);

// Excluir notificação
router.delete(
  "/alunos/:alunoId/notificacoes/:id",
  notificacaoController.deleteNotificacao,
);

// Disparar cobrança de mensalidade em 1 clique
router.post(
  "/alunos/:alunoId/mensalidades/:mensalidadeId/cobrar",
  notificacaoController.cobrarMensalidade,
);

// Notificações do responsável (todos os filhos)
router.get(
  "/responsaveis/:responsavelId/notificacoes",
  notificacaoController.getNotificacoesDoResponsavel,
);

// Marcar notificação como lida
router.patch("/notificacoes/:id/lida", notificacaoController.marcarComoLida);

export default router;
