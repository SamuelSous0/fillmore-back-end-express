import { notificacaoService, alunoService } from "../services/index.js";
import { AppError } from "../utils/index.js";

// Verifica se o usuário autenticado tem permissão para acessar dados do aluno
const verificarAcessoAoAluno = async (alunoId, req) => {
  const aluno = await alunoService.getAlunoById(alunoId);

  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  if (req.user?.tipo === "RESPONSAVEL") {
    if (aluno.responsavelId !== req.user.responsavel?.id) {
      throw new AppError(
        "Acesso não autorizado às notificações deste aluno.",
        403,
      );
    }
    return aluno;
  }

  if (req.user?.tipo === "MOTORISTA") {
    const motoristaId = req.user.motorista?.id;
    const pertenceAoMotorista =
      aluno.rotaIda?.motoristaId === motoristaId ||
      aluno.rotaVolta?.motoristaId === motoristaId;

    if (!motoristaId || !pertenceAoMotorista) {
      throw new AppError("Você não tem acesso às notificações deste aluno.", 403);
    }
    return aluno;
  }

  throw new AppError("Você não tem permissão para acessar este recurso.", 403);
};

// Lista notificações de um aluno
const getNotificacoesDoAluno = async (req, res) => {
  const { alunoId } = req.params;
  const { lida } = req.query;

  await verificarAcessoAoAluno(alunoId, req);

  const notificacoes = await notificacaoService.getNotificacoesDoAluno(alunoId, {
    lida,
  });

  return res.status(200).send(notificacoes);
};

// Busca notificação específica por ID
const getNotificacao = async (req, res) => {
  const { alunoId, id } = req.params;

  await verificarAcessoAoAluno(alunoId, req);

  const notificacao = await notificacaoService.getNotificacaoById(id);

  if (!notificacao || notificacao.alunoId !== alunoId) {
    throw new AppError("Notificação não encontrada.", 404);
  }

  return res.status(200).send(notificacao);
};

// Cria uma notificação para o aluno (Aviso emitido)
const createNotificacao = async (req, res) => {
  const { alunoId } = req.params;
  const { tipo, mensagem } = req.body || {};

  await verificarAcessoAoAluno(alunoId, req);

  if (!mensagem) {
    throw new AppError("A mensagem da notificação é obrigatória.", 400);
  }

  const notificacao = await notificacaoService.createNotificacao(alunoId, {
    tipo,
    mensagem,
  });

  return res.status(201).send(notificacao);
};

// Atualiza uma notificação
const updateNotificacao = async (req, res) => {
  const { alunoId, id } = req.params;

  await verificarAcessoAoAluno(alunoId, req);

  const existente = await notificacaoService.getNotificacaoById(id);

  if (!existente || existente.alunoId !== alunoId) {
    throw new AppError("Notificação não encontrada.", 404);
  }

  const atualizada = await notificacaoService.updateNotificacao(
    id,
    req.body || {},
  );

  return res.status(200).send(atualizada);
};

// Exclui uma notificação
const deleteNotificacao = async (req, res) => {
  const { alunoId, id } = req.params;

  await verificarAcessoAoAluno(alunoId, req);

  const existente = await notificacaoService.getNotificacaoById(id);

  if (!existente || existente.alunoId !== alunoId) {
    throw new AppError("Notificação não encontrada.", 404);
  }

  await notificacaoService.deleteNotificacao(id);

  return res.status(204).send();
};

// Marca notificação como lida
const marcarComoLida = async (req, res) => {
  const { id } = req.params;

  const notificacao = await notificacaoService.getNotificacaoById(id);

  if (!notificacao) {
    throw new AppError("Notificação não encontrada.", 404);
  }

  // Verifica se o usuário autenticado tem acesso ao aluno desta notificação
  await verificarAcessoAoAluno(notificacao.alunoId, req);

  const atualizada = await notificacaoService.marcarComoLida(id);

  return res.status(200).send(atualizada);
};

// Lista notificações de todos os filhos do responsável
const getNotificacoesDoResponsavel = async (req, res) => {
  const { responsavelId } = req.params;
  const { lida } = req.query;

  if (
    req.user?.tipo !== "RESPONSAVEL" ||
    req.user.responsavel?.id !== responsavelId
  ) {
    throw new AppError(
      "Acesso não autorizado às notificações deste responsável.",
      403,
    );
  }

  const notificacoes = await notificacaoService.getNotificacoesDoResponsavel(
    responsavelId,
    { lida },
  );

  return res.status(200).send(notificacoes);
};

// Dispara lembrete de cobrança em 1 clique pelo motorista
const cobrarMensalidade = async (req, res) => {
  const { alunoId, mensalidadeId } = req.params;

  if (req.user?.tipo !== "MOTORISTA") {
    throw new AppError(
      "Apenas o motorista pode disparar lembrete de cobrança.",
      403,
    );
  }

  await verificarAcessoAoAluno(alunoId, req);

  const notificacao = await notificacaoService.enviarLembreteMensalidade(
    alunoId,
    mensalidadeId,
  );

  return res.status(201).send(notificacao);
};

export default {
  getNotificacoesDoAluno,
  getNotificacao,
  createNotificacao,
  updateNotificacao,
  deleteNotificacao,
  marcarComoLida,
  getNotificacoesDoResponsavel,
  cobrarMensalidade,
};
