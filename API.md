# API compartilhada do educa+

O servidor Node.js disponibiliza uma API REST no mesmo domínio da aplicação. Os dados de contas, sessões, turmas e notas ficam no PostgreSQL, então podem ser acessados em outros aparelhos.

## Autenticação

As rotas autenticadas usam um cookie de sessão `HttpOnly`, criado por `/api/auth/login` ou `/api/auth/register`. O navegador o envia automaticamente nas chamadas ao mesmo domínio.

- `POST /api/auth/register` — cria conta. Corpo: `{ "identifier": "email ou usuário", "loginMethod": "email | username", "role": "aluno | professor | diretor | programador", "password": "...", "joinCode": "opcional" }`. Alunos entram somente com e-mail. O código de turma é opcional e exclusivo para alunos.
- `POST /api/auth/login` — recebe `identifier`, `loginMethod`, `role` e `password`.
- `GET /api/auth/me` — devolve a conta da sessão atual ou `account: null`.
- `POST /api/auth/logout` — encerra a sessão.
- `GET /api/health` — verifica a disponibilidade da API e do banco.

Professores podem entrar com e-mail e senha ou usuário e senha. Contas de diretor e Programador continuam exigindo a senha administrativa configurada no servidor; ela não é armazenada na conta. As duas opções de identificador são formas alternativas de login, não autenticação em dois fatores.

## Contas

- `GET /api/accounts` — diretor e Programador consultam as contas da plataforma; professores recebem os alunos das próprias turmas.
- `PATCH /api/accounts/:id` — somente Programador. Altera e-mail, usuário, perfil entre contas não administrativas e estado ativo/suspenso. Alterações de perfil encerram as sessões existentes.
- `DELETE /api/accounts/:id` — somente Programador. Remove a conta, seus vínculos com turmas e as notas vinculadas; não permite excluir a própria conta nem o último Programador ativo.

## Turmas

- `GET /api/classes` — lista as turmas visíveis ao usuário.
- `POST /api/classes` — professor cria uma turma própria; diretor ou Programador também pode criar e atribuir um professor.
- `PATCH /api/classes/:id` — professor responsável altera o nome; diretor ou Programador também pode atribuir outro professor.
- `DELETE /api/classes/:id` — professor responsável, diretor ou Programador exclui a turma, seus vínculos e as notas relacionadas.
- `POST /api/classes/join` — aluno entra com `{ "code": "CODIGO" }`.
- `POST /api/classes/:sourceId/transfer` — professor transfere um aluno entre suas turmas com `{ "studentId": "UUID", "targetClassId": "UUID" }`. Diretor e Programador também podem transferir.

O código de entrada é mostrado ao professor após a criação da turma.

## Notas

- `GET /api/grades` — aluno consulta as próprias notas; professor consulta notas das próprias turmas; diretor e Programador consultam todas.
- `POST /api/grades` — equipe registra ou atualiza uma nota. Corpo: `{ "classroomId": "UUID", "studentId": "UUID", "activityTitle": "Atividade", "questionScores": [{ "title": "Questão 1", "possible": 2, "earned": 1.5 }] }`. Aceita de 1 a 8 questões; a soma dos valores define os pontos da atividade e a nota é exibida em escala de 0 a 10.

As rotas de escrita validam a sessão e as permissões no servidor. Os valores recebidos são consultados com parâmetros SQL; não exponha senhas ou segredos em respostas da API.
