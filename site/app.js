(() => {
  'use strict';

  const CHAVE_SENHA = 'painel-fiscal:senha';
  const CHAVE_TEMA = 'painel-fiscal:tema';
  const FUSO = 'America/Sao_Paulo';

  const app = document.getElementById('app');
  const dica = document.getElementById('dica');

  // ---------- Armazenamento (pode não existir em janelas privadas) ----------

  const guardar = {
    ler(tipo, chave) {
      try { return window[tipo].getItem(chave); } catch { return null; }
    },
    gravar(tipo, chave, valor) {
      try { window[tipo].setItem(chave, valor); } catch { /* sem armazenamento */ }
    },
    remover(tipo, chave) {
      try { window[tipo].removeItem(chave); } catch { /* sem armazenamento */ }
    },
  };

  // ---------- Utilidades ----------

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
  const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const fmtData = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtHora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
  const fmtChaveMes = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit' });
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const data = (iso) => (iso ? fmtData.format(new Date(iso)) : '—');
  const dias = (n) => (n == null ? '—' : n === 1 ? '1 dia' : `${n} dias`);
  const ha = (n) => (n == null ? '' : n === 0 ? 'hoje' : `há ${dias(n)}`);
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  const capitalizar = (p) => (p.length > 2 && p === p.toUpperCase() ? p[0] + p.slice(1).toLowerCase() : p);
  const nomeCurto = (nome) => {
    const partes = String(nome).split(/\s+/).filter(Boolean).map(capitalizar);
    return partes.length <= 2 ? partes.join(' ') : `${partes[0]} ${partes[partes.length - 1]}`;
  };

  const mediana = (valores) => {
    const v = valores.filter((x) => x != null).sort((a, b) => a - b);
    if (!v.length) return null;
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
  };

  // ---------- Ícones ----------

  const svg = (conteudo, classe = '') =>
    `<svg class="${classe}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${conteudo}</svg>`;

  const ICONES = {
    critico: svg('<circle cx="8" cy="8" r="6.5" fill="currentColor" stroke="none"/><path d="M8 4.6v4" stroke="#fff"/><circle cx="8" cy="11.2" r=".4" fill="#fff" stroke="#fff"/>', 'icone-status'),
    atencao: svg('<path d="M8 1.8 15 14H1z" fill="currentColor" stroke="currentColor" stroke-width="1.2"/><path d="M8 6.2v3.4" stroke="#1a1a19"/><circle cx="8" cy="11.8" r=".35" fill="#1a1a19" stroke="#1a1a19"/>', 'icone-status'),
    em_dia: svg('<circle cx="8" cy="8" r="6.5" fill="currentColor" stroke="none"/><path d="m5.2 8.2 1.9 1.9 3.8-3.9" stroke="#fff"/>', 'icone-status'),
    concluido: svg('<rect x="1.8" y="1.8" width="12.4" height="12.4" rx="3" fill="currentColor" stroke="none"/><path d="m5.2 8.2 1.9 1.9 3.8-3.9" stroke="#fff"/>', 'icone-status'),
    busca: svg('<circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3.5 3.5"/>'),
    tema: svg('<circle cx="8" cy="8" r="6"/><path d="M8 2a6 6 0 0 0 0 12z" fill="currentColor"/>'),
    sair: svg('<rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/>'),
    externo: svg('<path d="M9 3h4v4M13 3 7.5 8.5M11 9.5V13H3V5h3.5"/>'),
    aviso: svg('<path d="M8 1.8 15 14H1z"/><path d="M8 6.2v3.4M8 11.8v.1"/>'),
    pessoa: svg('<circle cx="8" cy="5.5" r="2.7"/><path d="M2.8 14a5.2 5.2 0 0 1 10.4 0"/>'),
  };

  const SELO = `<svg class="selo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#ffffff" fill-opacity=".12"/><rect x=".5" y=".5" width="31" height="31" rx="7.5" fill="none" stroke="#ffffff" stroke-opacity=".25"/><path d="M9 22V10h4.5a4 4 0 0 1 0 8H9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 22l5-12" stroke="#8fc1ff" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  const SELO_ACESSO = SELO.replace('fill="#ffffff" fill-opacity=".12"', 'fill="#173a63"');

  const STATUS = {
    critico: { rotulo: 'Crítico', ordem: 0 },
    atencao: { rotulo: 'Atenção', ordem: 1 },
    em_dia: { rotulo: 'Em dia', ordem: 2 },
    concluido: { rotulo: 'Concluído', ordem: 3 },
  };
  const ESTADOS = { andamento: 'Em andamento', parado: 'Parado', pendente: 'Aguardando início', feito: 'Feito' };

  const pilula = (status) =>
    `<span class="pilula st-${status}">${ICONES[status]}${STATUS[status].rotulo}</span>`;
  const etiquetaEstado = (estado) =>
    `<span class="etiqueta e-${estado}"><span class="ponto"></span>${ESTADOS[estado] ?? estado}</span>`;
  const listaPessoas = (nomes) =>
    nomes.length
      ? nomes.map((n) => `<span data-dica="${esc(n)}">${esc(nomeCurto(n))}</span>`).join(', ')
      : `<span class="sem-dono">${ICONES.pessoa}Sem responsável</span>`;

  // ---------- Estado da tela ----------

  const tela = {
    painel: null,
    filtro: { status: 'ativos', busca: '', pessoa: '', fase: '', tipo: '' },
    ordem: { campo: 'parado', direcao: 'desc' },
    abertos: new Set(),
  };

  const nomeDaFase = (id) => tela.painel.fases.find((f) => f.id === id)?.nome ?? 'Outras etapas';

  function prepararProjetos(painel) {
    for (const p of painel.projetos) {
      p._principal = p.frentes.find((f) => f.id === p.frentePrincipal) ?? null;
      p._atual = p._principal?.atual ?? null;
      p._fase = p._atual?.fase ?? '';
      p._parado = p._atual?.diasParado ?? null;
      p._semDono = Boolean(p._atual && p._atual.responsaveis.length === 0);
      const pessoas = new Set();
      for (const f of p.frentes) for (const n of f.atual?.responsaveis ?? []) pessoas.add(n);
      p._pessoas = [...pessoas];
      p._busca = normalizar(
        [
          p.empresa, p.quadro, p.tipo,
          ...p.frentes.flatMap((f) => [f.nome, f.atual?.nome, f.proximo?.nome, ...(f.atual?.responsaveis ?? [])]),
        ].filter(Boolean).join(' '),
      );
    }
  }

  // ---------- Acesso com senha ----------

  const deBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function abrirDados(pacote, senha) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
    const chave = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: deBase64(pacote.salt), iterations: pacote.iteracoes, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const aberto = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(pacote.iv) }, chave, deBase64(pacote.dados));
    return JSON.parse(new TextDecoder().decode(aberto));
  }

  function telaDeAcesso(pacote) {
    app.innerHTML = `
      <div class="acesso">
        <form class="acesso-cartao" id="form-acesso" autocomplete="on">
          <div class="acesso-marca">${SELO_ACESSO}
            <div><h1>Projetos Fiscais</h1><p>Painel da diretoria · acesso restrito</p></div>
          </div>
          <input type="text" name="username" value="diretoria" autocomplete="username" hidden>
          <div class="campo">
            <label for="senha">Senha de acesso</label>
            <input id="senha" name="password" type="password" autocomplete="current-password" required>
          </div>
          <label class="lembrar"><input type="checkbox" id="lembrar"> Lembrar neste dispositivo</label>
          <button class="botao" type="submit">Entrar</button>
          <p class="erro" id="erro-acesso" role="alert"></p>
          <p class="acesso-rodape">Os dados são criptografados e só abrem com a senha da diretoria.</p>
        </form>
      </div>`;
    const form = document.getElementById('form-acesso');
    const campo = document.getElementById('senha');
    const erro = document.getElementById('erro-acesso');
    const botao = form.querySelector('button');
    campo.focus();

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      erro.textContent = '';
      botao.disabled = true;
      botao.textContent = 'Abrindo…';
      try {
        const painel = await abrirDados(pacote, campo.value);
        guardar.gravar('sessionStorage', CHAVE_SENHA, campo.value);
        if (document.getElementById('lembrar').checked) guardar.gravar('localStorage', CHAVE_SENHA, campo.value);
        iniciarPainel(painel);
      } catch {
        erro.textContent = window.isSecureContext === false
          ? 'Abra o painel pelo endereço https para usar a senha.'
          : 'Senha incorreta. Tente novamente.';
        botao.disabled = false;
        botao.textContent = 'Entrar';
        campo.select();
      }
    });
  }

  function sair() {
    guardar.remover('sessionStorage', CHAVE_SENHA);
    guardar.remover('localStorage', CHAVE_SENHA);
    location.reload();
  }

  // ---------- Tema ----------

  const TEMAS = ['auto', 'light', 'dark'];
  const NOME_TEMA = { auto: 'Tema automático', light: 'Tema claro', dark: 'Tema escuro' };

  function aplicarTema(tema) {
    if (tema === 'light' || tema === 'dark') document.documentElement.dataset.theme = tema;
    else delete document.documentElement.dataset.theme;
  }
  const temaAtual = () => guardar.ler('localStorage', CHAVE_TEMA) || 'auto';

  // ---------- Filtros e ordenação ----------

  function filtrar(projetos) {
    const { status, busca, pessoa, fase, tipo } = tela.filtro;
    const termo = normalizar(busca).trim();
    return projetos.filter((p) => {
      if (status === 'ativos' && p.status === 'concluido') return false;
      if (status !== 'ativos' && status !== 'todos' && p.status !== status) return false;
      if (pessoa === '__sem__' ? !p._semDono : pessoa && !p._pessoas.includes(pessoa)) return false;
      if (fase && p._fase !== fase) return false;
      if (tipo && p.tipo !== tipo) return false;
      if (termo && !termo.split(/\s+/).every((t) => p._busca.includes(t))) return false;
      return true;
    });
  }

  function ordenar(projetos) {
    const { campo, direcao } = tela.ordem;
    const sinal = direcao === 'asc' ? 1 : -1;
    // Critérios em ordem crescente; "desc" inverte. Gravidade: status primeiro, depois dias parado.
    const gravidade = (p) => (3 - STATUS[p.status].ordem) * 100000 + (p._parado ?? -1);
    const criterios = {
      parado: (a, b) => gravidade(a) - gravidade(b),
      entrada: (a, b) => Date.parse(a.entrada) - Date.parse(b.entrada),
      empresa: (a, b) => a.empresa.localeCompare(b.empresa, 'pt-BR'),
      progresso: (a, b) => a.progresso.feitas / (a.progresso.total || 1) - b.progresso.feitas / (b.progresso.total || 1),
    };
    return [...projetos].sort((a, b) => sinal * criterios[campo](a, b) || a.empresa.localeCompare(b.empresa, 'pt-BR'));
  }

  // ---------- Componentes ----------

  function topo(painel) {
    const gerado = new Date(painel.geradoEm);
    return `
      <header class="topo">
        <div class="topo-interno">
          ${SELO}
          <div class="topo-titulo">
            <h1>${esc(painel.titulo || 'Projetos Fiscais')}</h1>
            <p>${esc(painel.subtitulo || '')}</p>
          </div>
          <div class="topo-acoes">
            <span class="atualizado">Dados do Monday de <strong>${fmtData.format(gerado)} às ${fmtHora.format(gerado)}</strong></span>
            <button class="icone-botao" type="button" data-acao="tema" id="botao-tema">${ICONES.tema}<span>${NOME_TEMA[temaAtual()]}</span></button>
            ${tela.criptografado ? `<button class="icone-botao" type="button" data-acao="sair">${ICONES.sair}<span>Sair</span></button>` : ''}
          </div>
        </div>
      </header>`;
  }

  function avisoDesatualizado(painel) {
    const horas = (Date.now() - Date.parse(painel.geradoEm)) / 3_600_000;
    const limite = painel.limites?.dadosDesatualizadosAposHoras ?? 30;
    if (horas <= limite) return '';
    return `<div class="aviso" role="status">${ICONES.aviso}<div><strong>Dados desatualizados.</strong>
      A última atualização foi em ${data(painel.geradoEm)} às ${fmtHora.format(new Date(painel.geradoEm))}. A atualização automática pode ter falhado — verifique a aba Actions do GitHub.</div></div>`;
  }

  function kpis(painel) {
    const todos = painel.projetos;
    const ativos = todos.filter((p) => p.status !== 'concluido');
    const conta = (s) => ativos.filter((p) => p.status === s).length;
    const concluidos = todos.length - ativos.length;
    const novos = todos.filter((p) => (p.diasDesdeEntrada ?? 999) <= 30).length;
    const semDono = ativos.filter((p) => p._semDono).length;
    const med = mediana(ativos.map((p) => p._parado));
    const { atencaoAposDias: at, criticoAposDias: cr } = painel.limites;
    const f = tela.filtro;

    const bloco = ({ acao, valor, rotulo, numero, sufixo = '', nota, status, pressionado }) => `
      <button type="button" class="kpi ${status ? `st-${status}` : ''}" data-acao="${acao}" data-valor="${valor}" aria-pressed="${pressionado}">
        <span class="kpi-rotulo">${status ? ICONES[status] : ''}${rotulo}</span>
        <span class="kpi-valor num">${numero}${sufixo ? `<small>${sufixo}</small>` : ''}</span>
        <span class="kpi-nota">${nota}</span>
      </button>`;

    return `
      <div class="kpis" id="kpis">
        ${bloco({ acao: 'status', valor: 'ativos', rotulo: 'Projetos ativos', numero: ativos.length, nota: `${plural(concluidos, 'concluído', 'concluídos')} · ${plural(novos, 'novo', 'novos')} em 30 dias`, pressionado: f.status === 'ativos' && !f.pessoa })}
        ${bloco({ acao: 'status', valor: 'critico', status: 'critico', rotulo: 'Críticos', numero: conta('critico'), nota: `parados há +${cr} dias ou marcados “Parado”`, pressionado: f.status === 'critico' })}
        ${bloco({ acao: 'status', valor: 'atencao', status: 'atencao', rotulo: 'Atenção', numero: conta('atencao'), nota: `${at + 1} a ${cr} dias sem avanço`, pressionado: f.status === 'atencao' })}
        ${bloco({ acao: 'status', valor: 'em_dia', status: 'em_dia', rotulo: 'Em dia', numero: conta('em_dia'), nota: `com atividade nos últimos ${at} dias`, pressionado: f.status === 'em_dia' })}
        <div class="kpi kpi-estatico">
          <span class="kpi-rotulo">Tempo típico parado</span>
          <span class="kpi-valor num">${med ?? '—'}<small>${med === 1 ? 'dia' : 'dias'}</small></span>
          <span class="kpi-nota">mediana na etapa atual dos ativos</span>
        </div>
        ${bloco({ acao: 'pessoa', valor: '__sem__', rotulo: `${ICONES.pessoa}Sem responsável`, numero: semDono, nota: 'etapa atual sem dono no Monday', pressionado: f.pessoa === '__sem__' })}
      </div>`;
  }

  const ORDEM_SEGMENTOS = ['critico', 'atencao', 'em_dia'];

  function linhasDeBarras(linhas, acao, selecionado) {
    const maximo = Math.max(1, ...linhas.map((l) => l.total));
    if (!linhas.length) return '<p class="barra-vazia">Nenhum projeto ativo.</p>';
    return linhas
      .map((l) => {
        const segmentos = ORDEM_SEGMENTOS.filter((s) => l.contagem[s])
          .map((s) => {
            const n = l.contagem[s];
            return `<span class="barra-seg ${s}" style="width:${(n / maximo) * 100}%" data-dica="${esc(l.rotulo)} · ${STATUS[s].rotulo}: ${plural(n, 'projeto', 'projetos')}"></span>`;
          })
          .join('');
        return `
          <button type="button" class="barra-linha" data-acao="${acao}" data-valor="${esc(l.valor)}" aria-pressed="${selecionado === l.valor}"
            aria-label="${esc(l.rotulo)}: ${plural(l.total, 'projeto', 'projetos')}">
            <span class="barra-rotulo" data-dica="${esc(l.dica ?? l.rotulo)}">${esc(l.rotulo)}</span>
            <span class="barra-trilho">${segmentos}</span>
            <span class="barra-total num">${l.total}</span>
          </button>`;
      })
      .join('');
  }

  const contarPorStatus = (projetos) => {
    const contagem = { critico: 0, atencao: 0, em_dia: 0 };
    for (const p of projetos) if (p.status in contagem) contagem[p.status]++;
    return contagem;
  };

  const legendaStatus = () =>
    `<div class="legenda">${ORDEM_SEGMENTOS.map((s) => `<span class="st-${s}">${ICONES[s]}${STATUS[s].rotulo}</span>`).join('')}</div>`;

  function graficos(painel) {
    const ativos = painel.projetos.filter((p) => p.status !== 'concluido');

    const porFase = painel.fases
      .map((f) => {
        const doGrupo = ativos.filter((p) => p._fase === f.id);
        return { valor: f.id, rotulo: f.nome, total: doGrupo.length, contagem: contarPorStatus(doGrupo) };
      })
      .filter((l) => l.total > 0 || l.valor !== 'outras');

    const nomes = [...new Set(ativos.flatMap((p) => p._pessoas))];
    const porPessoa = nomes
      .map((n) => {
        const doResp = ativos.filter((p) => p._pessoas.includes(n));
        return { valor: n, rotulo: nomeCurto(n), dica: n, total: doResp.length, contagem: contarPorStatus(doResp) };
      })
      .sort((a, b) => b.total - a.total || b.contagem.critico - a.contagem.critico || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
    const semDono = ativos.filter((p) => p._semDono);
    if (semDono.length) {
      porPessoa.push({ valor: '__sem__', rotulo: 'Sem responsável', total: semDono.length, contagem: contarPorStatus(semDono) });
    }

    return `
      <div class="graficos" id="graficos">
        <section class="cartao grafico" aria-labelledby="g-fase">
          <h3 id="g-fase">Em que fase estão os projetos</h3>
          <p class="sub">Fase da etapa atual de cada projeto ativo · clique para filtrar a lista</p>
          ${legendaStatus()}
          <div class="barras">${linhasDeBarras(porFase, 'fase', tela.filtro.fase)}</div>
        </section>
        <section class="cartao grafico" aria-labelledby="g-pessoa">
          <h3 id="g-pessoa">Com quem estão os projetos</h3>
          <p class="sub">Projetos ativos em que a pessoa é responsável por uma etapa atual · clique para filtrar</p>
          ${legendaStatus()}
          <div class="barras">${linhasDeBarras(porPessoa, 'pessoa', tela.filtro.pessoa)}</div>
        </section>
      </div>`;
  }

  function entradasPorMes(painel) {
    const agora = new Date(painel.geradoEm);
    const meses = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - i, 15, 12));
      const chave = fmtChaveMes.format(d);
      meses.push({ chave, rotulo: `${MESES[Number(chave.slice(5, 7)) - 1]}/${chave.slice(2, 4)}`, projetos: [] });
    }
    for (const p of painel.projetos) {
      const m = meses.find((x) => x.chave === fmtChaveMes.format(new Date(p.entrada)));
      if (m) m.projetos.push(p.empresa);
    }
    const maximo = Math.max(1, ...meses.map((m) => m.projetos.length));
    const total = meses.reduce((s, m) => s + m.projetos.length, 0);
    return `
      <section class="cartao grafico" aria-labelledby="g-entradas">
        <h3 id="g-entradas">Entrada de projetos por mês</h3>
        <p class="sub">${plural(total, 'projeto iniciado', 'projetos iniciados')} nos últimos 12 meses (data de criação do quadro no Monday)</p>
        <div class="colunas" role="img" aria-label="Entradas por mês: ${meses.map((m) => `${m.rotulo} ${m.projetos.length}`).join(', ')}">
          ${meses
            .map((m) => {
              const n = m.projetos.length;
              const lista = n ? `: ${m.projetos.join(', ')}` : '';
              return `<div class="coluna" data-dica="${esc(`${m.rotulo} · ${plural(n, 'projeto', 'projetos')}${lista}`)}">
                ${n ? `<span class="coluna-valor num">${n}</span>` : ''}
                <span class="coluna-barra" style="height:${(n / maximo) * 100}%"></span>
              </div>`;
            })
            .join('')}
        </div>
        <div class="colunas-eixo">${meses.map((m) => `<span>${esc(m.rotulo)}</span>`).join('')}</div>
      </section>`;
  }

  function comoLer(painel) {
    const { atencaoAposDias: at, criticoAposDias: cr } = painel.limites;
    return `
      <section class="cartao como-ler">
        <h3>Como ler este painel</h3>
        <ul>
          <li><strong>Etapa atual:</strong> a etapa marcada como “Parado” ou, se não houver, a etapa “Em andamento” mais avançada. Sem nenhuma em andamento, é a próxima etapa que ainda não começou.</li>
          <li><strong>Parado há:</strong> dias desde a última atividade na etapa atual (mudança de status, subtarefa ou comentário no Monday). Para etapas que ainda não começaram, conta desde a conclusão da etapa anterior.</li>
          <li><strong>Semáforo:</strong> <em>Crítico</em> acima de ${cr} dias ou etapa marcada “Parado”; <em>Atenção</em> de ${at + 1} a ${cr} dias; <em>Em dia</em> até ${at} dias.</li>
          <li><strong>Com quem está:</strong> responsáveis (coluna “Resp.”) da etapa atual no Monday.</li>
          <li><strong>Frentes:</strong> cada grupo do quadro (um CNPJ ou uma frente de trabalho) é analisado em separado. A lista mostra a frente parada ou, senão, a de atividade mais recente; clique no projeto para ver todas.</li>
          <li><strong>Entrada:</strong> data de criação do quadro do cliente no Monday.</li>
        </ul>
      </section>`;
  }

  function barraDeFiltros(painel) {
    const ativos = painel.projetos.filter((p) => p.status !== 'concluido');
    const conta = (s) => painel.projetos.filter((p) => p.status === s).length;
    const opcoesStatus = [
      ['ativos', 'Ativos', ativos.length],
      ['critico', 'Críticos', conta('critico')],
      ['atencao', 'Atenção', conta('atencao')],
      ['em_dia', 'Em dia', conta('em_dia')],
      ['concluido', 'Concluídos', conta('concluido')],
      ['todos', 'Todos', painel.projetos.length],
    ];
    const pessoas = [...new Set(painel.projetos.flatMap((p) => p._pessoas))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const tipos = [...new Set(painel.projetos.map((p) => p.tipo))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return `
      <div class="cartao filtros" role="search">
        <label class="busca">
          <span class="oculto-visual">Buscar projeto, etapa ou pessoa</span>
          ${ICONES.busca}
          <input type="search" id="busca" placeholder="Buscar empresa, etapa ou pessoa…" autocomplete="off">
        </label>
        <div class="chips" role="group" aria-label="Situação">
          ${opcoesStatus
            .map(([valor, rotulo, n]) => `<button type="button" class="chip" data-acao="status" data-valor="${valor}" aria-pressed="false">${rotulo} <span class="qtd num">${n}</span></button>`)
            .join('')}
        </div>
        <select data-filtro="pessoa" aria-label="Responsável">
          <option value="">Todos os responsáveis</option>
          <option value="__sem__">Sem responsável</option>
          ${pessoas.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}
        </select>
        <select data-filtro="fase" aria-label="Fase">
          <option value="">Todas as fases</option>
          ${painel.fases.map((f) => `<option value="${esc(f.id)}">${esc(f.nome)}</option>`).join('')}
        </select>
        <select data-filtro="tipo" aria-label="Tipo de projeto">
          <option value="">Todos os tipos</option>
          ${tipos.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
        </select>
        <button type="button" class="limpar" data-acao="limpar" hidden>Limpar filtros</button>
      </div>`;
  }

  function cabecalhoLista() {
    const col = (campo, rotulo) => {
      const ativo = tela.ordem.campo === campo;
      const sort = ativo ? (tela.ordem.direcao === 'desc' ? 'descending' : 'ascending') : 'none';
      return `<button type="button" data-acao="ordenar" data-campo="${campo}" aria-sort="${sort}">${rotulo}</button>`;
    };
    return `
      <div class="lista-cabecalho">
        <span>Situação</span>
        ${col('empresa', 'Empresa')}
        ${col('entrada', 'Entrada')}
        <span>Etapa atual</span>
        <span>Com quem está</span>
        ${col('parado', 'Parado há')}
        <span>Próximo passo</span>
        ${col('progresso', 'Progresso')}
      </div>`;
  }

  function linhaProjeto(p) {
    const atual = p._atual;
    const principal = p._principal;
    const aberto = tela.abertos.has(p.id);
    const abertas = p.frentes.filter((f) => f.situacao !== 'concluida').length;
    const pct = p.progresso.total ? Math.round((p.progresso.feitas / p.progresso.total) * 100) : 0;
    const meta = [p.tipo, p.frentes.length > 1 ? `${plural(p.frentes.length, 'frente', 'frentes')}${abertas && abertas !== p.frentes.length ? ` (${abertas} em aberto)` : ''}` : null]
      .filter(Boolean)
      .join(' · ');

    const etapa = atual
      ? `${p.frentes.length > 1 ? `<span class="nome-frente" data-dica="Frente: ${esc(principal.nome)}">${esc(principal.nome)}</span>` : ''}
         <span class="nome-etapa">${esc(atual.nome)}</span>
         <span class="etiquetas">${etiquetaEstado(atual.estado)}<span class="etiqueta">${esc(nomeDaFase(atual.fase))}</span></span>`
      : `<span class="nome-etapa">Todas as etapas concluídas</span>`;

    return `
      <article class="projeto ${aberto ? 'aberto' : ''}" data-id="${esc(p.id)}">
        <div class="linha-projeto" role="button" tabindex="0" data-acao="alternar" data-id="${esc(p.id)}" aria-expanded="${aberto}">
          <div class="c-status">${pilula(p.status)}</div>
          <div class="c-empresa">
            <strong>${esc(p.empresa)}</strong>
            <span class="meta">${esc(meta)}</span>
            ${p.alertas.length ? `<span class="alertas">${p.alertas.map((a) => `<span class="alerta-chip">${esc(a.texto)}</span>`).join('')}</span>` : ''}
          </div>
          <div class="c-entrada"><span class="rot-mobile">Entrada:</span><span class="num">${data(p.entrada)}</span> <span class="meta">${ha(p.diasDesdeEntrada)}</span></div>
          <div class="c-etapa"><span class="rot-mobile">Etapa atual:</span>${etapa}</div>
          <div class="c-quem"><span class="rot-mobile">Com quem:</span>${atual ? listaPessoas(atual.responsaveis) : '—'}</div>
          <div class="c-parado">
            ${atual ? `<span class="dias num">${atual.diasParado ?? '—'}<small>${atual.diasParado === 1 ? 'dia' : 'dias'}</small></span><span class="meta">desde ${data(atual.ultimaAtividade)}</span>` : '<span class="meta">—</span>'}
          </div>
          <div class="c-proximo"><span class="rot-mobile">Próximo:</span>${
            principal?.proximo
              ? `${esc(principal.proximo.nome)}<span class="meta">${principal.proximo.responsaveis.length ? esc(principal.proximo.responsaveis.map(nomeCurto).join(', ')) : 'sem responsável definido'}</span>`
              : `<span class="meta">${atual ? 'Última etapa' : '—'}</span>`
          }</div>
          <div class="c-progresso">
            <div class="medidor" data-dica="${p.progresso.feitas} de ${p.progresso.total} etapas concluídas">
              <div class="medidor-trilho"><div class="medidor-preenchido" style="width:${pct}%"></div></div>
              <span class="num">${p.progresso.feitas}/${p.progresso.total} etapas</span>
            </div>
          </div>
        </div>
        ${aberto ? detalheProjeto(p) : ''}
      </article>`;
  }

  function blocoFrente(f, destaque) {
    const a = f.atual;
    const indiceAtual = a ? a.indice : -1;
    const trilha = f.etapas
      .map(
        (e, i) =>
          `<span class="passo ${e.estado} ${i === indiceAtual ? 'atual' : ''}" data-dica="${i + 1}. ${esc(e.nome)} — ${esc(ESTADOS[e.estado])}"></span>`,
      )
      .join('');

    let atualHtml = '<p>Todas as etapas desta frente foram concluídas.</p>';
    if (a) {
      const subs = a.subtarefasAbertas.length
        ? `<p class="meta" style="margin-top:8px">Subtarefas em aberto (${a.subtarefasAbertas.length} de ${a.subtarefasTotal}):</p>
           <ul>${a.subtarefasAbertas
             .slice(0, 6)
             .map((s) => `<li>${esc(s.nome)} <span class="meta" style="display:inline">· ${esc(s.rotulo || 'sem status')}${s.responsaveis.length ? ` · ${esc(s.responsaveis.map(nomeCurto).join(', '))}` : ''}</span></li>`)
             .join('')}${a.subtarefasAbertas.length > 6 ? `<li class="meta">+ ${a.subtarefasAbertas.length - 6} outras</li>` : ''}</ul>`
        : '';
      const comentario = a.ultimoComentario
        ? `<blockquote class="comentario">${esc(a.ultimoComentario.texto)}<footer>${esc(a.ultimoComentario.autor)} · ${data(a.ultimoComentario.data)}</footer></blockquote>`
        : '';
      atualHtml = `
        <p><strong>${esc(a.nome)}</strong> ${etiquetaEstado(a.estado)}</p>
        <p class="meta">${a.estado === 'pendente' ? 'Aguardando desde' : 'Nesta situação desde'} ${data(a.desde)} (${dias(a.diasNaEtapa)}) · última atividade ${data(a.ultimaAtividade)} (${ha(a.diasParado)})</p>
        <p>Com: ${listaPessoas(a.responsaveis)}</p>
        ${subs}${comentario}`;
    }

    const outras = f.outrasAbertas.length
      ? `<h5 style="margin-top:12px">Outras etapas abertas</h5>
         <ul>${f.outrasAbertas
           .map((o) => `<li>${esc(o.nome)} <span class="meta" style="display:inline">· ${esc(ESTADOS[o.estado])} · sem atualização ${ha(o.diasParado)}${o.responsaveis.length ? ` · ${esc(o.responsaveis.map(nomeCurto).join(', '))}` : ''}</span></li>`)
           .join('')}</ul>`
      : '';

    return `
      <div class="frente">
        <div class="frente-cabecalho">
          <h4>${esc(f.nome || 'Etapas')}${destaque ? ' <span class="meta" style="display:inline;font-weight:400">· em destaque na lista</span>' : ''}</h4>
          ${pilula(f.status)}
          <span class="meta">${f.progresso.feitas} de ${f.progresso.total} etapas concluídas</span>
        </div>
        <div class="trilha" aria-label="Etapas da frente">${trilha}</div>
        <div class="frente-grade">
          <div class="bloco"><h5>Etapa atual</h5>${atualHtml}</div>
          <div class="bloco">
            <h5>Próximo passo</h5>
            ${f.proximo ? `<p>${esc(f.proximo.nome)}</p><p class="meta">${f.proximo.responsaveis.length ? `Com: ${esc(f.proximo.responsaveis.map(nomeCurto).join(', '))}` : 'Sem responsável definido'}</p>` : `<p class="meta">${a ? 'Esta é a última etapa pendente.' : '—'}</p>`}
            ${outras}
          </div>
        </div>
      </div>`;
  }

  function detalheProjeto(p) {
    const abertas = p.frentes
      .filter((f) => f.situacao !== 'concluida')
      .sort((a, b) => (b.id === p.frentePrincipal) - (a.id === p.frentePrincipal) || STATUS[a.status].ordem - STATUS[b.status].ordem || (b.atual?.diasParado ?? 0) - (a.atual?.diasParado ?? 0));
    const concluidas = p.frentes.filter((f) => f.situacao === 'concluida');
    return `
      <div class="detalhe">
        <div class="detalhe-topo">
          ${/^https:\/\//.test(p.url ?? '') ? `<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Abrir quadro no Monday ${ICONES.externo.replace('<svg', '<svg style="width:13px;height:13px;vertical-align:-2px"')}</a>` : ''}
          <span>Quadro: ${esc(p.quadro)}</span>
          <span>Última movimentação no projeto: ${data(p.ultimaMovimentacao)} (${ha(p.diasSemMovimentacao)})</span>
        </div>
        <div class="frentes">
          ${abertas.map((f) => blocoFrente(f, p.frentes.length > 1 && f.id === p.frentePrincipal)).join('')}
          ${!abertas.length ? concluidas.map((f) => blocoFrente(f, false)).join('') : concluidas.length ? `<p class="concluidas">${plural(concluidas.length, 'frente concluída', 'frentes concluídas')}: ${concluidas.map((f) => esc(f.nome)).join(' · ')}</p>` : ''}
        </div>
      </div>`;
  }

  // ---------- Renderização ----------

  function renderizarLista() {
    const lista = ordenar(filtrar(tela.painel.projetos));
    const alvo = document.getElementById('lista');
    const contagem = document.getElementById('contagem');
    contagem.textContent = `${plural(lista.length, 'projeto', 'projetos')} ${tela.filtro.status === 'todos' ? 'no total' : 'exibidos'}`;
    alvo.innerHTML = lista.length
      ? cabecalhoLista() + lista.map(linhaProjeto).join('')
      : `${cabecalhoLista()}<p class="vazio">Nenhum projeto com esses filtros.</p>`;
  }

  function sincronizar() {
    const f = tela.filtro;
    document.getElementById('kpis').outerHTML = kpis(tela.painel);
    document.getElementById('graficos').outerHTML = graficos(tela.painel);
    for (const chip of app.querySelectorAll('.chip[data-acao="status"]')) {
      chip.setAttribute('aria-pressed', String(chip.dataset.valor === f.status));
    }
    for (const sel of app.querySelectorAll('select[data-filtro]')) sel.value = f[sel.dataset.filtro];
    const alterado = f.status !== 'ativos' || f.busca || f.pessoa || f.fase || f.tipo;
    app.querySelector('[data-acao="limpar"]').hidden = !alterado;
    renderizarLista();
  }

  function iniciarPainel(painel) {
    prepararProjetos(painel);
    tela.painel = painel;
    document.title = `${painel.titulo || 'Projetos Fiscais'} · Diretoria`;
    app.innerHTML = `
      ${topo(painel)}
      <main>
        ${avisoDesatualizado(painel)}
        ${kpis(painel)}
        <div class="secao">${graficos(painel)}</div>
        <section class="secao" id="projetos" aria-labelledby="t-projetos">
          <div class="secao-cabecalho">
            <h2 id="t-projetos">Onde está cada projeto</h2>
            <p id="contagem"></p>
          </div>
          ${barraDeFiltros(painel)}
          <div class="cartao lista" id="lista"></div>
        </section>
        <div class="secao duas-colunas">
          ${entradasPorMes(painel)}
          ${comoLer(painel)}
        </div>
        <p class="rodape">Fonte: Monday · quadros do workspace TAX - Consultivo · atualização automática</p>
      </main>`;
    ligarEventos();
    sincronizar();
  }

  // ---------- Eventos ----------

  function irParaLista() {
    const alvo = document.getElementById('projetos');
    if (alvo && alvo.getBoundingClientRect().top > window.innerHeight * 0.6) {
      alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function executar(acao, el) {
    const f = tela.filtro;
    switch (acao) {
      case 'status':
        f.status = f.status === el.dataset.valor && el.dataset.valor !== 'ativos' ? 'ativos' : el.dataset.valor;
        if (el.classList.contains('kpi')) { f.pessoa = ''; irParaLista(); }
        break;
      case 'pessoa':
        f.pessoa = f.pessoa === el.dataset.valor ? '' : el.dataset.valor;
        if (f.pessoa && f.status !== 'ativos' && f.status !== 'todos') f.status = 'ativos';
        irParaLista();
        break;
      case 'fase':
        f.fase = f.fase === el.dataset.valor ? '' : el.dataset.valor;
        if (f.fase && f.status === 'concluido') f.status = 'ativos';
        irParaLista();
        break;
      case 'limpar':
        Object.assign(f, { status: 'ativos', busca: '', pessoa: '', fase: '', tipo: '' });
        document.getElementById('busca').value = '';
        break;
      case 'ordenar': {
        const campo = el.dataset.campo;
        tela.ordem =
          tela.ordem.campo === campo
            ? { campo, direcao: tela.ordem.direcao === 'desc' ? 'asc' : 'desc' }
            : { campo, direcao: campo === 'empresa' || campo === 'entrada' ? 'asc' : 'desc' };
        renderizarLista();
        return;
      }
      case 'alternar': {
        const id = el.dataset.id;
        if (tela.abertos.has(id)) tela.abertos.delete(id); else tela.abertos.add(id);
        const artigo = el.closest('.projeto');
        const p = tela.painel.projetos.find((x) => x.id === id);
        artigo.outerHTML = linhaProjeto(p);
        app.querySelector(`.linha-projeto[data-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
        return;
      }
      case 'tema': {
        const proximo = TEMAS[(TEMAS.indexOf(temaAtual()) + 1) % TEMAS.length];
        guardar.gravar('localStorage', CHAVE_TEMA, proximo);
        aplicarTema(proximo);
        el.querySelector('span').textContent = NOME_TEMA[proximo];
        return;
      }
      case 'sair':
        sair();
        return;
      default:
        return;
    }
    sincronizar();
  }

  function ligarEventos() {
    app.addEventListener('click', (ev) => {
      if (ev.target.closest('a')) return;
      const el = ev.target.closest('[data-acao]');
      if (el) executar(el.dataset.acao, el);
    });
    app.addEventListener('keydown', (ev) => {
      const el = ev.target.closest('.linha-projeto');
      if (el && (ev.key === 'Enter' || ev.key === ' ')) {
        ev.preventDefault();
        executar('alternar', el);
      }
    });
    app.addEventListener('change', (ev) => {
      const sel = ev.target.closest('select[data-filtro]');
      if (!sel) return;
      tela.filtro[sel.dataset.filtro] = sel.value;
      if (sel.value && tela.filtro.status === 'concluido' && sel.dataset.filtro !== 'tipo') tela.filtro.status = 'ativos';
      sincronizar();
    });
    let espera;
    app.addEventListener('input', (ev) => {
      if (ev.target.id !== 'busca') return;
      clearTimeout(espera);
      espera = setTimeout(() => {
        tela.filtro.busca = ev.target.value;
        sincronizar();
      }, 120);
    });
  }

  // Dica flutuante para barras, etapas e nomes.
  function posicionarDica(x, y) {
    const margem = 12;
    const { width, height } = dica.getBoundingClientRect();
    let esquerda = x + margem;
    let topoDica = y + margem;
    if (esquerda + width > window.innerWidth - 8) esquerda = x - width - margem;
    if (topoDica + height > window.innerHeight - 8) topoDica = y - height - margem;
    dica.style.left = `${Math.max(8, esquerda)}px`;
    dica.style.top = `${Math.max(8, topoDica)}px`;
  }
  document.addEventListener('pointerover', (ev) => {
    const alvo = ev.target.closest?.('[data-dica]');
    if (!alvo) return;
    dica.textContent = alvo.dataset.dica;
    dica.hidden = false;
    posicionarDica(ev.clientX, ev.clientY);
  });
  document.addEventListener('pointermove', (ev) => {
    if (!dica.hidden) posicionarDica(ev.clientX, ev.clientY);
  });
  document.addEventListener('pointerout', (ev) => {
    const alvo = ev.target.closest?.('[data-dica]');
    if (alvo && !alvo.contains(ev.relatedTarget)) dica.hidden = true;
  });
  window.addEventListener('scroll', () => { dica.hidden = true; }, { passive: true });

  // ---------- Início ----------

  async function iniciar() {
    aplicarTema(temaAtual());
    let conteudo;
    try {
      conteudo = JSON.parse(document.getElementById('dados').textContent);
    } catch {
      conteudo = null;
    }
    if (conteudo?.aberto) {
      tela.criptografado = false;
      iniciarPainel(conteudo.aberto);
      return;
    }
    if (!conteudo?.cifrado) {
      app.innerHTML = '<p class="vazio">Painel sem dados. Execute a atualização (GitHub Actions) para publicar os dados.</p>';
      return;
    }
    tela.criptografado = true;
    const salva = guardar.ler('sessionStorage', CHAVE_SENHA) || guardar.ler('localStorage', CHAVE_SENHA);
    if (salva) {
      try {
        iniciarPainel(await abrirDados(conteudo.cifrado, salva));
        return;
      } catch {
        guardar.remover('sessionStorage', CHAVE_SENHA);
        guardar.remover('localStorage', CHAVE_SENHA);
      }
    }
    telaDeAcesso(conteudo.cifrado);
  }

  iniciar();
})();
