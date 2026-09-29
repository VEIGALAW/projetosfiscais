// Transforma os dados brutos do Monday no modelo do painel da diretoria.
//
// Modelo do Monday usado pela equipe:
//   quadro (board)  = um projeto / cliente
//   grupo  (group)  = uma frente do projeto (um CNPJ, "Compensações", "Fase 02"...)
//   item            = uma etapa, na ordem em que aparece no quadro
//   subitem         = tarefa operacional dentro da etapa

const DIA_MS = 86_400_000;

export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

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

const diasEntre = (inicioIso, fimIso) =>
  inicioIso ? Math.max(0, Math.floor((Date.parse(fimIso) - Date.parse(inicioIso)) / DIA_MS)) : null;

// Usuários removidos do Monday ("Deleted ... user", "Membro excluído") não contam como responsáveis.
const USUARIO_REMOVIDO = /^(deleted\b.*\buser|removed user|membro exclu[ií]do|usu[aá]rio exclu[ií]do)$/i;
const pessoas = (texto) => [
  ...new Set(
    String(texto ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && !USUARIO_REMOVIDO.test(p)),
  ),
];

// Estado da etapa a partir do rótulo de status.
export function classificarStatus(valor) {
  if (!valor) return 'pendente';
  if (valor.is_done) return 'feito';
  const rotulo = normalizar(valor.label ?? valor.text);
  if (/parad|bloque|travad|stuck|impedid/.test(rotulo)) return 'parado';
  if (/andamento|execucao|fazendo|working|progress/.test(rotulo)) return 'andamento';
  if (/^(feito|concluid|finalizad|done|entregue)/.test(rotulo)) return 'feito';
  return 'pendente';
}

// Coluna de status "principal" do quadro (ignora Prioridade, Saúde etc.).
function escolherColuna(colunas, tipo, preferidas, evitar) {
  const doTipo = colunas.filter((c) => c.type === tipo);
  return (
    doTipo.find((c) => preferidas.test(normalizar(c.title))) ??
    doTipo.find((c) => !evitar.test(normalizar(c.title))) ??
    doTipo[0] ??
    null
  )?.id ?? null;
}

export function nomeDaEmpresa(nomeQuadro) {
  let nome = String(nomeQuadro).trim().replace(/[.\s]+$/, '');
  nome = nome.replace(/^diagn[oó]stico[^-–|]*[-–|]\s*/i, '');
  nome = nome.replace(/\s*[-–|]\s*(diagn[oó]stico|projetos?)\b.*$/i, '');
  return nome.trim() || String(nomeQuadro).trim();
}

export function tipoDoProjeto(nomeQuadro, nomesDasEtapas = []) {
  const detectar = (texto) => {
    const n = normalizar(texto);
    const fiscal = /fiscal|tribut/.test(n);
    const previd = /previd/.test(n);
    if (fiscal && previd) return 'Fiscal + Previdenciário';
    if (previd) return 'Previdenciário';
    if (fiscal) return 'Fiscal';
    return null;
  };
  return detectar(nomeQuadro) ?? detectar(nomesDasEtapas.join(' ')) ?? 'Outros';
}

export function criarClassificadorDeFases(config) {
  const fases = config.fases ?? [];
  const ordem = config.prioridadeDasFases ?? fases.map((f) => f.id);
  const regras = ordem
    .map((id) => fases.find((f) => f.id === id))
    .filter(Boolean)
    .map((f) => ({ id: f.id, re: new RegExp(f.padrao, 'i') }));
  return (nomeEtapa) => {
    const n = normalizar(nomeEtapa);
    return regras.find((r) => r.re.test(n))?.id ?? 'outras';
  };
}

