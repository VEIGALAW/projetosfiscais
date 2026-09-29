#!/usr/bin/env node
// Gera o painel estático a partir do Monday.
//
//   node scripts/build.mjs                        produção: coleta no Monday e gera dist/ criptografado
//   node scripts/build.mjs --bruto coleta.json    usa uma coleta salva em vez de chamar a API
//   node scripts/build.mjs --salvar-bruto x.json  salva a coleta bruta (contém dados de clientes: não versionar)
//   node scripts/build.mjs --previa               gera previa/index.html SEM senha, só para uso local
//
// Variáveis de ambiente: MONDAY_API_TOKEN (coleta) e DASHBOARD_PASSWORD (senha do painel).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coletarDoMonday } from './lib/monday.mjs';
import { montarPainel, quadroSelecionado } from './lib/transform.mjs';
import { criptografar } from './lib/cripto.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SENHA_MINIMA = 12;

function lerArgumentos(argv) {
  const args = { previa: false, bruto: null, salvarBruto: null, saida: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--previa') args.previa = true;
    else if (a === '--bruto') args.bruto = argv[++i];
    else if (a === '--salvar-bruto') args.salvarBruto = argv[++i];
    else if (a === '--saida') args.saida = argv[++i];
    else throw new Error(`Argumento desconhecido: ${a}`);
  }
  return args;
}

// Insere conteúdo no template sem interpretar "$" do texto inserido.
const substituir = (texto, marcador, valor) => {
  if (!texto.includes(marcador)) throw new Error(`Marcador ${marcador} não encontrado no template`);
  return texto.split(marcador).join(valor);
};

// JSON seguro dentro de <script type="application/json">.
const jsonEmScript = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

export async function montarHtml(conteudoDados) {
  const [html, css, js] = await Promise.all(
    ['index.html', 'styles.css', 'app.js'].map((f) => fs.readFile(path.join(RAIZ, 'site', f), 'utf8')),
  );
  let saida = substituir(html, '/*__ESTILOS__*/', css);
  saida = substituir(saida, '/*__APP__*/', js);
  saida = substituir(saida, '"__DADOS__"', jsonEmScript(conteudoDados));
  return saida;
}

async function main() {
  const args = lerArgumentos(process.argv.slice(2));
  const config = JSON.parse(await fs.readFile(path.join(RAIZ, 'config.json'), 'utf8'));

  let bruto;
  if (args.bruto) {
    bruto = JSON.parse(await fs.readFile(args.bruto, 'utf8'));
  } else {
    const token = process.env.MONDAY_API_TOKEN;
    if (!token) throw new Error('Defina MONDAY_API_TOKEN (token da API do Monday).');
    console.log('Coletando dados do Monday…');
    bruto = await coletarDoMonday(token, config, (q) => quadroSelecionado(q, config));
  }
  if (args.salvarBruto) {
    await fs.writeFile(args.salvarBruto, JSON.stringify(bruto));
    console.log(`Coleta bruta salva em ${args.salvarBruto}`);
  }

  const painel = montarPainel(bruto, config);
  const ativos = painel.projetos.filter((p) => p.status !== 'concluido').length;
  console.log(`${painel.projetos.length} projetos (${ativos} ativos).`);

  if (args.previa) {
    const destino = args.saida ?? path.join(RAIZ, 'previa');
    await fs.mkdir(destino, { recursive: true });
    await fs.writeFile(path.join(destino, 'index.html'), await montarHtml({ aberto: painel }));
    console.log(`Prévia SEM senha gerada em ${destino}/index.html — não publique este arquivo.`);
    return;
  }

  const senha = process.env.DASHBOARD_PASSWORD ?? '';
  if (senha.length < SENHA_MINIMA) {
    throw new Error(`Defina DASHBOARD_PASSWORD com pelo menos ${SENHA_MINIMA} caracteres.`);
  }
  const cifrado = await criptografar(JSON.stringify(painel), senha);

  const destino = args.saida ?? path.join(RAIZ, 'dist');
  await fs.rm(destino, { recursive: true, force: true });
  await fs.mkdir(destino, { recursive: true });
  await fs.writeFile(path.join(destino, 'index.html'), await montarHtml({ cifrado }));
  await fs.writeFile(path.join(destino, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  console.log(`Painel criptografado gerado em ${destino}/`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((erro) => {
    console.error(`Erro: ${erro.message}`);
    process.exit(1);
  });
}
