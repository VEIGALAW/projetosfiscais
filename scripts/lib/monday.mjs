// Coleta os quadros e itens do Monday via API GraphQL (somente leitura).

const API_URL = 'https://api.monday.com/v2';

export const CONSULTA_QUADROS = `
query ($ws: [ID!], $page: Int!) {
  boards(workspace_ids: $ws, limit: 100, page: $page, state: active) {
    id name type url created_at updated_at items_count
    workspace { id name }
    columns { id title type }
    groups { id title position archived deleted }
  }
}`;

const CAMPOS_ITEM = `
fragment CamposItem on Item {
  id name state created_at updated_at
  group { id }
  column_values {
    id type text
    ... on StatusValue { label index is_done updated_at }
  }
  updates(limit: 1) { text_body created_at creator { name } }
  subitems {
    id name created_at updated_at
    column_values {
      id type text
      ... on StatusValue { label is_done updated_at }
    }
  }
}`;

export const CONSULTA_ITENS = `
query ($ids: [ID!], $limit: Int!) {
  boards(ids: $ids) {
    id
    items_page(limit: $limit) { cursor items { ...CamposItem } }
  }
}
${CAMPOS_ITEM}`;

export const CONSULTA_PROXIMA_PAGINA = `
query ($cursor: String!, $limit: Int!) {
  next_items_page(cursor: $cursor, limit: $limit) { cursor items { ...CamposItem } }
}
${CAMPOS_ITEM}`;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export async function consultar(token, query, variables = {}, tentativas = 6) {
  for (let tentativa = 1; ; tentativa++) {
    let resposta;
    let corpo;
    try {
      resposta = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ query, variables }),
      });
      corpo = await resposta.json().catch(() => null);
    } catch (erro) {
      if (tentativa >= tentativas) throw erro;
      await esperar(2 ** tentativa * 1000);
      continue;
    }

    const erros = corpo?.errors ?? (corpo?.error_message ? [{ message: corpo.error_message }] : []);
    const limiteAtingido =
      resposta.status === 429 ||
      erros.some((e) => /complexity|rate.?limit|too many/i.test(`${e.message} ${e.extensions?.code ?? ''}`));

    if (resposta.ok && erros.length === 0 && corpo?.data) return corpo.data;

    if ((limiteAtingido || resposta.status >= 500) && tentativa < tentativas) {
      const segundos =
        Number(erros.find((e) => e.extensions?.retry_in_seconds)?.extensions.retry_in_seconds) ||
        Number(resposta.headers.get('retry-after')) ||
        2 ** tentativa * 5;
      console.warn(`Monday pediu para aguardar (${segundos}s) — tentativa ${tentativa}/${tentativas}`);
      await esperar(segundos * 1000);
      continue;
    }

    if (resposta.status === 401 || resposta.status === 403) {
      throw new Error('Token do Monday inválido ou sem permissão (verifique o secret MONDAY_API_TOKEN).');
    }
    const detalhe = erros.map((e) => e.message).join('; ') || `HTTP ${resposta.status}`;
    throw new Error(`Falha na API do Monday: ${detalhe}`);
  }
}

export async function listarQuadros(token, workspaceIds) {
  const quadros = [];
  for (let page = 1; ; page++) {
    const { boards } = await consultar(token, CONSULTA_QUADROS, { ws: workspaceIds.map(String), page });
    quadros.push(...boards);
    if (boards.length < 100) return quadros;
  }
}

export async function carregarItens(token, idsQuadros, { lote = 3, limite = 200 } = {}) {
  const itensPorQuadro = new Map();
  for (let i = 0; i < idsQuadros.length; i += lote) {
    const ids = idsQuadros.slice(i, i + lote).map(String);
    const { boards } = await consultar(token, CONSULTA_ITENS, { ids, limit: limite });
    for (const quadro of boards) {
      const itens = [...quadro.items_page.items];
      let cursor = quadro.items_page.cursor;
      while (cursor) {
        const { next_items_page: pagina } = await consultar(token, CONSULTA_PROXIMA_PAGINA, {
          cursor,
          limit: limite,
        });
        itens.push(...pagina.items);
        cursor = pagina.cursor;
      }
      itensPorQuadro.set(String(quadro.id), itens);
    }
  }
  return itensPorQuadro;
}

// Retorna { coletadoEm, boards: [{ ...metadados, items: [...] }] } apenas com os quadros selecionados.
export async function coletarDoMonday(token, config, selecionar) {
  const quadros = (await listarQuadros(token, config.workspaceIds)).filter(selecionar);
  const itens = await carregarItens(
    token,
    quadros.map((q) => q.id),
  );
  return {
    coletadoEm: new Date().toISOString(),
    boards: quadros.map((q) => ({ ...q, items: itens.get(String(q.id)) ?? [] })),
  };
}
