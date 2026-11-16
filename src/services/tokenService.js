import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import models, { sequelize } from "../models/index.js";
import userService from "./userService.js";
import { AppError } from "../utils/index.js";

const getAccessSecret = () => process.env.JWT_SECRET || "default_jwt_secret";
const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || "default_jwt_refresh_secret";

const generateAccessToken = (user) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || "15m";
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      tipo: user.tipo,
      type: "access",
    },
    getAccessSecret(),
    {
      expiresIn,
      jwtid: randomUUID(),
    },
  );
};

const createRefreshToken = async (
  user,
  familiaId = randomUUID(),
  transaction = null,
) => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  const refreshToken = jwt.sign(
    {
      id: user.id,
      familiaId,
      type: "refresh",
    },
    getRefreshSecret(),
    {
      expiresIn,
      jwtid: randomUUID(),
    },
  );

  const decoded = jwt.decode(refreshToken);
  const expiraEm = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await models.RefreshToken.create(
    {
      token: refreshToken,
      usuarioId: user.id,
      familiaId,
      revogado: false,
      expiraEm,
    },
    ...(transaction ? [{ transaction }] : []),
  );

  return refreshToken;
};

const generateAuthTokens = async (user) => {
  const token = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user);
  return { token, refreshToken };
};

const rotateRefreshToken = async (oldRefreshToken) => {
  if (!oldRefreshToken) {
    throw new AppError("Refresh token é obrigatório.", 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(oldRefreshToken, getRefreshSecret(), {
      ignoreExpiration: true,
    });
  } catch {
    throw new AppError("Refresh token inválido.", 401);
  }

  if (decoded.type && decoded.type !== "refresh") {
    throw new AppError("Token fornecido não é um refresh token válido.", 401);
  }

  const storedToken = await models.RefreshToken.findOne({
    where: { token: oldRefreshToken },
  });

  if (!storedToken) {
    throw new AppError("Refresh token inválido ou não reconhecido.", 401);
  }

  // Detecção de reuso de Refresh Token (rotação segura)
  if (storedToken.revogado) {
    await models.RefreshToken.update(
      { revogado: true },
      { where: { familiaId: storedToken.familiaId } },
    );
    throw new AppError(
      "Tentativa de reutilização de refresh token detectada. Por segurança, a sessão foi encerrada.",
      401,
    );
  }

  if (
    new Date() > new Date(storedToken.expiraEm) ||
    (decoded.exp && Date.now() >= decoded.exp * 1000)
  ) {
    await storedToken.update({ revogado: true });
    throw new AppError("Refresh token expirado. Faça login novamente.", 401);
  }

  const user = await userService.getUserById(storedToken.usuarioId);
  if (!user) {
    await storedToken.update({ revogado: true });
    throw new AppError("Usuário associado ao refresh token não encontrado.", 401);
  }

  return await sequelize.transaction(async (t) => {
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await createRefreshToken(
      user,
      storedToken.familiaId,
      t,
    );

    await storedToken.update(
      {
        revogado: true,
        substituidoPorToken: newRefreshToken,
      },
      { transaction: t },
    );

    return {
      user,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };
  });
};

const revokeToken = async (token, expiraEm) => {
  return await models.TokenRevogado.create({
    token,
    expiraEm: expiraEm
      ? new Date(expiraEm * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
};

const revokeRefreshTokens = async ({ usuarioId, refreshToken }) => {
  if (refreshToken) {
    const stored = await models.RefreshToken.findOne({
      where: { token: refreshToken },
    });
    if (stored) {
      await models.RefreshToken.update(
        { revogado: true },
        { where: { familiaId: stored.familiaId } },
      );
      return;
    }
  }

  if (usuarioId) {
    await models.RefreshToken.update(
      { revogado: true },
      { where: { usuarioId, revogado: false } },
    );
  }
};

const isTokenRevoked = async (token) => {
  const revoked = await models.TokenRevogado.findOne({
    where: { token },
  });
  return !!revoked;
};

export default {
  generateAccessToken,
  createRefreshToken,
  generateAuthTokens,
  rotateRefreshToken,
  revokeToken,
  revokeRefreshTokens,
  isTokenRevoked,
};
