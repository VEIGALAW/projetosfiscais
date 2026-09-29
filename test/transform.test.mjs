// Testes com dados fictícios — nunca coloque dados reais de clientes neste repositório (ele é público).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarPainel, nomeDaEmpresa, quadroSelecionado, classificarStatus } from '../scripts/lib/transform.mjs';
import { criptografar, descriptografar } from '../scripts/lib/cripto.mjs';
import { montarHtml } from '../scripts/build.mjs';

const AGORA = '2026-09-29T12:00:00.000Z';
const diasAtras = (n) => new Date(Date.parse(AGORA) - n * 86_400_000).toISOString();

const CONFIG = {
  titulo: 'Teste',
  quadros: {
    excluirIds: [999],
    excluirNomes: ['^Subelementos de', '^Duplicata de'],
    excluirSeTiverColuna: ['Project Health (RAG)'],
  },
  limites: { atencaoAposDias: 7, criticoAposDias: 15, dadosDesatualizadosAposHoras: 30 },
  fases: [
    { id: 'onboarding', nome: 'Onboarding', padrao: 'recepcion|documenta' },
    { id: 'diagnostico', nome: 'Diagnóstico', padrao: 'diagnostico' },
    { id: 'entrega', nome: 'Entrega', padrao: 'apresentacao' },
  ],
  prioridadeDasFases: ['entrega', 'onboarding', 'diagnostico'],
};

const COLUNAS = [
  { id: 'name', title: 'Nome', type: 'name' },
  { id: 'project_owner', title: 'Resp.', type: 'people' },
  { id: 'project_status', title: 'Status', type: 'status' },
  { id: 'project_priority', title: 'Prioridade', type: 'status' },
];

const ROTULOS = { feito: 'Feito', andamento: 'Em andamento', parado: 'Parado', pendente: 'Aguardando etapa anterior' };

function item(nome, estado, { grupo = 'g1', resp = 'Ana Souza', mudou = null, comentario = null, subitens = [] } = {}) {
  return {
    id: `${grupo}-${nome}`,
    name: nome,
    state: 'active',
    created_at: diasAtras(100),
    group: { id: grupo },
    column_values: [
      { id: 'project_owner', type: 'people', text: resp },
      // A coluna de prioridade vem antes e não pode ser confundida com o status da etapa.
      { id: 'project_priority', type: 'status', text: 'Alta', label: 'Alta', is_done: false, updated_at: diasAtras(1) },
      {
        id: 'project_status',
        type: 'status',
        text: ROTULOS[estado],
        label: ROTULOS[estado],
        is_done: estado === 'feito',
        updated_at: mudou == null ? null : diasAtras(mudou),
      },
    ],
    updates: comentario ? [{ text_body: comentario.texto, created_at: diasAtras(comentario.dias), creator: { name: 'Bruno Lima' } }] : [],
    subitems: subitens,
  };
}

function quadro(id, nome, itens, grupos = [{ id: 'g1', title: 'Execução', position: '1' }], extra = {}) {
  return { id, name: nome, type: 'board', url: `https://exemplo.monday.com/boards/${id}`, created_at: diasAtras(120), columns: COLUNAS, groups: grupos, items: itens, ...extra };
}

const painelDe = (...quadros) => montarPainel({ boards: quadros }, CONFIG, AGORA);
const projeto = (painel, id) => painel.projetos.find((p) => p.id === String(id));
const principal = (p) => p.frentes.find((f) => f.id === p.frentePrincipal);

