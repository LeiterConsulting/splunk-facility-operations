from pathlib import Path
import tarfile
import gzip
root = Path(__file__).resolve().parents[1]
app = root / "splunk_facility_operations"
target = root / "artifacts" / "splunk_facility_operations-0.1.0.spl"
target.parent.mkdir(exist_ok=True)
with target.open("wb") as output, gzip.GzipFile(filename="", fileobj=output, mode="wb", mtime=0) as compressed:
    with tarfile.open(fileobj=compressed, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        for path in sorted(app.rglob("*")):
            if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc":
                info = archive.gettarinfo(str(path), arcname=str(path.relative_to(root)))
                info.uid = info.gid = info.mtime = 0
                info.uname = info.gname = ""
                info.mode = 0o644
                with path.open("rb") as source:
                    archive.addfile(info, source)
print(target)
