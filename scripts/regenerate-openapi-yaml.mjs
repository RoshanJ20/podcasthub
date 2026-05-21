/**
 * Regenerates openapi.yaml from docs/openapi.json, and mirrors both formats
 * to the repository root for VAPT delivery.
 *
 * `docs/openapi.json` is the single source of truth. Run this script after
 * any manual edit to the JSON to keep the four derived artefacts in sync:
 *
 *   docs/openapi.json   ← source of truth (edit this)
 *   docs/openapi.yaml   ← derived
 *   openapi.json        ← derived (root copy for VAPT consumers)
 *   openapi.yaml        ← derived (root copy for VAPT consumers)
 *
 * VAPT consumers may prefer either format, so both are committed at root.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const repoRoot = path.resolve(import.meta.dirname, '..');
const sourceJsonPath = path.join(repoRoot, 'docs', 'openapi.json');

const spec = JSON.parse(fs.readFileSync(sourceJsonPath, 'utf8'));

const yamlText = yaml.dump(spec, {
  indent: 2,
  lineWidth: 120,
  noRefs: true,
  sortKeys: false,
});

const jsonText = `${JSON.stringify(spec, null, 2)}\n`;

const outputs = [
  { kind: 'yaml', path: path.join(repoRoot, 'docs', 'openapi.yaml'), text: yamlText },
  { kind: 'json', path: path.join(repoRoot, 'openapi.json'), text: jsonText },
  { kind: 'yaml', path: path.join(repoRoot, 'openapi.yaml'), text: yamlText },
];

for (const { kind, path: outPath, text } of outputs) {
  fs.writeFileSync(outPath, text);
  const relative = path.relative(repoRoot, outPath).replaceAll(path.sep, '/');
  console.log(`${kind.toUpperCase().padEnd(4)} written: ${relative} (${text.split('\n').length} lines)`);
}