test('etapa em andamento: atual, próximo passo, responsáveis e tempo parado', () => {
  const p = projeto(
    painelDe(
      quadro(1, 'Alfa Ltda - Diagnóstico Fiscal/Previdenciário', [
        item('Recepcionamento', 'feito', { mudou: 40 }),
        item('Verificar documentação', 'feito', { mudou: 30 }),
        item('Diagnóstico e WPs', 'andamento', { mudou: 20, resp: 'Carla Dias, Deleted outdated pending user' }),
        item('Apresentação ao cliente', 'pendente', { resp: 'Diego Reis' }),
      ]),
    ),
    1,
  );
  assert.equal(p.empresa, 'Alfa Ltda');
  assert.equal(p.tipo, 'Fiscal + Previdenciário');
  const f = principal(p);
  assert.equal(f.atual.nome, 'Diagnóstico e WPs');
  assert.equal(f.atual.estado, 'andamento');
  assert.deepEqual(f.atual.responsaveis, ['Carla Dias']);
  assert.equal(f.atual.diasParado, 20);
  assert.equal(f.atual.fase, 'diagnostico');
  assert.equal(f.proximo.nome, 'Apresentação ao cliente');
  assert.deepEqual(p.progresso, { feitas: 2, total: 4 });
  assert.equal(p.status, 'critico');
});

test('atividade recente (subtarefa ou comentário) zera o tempo parado da etapa', () => {
  const p = projeto(
    painelDe(
      quadro(2, 'Beta SA', [
        item('Recepcionamento', 'feito', { mudou: 40 }),
        item('Diagnóstico', 'andamento', {
          mudou: 30,
          comentario: { texto: 'Aguardando XML do cliente', dias: 3 },
        }),
      ]),
    ),
    2,
  );
  const f = principal(p);
  assert.equal(f.atual.diasParado, 3);
  assert.equal(f.atual.diasNaEtapa, 30);
  assert.equal(f.atual.ultimoComentario.texto, 'Aguardando XML do cliente');
  assert.equal(p.status, 'em_dia');
});

test('sem etapa em andamento: aguarda a próxima pendente desde a conclusão da anterior', () => {
  const p = projeto(
    painelDe(
      quadro(3, 'Gama - Diagnóstico Fiscal', [
        item('Recepcionamento', 'feito', { mudou: 20 }),
        item('Diagnóstico', 'feito', { mudou: 10 }),
        item('Apresentação ao cliente', 'pendente', { resp: '' }),
        item('FUP', 'pendente'),
      ]),
    ),
    3,
  );
  const f = principal(p);
  assert.equal(f.situacao, 'aguardando');
  assert.equal(f.atual.nome, 'Apresentação ao cliente');
  assert.equal(f.atual.diasParado, 10);
  assert.equal(f.atual.fase, 'entrega');
  assert.equal(f.proximo.nome, 'FUP');
  assert.equal(p.status, 'atencao');
  assert.ok(p.alertas.some((a) => a.tipo === 'sem_responsavel'));
});

test('etapa marcada como Parado tem prioridade e deixa o projeto crítico', () => {
  const p = projeto(
    painelDe(
      quadro(4, 'Delta', [
        item('Recepcionamento', 'parado', { mudou: 2 }),
        item('Diagnóstico', 'andamento', { mudou: 1 }),
      ]),
    ),
    4,
  );
  const f = principal(p);
  assert.equal(f.atual.nome, 'Recepcionamento');
  assert.equal(f.situacao, 'parada');
  assert.equal(p.status, 'critico');
  assert.equal(f.outrasAbertas[0].nome, 'Diagnóstico');
});

test('quadro com várias frentes destaca a de atividade mais recente', () => {
  const grupos = [
    { id: 'a', title: 'CNPJ 1', position: '1' },
    { id: 'b', title: 'CNPJ 2', position: '2' },
    { id: 'c', title: 'Compensações', position: '3' },
  ];
  const p = projeto(
    painelDe(
      quadro(
        5,
        'Grupo Épsilon - Diagnóstico Fiscal',
        [
          item('Diagnóstico', 'andamento', { grupo: 'a', mudou: 40 }),
          item('Diagnóstico', 'andamento', { grupo: 'b', mudou: 2 }),
          item('Compensação', 'feito', { grupo: 'c', mudou: 1 }),
        ],
        grupos,
      ),
    ),
    5,
  );
  assert.equal(p.frentePrincipal, 'b');
  assert.equal(p.status, 'em_dia');
  assert.equal(p.frentes.find((f) => f.id === 'c').situacao, 'concluida');
  assert.ok(p.alertas.some((a) => a.tipo === 'frentes_criticas'));
  assert.equal(p.diasSemMovimentacao, 1);
});

