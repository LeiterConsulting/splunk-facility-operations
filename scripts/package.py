"""Build a reproducible demo package without local settings or customer inventory."""
from io import BytesIO
from pathlib import Path
import gzip
import tarfile

ROOT = Path(__file__).resolve().parents[1]
APP_ID = "splunk_facility_operations"
# Explicit release inputs keep local configuration, extra lookups, and stray files
# out of a distributable demo. Add new shipped assets here when extending the app.
RELEASE_FILES = (
    "appserver/static/catalogue.json",
    "appserver/static/facility-operations.css",
    "appserver/static/facility-operations.js",
    "appserver/static/facility-operations.js.LEGAL.txt",
    "appserver/templates/facility_operations.html",
    "bin/agent_providers.py",
    "bin/agent_tools.py",
    "bin/facility_ops_rest.py",
    "default/app.conf",
    "default/data/ui/nav/default.xml",
    "default/data/ui/views/facility_operations.xml",
    "default/facility_ops_agent.conf",
    "default/macros.conf",
    "default/props.conf",
    "default/restmap.conf",
    "default/transforms.conf",
    "default/web.conf",
    "lookups/facility_ops_demo_cycle.csv",
    "metadata/default.meta",
)
LIVE_INVENTORY = "lookups/facility_ops_live_inventory.csv"
EMPTY_INVENTORY = b"entity_id,name,vertical,layer,site,owner,category,control_id,depends_on,enabled\n"


def create_package(app, target):
    app, target = Path(app), Path(target)
    contents = {}
    for name in RELEASE_FILES:
        path = app / name
        if path.is_symlink() or not path.resolve().is_relative_to(app.resolve()):
            raise ValueError("Release input must be a regular app file: " + name)
        if not path.is_file():
            raise FileNotFoundError("Missing release input: " + name + ". Run npm run package to rebuild the app.")
        contents[name] = path.read_bytes()
    # Always ship an empty inventory without modifying the operator's local copy.
    contents[LIVE_INVENTORY] = EMPTY_INVENTORY
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("wb") as output, gzip.GzipFile(filename="", fileobj=output, mode="wb", mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode="w", format=tarfile.USTAR_FORMAT) as archive:
            for name, data in sorted(contents.items()):
                info = tarfile.TarInfo(APP_ID + "/" + name)
                info.size = len(data)
                info.mode = 0o644
                archive.addfile(info, BytesIO(data))
    return target


if __name__ == "__main__":
    print(create_package(ROOT / APP_ID, ROOT / "artifacts" / (APP_ID + "-0.1.0.spl")))
