import "dotenv/config";
import express from "express";
import helmet from "helmet";
import models, { sequelize } from "./models/index.js";
import {
  corsMiddleware,
  logMiddleware,
  limiterMiddleware,
  notFoundMiddleware,
  errorMiddleware,
} from "./middlewares/index.js";
import * as routes from "./routes/index.js";

const app = express();

app.set("trust proxy", true);

// 1. Segurança de cabeçalhos HTTP
app.use(helmet());

// 2. CORS com verificação de origens autorizadas
app.use(corsMiddleware);

// 3. Parsing do body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Log de requisições
app.use(logMiddleware);

// 5. Rate limit geral (100 req / 15 min)
app.use(limiterMiddleware);

// 6. Rotas da aplicação
app.get("/", (req, res) => {
  return res.status(200).send({
    name: "Fillmore API",
    description: "Back-end Express 5 para transporte escolar informal (Recife)",
    status: "online",
  });
});

app.use("/session", routes.session);
app.use("/users", routes.user);
app.use("/rotas", routes.rota);
app.use("/alunos", routes.aluno);
app.use("/responsaveis", routes.responsavel);

// 7. Rota não encontrada (404)
app.use(notFoundMiddleware);

// 8. Middleware global de tratamento de erros
app.use(errorMiddleware);

const port = process.env.PORT || 4001;

const eraseDatabaseOnSync = process.env.ERASE_DATABASE_ON_SYNC === "true";
const syncDatabase =
  process.env.SYNC_DATABASE === "true" || eraseDatabaseOnSync;

const startServer = () => {
  app.listen(port, () => {
    console.log(`Fillmore API ouvindo na porta ${port}!`);
  });
};

if (syncDatabase) {
  sequelize.sync({ force: eraseDatabaseOnSync }).then(() => {
    startServer();
  });
} else {
  startServer();
}

export default app;