export function quadroSelecionado(quadro, config) {
  const regras = config.quadros ?? {};
  if (quadro.type && quadro.type !== 'board') return false;
  if ((regras.excluirIds ?? []).map(String).includes(String(quadro.id))) return false;
  if ((regras.excluirNomes ?? []).some((p) => new RegExp(p, 'i').test(quadro.name))) return false;
  const titulos = (quadro.columns ?? []).map((c) => c.title);
  if ((regras.excluirSeTiverColuna ?? []).some((t) => titulos.includes(t))) return false;
  return true;
}

function lerEtapa(item, colStatus, colPessoas) {
  const valores = item.column_values ?? [];
  const status =
    valores.find((v) => v.id === colStatus) ?? valores.find((v) => v.type === 'status') ?? null;
  const resp =
    valores.find((v) => v.id === colPessoas) ?? valores.find((v) => v.type === 'people') ?? null;

  const subitens = (item.subitems ?? []).map((s) => {
    const sv = s.column_values ?? [];
    const sStatus = sv.find((v) => v.type === 'status') ?? null;
    const sResp = sv.find((v) => v.type === 'people') ?? null;
    return {
      nome: s.name,
      estado: classificarStatus(sStatus),
      rotulo: sStatus?.label ?? sStatus?.text ?? '',
      responsaveis: pessoas(sResp?.text),
      atividade: maxData(s.created_at, sStatus?.updated_at),
    };
  });

  const comentario = item.updates?.[0]
    ? {
        texto: String(item.updates[0].text_body ?? '').replace(/\s+/g, ' ').trim().slice(0, 600),
        autor: item.updates[0].creator?.name ?? '',
        data: item.updates[0].created_at,
      }
    : null;

  return {
    id: String(item.id),
    nome: String(item.name).trim(),
    grupo: item.group?.id ?? '',
    estado: classificarStatus(status),
    rotulo: status?.label ?? status?.text ?? '',
    statusMudouEm: status?.updated_at ?? null,
    criadoEm: item.created_at ?? null,
    responsaveis: pessoas(resp?.text),
    subitens,
    comentario,
  };
}

// Toda atividade registrada numa etapa (mudança de status, subtarefas, comentários).
const atividadeDaEtapa = (etapa) =>
  maxData(
    etapa.statusMudouEm,
    etapa.comentario?.data,
    etapa.subitens.map((s) => s.atividade),
  );

function statusSemaforo(situacao, diasParado, limites) {
  if (situacao === 'concluida') return 'concluido';
  if (situacao === 'parada') return 'critico';
  if (diasParado == null) return 'atencao';
  if (diasParado > limites.criticoAposDias) return 'critico';
  if (diasParado > limites.atencaoAposDias) return 'atencao';
  return 'em_dia';
}

