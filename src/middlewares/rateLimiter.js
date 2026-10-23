import { rateLimit } from "express-rate-limit";
import { AppError } from "../utils/index.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export const limiterMiddleware = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res, next) => {
    next(
      new AppError(
        "Muitas requisições originadas deste IP. Tente novamente em 15 minutos.",
        429,
      ),
    );
  },
});

export const authLimiterMiddleware = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res, next) => {
    next(
      new AppError(
        "Muitas tentativas de autenticação originadas deste IP. Tente novamente em 15 minutos.",
        429,
      ),
    );
  },
});

export default {
  limiterMiddleware,
  authLimiterMiddleware,
};
