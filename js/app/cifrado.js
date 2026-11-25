// Contenido privado cifrado (AES-256-GCM, clave derivada del código con PBKDF2-SHA256).
// El código nunca se guarda en el repositorio: sin él, los archivos .enc.json son ilegibles.
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const cryptoAPI = () => globalThis.crypto;

/** Normaliza el código: sin mayúsculas, sin tildes y sin espacios sobrantes. */
export const normalizarCodigo = (c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

async function clave(codigo, sal, iteraciones) {
  const base = await cryptoAPI().subtle.importKey('raw', enc.encode(normalizarCodigo(codigo)), 'PBKDF2', false, ['deriveKey']);
  return cryptoAPI().subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function cifrar(objeto, codigo, iteraciones = 600000) {
  const sal = cryptoAPI().getRandomValues(new Uint8Array(16));
  const iv = cryptoAPI().getRandomValues(new Uint8Array(12));
  const k = await clave(codigo, sal, iteraciones);
  const datos = new Uint8Array(await cryptoAPI().subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(objeto))));
  return { v: 1, kdf: 'PBKDF2-SHA256', iteraciones, sal: b64(sal), iv: b64(iv), datos: b64(datos) };
}

/** Devuelve el objeto descifrado o null si el código no es el correcto. */
export async function descifrar(paquete, codigo) {
  try {
    const k = await clave(codigo, deB64(paquete.sal), paquete.iteraciones);
    const claro = await cryptoAPI().subtle.decrypt({ name: 'AES-GCM', iv: deB64(paquete.iv) }, k, deB64(paquete.datos));
    return JSON.parse(dec.decode(claro));
  } catch {
    return null;
  }
}
