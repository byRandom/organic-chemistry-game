// Catálogo de reactivos (las «cartas» de la caja de herramientas).
// tipo (según la Tabla 6.1 del texto base):
//   'nucleofilo'  buen nucleófilo y base débil (I⁻, CN⁻, N₃⁻, RS⁻, CH₃COO⁻, NH₃)
//   'base'        base fuerte no impedida y buen nucleófilo (HO⁻, RO⁻)
//   'impedida'    base fuerte impedida ((CH₃)₃CO⁻)
//   'solvolisis'  nucleófilo débil y base débil en medio polar prótico (H₂O, ROH)
// grupo: fragmento SMILES que se une al carbono (el primer átomo es el que se enlaza).

export const REACTIVOS = {
  NaI: {
    nombre: 'NaI', condiciones: 'acetona', tipo: 'nucleofilo', grupo: 'I',
    descripcion: 'Ion yoduro: excelente nucleófilo y base muy débil (reacción de Finkelstein).',
  },
  NaCN: {
    nombre: 'NaCN', condiciones: 'DMSO', tipo: 'nucleofilo', grupo: 'C#N',
    descripcion: 'Ion cianuro: buen nucleófilo, poco básico. Alarga la cadena en un carbono (nitrilo).',
  },
  NaN3: {
    nombre: 'NaN₃', condiciones: 'DMF', tipo: 'nucleofilo', grupo: 'N=[N+]=[N-]',
    descripcion: 'Ion azida: muy buen nucleófilo y base débil. Da azidas de alquilo.',
  },
  CH3SNa: {
    nombre: 'CH₃SNa', condiciones: 'EtOH', tipo: 'nucleofilo', grupo: 'SC',
    descripcion: 'Ion metanotiolato: nucleófilo excelente (el S es grande y polarizable) y base débil.',
  },
  NaSH: {
    nombre: 'NaSH', condiciones: 'EtOH', tipo: 'nucleofilo', grupo: 'S',
    descripcion: 'Ion hidrogenosulfuro: buen nucleófilo, da tioles.',
  },
  CH3COONa: {
    nombre: 'CH₃COONa', condiciones: 'DMF', tipo: 'nucleofilo', grupo: 'OC(C)=O',
    descripcion: 'Ion acetato: buen nucleófilo y base débil. Con halogenuros secundarios da 100 % de SN2.',
  },
  NH3: {
    nombre: 'NH₃', condiciones: 'exceso', tipo: 'nucleofilo', grupo: 'N',
    descripcion: 'Amoniaco en exceso: nucleófilo neutro, da aminas primarias.',
  },
  NaOH: {
    nombre: 'NaOH', condiciones: 'H₂O', tipo: 'base', grupo: 'O',
    descripcion: 'Ion hidróxido: base fuerte y buen nucleófilo.',
  },
  CH3ONa: {
    nombre: 'CH₃O⁻Na⁺', condiciones: 'CH₃OH', tipo: 'base', grupo: 'OC',
    descripcion: 'Metóxido de sodio: base fuerte no impedida y buen nucleófilo.',
  },
  EtONa: {
    nombre: 'EtO⁻Na⁺', condiciones: 'EtOH', tipo: 'base', grupo: 'OCC',
    descripcion: 'Etóxido de sodio: base fuerte no impedida y buen nucleófilo.',
  },
  tBuOK: {
    nombre: '(CH₃)₃CO⁻K⁺', condiciones: '(CH₃)₃COH', tipo: 'impedida', grupo: 'OC(C)(C)C',
    descripcion: 'terc-Butóxido de potasio: base fuerte y muy voluminosa. Favorece la E2 y el alqueno menos sustituido (Hofmann).',
  },
  H2O: {
    nombre: 'H₂O', condiciones: 'Δ', tipo: 'solvolisis', grupo: 'O',
    descripcion: 'Agua: nucleófilo y base débiles, disolvente polar prótico. Solvólisis (SN1/E1).',
  },
  CH3OH: {
    nombre: 'CH₃OH', condiciones: '', tipo: 'solvolisis', grupo: 'OC',
    descripcion: 'Metanol: nucleófilo y base débiles, disolvente polar prótico (SN1/E1).',
  },
  EtOH: {
    nombre: 'EtOH', condiciones: '', tipo: 'solvolisis', grupo: 'OCC',
    descripcion: 'Etanol: nucleófilo y base débiles, disolvente polar prótico (SN1/E1).',
  },
};

export function reactivo(id) {
  const r = REACTIVOS[id];
  if (!r) throw new Error('Reactivo desconocido: ' + id);
  return { id, ...r };
}

export const etiquetaReactivo = (r) => r.nombre + (r.condiciones ? ', ' + r.condiciones : '');
