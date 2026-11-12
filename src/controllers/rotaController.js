import { rotaService } from "../services/index.js";
import { AppError } from "../utils/index.js";

const ensureMotorista = (req) => {
  const motoristaId = req.user?.motorista?.id;
  if (req.user?.tipo !== "MOTORISTA" || !motoristaId) {
    throw new AppError("Apenas usuários do tipo MOTORISTA podem gerenciar rotas.", 403);
  }
  return motoristaId;
};

const getRotas = async (req, res) => {
  const motoristaId = ensureMotorista(req);
  const rotas = await rotaService.getAllRotas(motoristaId);
  return res.status(200).send(rotas);
};

const getRota = async (req, res) => {
  const motoristaId = ensureMotorista(req);
  const rota = await rotaService.getRotaById(req.params.id, motoristaId);

  if (!rota) {
    throw new AppError("Rota não encontrada.", 404);
  }

  return res.status(200).send(rota);
};

const createRota = async (req, res) => {
  const motoristaId = ensureMotorista(req);
  const {
    nome,
    turno,
    pontoInicialLat,
    pontoInicialLng,
    pontoFinalLat,
    pontoFinalLng,
    distanciaTotalKm,
    tempoEstimadoMin,
  } = req.body || {};

  if (!nome || !turno) {
    throw new AppError("Nome e turno da rota são campos obrigatórios.", 400);
  }

  const rota = await rotaService.createRota(motoristaId, {
    nome,
    turno,
    pontoInicialLat,
    pontoInicialLng,
    pontoFinalLat,
    pontoFinalLng,
    distanciaTotalKm,
    tempoEstimadoMin,
  });

  return res.status(201).send(rota);
};

const updateRota = async (req, res) => {
  const motoristaId = ensureMotorista(req);
  const rota = await rotaService.updateRota(req.params.id, motoristaId, req.body || {});

  if (!rota) {
    throw new AppError("Rota não encontrada.", 404);
  }

  return res.status(200).send(rota);
};

const deleteRota = async (req, res) => {
  const motoristaId = ensureMotorista(req);
  const isDeleted = await rotaService.deleteRota(req.params.id, motoristaId);

  if (!isDeleted) {
    throw new AppError("Rota não encontrada.", 404);
  }

  return res.status(204).send();
};

// Recalcula e salva a melhor sequência de paradas (Rota Inteligente)
const otimizarRota = async (req, res) => {
  const motoristaId = ensureMotorista(req);
  const data = req.body?.data || req.query?.data;

  const resultado = await rotaService.otimizarRota(req.params.id, motoristaId, {
    data,
    salvarNoBanco: true,
  });

  return res.status(200).send(resultado);
};

// Obtém o trajeto inteligente do dia (excluindo alunos com viagem cancelada na data)
const getTrajetoOtimizado = async (req, res) => {
  const motoristaId =
    req.user?.tipo === "MOTORISTA" ? req.user?.motorista?.id : null;
  const data = req.query?.data;

  const resultado = await rotaService.otimizarRota(req.params.id, motoristaId, {
    data,
    salvarNoBanco: Boolean(motoristaId),
  });

  return res.status(200).send(resultado);
};

export default {
  getRotas,
  getRota,
  createRota,
  updateRota,
  deleteRota,
  otimizarRota,
  getTrajetoOtimizado,
};
