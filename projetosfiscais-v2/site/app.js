// Projetos Fiscais · Diretoria — painel estático (GitHub Pages).
//
// A casca (senha, tema, barra superior) é deste arquivo. O painel em si — HTML, cálculos e
// desenho — é o mesmo do dashboard interativo do Claude, colado nas funções marcadas abaixo e
// executado sobre um pequeno "dash" local que entrega os dados descriptografados.
(() => {
  'use strict';

  const CHAVE_SENHA = 'painel-fiscal:senha';
  const CHAVE_TEMA = 'painel-fiscal:tema';
  const FUSO = 'America/Sao_Paulo';
  const PARAMS_PADRAO = { status: 'ativos', fase: null, pessoa: null, busca: '', tipo: null };
  const MARKUP = "<div class=\"pf\" id=\"pagina\">\n  <header class=\"pf-head\" id=\"topo\">\n    <div><h1>Onde estão os projetos</h1><p class=\"pf-sub\">Visão executiva da esteira de diagnósticos fiscais e previdenciários</p></div>\n    <div>\n      <p class=\"pf-resumo dash-skeleton\" id=\"resumo\" data-source=\"kpis por_fase\">—</p>\n      <p class=\"pf-atualizado\" id=\"atualizado\"></p>\n    </div>\n  </header>\n\n  <section class=\"pf-tiles\" id=\"kpis\" aria-label=\"Indicadores\">\n    <button class=\"pf-tile\" data-filtro=\"ativos\" id=\"tile-ativos\">\n      <span class=\"rotulo\">Projetos ativos</span>\n      <span class=\"numero\"><span class=\"dash-skeleton\" data-source=\"kpis\" data-field=\"ativos\" data-row=\"0\">—</span></span>\n      <span class=\"nota\"><span data-source=\"kpis\" data-field=\"concluidos\" data-row=\"0\">—</span> <span id=\"p-concluidos\">concluídos</span> · <span data-source=\"kpis\" data-field=\"novos_30d\" data-row=\"0\">—</span> <span id=\"p-novos\">novos</span> em 30 dias</span>\n    </button>\n    <button class=\"pf-tile t-critico\" data-filtro=\"critico\" id=\"tile-critico\">\n      <span class=\"rotulo\"><span class=\"ponto critico\"></span>Críticos</span>\n      <span class=\"numero\"><span class=\"dash-skeleton\" data-source=\"kpis\" data-field=\"criticos\" data-row=\"0\">—</span></span>\n      <span class=\"nota\">sem movimento há +15 dias ou marcados \"Parado\"</span>\n    </button>\n    <button class=\"pf-tile t-atencao\" data-filtro=\"atencao\" id=\"tile-atencao\">\n      <span class=\"rotulo\"><span class=\"ponto atencao\"></span>Atenção</span>\n      <span class=\"numero\"><span class=\"dash-skeleton\" data-source=\"kpis\" data-field=\"atencao\" data-row=\"0\">—</span></span>\n      <span class=\"nota\">8 a 15 dias sem movimento</span>\n    </button>\n    <button class=\"pf-tile t-emdia\" data-filtro=\"em_dia\" id=\"tile-emdia\">\n      <span class=\"rotulo\"><span class=\"ponto em_dia\"></span>Em dia</span>\n      <span class=\"numero\"><span class=\"dash-skeleton\" data-source=\"kpis\" data-field=\"em_dia\" data-row=\"0\">—</span></span>\n      <span class=\"nota\">com movimento nos últimos 7 dias</span>\n    </button>\n    <button class=\"pf-tile\" data-filtro=\"prazo\" id=\"tile-prazos\">\n      <span class=\"rotulo\">Prazos vencidos</span>\n      <span class=\"numero\"><span class=\"dash-skeleton\" data-source=\"kpis\" data-field=\"prazos_vencidos\" data-row=\"0\">—</span><small>etapas</small></span>\n      <span class=\"nota\"><span data-source=\"kpis\" data-field=\"prazos_14d\" data-row=\"0\">—</span> <span id=\"p-vencem\">vencem</span> nos próximos 14 dias</span>\n    </button>\n    <button class=\"pf-tile\" data-filtro=\"sem_dono\" id=\"tile-semdono\">\n      <span class=\"rotulo\">Sem responsável</span>\n      <span class=\"numero\"><span class=\"dash-skeleton\" data-source=\"kpis\" data-field=\"sem_dono\" data-row=\"0\">—</span></span>\n      <span class=\"nota\">etapa atual sem dono no Monday · mediana parado: <span data-source=\"kpis\" data-field=\"mediana_dias\" data-row=\"0\">—</span> dias</span>\n    </button>\n  </section>\n\n  <section class=\"pf-grid\">\n    <div class=\"card\" id=\"fases\">\n      <h2>Em que fase está a esteira</h2>\n      <p class=\"nota\">Fase da etapa atual de cada projeto ativo · clique para filtrar a lista</p>\n      <div class=\"legenda\"><span><i class=\"ponto critico\"></i>Crítico</span><span><i class=\"ponto atencao\"></i>Atenção</span><span><i class=\"ponto em_dia\"></i>Em dia</span></div>\n      <div class=\"corpo barras dash-skeleton\" id=\"fases-corpo\" data-source=\"por_fase\"></div>\n    </div>\n    <div class=\"card\" id=\"pessoas\">\n      <h2>Com quem estão os projetos</h2>\n      <p class=\"nota\">Responsáveis pela etapa atual dos projetos ativos · clique para filtrar</p>\n      <div class=\"legenda\"><span><i class=\"ponto critico\"></i>Crítico</span><span><i class=\"ponto atencao\"></i>Atenção</span><span><i class=\"ponto em_dia\"></i>Em dia</span></div>\n      <div class=\"corpo barras dash-skeleton\" id=\"pessoas-corpo\" data-source=\"por_pessoa\"></div>\n    </div>\n  </section>\n\n  <section class=\"pf-grid\">\n    <div class=\"card\" id=\"travas\">\n      <h2>Maiores travas agora</h2>\n      <p class=\"nota\">Frentes abertas há mais tempo sem nenhuma mudança de status · clique para abrir o projeto</p>\n      <div class=\"corpo lista dash-skeleton\" id=\"travas-corpo\" data-source=\"travas\"></div>\n    </div>\n    <div class=\"card\" id=\"prazos\">\n      <h2>Prazos do cronograma</h2>\n      <p class=\"nota\">Etapas não concluídas com data-fim no Monday: vencidas e as que vencem em 14 dias</p>\n      <div class=\"corpo prazos-corpo dash-skeleton\" id=\"prazos-corpo\" data-source=\"prazos\"></div>\n    </div>\n    <div class=\"card\" id=\"ritmo\">\n      <h2>Ritmo da esteira</h2>\n      <p class=\"nota\">Quanto tempo cada fase costuma consumir e quantos projetos entram por mês</p>\n      <div class=\"ritmo\">\n        <div>\n          <h3>Mediana de dias por etapa concluída, por fase</h3>\n          <div class=\"corpo barras dash-skeleton\" id=\"tempo-corpo\" data-source=\"tempo_fase\" style=\"min-height: 9rem\"></div>\n        </div>\n        <div>\n          <h3>Projetos que entraram por mês (últimos 12 meses)</h3>\n          <div class=\"grafico dash-skeleton\" id=\"mes-corpo\" data-source=\"por_mes\"><div class=\"dica\" id=\"mes-dica\" hidden></div></div>\n        </div>\n      </div>\n    </div>\n  </section>\n\n  <section class=\"card\" id=\"projetos\">\n    <h2>Onde está cada projeto</h2>\n    <p class=\"nota\">Clique em um projeto para ver todas as frentes e a trilha de etapas · dados do Monday, workspace TAX - Consultivo</p>\n    <div class=\"filtros\">\n      <div class=\"chips\" id=\"chips\"></div>\n      <input type=\"search\" id=\"busca\" placeholder=\"Buscar empresa, etapa ou pessoa…\" aria-label=\"Buscar\">\n      <select id=\"sel-pessoa\" aria-label=\"Responsável\"></select>\n      <select id=\"sel-fase\" aria-label=\"Fase\"></select>\n      <select id=\"sel-tipo\" aria-label=\"Tipo\"></select>\n      <button class=\"chip limpar\" id=\"limpar\" hidden>Limpar filtros ×</button>\n      <span class=\"filtro-ativo\" id=\"contagem\"></span>\n    </div>\n    <div class=\"tabela-caixa\">\n      <div class=\"tabela\" id=\"tabela\" data-source=\"projetos frentes etapas_classificadas\">\n        <div class=\"linha cab\" id=\"cab\">\n          <button data-ordem=\"situacao\" class=\"c-situ\">Situação</button>\n          <button data-ordem=\"nome\" class=\"c-nome\">Empresa</button>\n          <button data-ordem=\"entrada\" class=\"c-entrada\">Entrada</button>\n          <button data-ordem=\"etapa\" class=\"c-etapa\">Etapa atual</button>\n          <button data-ordem=\"quem\" class=\"c-quem\">Com quem está</button>\n          <button data-ordem=\"dias\" class=\"c-dias\">Parado há</button>\n          <button data-ordem=\"proximo\" class=\"c-prox\">Próximo passo</button>\n          <button data-ordem=\"progresso\" class=\"c-prog\">Progresso</button>\n        </div>\n        <div id=\"linhas\"></div>\n      </div>\n    </div>\n  </section>\n\n  <section class=\"card leia\" id=\"como-ler\">\n    <h2>Como ler</h2>\n    <p><b>Projeto</b> é um quadro do Monday; <b>frente</b> é um grupo dentro do quadro (normalmente uma empresa/CNPJ); <b>etapa</b> é um item da esteira (Recepcionamento → … → FUP). A <b>frente principal</b> de um projeto é a frente aberta com movimento mais recente; as demais aparecem ao abrir o projeto.</p>\n    <p><b>Etapa atual</b> é a etapa \"Em andamento\" ou \"Parado\" iniciada por último; se nenhuma está em andamento, é a próxima etapa ainda não feita. <b>Parado há</b> conta os dias desde a última mudança de status em qualquer etapa da frente — mede quanto tempo a frente está sem avançar.</p>\n    <p><b>Crítico</b>: etapa atual marcada \"Parado\" ou mais de 15 dias sem movimento. <b>Atenção</b>: 8 a 15 dias, ou projeto em dia que tem outra frente crítica. <b>Em dia</b>: até 7 dias. <b>Concluído</b>: todas as etapas de todas as frentes feitas. <b>Fases</b> são inferidas pelo nome da etapa; o que não casa com a esteira padrão vai para \"Outras etapas\". <b>Prazos</b> vêm do campo Cronograma de cada etapa — só etapas com data-fim preenchida entram.</p>\n    <p>Os dados vêm do Monday pela atualização automática do GitHub (de hora em hora em dias úteis); a hora da última coleta aparece no topo. Ao abrir um projeto, a trilha mostra cada etapa, o último comentário e as subtarefas em aberto da etapa atual, com link para o quadro no Monday.</p>\n  </section>\n</div>";

  const app = document.getElementById('app');

  // ---------- Armazenamento (pode não existir em janelas privadas) ----------
  const guardar = {
    ler(tipo, chave) { try { return window[tipo].getItem(chave); } catch { return null; } },
    gravar(tipo, chave, valor) { try { window[tipo].setItem(chave, valor); } catch { /* sem armazenamento */ } },
    remover(tipo, chave) { try { window[tipo].removeItem(chave); } catch { /* sem armazenamento */ } },
  };

  const fmtData = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtHora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });

  const SELO = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 22V10h4.5a4 4 0 0 1 0 8H9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 22l5-12" stroke="#ce5600" stroke-width="2.6" stroke-linecap="round"/></svg>';

  // ---------- Acesso com senha (PBKDF2-SHA256 + AES-256-GCM, igual ao scripts/lib/cripto.mjs) ----------
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
          <div class="acesso-marca"><div class="marca"><div class="selo">${SELO}</div></div>
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
        const pacoteAberto = await abrirDados(pacote, campo.value);
        guardar.gravar('sessionStorage', CHAVE_SENHA, campo.value);
        if (document.getElementById('lembrar').checked) guardar.gravar('localStorage', CHAVE_SENHA, campo.value);
        iniciarPainel(pacoteAberto, true);
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

  // ---------- "dash" local: entrega os dados e roda os cálculos da página ----------
  function criarDash(etapas) {
    const calcs = {};
    const ouvintes = [];
    const cache = new Map();
    let params = { ...PARAMS_PADRAO };
    let agendado = false;
    const notificar = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => { agendado = false; for (const fn of ouvintes) fn(); });
    };
    const api = {
      colors: ['var(--pf-c0)', 'var(--pf-c1)', 'var(--pf-c2)', 'var(--pf-c3)', 'var(--pf-c4)', 'var(--pf-c5)', 'var(--pf-c6)', 'var(--pf-c7)'],
      loader() { /* os dados já vêm prontos */ },
      calc(id, def) { calcs[id] = def; cache.delete(id); },
      data(id) {
        if (id === 'etapas') return { status: 'ok', data: etapas, cut: false, refreshing: false, meta: [] };
        const c = calcs[id];
        if (!c) return { status: 'missing', data: null, refreshing: false, meta: [] };
        try {
          if (!cache.has(id)) cache.set(id, c.fn(...c.inputs.map((i) => api.data(i).data)));
          return { status: 'ok', data: cache.get(id), refreshing: false, meta: [] };
        } catch (erro) {
          console.error(`Cálculo ${id} falhou`, erro);
          return { status: 'error', data: null, message: erro.message, refreshing: false, meta: [] };
        }
      },
      onData(fn) { ouvintes.push(fn); fn(); },
      params() { return { ...params }; },
      setParams(novos) { params = { ...params, ...novos }; notificar(); },
      resetParams() { params = { ...PARAMS_PADRAO }; notificar(); },
      setLink(nome) { if (nome && location.hash !== '#' + nome) history.replaceState(null, '', '#' + nome); },
      refresh() {},
    };
    let temporizador = null;
    window.addEventListener('resize', () => { clearTimeout(temporizador); temporizador = setTimeout(notificar, 150); });
    return api;
  }

  // ---------- Página do painel (gerada a partir do dashboard interativo) ----------
  function definirCalculos(dash) {
    dash.loader('etapas', {
      description: 'Resposta GraphQL do Monday (quadros → grupos → itens) como uma tabela: uma linha por etapa, com o nome do grupo (frente), status, data da última mudança de status, responsáveis, cronograma e a hora da consulta; linhas já nesse formato passam como estão.',
      fn: ({ answer }) => {
        const a = typeof answer === 'string' ? JSON.parse(answer) : answer;
        if (Array.isArray(a) && (!a.length || a[0].etapa_id)) return a;
        if (a && Array.isArray(a.rows) && (!a.rows.length || a.rows[0].etapa_id)) return a.rows;
        if (a && Array.isArray(a.errors) && a.errors.length) throw new Error(a.errors.map((e) => e.message).join('; '));
        const consultado_em = new Date().toISOString();
        const quadros = (a && (a.boards || (a.data && a.data.boards))) || [];
        const rows = [];
        let cut = false;
        for (const q of quadros) {
          const grupos = new Map((q.groups || []).map((g, i) => [g.id, { titulo: g.title, ordem: i }]));
          const itens = (q.items_page && q.items_page.items) || [];
          if (itens.length >= 400) cut = true;
          const posicao = new Map();
          for (const it of itens) {
            const col = Object.fromEntries((it.column_values || []).map((c) => [c.id, c]));
            const st = col.project_status || {}, cron = col.project_timeline || {}, resp = col.project_owner || {};
            const gid = it.group ? it.group.id : '';
            posicao.set(gid, (posicao.get(gid) || 0) + 1);
            const g = grupos.get(gid) || { titulo: gid, ordem: 99 };
            rows.push({
              quadro_id: String(q.id), quadro: q.name, frente_id: gid, frente: g.titulo, frente_ordem: g.ordem,
              ordem: posicao.get(gid), etapa_id: String(it.id), etapa: it.name,
              status: st.label || st.text || '', status_em: st.updated_at || null,
              responsaveis: resp.text || '',
              prazo_inicio: cron.from ? String(cron.from).slice(0, 10) : null,
              prazo_fim: cron.to ? String(cron.to).slice(0, 10) : null,
              criado_em: it.created_at || null, atualizado_em: it.updated_at || null, consultado_em,
            });
          }
        }
        const columns = ['quadro_id', 'quadro', 'frente_id', 'frente', 'frente_ordem', 'ordem', 'etapa_id', 'etapa', 'status', 'status_em', 'responsaveis', 'prazo_inicio', 'prazo_fim', 'criado_em', 'atualizado_em', 'consultado_em'];
        return { columns, rows, cut };
      },
    });

    dash.calc('etapas_classificadas', {
      title: 'Etapas com fase e dias',
      description: 'Cada etapa com estado normalizado (feito, andamento, parado, pendente), fase inferida pelo nome, data do último movimento (status, subtarefa ou comentário, quando a fonte traz), dias desde a última mudança de status e situação do prazo (hoje = data do navegador).',
      inputs: ['etapas'],
      fn: (etapas) => {
        const FASES = [
          ['Pós-entrega', ['apropriacao de creditos', 'hub', 'fup', 'atualizac', 'orientacao sobre emissao']],
          ['Entrega', ['apresentacao', 'ppt', 'revisao', 'ajustes fina', 'reuniao interna', 'parecer']],
          ['Diagnóstico', ['diagnostico', 'oportunidades', 'insights', 'planejamento', 'mensuracao', 'jcp', 'pis', 'cofins', 'irpj', 'inss', 'creditos', 'pa:', 'debitos']],
          ['Análise inicial', ['estudo inicial', 'checklist', 'lousa', 'funil', 'cruzamento', 'analise', 'pendencias']],
          ['Onboarding', ['recepcionamento', 'documenta', 'download', 'xml', 'nfse', 'organizacao do projeto', 'solicitacao']],
        ];
        const limpo = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const faseDe = (nome) => { const n = limpo(nome); const f = FASES.find(([, chaves]) => chaves.some((c) => n.includes(c))); return f ? f[0] : 'Outras etapas'; };
        const agora = new Date();
        const hoje = agora.getFullYear() + '-' + String(agora.getMonth() + 1).padStart(2, '0') + '-' + String(agora.getDate()).padStart(2, '0');
        const dias = (iso) => { const t = Date.parse(iso || ''); return isNaN(t) ? null : Math.max(0, Math.floor((agora - t) / 86400000)); };
        const estadoDe = (e) => {
          if (e.estado) return e.estado;
          const s = limpo(e.status);
          if (/^(feito|concluid|finalizad|done|entregue)/.test(s)) return 'feito';
          if (/parad|bloque|travad|stuck|impedid/.test(s)) return 'parado';
          if (/andamento|execucao|fazendo|working|progress/.test(s)) return 'andamento';
          return 'pendente';
        };
        return etapas.map((e) => {
          const estado = estadoDe(e);
          const aberta = estado !== 'feito';
          const atrasoDias = e.prazo_fim && aberta ? Math.round((Date.parse(hoje) - Date.parse(e.prazo_fim)) / 86400000) : null;
          return {
            ...e,
            estado,
            fase: faseDe(e.etapa),
            aberta,
            em_curso: estado === 'andamento' || estado === 'parado',
            movimento_em: e.atividade_em || e.status_em || null,
            dias_desde_status: dias(e.status_em),
            atraso_dias: atrasoDias,
            prazo_situacao: atrasoDias === null ? null : atrasoDias > 0 ? 'vencido' : atrasoDias >= -14 ? 'proximo' : 'futuro',
          };
        });
      },
    });

    dash.calc('frentes', {
      title: 'Frentes e etapa atual',
      description: 'Uma linha por frente (grupo do quadro): etapa atual (uma marcada Parado tem precedência; senão a Em andamento iniciada por último; senão a próxima não feita), dias sem movimento (status, subtarefa ou comentário), próxima etapa e progresso.',
      inputs: ['etapas_classificadas'],
      fn: (etapas_classificadas) => {
        const agora = Date.now();
        const quando = (e) => Date.parse(e.status_em || '') || 0;
        const movimento = (e) => Date.parse(e.movimento_em || '') || 0;
        const maisRecente = (lista) => lista.reduce((m, e) => (quando(e) > quando(m) ? e : m));
        const grupos = new Map();
        for (const e of etapas_classificadas) {
          const k = e.quadro_id + '/' + e.frente_id;
          if (!grupos.has(k)) grupos.set(k, []);
          grupos.get(k).push(e);
        }
        const saida = [];
        for (const [chave, itens] of grupos) {
          itens.sort((a, b) => a.ordem - b.ordem);
          const feitas = itens.filter((e) => e.estado === 'feito');
          const paradas = itens.filter((e) => e.estado === 'parado');
          const andando = itens.filter((e) => e.estado === 'andamento');
          const emCurso = [...paradas, ...andando];
          const atual = paradas.length ? maisRecente(paradas) : andando.length ? maisRecente(andando) : itens.find((e) => e.aberta) || null;
          const estado = !atual ? 'concluida' : atual.estado === 'pendente' ? 'pendente' : atual.estado;
          const movimentos = itens.map(movimento).filter((t) => t > 0);
          const criados = itens.map((e) => Date.parse(e.criado_em || '')).filter((t) => !isNaN(t));
          const ultimo = movimentos.length ? Math.max(...movimentos) : criados.length ? Math.min(...criados) : null;
          const proxima = atual ? itens.find((e) => e.ordem > atual.ordem && e.aberta) || null : null;
          const p = itens[0];
          saida.push({
            chave, quadro_id: p.quadro_id, quadro: p.quadro, frente_id: p.frente_id, frente: p.frente, frente_ordem: p.frente_ordem,
            etapas: itens.length, feitas: feitas.length, estado,
            etapa_atual: atual ? atual.etapa : '', etapa_atual_id: atual ? atual.etapa_id : null, fase: atual ? atual.fase : 'Concluída',
            responsaveis: atual ? atual.responsaveis : '',
            dias_sem_movimento: ultimo === null ? null : Math.max(0, Math.floor((agora - ultimo) / 86400000)),
            ultimo_movimento: ultimo === null ? null : new Date(ultimo).toISOString(),
            proxima_etapa: proxima ? proxima.etapa : '', proxima_responsaveis: proxima ? proxima.responsaveis : '',
            comentario: atual ? atual.comentario || '' : '', comentario_autor: atual ? atual.comentario_autor || '' : '', comentario_em: atual ? atual.comentario_em || null : null,
            subtarefas_abertas: atual ? atual.subtarefas_abertas || 0 : 0, subtarefas_total: atual ? atual.subtarefas_total || 0 : 0,
            quadro_url: p.quadro_url || null, empresa: p.empresa || null, tipo_ajuste: p.tipo_ajuste || null, quadro_criado_em: p.quadro_criado_em || null,
            etapas_abertas_15: emCurso.filter((e) => e !== atual && (e.dias_desde_status || 0) > 15).length,
            prazos_vencidos: itens.filter((e) => e.prazo_situacao === 'vencido').length,
            entrada: criados.length ? new Date(Math.min(...criados)).toISOString() : null,
          });
        }
        return saida;
      },
    });

    dash.calc('projetos', {
      title: 'Projetos e situação',
      description: 'Uma linha por quadro: frente principal (aberta com movimento mais recente), situação (crítico/atenção/em dia/concluído; um projeto em dia com outra frente crítica fica em atenção), entrada (criação do quadro ou da primeira etapa), progresso, prazos e alertas.',
      inputs: ['frentes'],
      fn: (frentes) => {
        const nomeDe = (quadro) => String(quadro)
          .replace(/^\s*diagn[óo]stico\s+(fiscal|previdenci[áa]rio)[^-–|]*[-–|]\s*/i, '')
          .replace(/\s*[-–|]\s*diagn[óo]stico.*$/i, '')
          .replace(/\s*[-–|]\s*projetos\s*$/i, '')
          .replace(/\.\s*$/, '').trim();
        const tipoDe = (quadro) => {
          const q = String(quadro).toLowerCase();
          const fiscal = q.includes('fiscal'), prev = q.includes('previdenci');
          return fiscal && prev ? 'Fiscal + Previdenciário' : prev ? 'Previdenciário' : fiscal ? 'Fiscal' : q.includes('projetos') ? 'Projetos' : 'Diagnóstico';
        };
        const situacaoDe = (f) => f.estado === 'parado' || f.dias_sem_movimento === null || f.dias_sem_movimento > 15 ? 'critico' : f.dias_sem_movimento > 7 ? 'atencao' : 'em_dia';
        const porQuadro = new Map();
        for (const f of frentes) { if (!porQuadro.has(f.quadro_id)) porQuadro.set(f.quadro_id, []); porQuadro.get(f.quadro_id).push(f); }
        const saida = [];
        for (const [quadro_id, fs] of porQuadro) {
          fs.sort((a, b) => a.frente_ordem - b.frente_ordem);
          const abertas = fs.filter((f) => f.estado !== 'concluida');
          const principal = abertas.length ? abertas.reduce((m, f) => (Date.parse(f.ultimo_movimento || '') > Date.parse(m.ultimo_movimento || '') ? f : m)) : null;
          const outrasParadas = abertas.filter((f) => f !== principal && situacaoDe(f) === 'critico').length;
          const situacao = !principal ? 'concluido' : situacaoDe(principal) === 'em_dia' && outrasParadas ? 'atencao' : situacaoDe(principal);
          const entradas = fs.map((f) => Date.parse(f.entrada || '')).filter((t) => !isNaN(t));
          const criacao = Date.parse(fs[0].quadro_criado_em || '');
          const entrada = !isNaN(criacao) ? new Date(criacao).toISOString() : entradas.length ? new Date(Math.min(...entradas)).toISOString() : null;
          const pessoas = [...new Set(abertas.flatMap((f) => f.responsaveis.split(',').map((s) => s.trim()).filter((s) => s && !/deleted/i.test(s))))];
          saida.push({
            quadro_id, quadro: fs[0].quadro, nome: fs[0].empresa || nomeDe(fs[0].quadro), tipo: fs[0].tipo_ajuste || tipoDe(fs[0].quadro), situacao,
            frente_principal: principal ? principal.frente : '', frente_principal_id: principal ? principal.frente_id : null,
            estado: principal ? principal.estado : 'concluida', fase: principal ? principal.fase : 'Concluída',
            etapa_atual: principal ? principal.etapa_atual : '', responsaveis: principal ? principal.responsaveis : '',
            sem_dono: Boolean(principal && !principal.responsaveis.split(',').map((s) => s.trim()).filter((s) => s && !/deleted/i.test(s)).length),
            dias_sem_movimento: principal ? principal.dias_sem_movimento : null, ultimo_movimento: principal ? principal.ultimo_movimento : null,
            proxima_etapa: principal ? principal.proxima_etapa : '', proxima_responsaveis: principal ? principal.proxima_responsaveis : '',
            frentes: fs.length, frentes_abertas: abertas.length,
            outras_paradas: outrasParadas,
            etapas: fs.reduce((s, f) => s + f.etapas, 0), etapas_feitas: fs.reduce((s, f) => s + f.feitas, 0),
            etapas_abertas_15: fs.reduce((s, f) => s + f.etapas_abertas_15, 0),
            prazos_vencidos: fs.reduce((s, f) => s + f.prazos_vencidos, 0),
            pessoas: pessoas.join(', '),
            quadro_url: fs[0].quadro_url || null,
            entrada, idade_dias: entrada ? Math.floor((Date.now() - Date.parse(entrada)) / 86400000) : null,
            conclusao: principal ? null : fs.reduce((m, f) => (f.ultimo_movimento && f.ultimo_movimento > m ? f.ultimo_movimento : m), ''),
          });
        }
        return saida;
      },
    });

    dash.calc('kpis', {
      title: 'Indicadores do portfólio',
      description: 'Totais do portfólio: ativos, por situação, novos em 30 dias, sem responsável, prazos e mediana de dias parado.',
      inputs: ['projetos', 'etapas_classificadas'],
      fn: (projetos, etapas_classificadas) => {
        const ativos = projetos.filter((p) => p.situacao !== 'concluido');
        const conta = (s) => ativos.filter((p) => p.situacao === s).length;
        const dias = ativos.map((p) => p.dias_sem_movimento).filter((d) => d !== null).sort((a, b) => a - b);
        const mediana = dias.length ? (dias.length % 2 ? dias[(dias.length - 1) / 2] : Math.round((dias[dias.length / 2 - 1] + dias[dias.length / 2]) / 2)) : null;
        const limite30 = Date.now() - 30 * 86400000;
        return [{
          ativos: ativos.length, concluidos: projetos.length - ativos.length,
          criticos: conta('critico'), atencao: conta('atencao'), em_dia: conta('em_dia'),
          novos_30d: projetos.filter((p) => p.entrada && Date.parse(p.entrada) >= limite30).length,
          sem_dono: ativos.filter((p) => p.sem_dono).length,
          prazos_vencidos: etapas_classificadas.filter((e) => e.prazo_situacao === 'vencido').length,
          prazos_14d: etapas_classificadas.filter((e) => e.prazo_situacao === 'proximo').length,
          mediana_dias: mediana,
          frentes_abertas: ativos.reduce((s, p) => s + p.frentes_abertas, 0),
          etapas_abertas_15: ativos.reduce((s, p) => s + p.etapas_abertas_15, 0),
        }];
      },
    });

    dash.calc('por_fase', {
      title: 'Projetos ativos por fase',
      description: 'Quantos projetos ativos têm a etapa atual em cada fase da esteira, abertos por situação.',
      inputs: ['projetos'],
      fn: (projetos) => {
        const ORDEM = ['Onboarding', 'Análise inicial', 'Diagnóstico', 'Entrega', 'Pós-entrega', 'Outras etapas'];
        const ativos = projetos.filter((p) => p.situacao !== 'concluido');
        return ORDEM.map((fase, i) => {
          const ps = ativos.filter((p) => p.fase === fase);
          return { ordem: i + 1, fase, total: ps.length, critico: ps.filter((p) => p.situacao === 'critico').length, atencao: ps.filter((p) => p.situacao === 'atencao').length, em_dia: ps.filter((p) => p.situacao === 'em_dia').length };
        });
      },
    });

    dash.calc('por_pessoa', {
      title: 'Projetos ativos por responsável',
      description: 'Projetos ativos em que a pessoa responde pela etapa atual da frente principal, abertos por situação; "Sem responsável" quando a etapa não tem dono.',
      inputs: ['projetos'],
      fn: (projetos) => {
        const mapa = new Map();
        for (const p of projetos.filter((p) => p.situacao !== 'concluido')) {
          const nomes = p.responsaveis.split(',').map((s) => s.trim()).filter((s) => s && !/deleted/i.test(s));
          for (const n of nomes.length ? nomes : ['Sem responsável']) {
            if (!mapa.has(n)) mapa.set(n, { pessoa: n, total: 0, critico: 0, atencao: 0, em_dia: 0 });
            const r = mapa.get(n); r.total += 1; r[p.situacao] += 1;
          }
        }
        return [...mapa.values()].sort((a, b) => b.total - a.total || a.pessoa.localeCompare(b.pessoa));
      },
    });

    dash.calc('travas', {
      title: 'Frentes paradas há mais tempo',
      description: 'As frentes abertas com mais dias sem nenhuma mudança de status, com o projeto, a etapa atual e quem responde por ela.',
      inputs: ['frentes', 'projetos'],
      fn: (frentes, projetos) => {
        const nome = new Map(projetos.map((p) => [p.quadro_id, p.nome]));
        const frentesDe = new Map(projetos.map((p) => [p.quadro_id, p.frentes]));
        const situacao = (f) => f.estado === 'parado' || f.dias_sem_movimento === null || f.dias_sem_movimento > 15 ? 'critico' : f.dias_sem_movimento > 7 ? 'atencao' : 'em_dia';
        return frentes.filter((f) => f.estado !== 'concluida')
          .map((f) => ({ chave: f.chave, quadro_id: f.quadro_id, projeto: nome.get(f.quadro_id) || f.quadro, frente: f.frente, frentes_projeto: frentesDe.get(f.quadro_id) || 1, etapa_atual: f.etapa_atual, estado: f.estado, fase: f.fase, responsaveis: f.responsaveis, dias_sem_movimento: f.dias_sem_movimento, situacao: situacao(f), feitas: f.feitas, etapas: f.etapas }))
          .sort((a, b) => (b.dias_sem_movimento ?? 1e9) - (a.dias_sem_movimento ?? 1e9))
          .slice(0, 12);
      },
    });

    dash.calc('prazos', {
      title: 'Prazos vencidos e próximos',
      description: 'Etapas não concluídas com data-fim no cronograma: vencidas (atraso em dias) e as que vencem nos próximos 14 dias, por data.',
      inputs: ['etapas_classificadas', 'projetos'],
      fn: (etapas_classificadas, projetos) => {
        const nome = new Map(projetos.map((p) => [p.quadro_id, p.nome]));
        return etapas_classificadas
          .filter((e) => e.prazo_situacao === 'vencido' || e.prazo_situacao === 'proximo')
          .map((e) => ({ etapa_id: e.etapa_id, quadro_id: e.quadro_id, projeto: nome.get(e.quadro_id) || e.quadro, frente: e.frente, etapa: e.etapa, status: e.status, responsaveis: e.responsaveis, prazo_fim: e.prazo_fim, atraso_dias: e.atraso_dias, prazo_situacao: e.prazo_situacao }))
          .sort((a, b) => a.prazo_fim.localeCompare(b.prazo_fim));
      },
    });

    dash.calc('tempo_fase', {
      title: 'Dias por etapa concluída, por fase',
      description: 'Mediana de dias entre a conclusão de uma etapa e a da etapa anterior na mesma frente (só etapas consecutivas já feitas), agrupada pela fase da etapa.',
      inputs: ['etapas_classificadas'],
      fn: (etapas_classificadas) => {
        const ORDEM = ['Onboarding', 'Análise inicial', 'Diagnóstico', 'Entrega', 'Pós-entrega', 'Outras etapas'];
        const grupos = new Map();
        for (const e of etapas_classificadas) { const k = e.quadro_id + '/' + e.frente_id; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(e); }
        const duracoes = new Map(ORDEM.map((f) => [f, []]));
        for (const itens of grupos.values()) {
          itens.sort((a, b) => a.ordem - b.ordem);
          let anterior = null;
          for (const e of itens) {
            const t = e.estado === 'feito' ? Date.parse(e.status_em || '') : NaN;
            if (!isNaN(t)) { if (anterior !== null && t >= anterior) duracoes.get(e.fase).push((t - anterior) / 86400000); anterior = t; }
            else anterior = null;
          }
        }
        const mediana = (v) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); const m = s.length / 2; return s.length % 2 ? s[(s.length - 1) / 2] : (s[m - 1] + s[m]) / 2; };
        return ORDEM.map((fase, i) => ({ ordem: i + 1, fase, etapas_medidas: duracoes.get(fase).length, mediana_dias: mediana(duracoes.get(fase)) === null ? null : Math.round(mediana(duracoes.get(fase)) * 10) / 10 }));
      },
    });

    dash.calc('por_mes', {
      title: 'Entradas e conclusões por mês',
      description: 'Projetos que entraram (primeira etapa criada) e que foram concluídos em cada um dos últimos 12 meses.',
      inputs: ['projetos'],
      fn: (projetos) => {
        const meses = [];
        const d = new Date(); d.setDate(1);
        for (let i = 11; i >= 0; i--) { const m = new Date(d.getFullYear(), d.getMonth() - i, 1); meses.push(m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0')); }
        const chave = (iso) => { if (!iso) return null; const x = new Date(iso); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); };
        return meses.map((mes) => ({ mes, entradas: projetos.filter((p) => chave(p.entrada) === mes).length, concluidos: projetos.filter((p) => p.situacao === 'concluido' && chave(p.conclusao) === mes).length }));
      },
    });
  }

  function montarPagina(dash) {
    (() => {
      const ROTULO = { critico: 'Crítico', atencao: 'Atenção', em_dia: 'Em dia', concluido: 'Concluído' };
      const ESTADO = { andamento: 'Em andamento', parado: 'Parado', pendente: 'Aguardando início', concluida: 'Concluída' };
      const FASES = ['Onboarding', 'Análise inicial', 'Diagnóstico', 'Entrega', 'Pós-entrega', 'Outras etapas'];
      const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      const $ = (id) => document.getElementById(id);
      const estadoLocal = { ordem: 'dias', dir: 'desc', abertos: new Set(), animou: false };
      const raiz = $('pagina');
      raiz.style.setProperty('--pf-accent', dash.colors[0]);

      const texto = (tag, cls, txt) => { const el = document.createElement(tag); if (cls) el.className = cls; if (txt !== undefined && txt !== null) el.textContent = txt; return el; };
      const fmtData = (iso) => {
        if (!iso) return '—';
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) { const [a, m, d] = iso.split('-'); return d + '/' + m + '/' + a; }
        const x = new Date(iso); if (isNaN(x)) return '—';
        return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0') + '/' + x.getFullYear();
      };
      const fmtHora = (iso) => { const x = new Date(iso); return isNaN(x) ? '' : fmtData(iso) + ' às ' + String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
      const capitalizar = (s) => s.length > 3 && s === s.toUpperCase() ? s[0] + s.slice(1).toLowerCase() : s;
      const nomeCurto = (n) => { const p = n.trim().split(/\s+/); return p.length > 1 ? p[0] + ' ' + capitalizar(p[p.length - 1]) : n; };
      const pessoasDe = (s) => String(s || '').split(',').map((x) => x.trim()).filter((x) => x && !/deleted/i.test(x));
      const listaPessoas = (s) => { const ps = pessoasDe(s); return ps.length ? ps.map(nomeCurto).join(', ') : ''; };
      const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
      const normalizar = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const dadosOk = (id) => { const d = dash.data(id); return d.status === 'ok' ? d.data : null; };
      const situacaoFrente = (f) => f.estado === 'parado' || f.dias_sem_movimento === null || f.dias_sem_movimento > 15 ? 'critico' : f.dias_sem_movimento > 7 ? 'atencao' : 'em_dia';

      const mostrarFalha = (el, msg) => { el.classList.remove('dash-skeleton'); el.replaceChildren(texto('div', 'falhou', msg || 'Não carregou')); };
      const limparSkeleton = (el) => el.classList.remove('dash-skeleton');

      // ---------- filtros ----------
      const params = () => { const p = dash.params() || {}; return { status: p.status || 'ativos', fase: p.fase || null, pessoa: p.pessoa || null, busca: p.busca || '', tipo: p.tipo || null }; };
      const alternar = (chave, valor, padrao) => { const p = params(); dash.setParams({ [chave]: p[chave] === valor ? padrao : valor }); };
      for (const b of document.querySelectorAll('.pf-tile')) b.addEventListener('click', () => alternar('status', b.dataset.filtro, 'ativos'));
      const busca = $('busca');
      let temporizador = null;
      busca.addEventListener('input', () => { clearTimeout(temporizador); temporizador = setTimeout(() => dash.setParams({ busca: busca.value.trim() }), 180); });
      $('sel-pessoa').addEventListener('change', (e) => dash.setParams({ pessoa: e.target.value || null }));
      $('sel-fase').addEventListener('change', (e) => dash.setParams({ fase: e.target.value || null }));
      $('sel-tipo').addEventListener('change', (e) => dash.setParams({ tipo: e.target.value || null }));
      $('limpar').addEventListener('click', () => { dash.resetParams(); busca.value = ''; });
      $('cab').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-ordem]'); if (!b) return;
        if (estadoLocal.ordem === b.dataset.ordem) estadoLocal.dir = estadoLocal.dir === 'asc' ? 'desc' : 'asc';
        else { estadoLocal.ordem = b.dataset.ordem; estadoLocal.dir = ['dias', 'progresso', 'situacao'].includes(b.dataset.ordem) ? 'desc' : 'asc'; }
        desenhar();
      });
      $('linhas').addEventListener('click', (e) => {
        const l = e.target.closest('.linha.proj'); if (!l) return;
        const id = l.dataset.quadro;
        if (estadoLocal.abertos.has(id)) estadoLocal.abertos.delete(id); else estadoLocal.abertos.add(id);
        desenhar();
      });
      const abrirProjeto = (quadroId) => {
        estadoLocal.abertos.add(quadroId);
        const proj = (dadosOk('projetos') || []).find((x) => x.quadro_id === quadroId);
        const visivel = proj && filtrar([proj]).length;
        if (!visivel) dash.setParams({ status: 'todos', fase: null, pessoa: null, tipo: null, busca: '' }); else desenhar();
        setTimeout(() => { const el = document.querySelector('.linha.proj[data-quadro="' + quadroId + '"]'); if (el) el.scrollIntoView({ block: 'center' }); }, 80);
      };

      // ---------- desenho ----------
      const preencherChips = (projetos) => {
        const p = params();
        const ativos = projetos.filter((x) => x.situacao !== 'concluido');
        const defs = [['ativos', 'Ativos', ativos.length], ['critico', 'Críticos', ativos.filter((x) => x.situacao === 'critico').length], ['atencao', 'Atenção', ativos.filter((x) => x.situacao === 'atencao').length], ['em_dia', 'Em dia', ativos.filter((x) => x.situacao === 'em_dia').length], ['prazo', 'Com prazo vencido', ativos.filter((x) => x.prazos_vencidos > 0).length], ['sem_dono', 'Sem responsável', ativos.filter((x) => x.sem_dono).length], ['concluido', 'Concluídos', projetos.length - ativos.length], ['todos', 'Todos', projetos.length]];
        $('chips').replaceChildren(...defs.map(([v, r, n]) => { const b = texto('button', 'chip', r + ' '); b.appendChild(texto('b', '', n)); b.setAttribute('aria-pressed', String(p.status === v)); b.addEventListener('click', () => dash.setParams({ status: v })); return b; }));
        for (const t of document.querySelectorAll('.pf-tile')) t.setAttribute('aria-pressed', String(p.status === t.dataset.filtro));
        const sel = (id, rotulo, opcoes, atual) => { const s = $(id); s.replaceChildren(new Option(rotulo, ''), ...opcoes.map((o) => new Option(o[0], o[1]))); s.value = atual || ''; };
        const pessoas = [...new Set(projetos.filter((x) => x.situacao !== 'concluido').flatMap((x) => pessoasDe(x.responsaveis)))].sort((a, b) => a.localeCompare(b));
        sel('sel-pessoa', 'Todos os responsáveis', pessoas.map((n) => [nomeCurto(n), n]), p.pessoa);
        sel('sel-fase', 'Todas as fases', FASES.map((f) => [f, f]), p.fase);
        const tipos = [...new Set(projetos.map((x) => x.tipo))].sort();
        sel('sel-tipo', 'Todos os tipos', tipos.map((t) => [t, t]), p.tipo);
        if (busca !== document.activeElement) busca.value = p.busca;
        const filtrando = p.status !== 'ativos' || p.fase || p.pessoa || p.busca || p.tipo;
        $('limpar').hidden = !filtrando;
      };

      const filtrar = (projetos) => {
        const p = params();
        const termo = normalizar(p.busca);
        return projetos.filter((x) => {
          if (p.status === 'ativos' && x.situacao === 'concluido') return false;
          if (['critico', 'atencao', 'em_dia', 'concluido'].includes(p.status) && x.situacao !== p.status) return false;
          if (p.status === 'prazo' && !(x.prazos_vencidos > 0 && x.situacao !== 'concluido')) return false;
          if (p.status === 'sem_dono' && !x.sem_dono) return false;
          if (p.fase && x.fase !== p.fase) return false;
          if (p.pessoa && !pessoasDe(x.responsaveis).includes(p.pessoa)) return false;
          if (p.tipo && x.tipo !== p.tipo) return false;
          if (termo && !normalizar([x.nome, x.quadro, x.tipo, x.frente_principal, x.etapa_atual, x.proxima_etapa, x.pessoas, x.fase].join(' ')).includes(termo)) return false;
          return true;
        });
      };

      const ordenar = (lista) => {
        const o = estadoLocal.ordem, sinal = estadoLocal.dir === 'asc' ? 1 : -1;
        const grav = { critico: 3, atencao: 2, em_dia: 1, concluido: 0 };
        const chave = (x) => o === 'situacao' ? grav[x.situacao] : o === 'nome' ? x.nome.toLowerCase() : o === 'entrada' ? (x.entrada || '') : o === 'etapa' ? x.etapa_atual.toLowerCase() : o === 'quem' ? listaPessoas(x.responsaveis).toLowerCase() : o === 'dias' ? (x.dias_sem_movimento ?? -1) : o === 'proximo' ? x.proxima_etapa.toLowerCase() : x.etapas ? x.etapas_feitas / x.etapas : 0;
        return [...lista].sort((a, b) => { const ka = chave(a), kb = chave(b); return (ka < kb ? -1 : ka > kb ? 1 : 0) * sinal || (b.dias_sem_movimento ?? -1) - (a.dias_sem_movimento ?? -1); });
      };

      const barrasEmpilhadas = (el, linhas, chaveNome, chaveFiltro, selecionado, aoClicar) => {
        limparSkeleton(el);
        if (!linhas.length) { el.replaceChildren(texto('div', 'vazio', 'Nada a mostrar')); return; }
        const maximo = Math.max(1, ...linhas.map((l) => l.total));
        el.replaceChildren(...linhas.map((l) => {
          const b = texto('button', 'barra'); b.setAttribute('aria-pressed', String(selecionado === l[chaveFiltro]));
          b.appendChild(texto('span', 'nome', chaveNome(l)));
          const trilha = texto('span', 'trilha');
          for (const s of ['critico', 'atencao', 'em_dia']) if (l[s]) { const seg = texto('span', 'seg ' + s); seg.style.width = (l[s] / maximo * 100) + '%'; trilha.appendChild(seg); }
          b.appendChild(trilha); b.appendChild(texto('span', 'total', l.total));
          b.addEventListener('click', () => aoClicar(l[chaveFiltro]));
          return b;
        }));
      };

      const desenharTravas = (travas) => {
        const el = $('travas-corpo'); limparSkeleton(el);
        if (!travas.length) { el.replaceChildren(texto('div', 'vazio', 'Nenhuma frente aberta')); return; }
        el.replaceChildren(...travas.map((t) => {
          const b = texto('button', 'item');
          const d = texto('span', 'dias ' + t.situacao, t.dias_sem_movimento === null ? '—' : String(t.dias_sem_movimento)); d.appendChild(texto('small', '', 'dias'));
          const corpo = texto('span');
          corpo.appendChild(texto('span', 'titulo', t.projeto + (t.frentes_projeto > 1 ? ' · ' + t.frente : '')));
          const sub = texto('span', 'sub'); sub.appendChild(document.createElement('br'));
          const tag = texto('span', 'tag'); tag.appendChild(texto('i', 'ponto ' + t.estado)); tag.appendChild(document.createTextNode(ESTADO[t.estado] || t.estado));
          sub.appendChild(tag); sub.appendChild(document.createTextNode(' ' + t.etapa_atual + (listaPessoas(t.responsaveis) ? ' · ' + listaPessoas(t.responsaveis) : ' · sem responsável') + ' · ' + t.feitas + '/' + t.etapas + ' etapas'));
          corpo.appendChild(sub);
          b.appendChild(d); b.appendChild(corpo);
          b.addEventListener('click', () => abrirProjeto(t.quadro_id));
          return b;
        }));
      };

      const desenharPrazos = (prazos) => {
        const el = $('prazos-corpo'); limparSkeleton(el);
        const vencidos = prazos.filter((p) => p.prazo_situacao === 'vencido').sort((a, b) => b.atraso_dias - a.atraso_dias);
        const proximos = prazos.filter((p) => p.prazo_situacao === 'proximo');
        if (!prazos.length) { el.replaceChildren(texto('div', 'vazio', 'Nenhum prazo vencido ou próximo')); return; }
        const bloco = (titulo, lista, cls) => {
          const frag = document.createDocumentFragment();
          const h = texto('div', 'prazo-grupo'); h.appendChild(texto('span', '', titulo)); h.appendChild(texto('span', '', plural(lista.length, 'etapa', 'etapas'))); frag.appendChild(h);
          for (const p of lista) {
            const b = texto('button', 'prazo');
            const d = texto('span', 'data ' + cls, fmtData(p.prazo_fim)); d.appendChild(texto('small', '', cls === 'vencido' ? plural(p.atraso_dias, 'dia', 'dias') + ' atrás' : p.atraso_dias === 0 ? 'hoje' : 'em ' + plural(-p.atraso_dias, 'dia', 'dias')));
            const c = texto('span'); c.appendChild(texto('b', '', p.etapa)); c.appendChild(document.createElement('br'));
            c.appendChild(texto('span', 'sub', p.projeto + ' · ' + p.status + (listaPessoas(p.responsaveis) ? ' · ' + listaPessoas(p.responsaveis) : '')));
            b.appendChild(d); b.appendChild(c); b.addEventListener('click', () => abrirProjeto(p.quadro_id)); frag.appendChild(b);
          }
          return frag;
        };
        el.replaceChildren();
        if (vencidos.length) el.appendChild(bloco('Vencidos', vencidos, 'vencido'));
        if (proximos.length) el.appendChild(bloco('Próximos 14 dias', proximos, 'proximo'));
      };

      const desenharTempo = (tempo) => {
        const el = $('tempo-corpo'); limparSkeleton(el);
        const linhas = tempo.filter((t) => t.mediana_dias !== null);
        if (!linhas.length) { el.replaceChildren(texto('div', 'vazio', 'Ainda sem etapas concluídas em sequência')); return; }
        const maximo = Math.max(1, ...linhas.map((t) => t.mediana_dias));
        const pior = Math.max(...linhas.map((t) => t.mediana_dias));
        el.replaceChildren(...linhas.map((t) => {
          const b = texto('div', 'barra'); b.style.cursor = 'default';
          b.appendChild(texto('span', 'nome', t.fase));
          const trilha = texto('span', 'trilha'); const seg = texto('span', 'seg'); seg.style.width = (t.mediana_dias / maximo * 100) + '%'; seg.style.background = t.mediana_dias === pior ? 'var(--cds-chart-status-critical)' : 'var(--cds-chart-muted)'; trilha.appendChild(seg); b.appendChild(trilha);
          b.appendChild(texto('span', 'total', t.mediana_dias.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'd'));
          return b;
        }));
      };

      const desenharMeses = (meses) => {
        const el = $('mes-corpo'); limparSkeleton(el);
        const dica = $('mes-dica');
        for (const s of el.querySelectorAll('svg')) s.remove();
        const NS = 'http://www.w3.org/2000/svg';
        const no = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v); return n; };
        const largura = Math.max(240, el.clientWidth || 320), altura = 150;
        const m = { top: 14, right: 8, bottom: 22, left: 26 };
        const svg = no('svg', { width: '100%', viewBox: '0 0 ' + largura + ' ' + altura });
        el.insertBefore(svg, el.firstChild);
        const n = meses.length || 1;
        const passo = (largura - m.left - m.right) / n, faixa = passo * 0.75;
        const x = (i) => m.left + i * passo + (passo - faixa) / 2;
        const yMax = Math.max(2, ...meses.map((d) => Math.max(d.entradas, d.concluidos)));
        const y = (v) => altura - m.bottom - (v / yMax) * (altura - m.bottom - m.top);
        const rotuloMes = (k) => { const [a, mm] = k.split('-'); return MESES[Number(mm) - 1] + (mm === '01' || k === meses[0].mes ? '/' + a.slice(2) : ''); };
        const ticks = yMax <= 4 ? Array.from({ length: yMax + 1 }, (_, i) => i) : [0, Math.round(yMax / 2), yMax];
        const grade = no('g', { class: 'grade' });
        for (const t of ticks) { grade.appendChild(no('line', { x1: m.left, x2: largura - m.right, y1: y(t), y2: y(t) })); const tx = no('text', { x: m.left - 6, y: y(t) + 3.5, 'text-anchor': 'end' }); tx.textContent = String(t); grade.appendChild(tx); }
        svg.appendChild(grade);
        const eixo = no('g', { class: 'eixo' });
        meses.forEach((d, i) => { if (n > 8 && i % 2) return; const tx = no('text', { x: x(i) + faixa / 2, y: altura - m.bottom + 14, 'text-anchor': 'middle' }); tx.textContent = rotuloMes(d.mes); eixo.appendChild(tx); });
        svg.appendChild(eixo);
        meses.forEach((d, i) => {
          const r = no('rect', { x: x(i), width: faixa, y: y(d.entradas), height: Math.max(0, y(0) - y(d.entradas)), rx: 3, fill: dash.colors[0] });
          r.addEventListener('mousemove', (ev) => {
            dica.hidden = false; dica.replaceChildren(texto('span', 't', rotuloMes(d.mes) + '/' + d.mes.slice(0, 4)), document.createTextNode(plural(d.entradas, 'projeto entrou', 'projetos entraram') + ' · ' + plural(d.concluidos, 'concluído', 'concluídos')));
            const caixa = el.getBoundingClientRect(); const px = ev.clientX - caixa.left, py = ev.clientY - caixa.top;
            dica.style.left = Math.min(px + 10, caixa.width - dica.offsetWidth - 4) + 'px'; dica.style.top = Math.max(0, py - 34) + 'px';
          });
          r.addEventListener('mouseleave', () => { dica.hidden = true; });
          svg.appendChild(r);
          if (d.entradas > 0) { const tx = no('text', { x: x(i) + faixa / 2, y: y(d.entradas) - 3, 'text-anchor': 'middle' }); tx.textContent = String(d.entradas); svg.appendChild(tx); }
          if (d.concluidos > 0) svg.appendChild(no('circle', { cx: x(i) + faixa / 2, cy: y(d.concluidos), r: 3.5, fill: 'var(--color-ok)' }));
        });
      };

      const linhaProjeto = (p, frentesDoQuadro, etapasDoQuadro) => {
        const frag = document.createDocumentFragment();
        const l = texto('div', 'linha proj'); l.dataset.quadro = p.quadro_id; l.setAttribute('aria-expanded', String(estadoLocal.abertos.has(p.quadro_id)));
        const situ = texto('span', 'situ ' + p.situacao); situ.appendChild(texto('i', 'ponto ' + p.situacao)); situ.appendChild(document.createTextNode(ROTULO[p.situacao])); l.appendChild(texto('span', 'c-situ')).appendChild(situ);
        const emp = texto('span', 'c-nome'); emp.appendChild(texto('span', 'nome', p.nome));
        emp.appendChild(texto('span', 'sub', p.tipo + (p.frentes > 1 ? ' · ' + plural(p.frentes, 'frente', 'frentes') + ' (' + p.frentes_abertas + ' em aberto)' : '')));
        if (p.outras_paradas) emp.appendChild(texto('span', 'alerta suave', plural(p.outras_paradas, 'outra frente parada', 'outras frentes paradas')));
        if (p.etapas_abertas_15) emp.appendChild(texto('span', 'alerta', plural(p.etapas_abertas_15, 'etapa aberta', 'etapas abertas') + ' sem atualização há +15 dias'));
        if (p.prazos_vencidos) emp.appendChild(texto('span', 'alerta', plural(p.prazos_vencidos, 'prazo vencido', 'prazos vencidos')));
        l.appendChild(emp);
        const ent = texto('span', 'c-entrada'); ent.appendChild(texto('span', '', fmtData(p.entrada))); ent.appendChild(texto('span', 'sub', p.idade_dias === null ? '' : 'há ' + plural(p.idade_dias, 'dia', 'dias'))); l.appendChild(ent);
        const et = texto('span', 'c-etapa');
        if (p.situacao === 'concluido') { et.appendChild(texto('span', 'etapa', 'Todas as etapas feitas')); et.appendChild(texto('span', 'sub', p.conclusao ? 'concluído em ' + fmtData(p.conclusao) : '')); }
        else {
          if (p.frentes > 1) et.appendChild(texto('span', 'frente', p.frente_principal));
          et.appendChild(texto('span', 'etapa', p.etapa_atual));
          const es = texto('span', 'estado'); es.appendChild(texto('i', 'ponto ' + p.estado)); es.appendChild(document.createTextNode(ESTADO[p.estado] || p.estado)); et.appendChild(es);
          et.appendChild(texto('span', 'fase-tag', p.fase));
        }
        l.appendChild(et);
        const quem = texto('span', 'c-quem'); const lp = listaPessoas(p.responsaveis); quem.appendChild(texto('span', lp ? '' : 'sem-dono', lp || (p.situacao === 'concluido' ? '—' : 'Sem responsável'))); l.appendChild(quem);
        const dias = texto('span', 'c-dias');
        if (p.situacao !== 'concluido') { const d = texto('span', 'dias ' + p.situacao, p.dias_sem_movimento === null ? '—' : String(p.dias_sem_movimento)); d.appendChild(texto('small', '', p.ultimo_movimento ? 'dias · desde ' + fmtData(p.ultimo_movimento) : 'dias')); dias.appendChild(d); }
        l.appendChild(dias);
        const prox = texto('span', 'c-prox');
        if (p.situacao !== 'concluido') { prox.appendChild(texto('span', '', p.proxima_etapa || 'Última etapa')); if (p.proxima_etapa) prox.appendChild(texto('span', 'sub', listaPessoas(p.proxima_responsaveis) || 'sem responsável definido')); }
        l.appendChild(prox);
        const prog = texto('span', 'c-prog progresso'); const trilha = texto('span', 'trilha'); const feito = texto('span', 'feito'); feito.style.width = (p.etapas ? p.etapas_feitas / p.etapas * 100 : 0) + '%'; trilha.appendChild(feito); prog.appendChild(trilha); prog.appendChild(texto('span', 'txt', p.etapas_feitas + '/' + p.etapas + ' etapas')); l.appendChild(prog);
        frag.appendChild(l);
        if (estadoLocal.abertos.has(p.quadro_id)) {
          const det = texto('div', 'detalhe');
          for (const f of frentesDoQuadro) {
            const fr = texto('div', 'fr');
            const n = texto('span', 'n', f.frente); n.appendChild(texto('small', '', f.feitas + '/' + f.etapas + ' etapas · ' + (f.estado === 'concluida' ? 'concluída' : (f.dias_sem_movimento === null ? '' : plural(f.dias_sem_movimento, 'dia', 'dias') + ' sem movimento'))));
            fr.appendChild(n);
            const e = texto('span', 'e');
            if (f.estado === 'concluida') e.appendChild(texto('span', '', 'Todas as etapas feitas'));
            else { const tag = texto('span', 'situ ' + situacaoFrente(f)); tag.appendChild(texto('i', 'ponto ' + f.estado)); tag.appendChild(document.createTextNode(ESTADO[f.estado])); e.appendChild(tag); e.appendChild(document.createTextNode(' ')); e.appendChild(texto('b', '', f.etapa_atual)); e.appendChild(document.createTextNode(listaPessoas(f.responsaveis) ? ' · ' + listaPessoas(f.responsaveis) : ' · sem responsável')); }
            fr.appendChild(e);
            const passos = texto('span', 'passos');
            const its = etapasDoQuadro.filter((x) => x.frente_id === f.frente_id).sort((a, b) => a.ordem - b.ordem);
            for (const it of its) {
              const cls = it.estado;
              const ps = texto('button', 'passo ' + cls + (it.prazo_situacao === 'vencido' ? ' vencido' : '') + (it.etapa_id === f.etapa_atual_id ? ' atual' : ''));
              ps.title = it.ordem + '. ' + it.etapa + ' — ' + (it.status || 'sem status') + (it.status_em ? ' desde ' + fmtData(it.status_em) : '') + (listaPessoas(it.responsaveis) ? ' · ' + listaPessoas(it.responsaveis) : '') + (it.prazo_fim ? ' · prazo ' + fmtData(it.prazo_fim) : '');
              ps.setAttribute('aria-label', ps.title);
              passos.appendChild(ps);
            }
            fr.appendChild(passos);
            det.appendChild(fr);
            if (f.estado !== 'concluida' && (f.comentario || f.subtarefas_abertas)) {
              const extra = texto('div', 'extra');
              if (f.subtarefas_abertas) extra.appendChild(texto('span', 'tag', plural(f.subtarefas_abertas, 'subtarefa aberta', 'subtarefas abertas') + ' de ' + f.subtarefas_total));
              if (f.comentario) { const c = texto('span', 'coment'); c.appendChild(texto('b', '', (f.comentario_autor ? f.comentario_autor + (f.comentario_em ? ', ' + fmtData(f.comentario_em) : '') : 'Último comentário') + ': ')); c.appendChild(document.createTextNode(f.comentario)); extra.appendChild(c); }
              det.appendChild(extra);
            }
          }
          if (p.quadro_url) { const a = document.createElement('a'); a.className = 'abrir-monday'; a.href = p.quadro_url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Abrir no Monday ↗'; det.appendChild(a); }
          frag.appendChild(det);
        }
        return frag;
      };

      const desenharTabela = (projetos, frentes, etapas) => {
        preencherChips(projetos);
        const lista = ordenar(filtrar(projetos));
        for (const b of document.querySelectorAll('#cab button')) b.setAttribute('aria-sort', b.dataset.ordem === estadoLocal.ordem ? (estadoLocal.dir === 'asc' ? 'ascending' : 'descending') : 'none');
        $('contagem').textContent = plural(lista.length, 'projeto exibido', 'projetos exibidos') + ' de ' + projetos.length;
        const frentesPor = new Map(); for (const f of frentes) { if (!frentesPor.has(f.quadro_id)) frentesPor.set(f.quadro_id, []); frentesPor.get(f.quadro_id).push(f); }
        const etapasPor = new Map(); for (const e of etapas) { if (!etapasPor.has(e.quadro_id)) etapasPor.set(e.quadro_id, []); etapasPor.get(e.quadro_id).push(e); }
        const alvo = $('linhas');
        if (!lista.length) { alvo.replaceChildren(texto('div', 'vazio', 'Nenhum projeto com esses filtros.')); return; }
        const frag = document.createDocumentFragment();
        for (const p of lista) frag.appendChild(linhaProjeto(p, (frentesPor.get(p.quadro_id) || []).sort((a, b) => a.frente_ordem - b.frente_ordem), etapasPor.get(p.quadro_id) || []));
        alvo.replaceChildren(frag);
      };

      const desenharResumo = (k, porFase) => {
        const el = $('resumo'); limparSkeleton(el);
        const gargalo = [...porFase].sort((a, b) => b.critico - a.critico || b.total - a.total)[0];
        const partes = [];
        partes.push(k.criticos + ' dos ' + plural(k.ativos, 'projeto ativo está crítico', 'projetos ativos estão críticos'));
        if (gargalo && gargalo.total) partes.push('o gargalo está em ' + gargalo.fase + ' (' + plural(gargalo.total, 'projeto', 'projetos') + (gargalo.critico ? ', ' + gargalo.critico + ' críticos' : '') + ')');
        if (k.prazos_vencidos) partes.push(plural(k.prazos_vencidos, 'etapa com prazo vencido', 'etapas com prazo vencido'));
        if (k.sem_dono) partes.push(plural(k.sem_dono, 'projeto sem responsável', 'projetos sem responsável'));
        el.textContent = partes.join('; ') + '.';
      };

      const desenhar = () => {
        const base = dash.data('etapas');
        const falha = base.status === 'error' || base.status === 'connect' || base.status === 'declined' || base.status === 'missing';
        const alvos = ['fases-corpo', 'pessoas-corpo', 'travas-corpo', 'prazos-corpo', 'tempo-corpo', 'mes-corpo'];
        if (falha) {
          for (const id of alvos) mostrarFalha($(id), base.status === 'connect' ? 'Conecte o Monday para ver' : 'Não carregou');
          limparSkeleton($('resumo')); $('resumo').textContent = base.status === 'connect' ? 'Conecte sua conta do Monday no Claude para carregar os projetos.' : 'Os dados do Monday não carregaram.';
          for (const n of document.querySelectorAll('[data-source="kpis"][data-field]')) limparSkeleton(n);
          $('linhas').replaceChildren(texto('div', 'vazio', 'Sem dados do Monday.'));
          return;
        }
        if (base.status !== 'ok') return;
        const projetos = dadosOk('projetos'), frentes = dadosOk('frentes'), etapas = dadosOk('etapas_classificadas');
        const kpis = dadosOk('kpis'), porFase = dadosOk('por_fase'), porPessoa = dadosOk('por_pessoa'), travas = dadosOk('travas'), prazos = dadosOk('prazos'), tempo = dadosOk('tempo_fase'), meses = dadosOk('por_mes');
        if (!projetos || !frentes || !etapas || !kpis || !porFase || !porPessoa || !travas || !prazos || !tempo || !meses) return;
        const k = kpis[0];
        const consultadoEm = (etapas[0] && etapas[0].consultado_em) || null;
        $('atualizado').textContent = (consultadoEm ? 'Dados do Monday de ' + fmtHora(consultadoEm) : 'Dados do Monday') + ' · atualização automática de hora em hora (dias úteis, 7h–20h)' + (base.cut || (base.data && base.data.cut) ? ' · algum quadro tem mais etapas do que o lido' : '');
        for (const n of document.querySelectorAll('[data-source="kpis"][data-field]')) {
          limparSkeleton(n); const v = k[n.dataset.field];
          n.textContent = v === null || v === undefined ? '—' : String(v);
        }
        $('p-concluidos').textContent = k.concluidos === 1 ? 'concluído' : 'concluídos';
        $('p-novos').textContent = k.novos_30d === 1 ? 'novo' : 'novos';
        $('p-vencem').textContent = k.prazos_14d === 1 ? 'vence' : 'vencem';
        desenharResumo(k, porFase);
        const p = params();
        barrasEmpilhadas($('fases-corpo'), porFase, (l) => l.fase, 'fase', p.fase, (v) => alternar('fase', v, null));
        barrasEmpilhadas($('pessoas-corpo'), porPessoa.slice(0, 12).map((l) => ({ ...l, rotulo: l.pessoa === 'Sem responsável' ? l.pessoa : nomeCurto(l.pessoa) })), (l) => l.rotulo, 'pessoa', p.pessoa, (v) => { if (v === 'Sem responsável') dash.setParams({ status: p.status === 'sem_dono' ? 'ativos' : 'sem_dono' }); else alternar('pessoa', v, null); });
        desenharTravas(travas);
        desenharPrazos(prazos);
        desenharTempo(tempo);
        desenharMeses(meses);
        desenharTabela(projetos, frentes, etapas);
        if (!estadoLocal.animou) { estadoLocal.animou = true; for (const c of document.querySelectorAll('.pf-tile, .card')) c.classList.add('anima'); }
        const alvo = location.hash && document.getElementById(location.hash.slice(1));
        if (alvo && !estadoLocal.rolou) { estadoLocal.rolou = true; alvo.scrollIntoView(); }
      };

      dash.onData(desenhar);
      for (const sec of document.querySelectorAll('section[id], header[id]')) new IntersectionObserver((ents) => { for (const e of ents) if (e.isIntersecting) dash.setLink(sec.id); }, { threshold: [0.25] }).observe(sec);
    })();
  }

  // ---------- Casca: barra superior + painel ----------
  function avisoDesatualizado(pacote) {
    const horas = (Date.now() - Date.parse(pacote.geradoEm)) / 3_600_000;
    const limite = pacote.limites?.dadosDesatualizadosAposHoras ?? 30;
    if (!(horas > limite)) return '';
    return `<div class="aviso" role="status"><div><strong>Dados desatualizados.</strong>
      A última atualização foi em ${fmtData.format(new Date(pacote.geradoEm))} às ${fmtHora.format(new Date(pacote.geradoEm))}. A atualização automática pode ter falhado — verifique a aba Actions do GitHub.</div></div>`;
  }

  function iniciarPainel(pacote, criptografado) {
    const etapas = Array.isArray(pacote.etapas) ? pacote.etapas : [];
    const quando = pacote.coletadoEm || pacote.geradoEm;
    app.innerHTML = `
      <header class="barra-topo">
        <div class="dentro">
          <div class="marca"><div class="selo">${SELO}</div><div><b>Projetos Fiscais</b><span>Levantamento de créditos fiscais e previdenciários · Veiga Partners</span></div></div>
          <div class="direita">
            <span>Dados do Monday de <b>${quando ? fmtData.format(new Date(quando)) + ' às ' + fmtHora.format(new Date(quando)) : '—'}</b></span>
            <button class="botao-leve" type="button" id="botao-tema">${NOME_TEMA[temaAtual()]}</button>
            ${criptografado ? '<button class="botao-leve" type="button" id="botao-sair">Sair</button>' : ''}
          </div>
        </div>
      </header>
      ${avisoDesatualizado(pacote)}
      <main id="dash-root"></main>`;
    document.getElementById('botao-tema').addEventListener('click', (ev) => {
      const proximo = TEMAS[(TEMAS.indexOf(temaAtual()) + 1) % TEMAS.length];
      guardar.gravar('localStorage', CHAVE_TEMA, proximo);
      aplicarTema(proximo);
      ev.currentTarget.textContent = NOME_TEMA[proximo];
    });
    document.getElementById('botao-sair')?.addEventListener('click', sair);

    if (!etapas.length) {
      document.getElementById('dash-root').innerHTML = '<p class="vazio-geral">Nenhuma etapa veio do Monday nesta atualização.</p>';
      return;
    }
    document.getElementById('dash-root').innerHTML = MARKUP;
    const dash = criarDash(etapas);
    definirCalculos(dash);
    montarPagina(dash);
  }

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
      iniciarPainel(conteudo.aberto, false);
      return;
    }
    if (!conteudo?.cifrado) {
      app.innerHTML = '<p class="vazio-geral">Painel sem dados. Execute a atualização (GitHub Actions) para publicar os dados.</p>';
      return;
    }
    const salva = guardar.ler('sessionStorage', CHAVE_SENHA) || guardar.ler('localStorage', CHAVE_SENHA);
    if (salva) {
      try {
        iniciarPainel(await abrirDados(conteudo.cifrado, salva), true);
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
