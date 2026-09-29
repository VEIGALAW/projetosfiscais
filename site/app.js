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
  const fmtDataCurta = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: 'short' });
  const fmtHora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
  const fmtChaveMes = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit' });
  const fmtDiaSemana = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long' });
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const data = (iso) => (iso ? fmtData.format(new Date(iso)) : '—');
  const dataCurta = (iso) => (iso ? fmtDataCurta.format(new Date(iso)).replace('.', '') : '—');
  const dias = (n) => (n == null ? '—' : n === 1 ? '1 dia' : `${n} dias`);
  const ha = (n) => (n == null ? '' : n === 0 ? 'hoje' : `há ${dias(n)}`);
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  const capitalizar = (p) => (p.length > 2 && p === p.toUpperCase() ? p[0] + p.slice(1).toLowerCase() : p);
  const nomeCurto = (nome) => {
    const partes = String(nome).split(/\s+/).filter(Boolean).map(capitalizar);
    return partes.length <= 2 ? partes.join(' ') : `${partes[0]} ${partes[partes.length - 1]}`;
  };
  const iniciais = (nome) => {
    const partes = nomeCurto(nome).split(' ');
    return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
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
    fechar: svg('<path d="m4 4 8 8M12 4l-8 8"/>'),
    seta: svg('<path d="M6 3.5 10.5 8 6 12.5"/>'),
    relogio: svg('<circle cx="8" cy="8" r="6"/><path d="M8 4.8V8l2.2 1.6"/>'),
    alvo: svg('<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.5"/>'),
  };

  const SELO = `<svg class="selo" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#c9a45c"/><text x="20" y="26.5" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="15" font-weight="700" fill="#0c2340" letter-spacing="-.5">VP</text></svg>`;

  const STATUS = {
    critico: { rotulo: 'Crítico', ordem: 0 },
    atencao: { rotulo: 'Atenção', ordem: 1 },
    em_dia: { rotulo: 'Em dia', ordem: 2 },
    concluido: { rotulo: 'Concluído', ordem: 3 },
  };
  const ESTADOS = { andamento: 'Em andamento', parado: 'Parado', pendente: 'Aguardando início', feito: 'Feito' };

  // Cores fixas por pessoa (ordem alfabética), só para identificar avatares.
  const CORES_PESSOAS = ['#2a78d6', '#eb6834', '#1baf7a', '#9085e9', '#e87ba4', '#008300', '#4a3aa7', '#c98500'];
  const corDaPessoa = new Map();

  const pilula = (status) => `<span class="pilula st-${status}">${ICONES[status]}${STATUS[status].rotulo}</span>`;
  const etiquetaEstado = (estado) =>
    `<span class="etiqueta e-${estado}"><span class="ponto"></span>${ESTADOS[estado] ?? estado}</span>`;
  const avatar = (nome, tamanho = '') =>
    `<span class="avatar ${tamanho}" style="--cor:${corDaPessoa.get(nome) ?? '#6e6d67'}" data-dica="${esc(nome)}">${esc(iniciais(nome))}</span>`;
  const avatares = (nomes, max = 3) =>
    nomes.length
      ? `<span class="avatares">${nomes.slice(0, max).map((n) => avatar(n)).join('')}${nomes.length > max ? `<span class="avatar mais" data-dica="${esc(nomes.slice(max).join(', '))}">+${nomes.length - max}</span>` : ''}</span>`
      : `<span class="sem-dono" data-dica="Etapa sem responsável no Monday">${ICONES.pessoa}Sem dono</span>`;
  const listaPessoas = (nomes) =>
    nomes.length
      ? nomes.map((n) => `<span class="pessoa-inline">${avatar(n, 'mini')}${esc(nomeCurto(n))}</span>`).join('')
      : `<span class="sem-dono">${ICONES.pessoa}Sem responsável</span>`;
  const selo = (status, n) =>
    `<span class="selo-dias st-${status}" data-dica="${STATUS[status].rotulo}${n != null ? ` · ${dias(n)} sem avanço` : ''}">${ICONES[status]}<b class="num">${n ?? '—'}</b><small>${n === 1 ? 'dia' : 'dias'}</small></span>`;

  // ---------- Estado da tela ----------

  const tela = {
    painel: null,
    criptografado: false,
    filtro: { status: 'ativos', busca: '', pessoa: '', fase: '', tipo: '' },
    ordem: { campo: 'parado', direcao: 'desc' },
    aberto: null,
  };

  const nomeDaFase = (id) => tela.painel.fases.find((f) => f.id === id)?.nome ?? 'Outras etapas';
  const projetoPorId = (id) => tela.painel.projetos.find((p) => p.id === id);
  const ativosDe = (projetos) => projetos.filter((p) => p.status !== 'concluido');

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
    const todas = [...new Set(painel.projetos.flatMap((p) => p.frentes.flatMap((f) => [...(f.atual?.responsaveis ?? []), ...(f.proximo?.responsaveis ?? [])])))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    todas.forEach((n, i) => corDaPessoa.set(n, CORES_PESSOAS[i % CORES_PESSOAS.length]));
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
        <div class="acesso-lado">
          <div class="acesso-marca">${SELO}<span>Veiga Partners</span></div>
          <h1>Projetos Fiscais</h1>
          <p>Visão executiva da carteira de levantamento de créditos: onde cada projeto está, quem está com ele e o que está parado.</p>
        </div>
        <form class="acesso-cartao" id="form-acesso" autocomplete="on">
          <h2>Acesso da diretoria</h2>
          <p class="acesso-sub">Digite a senha para abrir o painel.</p>
          <input type="text" name="username" value="diretoria" autocomplete="username" hidden>
          <div class="campo">
            <label for="senha">Senha</label>
            <input id="senha" name="password" type="password" autocomplete="current-password" required>
          </div>
          <label class="lembrar"><input type="checkbox" id="lembrar"> Lembrar neste dispositivo</label>
          <button class="botao" type="submit">Entrar</button>
          <p class="erro" id="erro-acesso" role="alert"></p>
          <p class="acesso-rodape">${ICONES.sair}Dados criptografados · acesso restrito</p>
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
  const NOME_TEMA = { auto: 'Automático', light: 'Claro', dark: 'Escuro' };

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

  const gravidade = (p) => (3 - STATUS[p.status].ordem) * 100000 + (p._parado ?? -1);

  function ordenar(projetos) {
    const { campo, direcao } = tela.ordem;
    const sinal = direcao === 'asc' ? 1 : -1;
    // Critérios em ordem crescente; "desc" inverte. Gravidade: status primeiro, depois dias parado.
    const criterios = {
      parado: (a, b) => gravidade(a) - gravidade(b),
      entrada: (a, b) => Date.parse(a.entrada) - Date.parse(b.entrada),
      empresa: (a, b) => a.empresa.localeCompare(b.empresa, 'pt-BR'),
      progresso: (a, b) => a.progresso.feitas / (a.progresso.total || 1) - b.progresso.feitas / (b.progresso.total || 1),
    };
    return [...projetos].sort((a, b) => sinal * criterios[campo](a, b) || a.empresa.localeCompare(b.empresa, 'pt-BR'));
  }

  const filtroAtivo = () => {
    const f = tela.filtro;
    return f.status !== 'ativos' || f.busca || f.pessoa || f.fase || f.tipo;
  };

  // ---------- Cabeçalho e resumo executivo ----------

  function donut(contagem, total) {
    const r = 62;
    const c = 2 * Math.PI * r;
    const gap = total > 1 ? 3 : 0;
    let acumulado = 0;
    const arcos = ['critico', 'atencao', 'em_dia']
      .filter((s) => contagem[s])
      .map((s) => {
        const tam = (contagem[s] / total) * c;
        const arco = `<circle class="arco ${s}" r="${r}" cx="80" cy="80" stroke-dasharray="${Math.max(0, tam - gap)} ${c}" stroke-dashoffset="${-acumulado}" data-dica="${STATUS[s].rotulo}: ${plural(contagem[s], 'projeto', 'projetos')}"/>`;
        acumulado += tam;
        return arco;
      })
      .join('');
    return `
      <svg class="donut" viewBox="0 0 160 160" role="img" aria-label="Situação dos ${total} projetos ativos">
        <circle class="trilho" r="${r}" cx="80" cy="80"/>
        <g transform="rotate(-90 80 80)">${arcos}</g>
        <text x="80" y="78" text-anchor="middle" class="donut-num">${total}</text>
        <text x="80" y="100" text-anchor="middle" class="donut-rot">projetos ativos</text>
      </svg>`;
  }

  function kpis(painel) {
    const todos = painel.projetos;
    const ativos = ativosDe(todos);
    const contagem = { critico: 0, atencao: 0, em_dia: 0 };
    for (const p of ativos) contagem[p.status]++;
    const concluidos = todos.length - ativos.length;
    const semDono = ativos.filter((p) => p._semDono).length;
    const novos = todos.filter((p) => (p.diasDesdeEntrada ?? 999) <= 30).length;
    const { atencaoAposDias: at, criticoAposDias: cr } = painel.limites;
    const kpi = (valor, rotulo, nota, { acao, alvo, status, pressionado } = {}) => `
      <button type="button" class="kpi ${status ? `st-${status}` : ''}" ${acao ? `data-acao="${acao}" data-valor="${alvo}"` : 'disabled'} aria-pressed="${Boolean(pressionado)}">
        <span class="kpi-valor num">${valor}</span>
        <span class="kpi-rotulo">${status ? ICONES[status] : ''}${rotulo}</span>
        <span class="kpi-nota">${nota}</span>
      </button>`;
    const f = tela.filtro;

    return `
      <div class="kpis" id="kpis">
              ${kpi(contagem.critico, 'Críticos', `+${cr} dias ou “Parado”`, { acao: 'status', alvo: 'critico', status: 'critico', pressionado: f.status === 'critico' })}
              ${kpi(contagem.atencao, 'Atenção', `${at + 1} a ${cr} dias`, { acao: 'status', alvo: 'atencao', status: 'atencao', pressionado: f.status === 'atencao' })}
              ${kpi(contagem.em_dia, 'Em dia', `até ${at} dias`, { acao: 'status', alvo: 'em_dia', status: 'em_dia', pressionado: f.status === 'em_dia' })}
              ${kpi(semDono, 'Sem dono', 'etapa sem responsável', { acao: 'pessoa', alvo: '__sem__', pressionado: f.pessoa === '__sem__' })}
              ${kpi(concluidos, 'Concluídos', `${plural(novos, 'novo', 'novos')} em 30 dias`, { acao: 'status', alvo: 'concluido', status: 'concluido', pressionado: f.status === 'concluido' })}
            </div>
    `;
  }

  function cabecalho(painel) {
    const todos = painel.projetos;
    const ativos = ativosDe(todos);
    const contagem = { critico: 0, atencao: 0, em_dia: 0 };
    for (const p of ativos) contagem[p.status]++;
    const concluidos = todos.length - ativos.length;
    const semDono = ativos.filter((p) => p._semDono).length;
    const med = mediana(ativos.map((p) => p._parado));
    const novos = todos.filter((p) => (p.diasDesdeEntrada ?? 999) <= 30).length;
    const { atencaoAposDias: at, criticoAposDias: cr } = painel.limites;
    const gerado = new Date(painel.geradoEm);

    const pct = ativos.length ? Math.round((contagem.critico / ativos.length) * 100) : 0;
    const manchete = !ativos.length
      ? 'Nenhum projeto ativo no momento.'
      : contagem.critico === 0
        ? 'Carteira em dia: nenhum projeto parado há mais de ' + cr + ' dias.'
        : `<em>${contagem.critico} de ${ativos.length}</em> projetos estão parados há mais de ${cr} dias.`;

    return `
      <header class="topo">
        <div class="topo-barra">
          <div class="marca">${SELO}<div><strong>Veiga Partners</strong><span>Projetos Fiscais · Painel executivo</span></div></div>
          <div class="topo-acoes">
            <span class="atualizado">${ICONES.relogio}Atualizado ${fmtData.format(gerado)} às ${fmtHora.format(gerado)}</span>
            <button class="icone-botao" type="button" data-acao="tema">${ICONES.tema}<span>${NOME_TEMA[temaAtual()]}</span></button>
            ${tela.criptografado ? `<button class="icone-botao" type="button" data-acao="sair">${ICONES.sair}<span>Sair</span></button>` : ''}
          </div>
        </div>
        <div class="heroi">
          <div class="heroi-texto">
            <p class="sobretitulo">${esc(fmtDiaSemana.format(gerado))}</p>
            <h1>${manchete}</h1>
            <p class="heroi-sub">${ativos.length ? `${pct}% da carteira ativa está travada. O tempo típico sem avanço na etapa atual é de <strong>${dias(med)}</strong>${semDono ? ` e <strong>${plural(semDono, 'projeto está', 'projetos estão')} sem responsável</strong>` : ''}.` : ''}</p>
            ${kpis(painel)}
          </div>
          <div class="heroi-grafico">
            ${donut(contagem, ativos.length || 1)}
            <div class="donut-legenda">
              ${['critico', 'atencao', 'em_dia'].map((s) => `<span class="st-${s}">${ICONES[s]}${STATUS[s].rotulo}<b class="num">${contagem[s]}</b></span>`).join('')}
            </div>
          </div>
        </div>
      </header>`;
  }

  function avisoDesatualizado(painel) {
    const horas = (Date.now() - Date.parse(painel.geradoEm)) / 3_600_000;
    const limite = painel.limites?.dadosDesatualizadosAposHoras ?? 30;
    if (horas <= limite) return '';
    return `<div class="aviso" role="status">${ICONES.aviso}<div><strong>Dados desatualizados.</strong>
      A última atualização foi em ${data(painel.geradoEm)} às ${fmtHora.format(new Date(painel.geradoEm))}. Verifique a atualização automática (aba Actions do GitHub).</div></div>`;
  }

  // ---------- Esteira por fase ----------

  function cartaoProjeto(p) {
    const a = p._atual;
    return `
      <button type="button" class="card st-${p.status}" data-acao="abrir" data-id="${esc(p.id)}">
        <span class="card-empresa">${esc(p.empresa)}</span>
        <span class="card-etapa" data-dica="${esc(a ? `${a.nome} · ${ESTADOS[a.estado]}` : 'Concluído')}">${a?.estado === 'parado' ? '<span class="marca-parado">Parado</span> ' : ''}${esc(a?.nome ?? 'Concluído')}</span>
        <span class="card-rodape">
          ${a ? avatares(a.responsaveis) : '<span></span>'}
          ${selo(p.status, p._parado)}
        </span>
      </button>`;
  }

  function esteira(painel) {
    const visiveis = ativosDe(filtrar(painel.projetos));
    const colunas = painel.fases
      .map((f) => ({ ...f, projetos: ordenar(visiveis.filter((p) => p._fase === f.id)) }))
      .filter((c) => c.projetos.length || c.id !== 'outras');
    return `
      <div class="esteira" id="esteira">
        ${colunas
          .map((c, i) => {
            const criticos = c.projetos.filter((p) => p.status === 'critico').length;
            return `
            <section class="coluna-fase" aria-label="${esc(c.nome)}">
              <header>
                <span class="fase-num">${c.id === 'outras' ? '•' : i + 1}</span>
                <div><h3>${esc(c.nome)}</h3><span>${plural(c.projetos.length, 'projeto', 'projetos')}${criticos ? ` · ${criticos} crítico${criticos > 1 ? 's' : ''}` : ''}</span></div>
              </header>
              <div class="cards">${c.projetos.map(cartaoProjeto).join('') || '<p class="coluna-vazia">Nenhum projeto nesta fase</p>'}</div>
            </section>`;
          })
          .join('')}
      </div>`;
  }

  // ---------- Gargalos e pessoas ----------

  function gargalos(painel) {
    const lista = [...ativosDe(painel.projetos)].sort((a, b) => (b._parado ?? -1) - (a._parado ?? -1)).slice(0, 8);
    const maximo = Math.max(1, ...lista.map((p) => p._parado ?? 0));
    return `
      <section class="cartao painel-bloco">
        <div class="bloco-cabecalho">
          <div><h2>Maiores gargalos</h2><p>Projetos há mais tempo sem avanço na etapa atual</p></div>
        </div>
        <ol class="ranking">
          ${lista
            .map(
              (p, i) => `
            <li>
              <button type="button" class="ranking-linha" data-acao="abrir" data-id="${esc(p.id)}">
                <span class="posicao num">${i + 1}</span>
                <span class="ranking-nome"><strong>${esc(p.empresa)}</strong><span>${esc(p._atual?.nome ?? '')}</span></span>
                <span class="ranking-barra"><span class="barra-dias st-${p.status}" style="width:${Math.max(4, ((p._parado ?? 0) / maximo) * 100)}%"></span></span>
                <span class="ranking-dias num">${p._parado ?? '—'}<small>dias</small></span>
                ${p._atual ? avatares(p._atual.responsaveis, 2) : ''}
              </button>
            </li>`,
            )
            .join('')}
        </ol>
      </section>`;
  }

  function pessoas(painel) {
    const ativos = ativosDe(painel.projetos);
    const nomes = [...new Set(ativos.flatMap((p) => p._pessoas))];
    const linhas = nomes
      .map((n) => {
        const doResp = ativos.filter((p) => p._pessoas.includes(n));
        const conta = { critico: 0, atencao: 0, em_dia: 0 };
        for (const p of doResp) conta[p.status]++;
        return { n, total: doResp.length, conta };
      })
      .sort((a, b) => b.total - a.total || b.conta.critico - a.conta.critico || a.n.localeCompare(b.n, 'pt-BR'));
    const maximo = Math.max(1, ...linhas.map((l) => l.total));
    const semDono = ativos.filter((p) => p._semDono).length;
    return `
      <section class="cartao painel-bloco">
        <div class="bloco-cabecalho">
          <div><h2>Com quem estão os projetos</h2><p>Projetos ativos por responsável da etapa atual · clique para filtrar</p></div>
        </div>
        <div class="pessoas">
          ${linhas
            .map(
              (l) => `
            <button type="button" class="pessoa-linha" data-acao="pessoa" data-valor="${esc(l.n)}" aria-pressed="${tela.filtro.pessoa === l.n}">
              ${avatar(l.n)}
              <span class="pessoa-nome">${esc(nomeCurto(l.n))}</span>
              <span class="pessoa-barra" style="--largura:${(l.total / maximo) * 100}%">
                ${['critico', 'atencao', 'em_dia'].filter((s) => l.conta[s]).map((s) => `<span class="seg ${s}" style="flex:${l.conta[s]}" data-dica="${esc(nomeCurto(l.n))} · ${STATUS[s].rotulo}: ${plural(l.conta[s], 'projeto', 'projetos')}"></span>`).join('')}
              </span>
              <span class="pessoa-total num">${l.total}</span>
            </button>`,
            )
            .join('')}
          ${semDono ? `<button type="button" class="pessoa-linha sem" data-acao="pessoa" data-valor="__sem__" aria-pressed="${tela.filtro.pessoa === '__sem__'}"><span class="avatar vazio">${ICONES.pessoa}</span><span class="pessoa-nome">Sem responsável</span><span class="pessoa-barra" style="--largura:${(semDono / maximo) * 100}%"><span class="seg critico" style="flex:1"></span></span><span class="pessoa-total num">${semDono}</span></button>` : ''}
        </div>
        <div class="legenda">${['critico', 'atencao', 'em_dia'].map((s) => `<span class="st-${s}">${ICONES[s]}${STATUS[s].rotulo}</span>`).join('')}</div>
      </section>`;
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
      <section class="cartao painel-bloco">
        <div class="bloco-cabecalho">
          <div><h2>Entrada de projetos</h2><p>${plural(total, 'projeto iniciado', 'projetos iniciados')} nos últimos 12 meses</p></div>
        </div>
        <div class="colunas" role="img" aria-label="Entradas por mês: ${meses.map((m) => `${m.rotulo} ${m.projetos.length}`).join(', ')}">
          ${meses
            .map((m) => {
              const n = m.projetos.length;
              return `<div class="coluna" data-dica="${esc(`${m.rotulo} · ${plural(n, 'projeto', 'projetos')}${n ? `: ${m.projetos.join(', ')}` : ''}`)}">
                ${n ? `<span class="coluna-valor num">${n}</span>` : ''}
                <span class="coluna-barra" style="height:${(n / maximo) * 100}%"></span>
                <span class="coluna-rotulo">${esc(m.rotulo)}</span>
              </div>`;
            })
            .join('')}
        </div>
      </section>`;
  }

  function comoLer(painel) {
    const { atencaoAposDias: at, criticoAposDias: cr } = painel.limites;
    return `
      <section class="cartao painel-bloco como-ler">
        <div class="bloco-cabecalho"><div><h2>Como ler</h2><p>Regras usadas nos números acima</p></div></div>
        <dl>
          <div><dt>Etapa atual</dt><dd>A marcada “Parado” ou, senão, a “Em andamento” mais avançada. Sem nenhuma em andamento, a próxima que ainda não começou.</dd></div>
          <div><dt>Dias parado</dt><dd>Desde a última atividade na etapa (status, subtarefa ou comentário no Monday).</dd></div>
          <div><dt>Semáforo</dt><dd><span class="st-critico">${ICONES.critico}</span> Crítico: +${cr} dias ou “Parado” · <span class="st-atencao">${ICONES.atencao}</span> Atenção: ${at + 1}–${cr} dias · <span class="st-em_dia">${ICONES.em_dia}</span> Em dia: até ${at} dias</dd></div>
          <div><dt>Entrada</dt><dd>Data de criação do quadro do cliente no Monday.</dd></div>
        </dl>
      </section>`;
  }

  // ---------- Lista completa ----------

  function barraDeFiltros(painel) {
    const conta = (s) => painel.projetos.filter((p) => p.status === s).length;
    const opcoesStatus = [
      ['ativos', 'Ativos', ativosDe(painel.projetos).length],
      ['critico', 'Críticos', conta('critico')],
      ['atencao', 'Atenção', conta('atencao')],
      ['em_dia', 'Em dia', conta('em_dia')],
      ['concluido', 'Concluídos', conta('concluido')],
      ['todos', 'Todos', painel.projetos.length],
    ];
    const nomes = [...new Set(painel.projetos.flatMap((p) => p._pessoas))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const tipos = [...new Set(painel.projetos.map((p) => p.tipo))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return `
      <div class="filtros" role="search">
        <label class="busca">
          <span class="oculto-visual">Buscar projeto, etapa ou pessoa</span>
          ${ICONES.busca}
          <input type="search" id="busca" placeholder="Buscar empresa, etapa ou pessoa…" autocomplete="off">
        </label>
        <div class="chips" role="group" aria-label="Situação">
          ${opcoesStatus.map(([valor, rotulo, n]) => `<button type="button" class="chip" data-acao="status" data-valor="${valor}" aria-pressed="false">${rotulo}<span class="qtd num">${n}</span></button>`).join('')}
        </div>
        <div class="selects">
          <select data-filtro="pessoa" aria-label="Responsável">
            <option value="">Todos os responsáveis</option>
            <option value="__sem__">Sem responsável</option>
            ${nomes.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}
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
        </div>
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
        ${col('empresa', 'Empresa')}
        <span>Etapa atual</span>
        <span>Com quem</span>
        ${col('parado', 'Parado há')}
        <span>Próximo passo</span>
        ${col('entrada', 'Entrada')}
        ${col('progresso', 'Progresso')}
      </div>`;
  }

  function linhaProjeto(p) {
    const a = p._atual;
    const principal = p._principal;
    const pct = p.progresso.total ? Math.round((p.progresso.feitas / p.progresso.total) * 100) : 0;
    return `
      <button type="button" class="linha st-${p.status}" data-acao="abrir" data-id="${esc(p.id)}">
        <span class="c-empresa">
          <strong>${esc(p.empresa)}</strong>
          <span class="meta">${esc(p.tipo)}${p.frentes.length > 1 ? ` · ${plural(p.frentes.length, 'frente', 'frentes')}` : ''}</span>
        </span>
        <span class="c-etapa">
          <span class="nome-etapa">${esc(a?.nome ?? 'Todas as etapas concluídas')}</span>
          ${a ? `<span class="etiquetas">${etiquetaEstado(a.estado)}<span class="etiqueta">${esc(nomeDaFase(a.fase))}</span></span>` : ''}
        </span>
        <span class="c-quem">${a ? avatares(a.responsaveis) : '—'}</span>
        <span class="c-parado">${a ? selo(p.status, a.diasParado) : pilula('concluido')}</span>
        <span class="c-proximo"><span class="rot-mobile">Próximo:</span>${principal?.proximo ? esc(principal.proximo.nome) : `<span class="meta">${a ? 'Última etapa' : '—'}</span>`}</span>
        <span class="c-entrada"><span class="rot-mobile">Entrada:</span><span class="num">${data(p.entrada)}</span><span class="meta">${ha(p.diasDesdeEntrada)}</span></span>
        <span class="c-progresso">
          <span class="medidor" data-dica="${p.progresso.feitas} de ${p.progresso.total} etapas concluídas">
            <span class="medidor-trilho"><span class="medidor-preenchido" style="width:${pct}%"></span></span>
            <span class="num">${pct}%</span>
          </span>
        </span>
      </button>`;
  }

  // ---------- Detalhe (gaveta lateral) ----------

  function blocoFrente(f, unica) {
    const a = f.atual;
    const trilha = f.etapas
      .map((e, i) => `<span class="passo ${e.estado} ${a && i === a.indice ? 'atual' : ''}" data-dica="${i + 1}. ${esc(e.nome)} — ${esc(ESTADOS[e.estado])}"></span>`)
      .join('');

    let atualHtml = '<p class="meta">Todas as etapas desta frente foram concluídas.</p>';
    if (a) {
      const subs = a.subtarefasAbertas.length
        ? `<div class="subtarefas"><h5>Subtarefas em aberto · ${a.subtarefasAbertas.length} de ${a.subtarefasTotal}</h5><ul>${a.subtarefasAbertas
            .slice(0, 6)
            .map((s) => `<li>${esc(s.nome)}<span class="meta">${esc(s.rotulo || 'sem status')}${s.responsaveis.length ? ` · ${esc(s.responsaveis.map(nomeCurto).join(', '))}` : ''}</span></li>`)
            .join('')}${a.subtarefasAbertas.length > 6 ? `<li class="meta">+ ${a.subtarefasAbertas.length - 6} outras</li>` : ''}</ul></div>`
        : '';
      const comentario = a.ultimoComentario
        ? `<blockquote class="comentario"><p>${esc(a.ultimoComentario.texto)}</p><footer>${esc(a.ultimoComentario.autor)} · ${data(a.ultimoComentario.data)}</footer></blockquote>`
        : '';
      atualHtml = `
        <div class="etapa-atual">
          <div class="etapa-atual-topo"><strong>${esc(a.nome)}</strong>${etiquetaEstado(a.estado)}</div>
          <p class="meta">${a.estado === 'pendente' ? 'Aguardando desde' : 'Nesta situação desde'} ${data(a.desde)} · última atividade ${ha(a.diasParado)}</p>
          <div class="pessoas-inline">${listaPessoas(a.responsaveis)}</div>
        </div>
        ${comentario}${subs}`;
    }

    const outras = f.outrasAbertas.length
      ? `<div class="outras"><h5>Outras etapas abertas</h5><ul>${f.outrasAbertas
          .map((o) => `<li>${esc(o.nome)}<span class="meta">${esc(ESTADOS[o.estado])} · sem atualização ${ha(o.diasParado)}</span></li>`)
          .join('')}</ul></div>`
      : '';

    return `
      <section class="frente">
        ${unica ? '' : `<header class="frente-cabecalho"><h4>${esc(f.nome || 'Etapas')}</h4>${pilula(f.status)}</header>`}
        <div class="trilha-rotulo"><span>Etapas</span><span class="num">${f.progresso.feitas}/${f.progresso.total} concluídas</span></div>
        <div class="trilha" aria-label="Etapas da frente">${trilha}</div>
        ${atualHtml}
        ${f.proximo ? `<div class="proximo">${ICONES.seta}<div><span class="meta">Próximo passo</span><strong>${esc(f.proximo.nome)}</strong>${f.proximo.responsaveis.length ? `<span class="meta">com ${esc(f.proximo.responsaveis.map(nomeCurto).join(', '))}</span>` : ''}</div></div>` : ''}
        ${outras}
      </section>`;
  }

  function gaveta(p) {
    const a = p._atual;
    const abertas = p.frentes
      .filter((f) => f.situacao !== 'concluida')
      .sort((x, y) => (y.id === p.frentePrincipal) - (x.id === p.frentePrincipal) || STATUS[x.status].ordem - STATUS[y.status].ordem || (y.atual?.diasParado ?? 0) - (x.atual?.diasParado ?? 0));
    const concluidas = p.frentes.filter((f) => f.situacao === 'concluida');
    const unica = p.frentes.length === 1;
    const pct = p.progresso.total ? Math.round((p.progresso.feitas / p.progresso.total) * 100) : 0;
    return `
      <div class="veu" data-acao="fechar"></div>
      <aside class="gaveta" role="dialog" aria-modal="true" aria-labelledby="gaveta-titulo">
        <header class="gaveta-topo st-${p.status}">
          <div>
            ${pilula(p.status)}
            <h2 id="gaveta-titulo">${esc(p.empresa)}</h2>
            <p>${esc(p.tipo)} · entrou em ${data(p.entrada)} (${ha(p.diasDesdeEntrada)})</p>
          </div>
          <button type="button" class="fechar" data-acao="fechar" aria-label="Fechar">${ICONES.fechar}</button>
        </header>
        <div class="gaveta-corpo">
          <div class="resumo">
            <div><span>Parado há</span><strong class="num">${a ? dias(a.diasParado) : '—'}</strong></div>
            <div><span>Progresso</span><strong class="num">${pct}%</strong></div>
            <div><span>Última movimentação</span><strong>${dataCurta(p.ultimaMovimentacao)}</strong></div>
          </div>
          ${p.alertas.length ? `<div class="alertas">${p.alertas.map((al) => `<span>${ICONES.aviso}${esc(al.texto)}</span>`).join('')}</div>` : ''}
          ${abertas.map((f) => blocoFrente(f, unica)).join('')}
          ${!abertas.length ? concluidas.map((f) => blocoFrente(f, unica)).join('') : concluidas.length ? `<p class="concluidas">${ICONES.concluido}${plural(concluidas.length, 'frente concluída', 'frentes concluídas')}: ${concluidas.map((f) => esc(f.nome)).join(' · ')}</p>` : ''}
          ${/^https:\/\//.test(p.url ?? '') ? `<a class="botao-monday" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Abrir quadro no Monday ${ICONES.externo}</a>` : ''}
        </div>
      </aside>`;
  }

  function abrirGaveta(id) {
    const p = projetoPorId(id);
    if (!p) return;
    tela.aberto = id;
    const alvo = document.getElementById('camada');
    alvo.innerHTML = gaveta(p);
    document.body.classList.add('com-gaveta');
    requestAnimationFrame(() => alvo.classList.add('visivel'));
    alvo.querySelector('.fechar')?.focus();
  }

  function fecharGaveta() {
    const alvo = document.getElementById('camada');
    alvo.classList.remove('visivel');
    document.body.classList.remove('com-gaveta');
    const id = tela.aberto;
    tela.aberto = null;
    setTimeout(() => { if (!tela.aberto) alvo.innerHTML = ''; }, 250);
    if (id) app.querySelector(`[data-acao="abrir"][data-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
  }

  // ---------- Renderização ----------

  function renderizarDinamico() {
    const f = tela.filtro;
    const painel = tela.painel;
    document.getElementById('kpis').outerHTML = kpis(painel);
    document.getElementById('esteira').outerHTML = esteira(painel);
    document.getElementById('bloco-pessoas').innerHTML = pessoas(painel);

    for (const chip of app.querySelectorAll('.chip[data-acao="status"]')) chip.setAttribute('aria-pressed', String(chip.dataset.valor === f.status));
    for (const sel of app.querySelectorAll('select[data-filtro]')) sel.value = f[sel.dataset.filtro];
    app.querySelector('[data-acao="limpar"]').hidden = !filtroAtivo();

    const resumo = document.getElementById('resumo-filtro');
    resumo.hidden = !filtroAtivo();
    resumo.innerHTML = filtroAtivo() ? `Filtro aplicado à esteira e à lista · <button type="button" data-acao="limpar">limpar</button>` : '';

    const lista = ordenar(filtrar(painel.projetos));
    document.getElementById('contagem').textContent = plural(lista.length, 'projeto', 'projetos');
    document.getElementById('lista').innerHTML = cabecalhoLista() + (lista.length ? lista.map(linhaProjeto).join('') : '<p class="vazio">Nenhum projeto com esses filtros.</p>');
  }

  function iniciarPainel(painel) {
    prepararProjetos(painel);
    tela.painel = painel;
    document.title = `${painel.titulo || 'Projetos Fiscais'} · Painel executivo`;
    app.innerHTML = `
      ${cabecalho(painel)}
      <main>
        ${avisoDesatualizado(painel)}
        <section class="secao">
          <div class="secao-cabecalho">
            <div><h2>Esteira dos projetos</h2><p>Em que fase está cada projeto ativo · clique num card para ver os detalhes</p></div>
            <p class="resumo-filtro" id="resumo-filtro" hidden></p>
          </div>
          ${esteira(painel)}
        </section>
        <div class="grade-2">
          ${gargalos(painel)}
          <div id="bloco-pessoas">${pessoas(painel)}</div>
        </div>
        <section class="secao" id="projetos">
          <div class="secao-cabecalho">
            <div><h2>Todos os projetos</h2><p>Lista completa com filtros · <span id="contagem"></span></p></div>
          </div>
          <div class="cartao lista-cartao">
            ${barraDeFiltros(painel)}
            <div class="lista" id="lista"></div>
          </div>
        </section>
        <div class="grade-2">
          ${entradasPorMes(painel)}
          ${comoLer(painel)}
        </div>
        <p class="rodape">Fonte: Monday · workspace TAX - Consultivo · atualização automática</p>
      </main>
      <div id="camada" class="camada"></div>`;
    ligarEventos();
    renderizarDinamico();
  }

  // ---------- Eventos ----------

  function executar(acao, el) {
    const f = tela.filtro;
    switch (acao) {
      case 'status':
        f.status = f.status === el.dataset.valor && el.dataset.valor !== 'ativos' ? 'ativos' : el.dataset.valor;
        if (el.classList.contains('kpi')) f.pessoa = '';
        break;
      case 'pessoa':
        f.pessoa = f.pessoa === el.dataset.valor ? '' : el.dataset.valor;
        if (f.pessoa && f.status !== 'ativos' && f.status !== 'todos') f.status = 'ativos';
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
        break;
      }
      case 'abrir':
        abrirGaveta(el.dataset.id);
        return;
      case 'fechar':
        fecharGaveta();
        return;
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
    renderizarDinamico();
  }

  function ligarEventos() {
    document.addEventListener('click', (ev) => {
      if (ev.target.closest('a')) return;
      const el = ev.target.closest('[data-acao]');
      if (el && !el.disabled) executar(el.dataset.acao, el);
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && tela.aberto) fecharGaveta();
    });
    app.addEventListener('change', (ev) => {
      const sel = ev.target.closest('select[data-filtro]');
      if (!sel) return;
      tela.filtro[sel.dataset.filtro] = sel.value;
      if (sel.value && tela.filtro.status === 'concluido' && sel.dataset.filtro !== 'tipo') tela.filtro.status = 'ativos';
      renderizarDinamico();
    });
    let espera;
    app.addEventListener('input', (ev) => {
      if (ev.target.id !== 'busca') return;
      clearTimeout(espera);
      espera = setTimeout(() => {
        tela.filtro.busca = ev.target.value;
        renderizarDinamico();
      }, 120);
    });
  }

  // Dica flutuante.
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
  window.addEventListener('scroll', () => { dica.hidden = true; }, { passive: true, capture: true });

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
