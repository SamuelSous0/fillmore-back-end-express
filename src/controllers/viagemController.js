import { viagemService, alunoService } from "../services/index.js";
import { AppError } from "../utils/index.js";

// Verifica se o usuário autenticado tem permissão para ler dados do aluno
const verificarAcessoAoAluno = async (alunoId, req) => {
  const aluno = await alunoService.getAlunoById(alunoId);

  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  if (req.user?.tipo === "RESPONSAVEL") {
    if (aluno.responsavelId !== req.user.responsavel?.id) {
      throw new AppError(
        "Acesso não autorizado às viagens deste aluno.",
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
      throw new AppError("Você não tem acesso às viagens deste aluno.", 403);
    }
    return aluno;
  }

  throw new AppError("Você não tem permissão para acessar este recurso.", 403);
};

// Verifica permissão para criar, alterar ou excluir cancelamento de viagem (Responsável ou Motorista)
const verificarPermissaoGerenciamento = async (alunoId, req) => {
  const aluno = await verificarAcessoAoAluno(alunoId, req);

  if (req.user?.tipo === "RESPONSAVEL") {
    if (aluno.responsavelId !== req.user.responsavel?.id) {
      throw new AppError(
        "Apenas o responsável pelo aluno pode gerenciar cancelamentos.",
        403,
      );
    }
    return aluno;
  }

  // Motorista também pode registrar cancelamento em caso de imprevisto
  if (req.user?.tipo === "MOTORISTA") {
    return aluno;
  }

  throw new AppError("Você não tem permissão para gerenciar viagens.", 403);
};

// Lista os cancelamentos de viagem de um aluno
const getViagensDoAluno = async (req, res) => {
  const { alunoId } = req.params;
  const { data } = req.query;

  await verificarAcessoAoAluno(alunoId, req);

  const viagens = await viagemService.getViagensDoAluno(alunoId, { data });

  return res.status(200).send(viagens);
};

// Busca cancelamento por ID
const getViagem = async (req, res) => {
  const { alunoId, id } = req.params;

  await verificarAcessoAoAluno(alunoId, req);

  const viagem = await viagemService.getViagemById(id);

  if (!viagem || viagem.alunoId !== alunoId) {
    throw new AppError("Cancelamento de viagem não encontrado.", 404);
  }

  return res.status(200).send(viagem);
};

// Registra cancelamento de viagem
const createViagem = async (req, res) => {
  const { alunoId } = req.params;
  const { data, turnoCancelado, canceladaPeloResponsavel, motivoCancelamento } =
    req.body || {};

  await verificarPermissaoGerenciamento(alunoId, req);

  if (!data || !turnoCancelado) {
    throw new AppError("Data e turno cancelado são obrigatórios.", 400);
  }

  const ehResponsavel = req.user?.tipo === "RESPONSAVEL";

  const viagem = await viagemService.createViagem(alunoId, {
    data,
    turnoCancelado,
    canceladaPeloResponsavel:
      canceladaPeloResponsavel !== undefined
        ? canceladaPeloResponsavel
        : ehResponsavel,
    motivoCancelamento,
  });

  return res.status(201).send(viagem);
};

// Atualiza cancelamento de viagem
const updateViagem = async (req, res) => {
  const { alunoId, id } = req.params;

  await verificarPermissaoGerenciamento(alunoId, req);

  const existente = await viagemService.getViagemById(id);

  if (!existente || existente.alunoId !== alunoId) {
    throw new AppError("Cancelamento de viagem não encontrado.", 404);
  }

  const atualizada = await viagemService.updateViagem(id, req.body || {});

  return res.status(200).send(atualizada);
};

// Exclui cancelamento de viagem
const deleteViagem = async (req, res) => {
  const { alunoId, id } = req.params;

  await verificarPermissaoGerenciamento(alunoId, req);

  const existente = await viagemService.getViagemById(id);

  if (!existente || existente.alunoId !== alunoId) {
    throw new AppError("Cancelamento de viagem não encontrado.", 404);
  }

  await viagemService.deleteViagem(id);

  return res.status(204).send();
};

export default {
  getViagensDoAluno,
  getViagem,
  createViagem,
  updateViagem,
  deleteViagem,
};
