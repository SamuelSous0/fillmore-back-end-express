import argon2 from "argon2";
import { userService, tokenService } from "../services/index.js";
import { AppError } from "../utils/index.js";

const login = async (req, res) => {
  const { email, senha } = req.body || {};

  if (!email || !senha) {
    throw new AppError("E-mail e senha são campos obrigatórios.", 400);
  }

  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new AppError("Credenciais inválidas.", 401);
  }

  const isPasswordValid = await argon2.verify(user.senha, senha);
  if (!isPasswordValid) {
    throw new AppError("Credenciais inválidas.", 401);
  }

  const { token, refreshToken } = await tokenService.generateAuthTokens(user);

  return res.status(200).send({
    user,
    token,
    refreshToken,
  });
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    throw new AppError("Refresh token é obrigatório.", 400);
  }

  const sessionData = await tokenService.rotateRefreshToken(refreshToken);

  return res.status(200).send(sessionData);
};

const logout = async (req, res) => {
  if (req.token) {
    await tokenService.revokeToken(req.token, req.tokenPayload?.exp);
  }

  await tokenService.revokeRefreshTokens({
    usuarioId: req.user?.id,
    refreshToken: req.body?.refreshToken,
  });

  return res.status(204).send();
};

const getSession = async (req, res) => {
  if (!req.user) {
    throw new AppError("Usuário não autenticado.", 401);
  }

  return res.status(200).send(req.user);
};

export default {
  login,
  refresh,
  logout,
  getSession,
};
