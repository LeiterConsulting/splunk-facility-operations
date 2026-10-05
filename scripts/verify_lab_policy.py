"""Check caller permissions, credential isolation and missing live evidence on a development lab.

Creates one temporary reader and one synthetic inventory row, then removes both.
Refuses to replace populated inventory or an existing provider key.
"""
import argparse, base64, copy, json, secrets
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from verify_lab import Client, APP

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--env-file', required=True); parser.add_argument('--prefix', required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
admin = Client(args.env_file, args.prefix)
base = 'servicesNS/-/' + APP + '/facility_ops/'
settings = admin.request(base + 'settings')
if settings['key_configured'] or admin.search('| inputlookup facility_ops_live_inventory.csv'):
    raise SystemExit('Existing key or populated inventory; fixture checks refused')
username = 'facility_ops_probe_' + secrets.token_hex(5)
password = secrets.token_urlsafe(24)
fake_key = 'synthetic-test-' + secrets.token_hex(12)
created = credential = inventory = False
receipt = {'target':args.prefix, 'checks':[]}
def check(name, condition):
    receipt['checks'].append({'name':name, 'passed':bool(condition)})
    print(name + ': ' + ('passed' if condition else 'FAILED'), flush=True)
def denied(client, path, form=None):
    try: client.request(path, form)
    except HTTPError as error: return error.code in (401, 403)
    return False
try:
    admin.request('services/authentication/users', {'name':username, 'password':password, 'roles':'user'})
    created = True
    reader = copy.copy(admin)
    reader.auth = 'Basic ' + base64.b64encode((username + ':' + password).encode()).decode()
    info = reader.request(base + 'settings')
    check('reader_can_read_nonsecret_settings', not info['can_configure'])
    check('reader_cannot_write_settings', denied(reader, base + 'settings', {'payload':json.dumps(settings)}))
    context = {'mode':'demo','vertical':'public_services','usecase':'dependency','audience':'operations','clock':90}
    answer = reader.request(base + 'agent', {'payload':json.dumps({'message':'Investigate dependency impact','context':context})})
    check('reader_investigation_uses_caller_identity', answer.get('user') == username and bool(answer.get('results')))
    saved = admin.request(base + 'settings', {'payload':json.dumps(dict(settings, api_key=fake_key))})
    credential = True
    info = reader.request(base + 'settings')
    check('credential_never_returned_by_settings', saved['key_configured'] and info['key_configured'] and fake_key not in json.dumps(info))
    check('reader_cannot_read_credential_storage', denied(reader, 'servicesNS/nobody/' + APP + '/storage/passwords/' + quote('facility_ops:openai:', safe='')))
    admin.request(base + 'settings', {'payload':json.dumps(dict(settings, provider='ollama', model='synthetic-tool-model', allow_live_llm=False))})
    check('live_llm_requires_enabled_setting', denied(reader, base + 'agent', {'payload':json.dumps({'message':'Investigate','context':dict(context, mode='live')})}))
    admin.request(base + 'settings', {'payload':json.dumps(settings)})
    admin.search('| makeresults | eval entity_id="identity",name="Synthetic lab inventory probe",vertical="public_services",layer="shared",site="Synthetic site",owner="Synthetic owner",category="Identity",control_id="IA-2",depends_on="",enabled=1 | table entity_id name vertical layer site owner category control_id depends_on enabled | outputlookup facility_ops_live_inventory.csv')
    inventory = True
    from importlib.util import spec_from_file_location, module_from_spec
    spec = spec_from_file_location('facility_test_tools', Path(__file__).resolve().parents[1] / 'splunk_facility_operations/bin/agent_tools.py')
    module = module_from_spec(spec); spec.loader.exec_module(module)
    rows = reader.search(module.compile_search(dict(context, mode='live'), 'snapshot'))
    check('missing_live_inventory_entity_is_unknown', len(rows) == 1 and rows[0]['entity_id'] == 'identity' and rows[0]['state'] == 'unknown')
finally:
    if inventory:
        admin.search('| inputlookup facility_ops_live_inventory.csv | where entity_id!="identity" | outputlookup facility_ops_live_inventory.csv')
    admin.request(base + 'settings', {'payload':json.dumps(settings)})
    if credential:
        admin.request('servicesNS/nobody/' + APP + '/storage/passwords/' + quote('facility_ops:openai:', safe=''), method='DELETE')
    if created:
        admin.request('services/authentication/users/' + username, method='DELETE')
    check('synthetic_fixtures_removed', not admin.request(base + 'settings')['key_configured'] and not admin.search('| inputlookup facility_ops_live_inventory.csv'))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(receipt, indent=2) + '\n')
if not all(item['passed'] for item in receipt['checks']): raise SystemExit(1)
