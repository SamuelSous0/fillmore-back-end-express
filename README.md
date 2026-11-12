# Fillmore Back-End API

API RESTful desenvolvida em Node.js e Express para o gerenciamento logístico e financeiro de transporte escolar (vans escolares). Projeto desenvolvido para a disciplina de Aplicações Orientadas a Serviços (AOS) — UNICAP.

## Integrantes

- Samuel Alexandre de Sousa Barbosa — RA: 00000859887
- Paulo Cesar Mendes de Jesus Neto — RA: 00000859899
- Edmundo Cariolano da Silva — RA: 00000859930
- Sammuel Victor Santana de Souza — RA: 00000859904
- João Victor de Oliveira Chaves — RA: 00000859881

## Tecnologias Utilizadas

- **Runtime e Framework:** Node.js (ES Modules), Express 5
- **Banco de Dados e ORM:** PostgreSQL (NeonDB), Sequelize
- **Autenticação e Segurança:** JWT (`jsonwebtoken`), `bcrypt`, `helmet`, `cors`, `express-rate-limit`
- **Validação de Dados:** `zod`
- **Hospedagem:** Vercel

## Funcionalidades Principais

- **Autenticação e Usuários:** Cadastro de motoristas e responsáveis, login com JWT, controle de sessão e revogação de tokens (logout).
- **Gestão de Rotas e Rota Inteligente:** Cadastro de rotas por turno, controle de capacidade máxima da van e otimização automática da ordem de paradas por proximidade geográfica (fórmula de Haversine), ignorando alunos com ausência registrada no dia.
- **Gestão de Alunos:** Cadastro de alunos vinculados a responsáveis e rotas, com suporte a endereços distintos de embarque e desembarque (guarda compartilhada).
- **Controle de Mensalidades:** Geração de cobranças mensais, atualização automática de vencimento (`ATRASADO`), baixa de pagamento e consulta de pendências com dados Pix do motorista.
- **Operação Diária e Notificações:** Check-list de presença diária, cancelamento antecipado de viagens pelos responsáveis e disparo de notificações automáticas e lembretes de cobrança.

## Configuração e Execução Local

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure o arquivo `.env` na raiz do projeto:
   ```env
   PORT=4001
   DATABASE_URL="postgresql://usuario:senha@host/neondb?sslmode=require"
   JWT_SECRET="sua_chave_secreta"
   JWT_EXPIRES_IN="1h"
   BCRYPT_ROUNDS=10
   ```

3. Inicie o servidor (a sincronização com o banco é feita automaticamente na inicialização):
   ```bash
   npm run dev
   ```

## Principais Endpoints

| Recurso | Endpoints |
| :--- | :--- |
| **Autenticação e Usuários** | `POST /users`, `POST /session`, `DELETE /session`, `GET /users`, `GET /users/:userId`, `PUT /users/:userId`, `DELETE /users/:userId` |
| **Rotas Escolares** | `GET /rotas`, `POST /rotas`, `GET /rotas/:rotaId`, `PUT /rotas/:rotaId`, `DELETE /rotas/:rotaId`, `POST /rotas/:rotaId/otimizar`, `GET /rotas/:rotaId/trajeto` |
| **Alunos** | `GET /alunos`, `POST /alunos`, `GET /alunos/:alunoId`, `PUT /alunos/:alunoId`, `DELETE /alunos/:alunoId`, `GET /responsaveis/:responsavelId/alunos`, `GET /rotas/:rotaId/alunos`, `POST /rotas/:rotaId/alunos`, `DELETE /rotas/:rotaId/alunos/:alunoId` |
| **Mensalidades** | `GET /alunos/:alunoId/mensalidades`, `POST /alunos/:alunoId/mensalidades`, `GET /alunos/:alunoId/mensalidades/:mensalidadeId`, `PUT /alunos/:alunoId/mensalidades/:mensalidadeId`, `PATCH /alunos/:alunoId/mensalidades/:mensalidadeId/pagamento`, `DELETE /alunos/:alunoId/mensalidades/:mensalidadeId`, `GET /responsaveis/:responsavelId/mensalidades/pendentes` |
| **Presenças e Viagens** | `GET /alunos/:alunoId/presencas`, `POST /alunos/:alunoId/presencas`, `PUT /alunos/:alunoId/presencas/:id`, `DELETE /alunos/:alunoId/presencas/:id`, `GET /alunos/:alunoId/viagens`, `POST /alunos/:alunoId/viagens`, `PUT /alunos/:alunoId/viagens/:id`, `DELETE /alunos/:alunoId/viagens/:id` |
| **Notificações** | `GET /alunos/:alunoId/notificacoes`, `POST /alunos/:alunoId/notificacoes`, `GET /responsaveis/:responsavelId/notificacoes`, `PATCH /notificacoes/:id/lida`, `POST /alunos/:alunoId/mensalidades/:mensalidadeId/cobrar` |

## Collection do Postman

A coleção completa para testes encontra-se em `postman/fillmore-api.postman_collection.json`.