test('quadro com todas as etapas feitas fica concluído', () => {
  const p = projeto(painelDe(quadro(6, 'Zeta', [item('Recepcionamento', 'feito', { mudou: 5 })])), 6);
  assert.equal(p.status, 'concluido');
  assert.equal(p.frentePrincipal, null);
});

test('seleção de quadros ignora modelos, duplicatas, subelementos e visões de projeto', () => {
  const base = { type: 'board', columns: COLUNAS };
  assert.equal(quadroSelecionado({ ...base, id: 1, name: 'Cliente X' }, CONFIG), true);
  assert.equal(quadroSelecionado({ ...base, id: 999, name: 'Projetos' }, CONFIG), false);
  assert.equal(quadroSelecionado({ ...base, id: 2, name: 'Subelementos de Cliente X' }, CONFIG), false);
  assert.equal(quadroSelecionado({ ...base, id: 3, name: 'Duplicata de Modelo' }, CONFIG), false);
  assert.equal(quadroSelecionado({ ...base, id: 4, name: 'Cliente Y', type: 'sub_items_board' }, CONFIG), false);
  assert.equal(
    quadroSelecionado({ ...base, id: 5, name: 'Diagnóstico X', columns: [{ id: 'h', title: 'Project Health (RAG)', type: 'status' }] }, CONFIG),
    false,
  );
});

test('nome da empresa a partir do nome do quadro', () => {
  assert.equal(nomeDaEmpresa('Acme - Diagnóstico Fiscal/Previdenciário'), 'Acme');
  assert.equal(nomeDaEmpresa('Diagnóstico Fiscal - Ômega'), 'Ômega');
  assert.equal(nomeDaEmpresa('Diagnóstico Fiscal/Previdenciário - Beta Transportes'), 'Beta Transportes');
  assert.equal(nomeDaEmpresa('Óxidos Brasil - Diagnóstico Fiscal/Previdenciário.'), 'Óxidos Brasil');
  assert.equal(nomeDaEmpresa('Fazenda Exemplo - Projetos'), 'Fazenda Exemplo');
  assert.equal(nomeDaEmpresa('Serviços Gerais Exemplo SA'), 'Serviços Gerais Exemplo SA');
});

test('classificação dos rótulos de status', () => {
  assert.equal(classificarStatus({ label: 'Feito', is_done: true }), 'feito');
  assert.equal(classificarStatus({ label: 'Finalizado', is_done: true }), 'feito');
  assert.equal(classificarStatus({ label: 'Em andamento' }), 'andamento');
  assert.equal(classificarStatus({ label: 'Parado' }), 'parado');
  assert.equal(classificarStatus({ label: 'Aguardando etapa anterior' }), 'pendente');
  assert.equal(classificarStatus({ label: 'Etapa futura' }), 'pendente');
  assert.equal(classificarStatus(null), 'pendente');
});

test('criptografia: abre com a senha certa e falha com a errada', async () => {
  const pacote = await criptografar('{"ok":true}', 'senha-muito-segura');
  assert.equal(await descriptografar(pacote, 'senha-muito-segura'), '{"ok":true}');
  await assert.rejects(() => descriptografar(pacote, 'outra-senha-qualquer'));
  assert.ok(!JSON.stringify(pacote).includes('ok'));
});

test('HTML final embute os dados sem quebrar o <script> nem interpretar "$"', async () => {
  const html = await montarHtml({ aberto: { texto: '</script><b>$& $1' } });
  assert.ok(!html.includes('</script><b>'));
  assert.ok(html.includes('\\u003c/script>\\u003cb>$& $1'));
  assert.ok(!html.includes('/*__APP__*/'));
  assert.ok(!html.includes('"__DADOS__"'));
});
