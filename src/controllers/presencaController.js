import { presencaService, alunoService } from "../services/index.js";
import { AppError } from "../utils/index.js";

// Verifica se o usuário autenticado tem permissão para ler dados do aluno
const verificarAcessoAoAluno = async (alunoId, req) => {
  const aluno = await alunoService.getAlunoById(alunoId);

  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  if (req.user?.tipo === "RESPONSAVEL") {
    if (aluno.responsavelId !== req.user.responsavel?.id) {
      throw new AppError("Acesso não autorizado às presenças deste aluno.", 403);
    }
    return aluno;
  }

  if (req.user?.tipo === "MOTORISTA") {
    const motoristaId = req.user.motorista?.id;
    const pertenceAoMotorista =
      aluno.rotaIda?.motoristaId === motoristaId ||
      aluno.rotaVolta?.motoristaId === motoristaId;

    if (!motoristaId || !pertenceAoMotorista) {
      throw new AppError("Você não tem acesso às presenças deste aluno.", 403);
    }
    return aluno;
  }

  throw new AppError("Você não tem permissão para acessar este recurso.", 403);
};

// Apenas motoristas podem criar, atualizar e excluir registros de presença
const verificarPermissaoMotorista = async (alunoId, req) => {
  if (req.user?.tipo !== "MOTORISTA") {
    throw new AppError(
      "Somente motoristas podem gerenciar o check-list de presença.",
      403,
    );
  }

  return await verificarAcessoAoAluno(alunoId, req);
};

// Lista as presenças de um aluno
const getPresencasDoAluno = async (req, res) => {
  const { alunoId } = req.params;
  const { data, turno } = req.query;

  await verificarAcessoAoAluno(alunoId, req);

  const presencas = await presencaService.getPresencasDoAluno(alunoId, {
    data,
    turno,
  });

  return res.status(200).send(presencas);
};

// Busca uma presença específica
const getPresenca = async (req, res) => {
  const { alunoId, id } = req.params;

  await verificarAcessoAoAluno(alunoId, req);

  const presenca = await presencaService.getPresencaById(id);

  if (!presenca || presenca.alunoId !== alunoId) {
    throw new AppError("Registro de presença não encontrado.", 404);
  }

  return res.status(200).send(presenca);
};

// Cria um registro de presença
const createPresenca = async (req, res) => {
  const { alunoId } = req.params;
  const { data, turno, embarcou, horarioEmbarque } = req.body || {};

  await verificarPermissaoMotorista(alunoId, req);

  if (!data || !turno) {
    throw new AppError("Data e turno são obrigatórios.", 400);
  }

  const presenca = await presencaService.createPresenca(alunoId, {
    data,
    turno,
    embarcou,
    horarioEmbarque,
  });

  return res.status(201).send(presenca);
};

// Atualiza uma presença
const updatePresenca = async (req, res) => {
  const { alunoId, id } = req.params;

  await verificarPermissaoMotorista(alunoId, req);

  const existente = await presencaService.getPresencaById(id);

  if (!existente || existente.alunoId !== alunoId) {
    throw new AppError("Registro de presença não encontrado.", 404);
  }

  const atualizada = await presencaService.updatePresenca(id, req.body || {});

  return res.status(200).send(atualizada);
};

// Exclui uma presença
const deletePresenca = async (req, res) => {
  const { alunoId, id } = req.params;

  await verificarPermissaoMotorista(alunoId, req);

  const existente = await presencaService.getPresencaById(id);

  if (!existente || existente.alunoId !== alunoId) {
    throw new AppError("Registro de presença não encontrado.", 404);
  }

  await presencaService.deletePresenca(id);

  return res.status(204).send();
};

export default {
  getPresencasDoAluno,
  getPresenca,
  createPresenca,
  updatePresenca,
  deletePresenca,
};
