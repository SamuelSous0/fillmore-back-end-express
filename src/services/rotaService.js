import { Op } from "sequelize";
import models from "../models/index.js";
import { AppError } from "../utils/index.js";

const getRotaIncludes = () => [
  { model: models.Motorista, as: "motorista" },
  ...(models.Aluno
    ? [
        { model: models.Aluno, as: "alunosIda" },
        { model: models.Aluno, as: "alunosVolta" },
      ]
    : []),
];

// Fórmula de Haversine para calcular distância em km entre duas coordenadas
// Aplica fator de tortuosidade viária urbana (1.3x) para estimativa realista de rua
const calcularDistanciaKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Raio da Terra em km

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanciaLinhaReta = R * c;

  return Number((distanciaLinhaReta * 1.3).toFixed(2));
};

// Estima tempo em minutos considerando velocidade urbana média (22 km/h) + tempo de parada
const calcularTempoTrechoMin = (distanciaKm, incluirParada = true) => {
  const VELOCIDADE_MEDIA_KMH = 22;
  const TEMPO_EMBARQUE_MIN = incluirParada ? 2 : 0;
  const minutosDeslocamento = (distanciaKm / VELOCIDADE_MEDIA_KMH) * 60;
  return Math.max(1, Math.round(minutosDeslocamento + TEMPO_EMBARQUE_MIN));
};

const getAllRotas = async (motoristaId) => {
  const where = motoristaId ? { motoristaId } : {};
  return await models.Rota.findAll({
    where,
    include: getRotaIncludes(),
  });
};

const getRotaById = async (id, motoristaId) => {
  const rota = await models.Rota.findByPk(id, {
    include: getRotaIncludes(),
  });

  if (!rota) {
    return null;
  }

  if (motoristaId && rota.motoristaId !== motoristaId) {
    throw new AppError("Acesso não autorizado a uma rota de outro motorista.", 403);
  }

  return rota;
};

const createRota = async (
  motoristaId,
  {
    nome,
    turno = "MANHA",
    pontoInicialLat,
    pontoInicialLng,
    pontoFinalLat,
    pontoFinalLng,
    distanciaTotalKm,
    tempoEstimadoMin,
  },
) => {
  const rota = await models.Rota.create({
    motoristaId,
    nome,
    turno,
    pontoInicialLat: pontoInicialLat !== undefined ? pontoInicialLat : null,
    pontoInicialLng: pontoInicialLng !== undefined ? pontoInicialLng : null,
    pontoFinalLat: pontoFinalLat !== undefined ? pontoFinalLat : null,
    pontoFinalLng: pontoFinalLng !== undefined ? pontoFinalLng : null,
    distanciaTotalKm: distanciaTotalKm !== undefined ? distanciaTotalKm : null,
    tempoEstimadoMin: tempoEstimadoMin !== undefined ? tempoEstimadoMin : null,
  });

  return await getRotaById(rota.id, motoristaId);
};

const updateRota = async (id, motoristaId, data) => {
  const rota = await getRotaById(id, motoristaId);
  if (!rota) {
    return null;
  }

  const updateData = {};
  if (data.nome !== undefined) updateData.nome = data.nome;
  if (data.turno !== undefined) updateData.turno = data.turno;
  if (data.pontoInicialLat !== undefined) updateData.pontoInicialLat = data.pontoInicialLat;
  if (data.pontoInicialLng !== undefined) updateData.pontoInicialLng = data.pontoInicialLng;
  if (data.pontoFinalLat !== undefined) updateData.pontoFinalLat = data.pontoFinalLat;
  if (data.pontoFinalLng !== undefined) updateData.pontoFinalLng = data.pontoFinalLng;
  if (data.distanciaTotalKm !== undefined) updateData.distanciaTotalKm = data.distanciaTotalKm;
  if (data.tempoEstimadoMin !== undefined) updateData.tempoEstimadoMin = data.tempoEstimadoMin;

  if (Object.keys(updateData).length > 0) {
    await rota.update(updateData);
  }

  return await getRotaById(id, motoristaId);
};

const deleteRota = async (id, motoristaId) => {
  const rota = await getRotaById(id, motoristaId);
  if (!rota) {
    return false;
  }

  await rota.destroy();
  return true;
};

const validarCapacidadeRota = async (rotaId) => {
  const rota = await models.Rota.findByPk(rotaId, {
    include: [{ model: models.Motorista, as: "motorista" }],
  });

  if (!rota) {
    throw new AppError("Rota não encontrada.", 404);
  }

  const capacidadeMaxima = rota.motorista?.capacidadeVan ?? 15;
  let vagasOcupadas = 0;

  if (models.Aluno) {
    const fkField = rota.turno === "TARDE" ? "rotaVoltaId" : "rotaIdaId";
    vagasOcupadas = await models.Aluno.count({
      where: { [fkField]: rota.id },
    });
  }

  if (vagasOcupadas >= capacidadeMaxima) {
    throw new AppError(
      `Capacidade máxima da van para esta rota (${rota.turno}) foi atingida.`,
      409,
    );
  }

  return {
    rota,
    capacidadeMaxima,
    vagasOcupadas,
    vagasDisponiveis: capacidadeMaxima - vagasOcupadas,
  };
};

