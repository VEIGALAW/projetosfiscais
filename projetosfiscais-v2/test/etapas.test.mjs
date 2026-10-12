import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarEtapas, montarPacote, pessoas } from '../scripts/lib/etapas.mjs';

const config = {
  titulo: 'Projetos Fiscais',
  subtitulo: 'teste',
  limites: { atencaoAposDias: 7, criticoAposDias: 15, dadosDesatualizadosAposHoras: 30 },
  quadros: { excluirIds: [], excluirNomes: ['^Subelementos de'], excluirSeTiverColuna: ['Project Health (RAG)'], ajustes: { 2: { empresa: 'Cliente Ajustado', tipo: 'Previdenciário' } } },
};

const status = (label, updated_at, is_done = false) => ({ id: 'project_status', type: 'status', text: label, label, is_done, updated_at });
const resp = (text) => ({ id: 'project_owner', type: 'people', text });
const cronograma = (from, to) => ({ id: 'project_timeline', type: 'timeline', text: `${from} - ${to}`, from: `${from}T00:00:00+00:00`, to: `${to}T00:00:00+00:00` });

const quadro = {
  id: 1,
  name: 'Empresa X - Diagnóstico Fiscal',
  type: 'board',
  url: 'https://monday.com/boards/1',
  created_at: '2026-01-05T10:00:00Z',
  columns: [
    { id: 'project_status', title: 'Status', type: 'status' },
    { id: 'project_owner', title: 'Resp.', type: 'people' },
    { id: 'project_timeline', title: 'Cronograma', type: 'timeline' },
  ],
  groups: [
    { id: 'g2', title: 'Segunda frente', position: '2' },
    { id: 'g1', title: 'Execução', position: '1' },
  ],
  items: [
    { id: 11, name: 'Recepcionamento', state: 'active', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-06T10:00:00Z', group: { id: 'g1' },
      column_values: [status('Feito', '2026-01-06T10:00:00Z', true), resp('Ana Silva, Deleted outdated pending user'), cronograma('2026-01-05', '2026-01-06')],
      updates: [{ text_body: 'Documentos  recebidos\n ok', created_at: '2026-01-07T10:00:00Z', creator: { name: 'Ana Silva' } }],
      subitems: [{ id: 111, name: 'Sub', created_at: '2026-01-08T10:00:00Z', column_values: [{ id: 'status', type: 'status', text: 'Em andamento', label: 'Em andamento', is_done: false, updated_at: '2026-01-09T10:00:00Z' }] }] },
    { id: 12, name: 'Diagnóstico', state: 'active', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z', group: { id: 'g1' },
      column_values: [status('Em andamento', '2026-01-10T10:00:00Z'), resp(''), { id: 'project_timeline', type: 'timeline', text: '2026-02-01 - 2026-02-10' }] },
    { id: 13, name: 'Item apagado', state: 'deleted', created_at: '2026-01-05T10:00:00Z', group: { id: 'g1' }, column_values: [status('Feito', null, true)] },
    { id: 21, name: 'FUP', state: 'active', created_at: '2026-01-05T10:00:00Z', group: { id: 'g2' }, column_values: [status('Parado', '2026-01-12T10:00:00Z'), resp('Bia Souza')] },
  ],
};

test('monta uma linha por etapa ativa, na ordem dos grupos e com os campos esperados', () => {
  const bruto = { coletadoEm: '2026-01-20T12:00:00Z', boards: [quadro] };
  const linhas = montarEtapas(bruto, config);
  assert.equal(linhas.length, 3);
  const [a, b, c] = linhas;
  assert.deepEqual(linhas.map((l) => l.etapa), ['Recepcionamento', 'Diagnóstico', 'FUP']);
  assert.equal(a.quadro_id, '1');
  assert.equal(a.quadro_url, 'https://monday.com/boards/1');
  assert.equal(a.quadro_criado_em, '2026-01-05T10:00:00Z');
  assert.equal(a.frente, 'Execução');
  assert.equal(a.frente_ordem, 0);
  assert.equal(c.frente_ordem, 1);
  assert.deepEqual([a.ordem, b.ordem, c.ordem], [1, 2, 1]);
  assert.equal(a.estado, 'feito');
  assert.equal(b.estado, 'andamento');
  assert.equal(c.estado, 'parado');
  assert.equal(a.responsaveis, 'Ana Silva');
  assert.equal(a.prazo_fim, '2026-01-06');
  assert.equal(b.prazo_inicio, '2026-02-01');
  assert.equal(b.prazo_fim, '2026-02-10');
  assert.equal(a.comentario, 'Documentos recebidos ok');
  assert.equal(a.comentario_autor, 'Ana Silva');
  assert.equal(a.subtarefas_abertas, 1);
  assert.equal(a.subtarefas_total, 1);
  assert.equal(a.atividade_em, '2026-01-09T10:00:00.000Z');
  assert.equal(b.atividade_em, '2026-01-10T10:00:00.000Z');
  assert.equal(a.consultado_em, '2026-01-20T12:00:00Z');
  assert.equal(a.empresa, null);
});

test('aplica ajustes de empresa e tipo e ignora quadros excluídos', () => {
  const bruto = {
    boards: [
      { ...quadro, id: 2, name: 'Outro - Diagnóstico Previdenciário' },
      { ...quadro, id: 3, name: 'Subelementos de Outro' },
      { ...quadro, id: 4, name: 'Resumo', columns: [...quadro.columns, { id: 'rag', title: 'Project Health (RAG)', type: 'status' }] },
    ],
  };
  const linhas = montarEtapas(bruto, config);
  assert.deepEqual([...new Set(linhas.map((l) => l.quadro_id))], ['2']);
  assert.equal(linhas[0].empresa, 'Cliente Ajustado');
  assert.equal(linhas[0].tipo_ajuste, 'Previdenciário');
});

test('pacote traz metadados e contagem de quadros', () => {
  const pacote = montarPacote({ coletadoEm: '2026-01-20T12:00:00Z', boards: [quadro] }, config, '2026-01-20T12:30:00Z');
  assert.equal(pacote.versao, 2);
  assert.equal(pacote.geradoEm, '2026-01-20T12:30:00Z');
  assert.equal(pacote.coletadoEm, '2026-01-20T12:00:00Z');
  assert.equal(pacote.quadros, 1);
  assert.equal(pacote.etapas.length, 3);
  assert.equal(pacote.titulo, 'Projetos Fiscais');
});

test('pessoas remove usuários apagados e duplicados', () => {
  assert.deepEqual(pessoas('Ana, Deleted outdated pending user, Ana , Bia'), ['Ana', 'Bia']);
});
