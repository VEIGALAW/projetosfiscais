# Projetos Fiscais — painel da diretoria

Painel visual para a diretoria acompanhar os projetos de levantamento de créditos fiscais e
previdenciários da Veiga Partners. Os dados vêm do **Monday** (workspace *TAX - Consultivo*) e o
painel é publicado no **GitHub Pages**, protegido por senha.

O painel é a versão executiva (visão de diretoria): uma frase de leitura no topo, indicadores
clicáveis, a esteira por fase, a carga por responsável, as maiores travas, os prazos do cronograma,
o ritmo da esteira e a lista de projetos com busca, filtros e trilha de etapas por frente.

| Informação | Como é calculada |
| --- | --- |
| **Projeto / frente / etapa** | quadro do Monday / grupo do quadro (normalmente uma empresa ou CNPJ) / item da esteira |
| **Empresa** e **tipo** | nome do quadro (ajustáveis em `config.json`) |
| **Entrada** | data de criação do quadro (ou da primeira etapa) |
| **Etapa atual** | item marcado *Parado* (tem precedência) ou, senão, o item *Em andamento* iniciado por último; sem nenhum em andamento, o próximo item ainda não feito |
| **Frente principal** | frente aberta com movimento mais recente; as demais aparecem ao abrir o projeto |
| **Com quem está** | coluna *Resp.* da etapa atual |
| **Parado há** | dias desde o último movimento em qualquer etapa da frente (mudança de status, subtarefa ou comentário) |
| **Semáforo** | *Crítico* (> 15 dias ou etapa *Parado*), *Atenção* (8–15 dias, ou em dia com outra frente crítica), *Em dia* (≤ 7 dias), *Concluído* (todas as etapas feitas) |
| **Fase** | inferida pelo nome da etapa (Onboarding → Análise inicial → Diagnóstico → Entrega → Pós-entrega; o resto vira "Outras etapas") |
| **Prazos** | campo *Cronograma* de cada etapa: vencidos e os que vencem em 14 dias |
| **Ritmo** | mediana de dias entre a conclusão de etapas consecutivas, por fase; projetos que entraram por mês |

Os números são calculados na própria página, a partir de uma tabela plana de etapas
(`scripts/lib/etapas.mjs`): a mesma página roda no dashboard interativo do Claude e aqui.

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
2. **Senha da diretoria** — escolha a senha da diretoria (mínimo de 8 caracteres; quanto mais longa, mais segura — prefira uma frase
   longa). É ela que protege os dados publicados.
3. No GitHub, em **Settings → Secrets and variables → Actions → New repository secret**, crie:
   - `MONDAY_API_TOKEN` — o token do passo 1
   - `DASHBOARD_PASSWORD` — a senha do passo 2
   - `FOTOS_JSON` (opcional) — as fotos dos responsáveis em base64 (ver abaixo)
4. O site é publicado no branch `gh-pages` (Settings → Pages → *Deploy from a branch* → `gh-pages`).
5. Em **Actions → Atualizar painel → Run workflow**, rode a primeira atualização.
6. Acesse **https://veigalaw.github.io/projetosfiscais/** e entre com a senha. A opção
   *Lembrar neste dispositivo* evita digitar a senha de novo naquele navegador (o botão *Sair*
   apaga).

**Fotos dos responsáveis.** A página mostra a foto de perfil (Microsoft 365) de quem responde por
cada etapa. Como o repositório é público, as fotos não ficam versionadas: elas entram pelo secret
`FOTOS_JSON`, que é o conteúdo de um `fotos.json` (lista de `{ "pessoa": "Nome como está no
Monday", "foto": "data:image/jpeg;base64,..." }`) codificado em base64 — por exemplo
`base64 -w0 fotos.json`. Localmente, basta deixar o `fotos.json` na raiz (ele está no
`.gitignore`). Quem não tiver foto aparece pelas iniciais.

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
  regular). `prioridadeDasFases` define a ordem de teste. Esses padrões alimentam o modelo
  antigo (`scripts/lib/transform.mjs`, mantido nos testes); a página atual usa as regras de fase
  embutidas nos seus cálculos.

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
- `scripts/lib/etapas.mjs` — tabela plana de etapas (uma linha por item) que a página consome
- `scripts/lib/transform.mjs` — modelo antigo (etapa atual, semáforo), mantido como referência e nos testes
- `scripts/lib/cripto.mjs` — criptografia dos dados
- `scripts/build.mjs` — junta tudo e gera a página
- `site/` — página do painel (HTML, CSS e JavaScript puros, sem dependências externas); `app.js` e
  `styles.css` carregam a casca (senha, tema) e, dentro dela, a mesma página do dashboard interativo
- `.github/workflows/painel.yml` — atualização e publicação automáticas (branch `gh-pages`)
