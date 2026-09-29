# Projetos Fiscais — painel da diretoria

Painel visual para a diretoria acompanhar os projetos de levantamento de créditos fiscais e
previdenciários da Veiga Partners. Os dados vêm do **Monday** (workspace *TAX - Consultivo*) e o
painel é publicado no **GitHub Pages**, protegido por senha.

Para cada projeto o painel mostra:

| Informação | De onde vem |
| --- | --- |
| **Empresa** | nome do quadro do cliente no Monday |
| **Entrada** | data de criação do quadro |
| **Etapa atual** (e a fase: onboarding, análise, diagnóstico, entrega, pós-entrega) | item marcado como *Parado* ou, senão, o item *Em andamento* mais avançado; sem nenhum em andamento, o próximo item ainda não iniciado |
| **Com quem está** | coluna *Resp.* da etapa atual |
| **Parado há** | dias desde a última atividade na etapa atual (mudança de status, subtarefa ou comentário) |
| **Próximo passo** | próximo item ainda não iniciado do quadro |
| **Semáforo** | *Crítico* (> 15 dias ou marcado “Parado”), *Atenção* (8–15 dias), *Em dia* (≤ 7 dias) |

Também traz os indicadores gerais (ativos, críticos, sem responsável, tempo típico parado), a
distribuição dos projetos por fase e por responsável, as entradas por mês e, ao clicar num
projeto, todas as frentes (grupos do quadro — por exemplo cada CNPJ), as subtarefas em aberto e o
último comentário da etapa.

## Como funciona

```
Monday (API) ──► GitHub Actions (de hora em hora) ──► página criptografada ──► GitHub Pages
                 coleta + calcula + criptografa        (só abre com a senha)
```

- Este repositório é **público**: aqui fica só o código. Nenhum dado de cliente é versionado.
- A cada execução, o workflow `Atualizar painel` lê o Monday, calcula os indicadores e gera uma
  página única com os dados **criptografados (AES-256-GCM, chave derivada da senha com
  PBKDF2-SHA256, 600 mil iterações)**. Sem a senha, o conteúdo publicado é ilegível.
- O token do Monday fica só nos *secrets* do GitHub e nunca chega ao navegador.
- Atualização automática de hora em hora das 7h às 20h (seg–sex) e uma vez por dia no fim de
  semana. Também dá para atualizar na hora pelo botão *Run workflow*.

## Configuração (uma vez)

1. **Token do Monday** — no Monday, clique na sua foto → *Developers* → *My access tokens* →
   copie o token. O painel enxerga os mesmos quadros que o dono do token; use a conta de alguém
   com acesso a todos os quadros do *TAX - Consultivo*.
2. **Senha da diretoria** — escolha uma senha forte (mínimo de 12 caracteres; prefira uma frase
   longa). É ela que protege os dados publicados.
3. No GitHub, em **Settings → Secrets and variables → Actions → New repository secret**, crie:
   - `MONDAY_API_TOKEN` — o token do passo 1
   - `DASHBOARD_PASSWORD` — a senha do passo 2
4. O site é publicado no branch `gh-pages` (Settings → Pages → *Deploy from a branch* → `gh-pages`).
5. Em **Actions → Atualizar painel → Run workflow**, rode a primeira atualização.
6. Acesse **https://veigalaw.github.io/projetosfiscais/** e entre com a senha. A opção
   *Lembrar neste dispositivo* evita digitar a senha de novo naquele navegador (o botão *Sair*
   apaga).

Para **trocar a senha**, atualize o secret `DASHBOARD_PASSWORD` e rode o workflow de novo — a
senha antiga deixa de funcionar na próxima publicação.

## Ajustes (`config.json`)

- `workspaceIds` — workspaces do Monday lidos (hoje, o *TAX - Consultivo*).
- `quadros.excluirIds` — quadros que não são projetos de cliente (hoje: visões *Projects* e
  *Project Timeline*, *Oportunidades*, *Oportunidades Previdenciárias*, *Postagens*,
  *Reforma Tributária - Temas*, *Assuntos internos*, *Criar app Vibe* e o quadro da pasta *GCAP*).
  Para tirar ou incluir um quadro, use o número que aparece na URL dele no Monday.
- `quadros.excluirNomes` — padrões de nome ignorados (*Subelementos de…*, *Duplicata de…*,
  *Modelo*, *Old*). Quadros com a coluna *Project Health (RAG)* (visões resumidas de 1 item) também
  são ignorados.
- `quadros.ajustes` — correções por quadro, se precisar. Exemplo:
  `"18400000000": { "empresa": "Nome correto", "tipo": "Fiscal", "entrada": "2026-01-10" }`.
- `limites` — dias para *Atenção* e *Crítico*, e após quantas horas sem atualizar o painel avisa
  que os dados estão desatualizados.
- `fases` — palavras que classificam cada etapa numa fase (sem acento, minúsculas, expressão
  regular). `prioridadeDasFases` define a ordem de teste.

Quadro novo de cliente criado no workspace entra no painel automaticamente na próxima
atualização. Para o painel ficar fiel, basta a equipe manter no Monday o **status**, o
**responsável** e os **comentários** de cada etapa.

## Desenvolvimento local

Requer Node.js 20+ (sem dependências externas).

```bash
npm test                                             # testes (dados fictícios)
MONDAY_API_TOKEN=... node scripts/build.mjs --previa # gera previa/index.html sem senha
MONDAY_API_TOKEN=... DASHBOARD_PASSWORD=... node scripts/build.mjs  # gera dist/ como em produção
```

`previa/`, `dist/` e coletas salvas com `--salvar-bruto` contêm dados de clientes e estão no
`.gitignore` — nunca os adicione ao repositório.

Estrutura:

- `scripts/lib/monday.mjs` — coleta via API GraphQL do Monday (somente leitura)
- `scripts/lib/transform.mjs` — regras: etapa atual, próximo passo, tempo parado, semáforo
- `scripts/lib/cripto.mjs` — criptografia dos dados
- `scripts/build.mjs` — junta tudo e gera a página
- `site/` — página do painel (HTML, CSS e JavaScript puros)
- `.github/workflows/painel.yml` — atualização e publicação automáticas (branch `gh-pages`)
