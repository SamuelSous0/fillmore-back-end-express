
import { mensalidadeService } from "../services/index.js";
import { AppError } from "../utils/index.js";

// Verifica se o usuário tem acesso ao aluno.
const verificarAcessoAoAluno = async (alunoId, req) => {
  const aluno = await mensalidadeService.getAlunoComMotoristas(alunoId);

  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  if (req.user?.tipo === "RESPONSAVEL") {
    if (aluno.responsavelId !== req.user.responsavel?.id) {
      throw new AppError(
        "Acesso não autorizado às mensalidades deste aluno.",
        403,
      );
    }

    return aluno;
  }

  if (req.user?.tipo === "MOTORISTA") {
    const motoristaId = req.user.motorista?.id;

    const pertenceAoMotorista =
      aluno.rotaIda?.motorista?.id === motoristaId ||
      aluno.rotaVolta?.motorista?.id === motoristaId;

    if (!motoristaId || !pertenceAoMotorista) {
      throw new AppError(
        "Você não tem acesso às mensalidades deste aluno.",
        403,
      );
    }

    return aluno;
  }

  throw new AppError(
    "Você não tem permissão para acessar mensalidades.",
    403,
  );
};

// Verifica se o usuário pode gerenciar mensalidades.
const verificarPermissaoDeGerenciamento = async (alunoId, req) => {
  if (req.user?.tipo !== "MOTORISTA") {
    throw new AppError(
      "Somente o motorista responsável pode gerenciar mensalidades.",
      403,
    );
  }

  return await verificarAcessoAoAluno(alunoId, req);
};

// Lista mensalidades de um aluno.
const getMensalidadesDoAluno = async (req, res) => {
  const { alunoId } = req.params;

  await verificarAcessoAoAluno(alunoId, req);

  const mensalidades =
    await mensalidadeService.getMensalidadesDoAluno(alunoId);

  return res.status(200).send(mensalidades);
};

// Busca uma mensalidade específica.
const getMensalidade = async (req, res) => {
  const { alunoId, mensalidadeId } = req.params;

  await verificarAcessoAoAluno(alunoId, req);

  const mensalidade =
    await mensalidadeService.getMensalidadeById(mensalidadeId);

  if (!mensalidade || mensalidade.alunoId !== alunoId) {
    throw new AppError("Mensalidade não encontrada.", 404);
  }

  return res.status(200).send(mensalidade);
};

// Cria uma mensalidade.
const createMensalidade = async (req, res) => {
  const { alunoId } = req.params;

  const {
    mesReferencia,
    anoReferencia,
    valor,
    dataVencimento,
  } = req.body || {};

  await verificarPermissaoDeGerenciamento(alunoId, req);

  if (
    mesReferencia === undefined ||
    anoReferencia === undefined ||
    valor === undefined ||
    !dataVencimento
  ) {
    throw new AppError(
      "Mês, ano, valor e data de vencimento são obrigatórios.",
      400,
    );
  }

  const mensalidade = await mensalidadeService.createMensalidade(
    alunoId,
    {
      mesReferencia,
      anoReferencia,
      valor,
      dataVencimento,
    },
  );

  return res.status(201).send(mensalidade);
};

// Registra o pagamento.
const registrarPagamento = async (req, res) => {
  const { alunoId, mensalidadeId } = req.params;

  await verificarPermissaoDeGerenciamento(alunoId, req);

  const mensalidade =
    await mensalidadeService.getMensalidadeById(mensalidadeId);

  if (!mensalidade || mensalidade.alunoId !== alunoId) {
    throw new AppError("Mensalidade não encontrada.", 404);
  }

  const atualizada = await mensalidadeService.registrarPagamento(
    mensalidadeId,
    req.body?.dataPagamento || new Date(),
  );

  return res.status(200).send(atualizada);
};

// Atualiza uma mensalidade.
const updateMensalidade = async (req, res) => {
  const { alunoId, mensalidadeId } = req.params;

  await verificarPermissaoDeGerenciamento(alunoId, req);

  const existente =
    await mensalidadeService.getMensalidadeById(mensalidadeId);

  if (!existente || existente.alunoId !== alunoId) {
    throw new AppError("Mensalidade não encontrada.", 404);
  }

  const mensalidade = await mensalidadeService.updateMensalidade(
    mensalidadeId,
    req.body || {},
  );

  return res.status(200).send(mensalidade);
};

// Exclui uma mensalidade.
const deleteMensalidade = async (req, res) => {
  const { alunoId, mensalidadeId } = req.params;

  await verificarPermissaoDeGerenciamento(alunoId, req);

  const existente =
    await mensalidadeService.getMensalidadeById(mensalidadeId);

  if (!existente || existente.alunoId !== alunoId) {
    throw new AppError("Mensalidade não encontrada.", 404);
  }

  await mensalidadeService.deleteMensalidade(mensalidadeId);

  return res.status(204).send();
};

// Lista as mensalidades pendentes de um responsável.
const getMensalidadesPendentesDoResponsavel = async (req, res) => {
  const { responsavelId } = req.params;

  if (
    req.user?.tipo !== "RESPONSAVEL" ||
    req.user.responsavel?.id !== responsavelId
  ) {
    throw new AppError(
      "Acesso não autorizado às mensalidades deste responsável.",
      403,
    );
  }

  const resultado =
    await mensalidadeService.getMensalidadesPendentesDoResponsavel(
      responsavelId,
    );

  return res.status(200).send(resultado);
};

export default {
  getMensalidadesDoAluno,
  getMensalidade,
  createMensalidade,
  registrarPagamento,
  updateMensalidade,
  deleteMensalidade,
  getMensalidadesPendentesDoResponsavel,
};
