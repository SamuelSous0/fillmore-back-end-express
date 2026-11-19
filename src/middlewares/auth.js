import jwt from "jsonwebtoken";
import { AppError } from "../utils/index.js";
import { tokenService, userService, alunoService } from "../services/index.js";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Token de autenticação não fornecido.", 401);
  }

  const token = authHeader.split(" ")[1];

  const revoked = await tokenService.isTokenRevoked(token);
  if (revoked) {
    throw new AppError("Sessão finalizada ou token revogado. Faça login novamente.", 401);
  }

  const secret = process.env.JWT_SECRET || "default_jwt_secret";
  const decoded = jwt.verify(token, secret);

  if (decoded.type === "refresh") {
    throw new AppError(
      "Refresh token não pode ser utilizado para autenticar requisições diretas.",
      401,
    );
  }

  const user = await userService.getUserById(decoded.id);
  if (!user) {
    throw new AppError("Usuário associado a este token não foi encontrado.", 401);
  }

  req.user = user;
  req.token = token;
  req.tokenPayload = decoded;

  next();
};

/**
 * Middleware de Controle de Acesso Baseado em Papéis (RBAC):
 * Restringe o acesso da rota aos papéis especificados (ex: "MOTORISTA", "RESPONSAVEL", "ADMIN").
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    const user = req.user;
    const userRole = user?.role || user?.tipo;

    if (!user || (!roles.includes(userRole) && !roles.includes(user.tipo))) {
      throw new AppError("Você não tem permissão para executar esta ação.", 403);
    }

    next();
  };
};

/**
 * Middleware de Validação de Propriedade de Usuário:
 * Permite consulta, alteração ou exclusão de cadastro apenas ao próprio titular ou ADMIN.
 */
export const isUserOwner = (req, res, next) => {
  const user = req.user;
  if (!user) {
    throw new AppError("Acesso não autorizado. Autenticação obrigatória.", 401);
  }

  if (req.params.userId !== user.id && user.role !== "ADMIN") {
    throw new AppError("Acesso não autorizado aos dados de outro usuário.", 403);
  }

  next();
};

/**
 * Middleware de Validação de Propriedade de Aluno:
 * Garante que um RESPONSAVEL acesse/modifique apenas seus próprios alunos
 * e anexa a instância em `req.aluno` para evitar consultas SELECT duplicadas.
 */
export const isAlunoOwner = async (req, res, next) => {
  const user = req.user;
  if (!user) {
    throw new AppError("Acesso não autorizado. Autenticação obrigatória.", 401);
  }

  const alunoId = req.params.id || req.params.alunoId;
  const aluno = await alunoService.getAlunoById(alunoId);
  if (!aluno) {
    throw new AppError("Aluno não encontrado.", 404);
  }

  if (
    user.tipo === "RESPONSAVEL" &&
    user.responsavel?.id &&
    aluno.responsavelId !== user.responsavel.id &&
    user.role !== "ADMIN"
  ) {
    throw new AppError("Acesso não autorizado a dados de outro responsável.", 403);
  }

  req.aluno = aluno;
  next();
};

/**
 * Middleware de Validação de Propriedade de Responsável:
 * Garante que um usuário do tipo RESPONSAVEL consulte apenas os dados do seu próprio perfil.
 */
export const isResponsavelOwner = (req, res, next) => {
  const user = req.user;
  if (!user) {
    throw new AppError("Acesso não autorizado. Autenticação obrigatória.", 401);
  }

  if (
    user.tipo === "RESPONSAVEL" &&
    user.responsavel?.id &&
    user.responsavel.id !== req.params.responsavelId &&
    user.role !== "ADMIN"
  ) {
    throw new AppError("Acesso não autorizado aos alunos de outro responsável.", 403);
  }

  next();
};

export default authMiddleware;
