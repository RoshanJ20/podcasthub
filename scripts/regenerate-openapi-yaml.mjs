/**
 * Regenerates docs/openapi.yaml from docs/openapi.json.
 *
 * Used after manual edits to the JSON spec to keep the two files in sync.
 * VAPT consumers may prefer either format, so both are committed.
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const repoRoot = path.resolve(import.meta.dirname, '..');
const jsonPath = path.join(repoRoot, 'docs', 'openapi.json');
const yamlPath = path.join(repoRoot, 'docs', 'openapi.yaml');

const spec = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const dumped = yaml.dump(spec, {
  indent: 2,
  lineWidth: 120,
  noRefs: true,
  sortKeys: false,
});

fs.writeFileSync(yamlPath, dumped);
console.log(`YAML written: ${yamlPath} (${dumped.split('\n').length} lines)`);
