// Transforma a coleta bruta do Monday numa tabela plana: uma linha por etapa (item).
//
// É o mesmo formato que o dashboard interativo lê (no Claude e no GitHub Pages): todas as
// regras de negócio (etapa atual, dias sem movimento, semáforo, fases) ficam na página, em
// cálculos que o leitor consegue inspecionar. Aqui só se lê e se normaliza o que veio do Monday.
//
// Modelo do Monday usado pela equipe:
//   quadro (board)  = um projeto / cliente
//   grupo  (group)  = uma frente do projeto (um CNPJ, "Compensações", "Fase 02"...)
//   item            = uma etapa, na ordem em que aparece no quadro
//   subitem         = tarefa operacional dentro da etapa

import { classificarStatus, normalizar, quadroSelecionado } from './transform.mjs';

const USUARIO_REMOVIDO = /^(deleted\b.*\buser|removed user|membro exclu[ií]do|usu[aá]rio exclu[ií]do)$/i;

export const pessoas = (texto) => [
  ...new Set(
    String(texto ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && !USUARIO_REMOVIDO.test(p)),
  ),
];

const maxData = (...datas) => {
  let melhor = null;
  for (const d of datas.flat()) {
    if (!d) continue;
    const t = Date.parse(d);
    if (Number.isNaN(t)) continue;
    if (melhor === null || t > melhor) melhor = t;
  }
  return melhor === null ? null : new Date(melhor).toISOString();
};

// Coluna "principal" de um tipo no quadro (ignora Prioridade, Saúde etc.).
export function escolherColuna(colunas, tipo, preferidas, evitar = /^$/) {
  const doTipo = (colunas ?? []).filter((c) => c.type === tipo);
  return (
    doTipo.find((c) => preferidas.test(normalizar(c.title))) ??
    doTipo.find((c) => !evitar.test(normalizar(c.title))) ??
    doTipo[0] ??
    null
  )?.id ?? null;
}

const soData = (valor) => (valor ? String(valor).slice(0, 10) : null);

// Lê o cronograma de um item: campos from/to da API ou o texto "2026-01-10 - 2026-01-20".
function lerCronograma(valor) {
  if (!valor) return { inicio: null, fim: null };
  if (valor.from || valor.to) return { inicio: soData(valor.from), fim: soData(valor.to) };
  const m = /(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/.exec(String(valor.text ?? ''));
  return m ? { inicio: m[1], fim: m[2] } : { inicio: null, fim: null };
}

export function etapasDoQuadro(quadro, config, consultadoEm) {
  const colunas = quadro.columns ?? [];
  const colStatus = escolherColuna(colunas, 'status', /^status$/, /priori|health|saude|fase|phase|stage/);
  const colPessoas = escolherColuna(colunas, 'people', /^resp|pessoa|person|owner|dono/);
  const colCronograma = escolherColuna(colunas, 'timeline', /cronograma|timeline|prazo/, /^$/);
  const ajuste = config?.quadros?.ajustes?.[quadro.id] ?? {};

  const grupos = [...(quadro.groups ?? [])]
    .filter((g) => !g.archived && !g.deleted)
    .sort((a, b) => Number(a.position) - Number(b.position));
  const ordemDoGrupo = new Map(grupos.map((g, i) => [g.id, i]));
  const tituloDoGrupo = new Map(grupos.map((g) => [g.id, String(g.title ?? '').trim() || g.id]));

  const itens = (quadro.items ?? []).filter((i) => !i.state || i.state === 'active');
  const posicao = new Map();
  const linhas = [];
  for (const item of itens) {
    const valores = item.column_values ?? [];
    const status = valores.find((v) => v.id === colStatus) ?? valores.find((v) => v.type === 'status') ?? null;
    const resp = valores.find((v) => v.id === colPessoas) ?? valores.find((v) => v.type === 'people') ?? null;
    const cronograma = valores.find((v) => v.id === colCronograma) ?? valores.find((v) => v.type === 'timeline') ?? null;
    const prazo = lerCronograma(cronograma);
    const grupoId = item.group?.id ?? '';
    posicao.set(grupoId, (posicao.get(grupoId) ?? 0) + 1);

    const subitens = item.subitems ?? [];
    const subitensAbertos = subitens.filter((s) => {
      const st = (s.column_values ?? []).find((v) => v.type === 'status') ?? null;
      return classificarStatus(st) !== 'feito';
    });
    const atividadeSubitens = subitens.map((s) => {
      const st = (s.column_values ?? []).find((v) => v.type === 'status') ?? null;
      return maxData(s.created_at, st?.updated_at);
    });
    const comentario = item.updates?.[0] ?? null;

    linhas.push({
      quadro_id: String(quadro.id),
      quadro: String(quadro.name),
      quadro_url: quadro.url ?? null,
      empresa: ajuste.empresa ?? null,
      tipo_ajuste: ajuste.tipo ?? null,
      quadro_criado_em: ajuste.entrada ?? quadro.created_at ?? null,
      frente_id: grupoId,
      frente: tituloDoGrupo.get(grupoId) ?? grupoId,
      frente_ordem: ordemDoGrupo.get(grupoId) ?? 99,
      ordem: posicao.get(grupoId),
      etapa_id: String(item.id),
      etapa: String(item.name).trim(),
      status: status?.label ?? status?.text ?? '',
      estado: classificarStatus(status),
      status_em: status?.updated_at ?? null,
      responsaveis: pessoas(resp?.text).join(', '),
      prazo_inicio: prazo.inicio,
      prazo_fim: prazo.fim,
      criado_em: item.created_at ?? null,
      atualizado_em: item.updated_at ?? null,
      atividade_em: maxData(status?.updated_at, comentario?.created_at, atividadeSubitens),
      subtarefas_abertas: subitensAbertos.length,
      subtarefas_total: subitens.length,
      comentario: comentario ? String(comentario.text_body ?? '').replace(/\s+/g, ' ').trim().slice(0, 400) : '',
      comentario_autor: comentario?.creator?.name ?? '',
      comentario_em: comentario?.created_at ?? null,
      consultado_em: consultadoEm,
    });
  }
  return linhas;
}

export function montarEtapas(bruto, config, agora = new Date().toISOString()) {
  const consultadoEm = bruto.coletadoEm ?? agora;
  return (bruto.boards ?? [])
    .filter((q) => quadroSelecionado(q, config))
    .flatMap((q) => etapasDoQuadro(q, config, consultadoEm));
}

export function montarPacote(bruto, config, agora = new Date().toISOString()) {
  const etapas = montarEtapas(bruto, config, agora);
  return {
    versao: 2,
    geradoEm: agora,
    coletadoEm: bruto.coletadoEm ?? agora,
    titulo: config.titulo,
    subtitulo: config.subtitulo,
    limites: config.limites,
    quadros: new Set(etapas.map((e) => e.quadro_id)).size,
    etapas,
  };
}
