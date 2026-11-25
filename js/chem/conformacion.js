// Análisis conformacional: energías de Newman y de sillas de ciclohexano (kcal/mol, como el libro).

// Tamaño relativo de los grupos para estimar interacciones.
// Con H/H, H/CH3 y CH3/CH3 se reproducen exactamente los valores del texto base (Tema 2):
//   etano eclipsado 3,0 · butano gauche 0,9 · butano anticlinal 3,8.
export function tamano(grupo) {
  const g = grupo.replace(/[₀-₉]/g, (d) => '₀₁₂₃₄₅₆₇₈₉'.indexOf(d));
  if (g === 'H') return 0;
  if (g === 'C(CH3)3') return 3.5;
  if (g === 'CH3') return 2;
  if (/^C/.test(g)) return 2.5; // otros grupos alquilo o con carbono
  return 1; // halógenos, OH, NH2, OCH3...
}

export function energiaEclipsado(a, b) {
  const sa = tamano(a), sb = tamano(b);
  return 1.0 + 0.2 * (sa + sb) + 0.2 * sa * sb;
}

export function energiaGauche(a, b) {
  return 0.225 * tamano(a) * tamano(b);
}

const difAng = (x, y) => {
  const d = Math.abs((((x - y) % 360) + 360) % 360);
  return Math.min(d, 360 - d);
};

/**
 * Energía de una conformación de Newman.
 * delante/detras: [{texto, ang}] (grados). Suma eclipsamientos (Δ = 0°) e interacciones gauche (Δ = 60°).
 */
export function energiaNewman(delante, detras) {
  let e = 0;
  for (const f of delante) {
    for (const b of detras) {
      const d = difAng(f.ang, b.ang);
      if (d < 1) e += energiaEclipsado(f.texto, b.texto);
      else if (Math.abs(d - 60) < 1) e += energiaGauche(f.texto, b.texto);
    }
  }
  return Math.round(e * 100) / 100;
}

/** Grupos de Newman a ángulos: delante fijo en 0/120/240; detrás girado `giro` grados (0 = eclipsada). */
export function disposicionNewman(delante, detras, giro) {
  return {
    delante: delante.map((t, k) => ({ texto: t, ang: k * 120 })),
    detras: detras.map((t, k) => ({ texto: t, ang: k * 120 + giro })),
  };
}

/** Perfil de energía para giros de 0 a 360 cada 60°. */
export function perfilNewman(delante, detras) {
  const out = [];
  for (let g = 0; g < 360; g += 60) {
    const d = disposicionNewman(delante, detras, g);
    out.push({ giro: g, e: energiaNewman(d.delante, d.detras) });
  }
  return out;
}

// ---------- sillas ----------
// Diferencia de energía axial–ecuatorial (valor A, kcal/mol). Tabla 3.3 del texto base para los alquilos;
// el resto son valores bibliográficos aproximados.
export const VALOR_A = {
  'CH₃': 1.7, 'CH₂CH₃': 1.75, 'CH(CH₃)₂': 2.1, 'C(CH₃)₃': 5.0,
  OH: 0.9, 'OCH₃': 0.6, Cl: 0.5, Br: 0.5, I: 0.45, F: 0.25, 'NH₂': 1.4, COOH: 1.4, CN: 0.2, 'C₆H₅': 2.8,
};
export const DEL_LIBRO = new Set(['CH₃', 'CH₂CH₃', 'CH(CH₃)₂', 'C(CH₃)₃']);

export const valorA = (t) => VALOR_A[t] ?? 1.7;

/**
 * Sustituyentes en una silla: [{carbono (0-5), texto, pos: 'ax'|'eq'}] y la geometría (axArriba por carbono).
 * Devuelve energía (suma de valores A axiales + 1,3-diaxiales entre sustituyentes) y su cara (arriba/abajo).
 */
export function analizarSilla(subs, axArriba) {
  let e = 0;
  const caras = subs.map((s) => (s.pos === 'ax') === axArriba[s.carbono]);
  subs.forEach((s) => { if (s.pos === 'ax') e += valorA(s.texto); });
  // interacción 1,3-diaxial adicional entre dos sustituyentes axiales en la misma cara
  for (let i = 0; i < subs.length; i++) {
    for (let j = i + 1; j < subs.length; j++) {
      const a = subs[i], b = subs[j];
      const dist = Math.min(Math.abs(a.carbono - b.carbono), 6 - Math.abs(a.carbono - b.carbono));
      if (a.pos === 'ax' && b.pos === 'ax' && dist === 2 && caras[i] === caras[j]) e += 2.0;
    }
  }
  return { energia: Math.round(e * 100) / 100, arriba: caras };
}

/** Gira la silla: cada sustituyente conserva su cara (arriba/abajo) y cambia axial ↔ ecuatorial. */
export function girarSilla(subs) {
  return subs.map((s) => ({ ...s, pos: s.pos === 'ax' ? 'eq' : 'ax' }));
}