export function analisarFrente(etapas, contexto) {
  const { agora, limites, fase, entradaDoProjeto } = contexto;
  const total = etapas.length;
  const feitas = etapas.filter((e) => e.estado === 'feito').length;

  const resumoEtapas = etapas.map((e) => ({ nome: e.nome, estado: e.estado, rotulo: e.rotulo }));

  if (total === 0 || feitas === total) {
    return {
      situacao: 'concluida',
      status: 'concluido',
      progresso: { feitas, total },
      atual: null,
      proximo: null,
      outrasAbertas: [],
      ultimaAtividade: maxData(etapas.map(atividadeDaEtapa)),
      etapas: resumoEtapas,
    };
  }

  const paradas = etapas.filter((e) => e.estado === 'parado');
  const emAndamento = etapas.filter((e) => e.estado === 'andamento');

  let atual;
  let situacao;
  if (paradas.length) {
    atual = paradas[0];
    situacao = 'parada';
  } else if (emAndamento.length) {
    // A etapa mais avançada em execução mostra onde o projeto está.
    atual = emAndamento[emAndamento.length - 1];
    situacao = 'andamento';
  } else {
    atual = etapas.find((e) => e.estado === 'pendente');
    situacao = 'aguardando';
  }

  const indiceAtual = etapas.indexOf(atual);

  // Desde quando a etapa está nesta situação.
  let desde;
  if (atual.estado === 'pendente') {
    const anterioresFeitas = etapas
      .slice(0, indiceAtual)
      .filter((e) => e.estado === 'feito')
      .map((e) => e.statusMudouEm);
    desde = maxData(anterioresFeitas) ?? atual.criadoEm ?? entradaDoProjeto;
  } else {
    desde = atual.statusMudouEm ?? atual.criadoEm ?? entradaDoProjeto;
  }
  const ultimaAtividadeEtapa = maxData(desde, atividadeDaEtapa(atual));

  const proximo =
    etapas.slice(indiceAtual + 1).find((e) => e.estado === 'pendente') ??
    etapas.find((e, i) => i !== indiceAtual && e.estado === 'pendente') ??
    null;

  const diasParado = diasEntre(ultimaAtividadeEtapa, agora);

  const outrasAbertas = [...paradas, ...emAndamento]
    .filter((e) => e !== atual)
    .map((e) => {
      const ultima = maxData(e.statusMudouEm ?? e.criadoEm, atividadeDaEtapa(e));
      return {
        nome: e.nome,
        estado: e.estado,
        rotulo: e.rotulo,
        responsaveis: e.responsaveis,
        diasParado: diasEntre(ultima, agora),
      };
    });

  return {
    situacao,
    status: statusSemaforo(situacao, diasParado, limites),
    progresso: { feitas, total },
    atual: {
      indice: indiceAtual,
      nome: atual.nome,
      estado: atual.estado,
      rotulo: atual.rotulo || 'Aguardando',
      fase: fase(atual.nome),
      responsaveis: atual.responsaveis,
      desde,
      ultimaAtividade: ultimaAtividadeEtapa,
      diasParado,
      diasNaEtapa: diasEntre(desde, agora),
      subtarefasAbertas: atual.subitens
        .filter((s) => s.estado !== 'feito')
        .map(({ nome, rotulo, responsaveis }) => ({ nome, rotulo, responsaveis })),
      subtarefasTotal: atual.subitens.length,
      ultimoComentario: atual.comentario,
    },
    proximo: proximo ? { nome: proximo.nome, responsaveis: proximo.responsaveis } : null,
    outrasAbertas,
    ultimaAtividade: maxData(etapas.map(atividadeDaEtapa)),
    etapas: resumoEtapas,
  };
}

const tempo = (iso) => (iso ? Date.parse(iso) : 0);

