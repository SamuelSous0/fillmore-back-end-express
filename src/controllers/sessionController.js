import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
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

  const isPasswordValid = await bcrypt.compare(senha, user.senha);
  if (!isPasswordValid) {
    throw new AppError("Credenciais inválidas.", 401);
  }

  const secret = process.env.JWT_SECRET || "default_jwt_secret";
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      tipo: user.tipo,
    },
    secret,
    {
      expiresIn: "24h",
    },
  );

  return res.status(200).send({
    user,
    token,
  });
};

const logout = async (req, res) => {
  if (req.token) {
    await tokenService.revokeToken(req.token, req.tokenPayload?.exp);
  }

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
  logout,
  getSession,
};
