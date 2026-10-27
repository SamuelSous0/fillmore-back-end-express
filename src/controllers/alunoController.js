import { alunoService } from "../services/index.js";
import { AppError } from "../utils/index.js";

const getAlunos = async (req, res) => {
  const filtro = {};
  if (req.user?.tipo === "RESPONSAVEL") {
    filtro.responsavelId = req.user.responsavel?.id;
  }
  const alunos = await alunoService.getAlunos(filtro);
  return res.status(200).send(alunos);
};

const getAluno = async (req, res) => {
  const aluno = await alunoService.getAlunoById(req.params.id);
  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  if (
    req.user?.tipo === "RESPONSAVEL" &&
    req.user.responsavel?.id &&
    aluno.responsavelId !== req.user.responsavel.id
  ) {
    throw new AppError("Acesso não autorizado a dados de outro responsável.", 403);
  }

  return res.status(200).send(aluno);
};

const createAluno = async (req, res) => {
  const {
    nome,
    escola,
    responsavelId,
    modalidade,
    enderecoEmbarque,
    latitudeEmbarque,
    longitudeEmbarque,
    enderecoDesembarque,
    latitudeDesembarque,
    longitudeDesembarque,
    rotaIdaId,
    ordemNaRotaIda,
    rotaVoltaId,
    ordemNaRotaVolta,
    nomeContatoEntrega,
    telefoneContatoEntrega,
    diaVencimentoMensalidade,
  } = req.body || {};

  const targetResponsavelId = responsavelId || req.user?.responsavel?.id;

  if (!nome || !escola) {
    throw new AppError("Nome e escola do aluno são campos obrigatórios.", 400);
  }

  if (!targetResponsavelId) {
    throw new AppError(
      "O campo responsavelId é obrigatório para cadastrar o aluno.",
      400,
    );
  }

  if (
    req.user?.tipo === "RESPONSAVEL" &&
    req.user.responsavel?.id &&
    targetResponsavelId !== req.user.responsavel.id
  ) {
    throw new AppError("Você não pode cadastrar um aluno para outro responsável.", 403);
  }

  const aluno = await alunoService.createAluno({
    nome,
    escola,
    responsavelId: targetResponsavelId,
    modalidade,
    enderecoEmbarque,
    latitudeEmbarque,
    longitudeEmbarque,
    enderecoDesembarque,
    latitudeDesembarque,
    longitudeDesembarque,
    rotaIdaId,
    ordemNaRotaIda,
    rotaVoltaId,
    ordemNaRotaVolta,
    nomeContatoEntrega,
    telefoneContatoEntrega,
    diaVencimentoMensalidade,
  });

  return res.status(201).send(aluno);
};

const updateAluno = async (req, res) => {
  const existing = await alunoService.getAlunoById(req.params.id);
  if (!existing) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  if (
    req.user?.tipo === "RESPONSAVEL" &&
    req.user.responsavel?.id &&
    existing.responsavelId !== req.user.responsavel.id
  ) {
    throw new AppError("Acesso não autorizado a dados de outro responsável.", 403);
  }

  const aluno = await alunoService.updateAluno(req.params.id, req.body || {});
  return res.status(200).send(aluno);
};

const deleteAluno = async (req, res) => {
  const existing = await alunoService.getAlunoById(req.params.id);
  if (!existing) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  if (
    req.user?.tipo === "RESPONSAVEL" &&
    req.user.responsavel?.id &&
    existing.responsavelId !== req.user.responsavel.id
  ) {
    throw new AppError("Acesso não autorizado a dados de outro responsável.", 403);
  }

  await alunoService.deleteAluno(req.params.id);
  return res.status(204).send();
};

const getAlunosDaRota = async (req, res) => {
  const { rotaId } = req.params;
  const alunos = await alunoService.getAlunosByRota(rotaId);
  return res.status(200).send(alunos);
};

const vincularAlunoNaRota = async (req, res) => {
  const { rotaId } = req.params;
  const { alunoId, tipoTrajeto, ordemNaRota } = req.body || {};

  if (!alunoId) {
    throw new AppError("O campo alunoId é obrigatório no corpo da requisição.", 400);
  }

  const aluno = await alunoService.associarAlunoARota(alunoId, rotaId, {
    tipoTrajeto,
    ordemNaRota,
  });

  return res.status(200).send(aluno);
};

const removerAlunoDaRota = async (req, res) => {
  const { rotaId, alunoId } = req.params;
  await alunoService.desassociarAlunoDaRota(alunoId, rotaId);
  return res.status(204).send();
};

const getAlunosDoResponsavel = async (req, res) => {
  const { responsavelId } = req.params;

  if (
    req.user?.tipo === "RESPONSAVEL" &&
    req.user.responsavel?.id &&
    req.user.responsavel.id !== responsavelId
  ) {
    throw new AppError("Acesso não autorizado aos alunos de outro responsável.", 403);
  }

  const alunos = await alunoService.getAlunosByResponsavel(responsavelId);
  return res.status(200).send(alunos);
};

export default {
  getAlunos,
  getAluno,
  createAluno,
  updateAluno,
  deleteAluno,
  getAlunosDaRota,
  vincularAlunoNaRota,
  removerAlunoDaRota,
  getAlunosDoResponsavel,
};
