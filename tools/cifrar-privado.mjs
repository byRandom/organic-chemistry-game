// Cifra un archivo de contenido privado (p. ej. una PEC real) con un código.
// Uso: node tools/cifrar-privado.mjs <entrada.json> <salida.enc.json>   (código en la variable PK_CODIGO)
// La entrada en claro NO debe guardarse en el repositorio.
import { readFileSync, writeFileSync } from 'node:fs';
import { cifrar, descifrar } from '../js/app/cifrado.js';

const [entrada, salida] = process.argv.slice(2);
const codigo = process.env.PK_CODIGO;
if (!entrada || !salida || !codigo) {
  console.error('Uso: PK_CODIGO="tu código" node tools/cifrar-privado.mjs entrada.json salida.enc.json');
  process.exit(1);
}
const objeto = JSON.parse(readFileSync(entrada, 'utf8'));
const paquete = await cifrar(objeto, codigo);
const comprobacion = await descifrar(paquete, codigo);
if (JSON.stringify(comprobacion) !== JSON.stringify(objeto)) throw new Error('La comprobación del cifrado ha fallado');
writeFileSync(salida, JSON.stringify(paquete) + '\n');
console.log(`Cifrado: ${salida} (${paquete.datos.length} caracteres)`);
