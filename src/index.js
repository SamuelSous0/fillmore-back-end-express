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
import { userService } from "./services/index.js";

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

const seedRotas = async () => {
  const rotasCount = await models.Rota.count();
  if (rotasCount >= 2) {
    return;
  }

  let motorista = await models.Motorista.findOne();
  if (!motorista) {
    const novoUsuarioMotorista = await userService.createUser({
      nome: "Carlos Silva",
      email: "carlos.motorista@fillmore.com",
      senha: "senhaSegura123",
      tipo: "MOTORISTA",
      telefone: "81999990001",
      cnh: "12345678900",
      placaVeiculo: "PEA-1234",
      capacidadeVan: 15,
      chavePix: "81999990001",
      titularPix: "Carlos Silva",
    });
    motorista = novoUsuarioMotorista.motorista;
  }

  await models.Rota.bulkCreate([
    {
      motoristaId: motorista.id,
      nome: "Rota Boa Viagem → Colégio Santa Maria",
      turno: "MANHA",
      pontoInicialLat: -8.1189,
      pontoInicialLng: -34.8988,
      pontoFinalLat: -8.1255,
      pontoFinalLng: -34.9032,
      distanciaTotalKm: 8.5,
      tempoEstimadoMin: 35,
    },
    {
      motoristaId: motorista.id,
      nome: "Rota Colégio Santa Maria → Boa Viagem",
      turno: "TARDE",
      pontoInicialLat: -8.1255,
      pontoInicialLng: -34.9032,
      pontoFinalLat: -8.1189,
      pontoFinalLng: -34.8988,
      distanciaTotalKm: 9.2,
      tempoEstimadoMin: 40,
    },
  ]);
};

if (syncDatabase) {
  sequelize
    .sync({ force: eraseDatabaseOnSync, alter: !eraseDatabaseOnSync })
    .then(async () => {
      await seedRotas();
      startServer();
    });
} else {
  startServer();
}

export default app;
