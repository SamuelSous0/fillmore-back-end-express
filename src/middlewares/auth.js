import jwt from "jsonwebtoken";
import { AppError } from "../utils/index.js";
import { tokenService, userService } from "../services/index.js";

const authMiddleware = async (req, res, next) => {
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

  const user = await userService.getUserById(decoded.id);
  if (!user) {
    throw new AppError("Usuário associado a este token não foi encontrado.", 401);
  }

  req.user = user;
  req.token = token;
  req.tokenPayload = decoded;

  next();
};

export default authMiddleware;
