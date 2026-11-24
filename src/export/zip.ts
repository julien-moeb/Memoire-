/**
 * Écriture d'une archive ZIP sans compression (méthode « stored »), sans dépendance.
 * Les fichiers CSV de l'export pèsent quelques centaines de kilo-octets : la compression
 * n'apporterait guère, alors qu'une bibliothèque alourdirait l'application.
 * Noms de fichiers en UTF-8 (bit 11 des indicateurs), lisibles par tous les outils courants.
 */

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(octets: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < octets.length; i++) c = TABLE_CRC[(c ^ octets[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface FichierZip {
  nom: string;
  contenu: string | Uint8Array;
}

/** Date et heure au format MS-DOS, en heure locale. */
function dateDos(d: Date): { heure: number; date: number } {
  return {
    heure: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export function creerZip(fichiers: readonly FichierZip[], quand: Date = new Date()): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const { heure, date } = dateDos(quand);
  const locaux: Uint8Array[] = [];
  const centraux: Uint8Array[] = [];
  let decalage = 0;

  for (const f of fichiers) {
    const nom = enc.encode(f.nom);
    const donnees = typeof f.contenu === 'string' ? enc.encode(f.contenu) : f.contenu;
    const crc = crc32(donnees);

    const local = new Uint8Array(30 + nom.length + donnees.length);
    const vl = new DataView(local.buffer);
    vl.setUint32(0, 0x04034b50, true);
    vl.setUint16(4, 20, true); // version requise
    vl.setUint16(6, 0x0800, true); // noms en UTF-8
    vl.setUint16(8, 0, true); // sans compression
    vl.setUint16(10, heure, true);
    vl.setUint16(12, date, true);
    vl.setUint32(14, crc, true);
    vl.setUint32(18, donnees.length, true);
    vl.setUint32(22, donnees.length, true);
    vl.setUint16(26, nom.length, true);
    vl.setUint16(28, 0, true);
    local.set(nom, 30);
    local.set(donnees, 30 + nom.length);
    locaux.push(local);

    const central = new Uint8Array(46 + nom.length);
    const vc = new DataView(central.buffer);
    vc.setUint32(0, 0x02014b50, true);
    vc.setUint16(4, 20, true);
    vc.setUint16(6, 20, true);
    vc.setUint16(8, 0x0800, true);
    vc.setUint16(10, 0, true);
    vc.setUint16(12, heure, true);
    vc.setUint16(14, date, true);
    vc.setUint32(16, crc, true);
    vc.setUint32(20, donnees.length, true);
    vc.setUint32(24, donnees.length, true);
    vc.setUint16(28, nom.length, true);
    vc.setUint32(42, decalage, true);
    central.set(nom, 46);
    centraux.push(central);
    decalage += local.length;
  }

  const tailleCentrale = centraux.reduce((n, c) => n + c.length, 0);
  const fin = new Uint8Array(22);
  const vf = new DataView(fin.buffer);
  vf.setUint32(0, 0x06054b50, true);
  vf.setUint16(8, fichiers.length, true);
  vf.setUint16(10, fichiers.length, true);
  vf.setUint32(12, tailleCentrale, true);
  vf.setUint32(16, decalage, true);

  const total = new Uint8Array(new ArrayBuffer(decalage + tailleCentrale + 22));
  let p = 0;
  for (const b of [...locaux, ...centraux, fin]) {
    total.set(b, p);
    p += b.length;
  }
  return total;
}
