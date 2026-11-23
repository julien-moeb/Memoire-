/** Régénère contenu/schemas/*.schema.json à partir des schémas Zod : npm run schemas */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { SCHEMAS_PAR_TYPE } from '../src/contenu/schemas';
import { RACINE_CONTENU } from './lire-contenu';

const dossier = join(RACINE_CONTENU, 'schemas');
mkdirSync(dossier, { recursive: true });
for (const [type, schema] of Object.entries(SCHEMAS_PAR_TYPE)) {
  const json = z.toJSONSchema(schema, { io: 'input' });
  writeFileSync(join(dossier, `${type}.schema.json`), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`✓ ${type}.schema.json`);
}