// Calcula a Rota Inteligente (Vizinho Mais Próximo + filtro de viagens canceladas no dia)
const otimizarRota = async (
  id,
  motoristaId,
  { data, salvarNoBanco = true } = {},
) => {
  const rota = await getRotaById(id, motoristaId);
  if (!rota) {
    throw new AppError("Rota não encontrada.", 404);
  }

  const dataReferencia =
    data ||
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Recife",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  const ehTarde = rota.turno === "TARDE";
  const fkField = ehTarde ? "rotaVoltaId" : "rotaIdaId";
  const ordemField = ehTarde ? "ordemNaRotaVolta" : "ordemNaRotaIda";
  const tipoParada = ehTarde ? "DESEMBARQUE" : "EMBARQUE";

  const alunosDaRota = await models.Aluno.findAll({
    where: { [fkField]: rota.id },
  });

  // Verifica quais alunos cancelaram a viagem nesta data e turno
  const alunoIds = alunosDaRota.map((a) => a.id);
  const cancelamentosHoje =
    alunoIds.length > 0 && models.ViagemDiaria
      ? await models.ViagemDiaria.findAll({
          where: {
            alunoId: { [Op.in]: alunoIds },
            data: dataReferencia,
            turnoCancelado: { [Op.in]: [rota.turno, "AMBOS"] },
          },
        })
      : [];

  const mapaCancelamentos = new Map(
    cancelamentosHoje.map((c) => [c.alunoId, c]),
  );

  const alunosAtivos = [];
  const alunosCanceladosNoDia = [];

  for (const aluno of alunosDaRota) {
    if (mapaCancelamentos.has(aluno.id)) {
      const cancelamento = mapaCancelamentos.get(aluno.id);
      alunosCanceladosNoDia.push({
        alunoId: aluno.id,
        alunoNome: aluno.nome,
        turnoCancelado: cancelamento.turnoCancelado,
        motivoCancelamento: cancelamento.motivoCancelamento,
      });
    } else {
      alunosAtivos.push(aluno);
    }
  }

  // Extrai coordenadas conforme o turno (MANHA = embarque, TARDE = desembarque)
  const comCoordenadas = [];
  const semCoordenadas = [];

  for (const aluno of alunosAtivos) {
    const lat = ehTarde
      ? (aluno.latitudeDesembarque ?? aluno.latitudeEmbarque)
      : (aluno.latitudeEmbarque ?? aluno.latitudeDesembarque);
    const lng = ehTarde
      ? (aluno.longitudeDesembarque ?? aluno.longitudeEmbarque)
      : (aluno.longitudeEmbarque ?? aluno.longitudeDesembarque);
    const endereco = ehTarde
      ? (aluno.enderecoDesembarque ?? aluno.enderecoEmbarque)
      : (aluno.enderecoEmbarque ?? aluno.enderecoDesembarque);

    if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
      comCoordenadas.push({ aluno, lat: Number(lat), lng: Number(lng), endereco });
    } else {
      semCoordenadas.push({ aluno, lat: null, lng: null, endereco });
    }
  }

  // Define ponto de partida (pontoInicial da rota ou primeiro aluno com coordenada)
  let atualLat =
    rota.pontoInicialLat !== null && rota.pontoInicialLat !== undefined
      ? Number(rota.pontoInicialLat)
      : (comCoordenadas[0]?.lat ?? -8.1189);
  let atualLng =
    rota.pontoInicialLng !== null && rota.pontoInicialLng !== undefined
      ? Number(rota.pontoInicialLng)
      : (comCoordenadas[0]?.lng ?? -34.8988);

  // Algoritmo do Vizinho Mais Próximo (Nearest Neighbor)
  const naoVisitados = [...comCoordenadas];
  const paradas = [];
  let distanciaTotalKm = 0;
  let tempoEstimadoMin = 0;
  let ordemAtual = 1;

  while (naoVisitados.length > 0) {
    let indiceMaisProximo = 0;
    let menorDistancia = Infinity;

    for (let i = 0; i < naoVisitados.length; i++) {
      const candidato = naoVisitados[i];
      const dist = calcularDistanciaKm(
        atualLat,
        atualLng,
        candidato.lat,
        candidato.lng,
      );
      if (dist < menorDistancia) {
        menorDistancia = dist;
        indiceMaisProximo = i;
      }
    }

    const escolhido = naoVisitados.splice(indiceMaisProximo, 1)[0];
    const tempoTrecho = calcularTempoTrechoMin(menorDistancia, true);

    distanciaTotalKm += menorDistancia;
    tempoEstimadoMin += tempoTrecho;

    paradas.push({
      ordem: ordemAtual++,
      alunoId: escolhido.aluno.id,
      alunoNome: escolhido.aluno.nome,
      escola: escolhido.aluno.escola,
      tipoParada,
      endereco: escolhido.endereco,
      latitude: escolhido.lat,
      longitude: escolhido.lng,
      contatoEntrega: {
        nome: escolhido.aluno.nomeContatoEntrega,
        telefone: escolhido.aluno.telefoneContatoEntrega,
      },
      distanciaTrechoKm: menorDistancia,
      tempoTrechoMin: tempoTrecho,
    });

    atualLat = escolhido.lat;
    atualLng = escolhido.lng;
  }

  // Adiciona ao final alunos que não tinham latitude/longitude cadastrada
  for (const item of semCoordenadas) {
    paradas.push({
      ordem: ordemAtual++,
      alunoId: item.aluno.id,
      alunoNome: item.aluno.nome,
      escola: item.aluno.escola,
      tipoParada,
      endereco: item.endereco,
      latitude: null,
      longitude: null,
      contatoEntrega: {
        nome: item.aluno.nomeContatoEntrega,
        telefone: item.aluno.telefoneContatoEntrega,
      },
      distanciaTrechoKm: 0,
      tempoTrechoMin: 2,
    });
    tempoEstimadoMin += 2;
  }

  // Soma trecho até o ponto final (ex.: escola na manhã ou ponto final na tarde)
  let trechoFinalKm = 0;
  let trechoFinalMin = 0;
  if (
    paradas.length > 0 &&
    rota.pontoFinalLat !== null &&
    rota.pontoFinalLat !== undefined &&
    rota.pontoFinalLng !== null &&
    rota.pontoFinalLng !== undefined
  ) {
    trechoFinalKm = calcularDistanciaKm(
      atualLat,
      atualLng,
      Number(rota.pontoFinalLat),
      Number(rota.pontoFinalLng),
    );
    trechoFinalMin = calcularTempoTrechoMin(trechoFinalKm, false);
    distanciaTotalKm += trechoFinalKm;
    tempoEstimadoMin += trechoFinalMin;
  }

  distanciaTotalKm = Number(distanciaTotalKm.toFixed(2));

  // Persiste a nova ordem de embarque/desembarque e métricas da rota
  if (salvarNoBanco) {
    for (const parada of paradas) {
      await models.Aluno.update(
        { [ordemField]: parada.ordem },
        { where: { id: parada.alunoId } },
      );
    }

    if (paradas.length > 0) {
      await rota.update({
        distanciaTotalKm,
        tempoEstimadoMin,
      });
    }
  }

  // Monta array de waypoints prontos para renderização no mapa no Front-end
  const waypoints = [];
  if (rota.pontoInicialLat !== null && rota.pontoInicialLng !== null) {
    waypoints.push({
      tipo: "INICIO",
      descricao: "Ponto de partida da rota",
      latitude: Number(rota.pontoInicialLat),
      longitude: Number(rota.pontoInicialLng),
    });
  }

  for (const p of paradas) {
    if (p.latitude !== null && p.longitude !== null) {
      waypoints.push({
        tipo: "PARADA_ALUNO",
        ordem: p.ordem,
        alunoId: p.alunoId,
        alunoNome: p.alunoNome,
        endereco: p.endereco,
        latitude: p.latitude,
        longitude: p.longitude,
      });
    }
  }

  if (rota.pontoFinalLat !== null && rota.pontoFinalLng !== null) {
    waypoints.push({
      tipo: "FIM",
      descricao: "Destino final da rota",
      latitude: Number(rota.pontoFinalLat),
      longitude: Number(rota.pontoFinalLng),
      distanciaTrechoFinalKm: trechoFinalKm,
      tempoTrechoFinalMin: trechoFinalMin,
    });
  }

  return {
    rotaId: rota.id,
    nome: rota.nome,
    turno: rota.turno,
    dataReferencia,
    resumo: {
      totalAlunosVinculados: alunosDaRota.length,
      alunosAtivosHoje: alunosAtivos.length,
      alunosAusentesHoje: alunosCanceladosNoDia.length,
      distanciaTotalKm,
      tempoEstimadoMin,
    },
    pontoInicial: {
      latitude: rota.pontoInicialLat,
      longitude: rota.pontoInicialLng,
    },
    paradas,
    pontoFinal: {
      latitude: rota.pontoFinalLat,
      longitude: rota.pontoFinalLng,
    },
    alunosCanceladosNoDia,
    waypoints,
  };
};

export default {
  getAllRotas,
  getRotaById,
  createRota,
  updateRota,
  deleteRota,
  validarCapacidadeRota,
  otimizarRota,
};