export function analisarProjeto(quadro, config, agora) {
  const limites = config.limites;
  const fase = criarClassificadorDeFases(config);
  const ajuste = config.quadros?.ajustes?.[quadro.id] ?? {};

  const colStatus = escolherColuna(quadro.columns ?? [], 'status', /^status$/, /priori|health|saude|fase|phase|stage/);
  const colPessoas = escolherColuna(quadro.columns ?? [], 'people', /^resp|pessoa|person|owner|dono/, /^$/);

  const itens = (quadro.items ?? []).filter((i) => !i.state || i.state === 'active');
  const etapas = itens.map((i) => lerEtapa(i, colStatus, colPessoas));
  const entrada = ajuste.entrada ?? quadro.created_at;

  const grupos = [...(quadro.groups ?? [])]
    .filter((g) => !g.archived && !g.deleted)
    .sort((a, b) => Number(a.position) - Number(b.position));
  // Grupos que não vieram na lista (raro) entram no fim, na ordem dos itens.
  for (const e of etapas) {
    if (!grupos.some((g) => g.id === e.grupo)) grupos.push({ id: e.grupo, title: e.grupo });
  }

  const frentes = grupos
    .map((g) => {
      const etapasDoGrupo = etapas.filter((e) => e.grupo === g.id);
      if (!etapasDoGrupo.length) return null;
      return {
        id: g.id,
        nome: String(g.title ?? '').trim(),
        ...analisarFrente(etapasDoGrupo, { agora, limites, fase, entradaDoProjeto: entrada }),
      };
    })
    .filter(Boolean);

  // Frente em destaque: uma marcada como "Parado" ou, senão, a que teve atividade mais recente.
  const abertas = frentes.filter((f) => f.situacao !== 'concluida');
  const principal =
    [...abertas].sort(
      (a, b) =>
        (b.situacao === 'parada') - (a.situacao === 'parada') ||
        tempo(b.atual?.ultimaAtividade) - tempo(a.atual?.ultimaAtividade),
    )[0] ?? null;

  const ultimaMovimentacao = maxData(frentes.map((f) => f.ultimaAtividade)) ?? entrada;
  const feitas = frentes.reduce((s, f) => s + f.progresso.feitas, 0);
  const total = frentes.reduce((s, f) => s + f.progresso.total, 0);

  const alertas = [];
  if (principal?.atual && principal.atual.responsaveis.length === 0) {
    alertas.push({ tipo: 'sem_responsavel', texto: 'Etapa atual sem responsável definido' });
  }
  const outrasCriticas = abertas.filter((f) => f !== principal && f.status === 'critico');
  if (outrasCriticas.length) {
    alertas.push({
      tipo: 'frentes_criticas',
      texto: `${outrasCriticas.length} outra${outrasCriticas.length > 1 ? 's' : ''} frente${
        outrasCriticas.length > 1 ? 's' : ''
      } parada${outrasCriticas.length > 1 ? 's' : ''}`,
    });
  }
  const esquecidas = frentes
    .flatMap((f) => f.outrasAbertas)
    .filter((e) => (e.diasParado ?? 0) > limites.criticoAposDias);
  if (esquecidas.length) {
    alertas.push({
      tipo: 'etapas_esquecidas',
      texto: `${esquecidas.length} etapa${esquecidas.length > 1 ? 's' : ''} aberta${
        esquecidas.length > 1 ? 's' : ''
      } sem atualização há +${limites.criticoAposDias} dias`,
    });
  }

  const nomesDasFrentes = frentes.map((f) => f.nome).filter((n) => !/^(execucao|diagnostico)$/i.test(normalizar(n)));

  return {
    id: String(quadro.id),
    empresa: ajuste.empresa ?? nomeDaEmpresa(quadro.name),
    quadro: quadro.name,
    tipo: ajuste.tipo ?? tipoDoProjeto(quadro.name, etapas.map((e) => e.nome)),
    url: quadro.url ?? null,
    entrada,
    diasDesdeEntrada: diasEntre(entrada, agora),
    situacao: principal ? principal.situacao : 'concluida',
    status: principal ? principal.status : 'concluido',
    progresso: { feitas, total },
    ultimaMovimentacao,
    diasSemMovimentacao: diasEntre(ultimaMovimentacao, agora),
    frentePrincipal: principal?.id ?? null,
    nomesDasFrentes,
    alertas,
    frentes,
  };
}

const ORDEM_STATUS = { critico: 0, atencao: 1, em_dia: 2, concluido: 3 };

export function montarPainel(bruto, config, agora = new Date().toISOString()) {
  const projetos = (bruto.boards ?? [])
    .filter((q) => quadroSelecionado(q, config))
    .map((q) => analisarProjeto(q, config, agora))
    .filter((p) => p.frentes.length > 0)
    .sort((a, b) => {
      const principalA = a.frentes.find((f) => f.id === a.frentePrincipal);
      const principalB = b.frentes.find((f) => f.id === b.frentePrincipal);
      return (
        ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status] ||
        (principalB?.atual?.diasParado ?? -1) - (principalA?.atual?.diasParado ?? -1) ||
        a.empresa.localeCompare(b.empresa, 'pt-BR')
      );
    });

  return {
    versao: 1,
    geradoEm: agora,
    titulo: config.titulo,
    subtitulo: config.subtitulo,
    limites: config.limites,
    fases: [
      ...(config.fases ?? []).map(({ id, nome }) => ({ id, nome })),
      { id: 'outras', nome: 'Outras etapas' },
    ],
    projetos,
  };
}
