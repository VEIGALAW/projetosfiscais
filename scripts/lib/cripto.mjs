// Criptografia dos dados do painel (PBKDF2-SHA256 + AES-256-GCM via WebCrypto).
// O navegador usa exatamente o mesmo esquema para abrir os dados com a senha.

import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;
export const ITERACOES = 600_000;

const paraBase64 = (bytes) => Buffer.from(bytes).toString('base64');
const deBase64 = (texto) => new Uint8Array(Buffer.from(texto, 'base64'));

async function derivarChave(senha, salt, iteracoes, uso) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iteracoes, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    [uso],
  );
}

export async function criptografar(texto, senha) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const chave = await derivarChave(senha, salt, ITERACOES, 'encrypt');
  const cifrado = await subtle.encrypt({ name: 'AES-GCM', iv }, chave, new TextEncoder().encode(texto));
  return {
    v: 1,
    iteracoes: ITERACOES,
    salt: paraBase64(salt),
    iv: paraBase64(iv),
    dados: paraBase64(new Uint8Array(cifrado)),
  };
}

export async function descriptografar(pacote, senha) {
  const chave = await derivarChave(senha, deBase64(pacote.salt), pacote.iteracoes, 'decrypt');
  const aberto = await subtle.decrypt({ name: 'AES-GCM', iv: deBase64(pacote.iv) }, chave, deBase64(pacote.dados));
  return new TextDecoder().decode(aberto);
}
