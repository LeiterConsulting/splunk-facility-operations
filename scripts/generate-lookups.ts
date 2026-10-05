import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { verticals, usecases, phases, entitiesFor } from '../src/catalogue';
import { signalsForPhase } from '../src/model';
const directory = 'splunk_facility_operations/lookups';
mkdirSync(directory, { recursive: true });
const rows = verticals.flatMap((vertical) => usecases.flatMap((usecase) => phases.flatMap((_, phase) => signalsForPhase(vertical.id, usecase.id, phase, 0))));
const fields = ['vertical', 'usecase', 'phase', 'entity_id', 'name', 'layer', 'site', 'owner', 'category', 'depends_on', 'control_id', 'state', 'reason', 'latency_ms', 'queue_depth', 'temperature_c', 'control_state'];
function csv(value: unknown) {
  const text = Array.isArray(value) ? value.join(';') : String(value ?? '');
  return '"' + text.replaceAll('"', '""') + '"';
}
writeFileSync(directory + '/facility_ops_demo_cycle.csv', fields.join(',') + '\n' + rows.map((row) => fields.map((field) => csv(row[field as keyof typeof row])).join(',')).join('\n') + '\n');
if (!existsSync(directory + '/facility_ops_live_inventory.csv')) writeFileSync(directory + '/facility_ops_live_inventory.csv', 'entity_id,name,vertical,layer,site,owner,category,control_id,depends_on,enabled\n');
writeFileSync('splunk_facility_operations/appserver/static/catalogue.json', JSON.stringify({ verticals, usecases, phases, entities: verticals.map((vertical) => ({ vertical: vertical.id, entities: entitiesFor(vertical.id) })) }));
console.log('Generated ' + rows.length + ' recurring demo observations. Existing local inventory is preserved; release packages ship an empty inventory.');
