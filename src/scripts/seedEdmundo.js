import "dotenv/config";
import models, { sequelize } from "../models/index.js";

const seedEdmundo = async () => {
  try {
    console.log("Sincronizando tabelas de Edmundo...");
    await models.Presenca.sync();
    await models.ViagemDiaria.sync();
    await models.Notificacao.sync();
    console.log("Tabelas sincronizadas com sucesso!");

    const alunos = await models.Aluno.findAll();
    if (alunos.length === 0) {
      console.log("Nenhum aluno encontrado para associar seeds.");
      return;
    }

    const alunoLucas = alunos.find((a) => a.nome.includes("Lucas")) || alunos[0];
    const alunoMariana =
      alunos.find((a) => a.nome.includes("Mariana")) || alunos[1] || alunos[0];

    // 1. Presenças (Check-list diário)
    const presencasCount = await models.Presenca.count();
    if (presencasCount < 2) {
      await models.Presenca.bulkCreate([
        {
          alunoId: alunoLucas.id,
          data: "2026-11-03",
          turno: "MANHA",
          embarcou: true,
          horarioEmbarque: "06:45",
        },
        {
          alunoId: alunoLucas.id,
          data: "2026-11-03",
          turno: "TARDE",
          embarcou: true,
          horarioEmbarque: "12:15",
        },
        {
          alunoId: alunoMariana.id,
          data: "2026-11-03",
          turno: "MANHA",
          embarcou: true,
          horarioEmbarque: "07:05",
        },
      ]);
      console.log("Presenças pré-cadastradas com sucesso!");
    } else {
      console.log(`Presenças já existem no banco (${presencasCount} registros).`);
    }

    // 2. Viagens Diárias (Cancelamentos de viagem pelo responsável)
    const viagensCount = await models.ViagemDiaria.count();
    if (viagensCount < 2) {
      await models.ViagemDiaria.bulkCreate([
        {
          alunoId: alunoLucas.id,
          data: "2026-11-04",
          turnoCancelado: "MANHA",
          canceladaPeloResponsavel: true,
          motivoCancelamento: "Consulta médica pela manhã",
        },
        {
          alunoId: alunoMariana.id,
          data: "2026-11-05",
          turnoCancelado: "TARDE",
          canceladaPeloResponsavel: true,
          motivoCancelamento: "Pai vai buscar na escola à tarde",
        },
      ]);
      console.log("Viagens canceladas pré-cadastradas com sucesso!");
    } else {
      console.log(`Viagens já existem no banco (${viagensCount} registros).`);
    }

    // 3. Notificações (Avisos e cobranças)
    const notificacoesCount = await models.Notificacao.count();
    if (notificacoesCount < 2) {
      await models.Notificacao.bulkCreate([
        {
          alunoId: alunoLucas.id,
          tipo: "COBRANCA_MENSALIDADE",
          mensagem: `Lembrete: A mensalidade de ${alunoLucas.nome} referente ao mês 11/2026 está em aberto (Vencimento: 2026-11-10). Chave Pix do motorista: 81999990001 (Carlos Silva).`,
          timestamp: new Date("2026-11-01T08:00:00Z"),
          lida: false,
        },
        {
          alunoId: alunoLucas.id,
          tipo: "VIAGEM_CANCELADA",
          mensagem: `A viagem de ${alunoLucas.nome} do dia 2026-11-04 (manhã) foi cancelada. Motivo: Consulta médica pela manhã.`,
          timestamp: new Date("2026-11-02T14:30:00Z"),
          lida: false,
        },
        {
          alunoId: alunoMariana.id,
          tipo: "VAN_CHEGANDO",
          mensagem: `A van escolar está se aproximando do ponto de embarque (previsão: 5 minutos).`,
          timestamp: new Date("2026-11-03T07:00:00Z"),
          lida: true,
        },
      ]);
      console.log("Notificações pré-cadastradas com sucesso!");
    } else {
      console.log(
        `Notificações já existem no banco (${notificacoesCount} registros).`,
      );
    }

    console.log("Seeds de Edmundo executados com sucesso total!");
  } catch (error) {
    console.error("Erro ao executar seeds de Edmundo:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

seedEdmundo();
