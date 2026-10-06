"""Release checks protect local configuration and inventory from distribution."""
from pathlib import Path
from tempfile import TemporaryDirectory
import errno
import importlib.util
import tarfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


package = load_script("package")
preview = load_script("serve_preview")


class PackagingTests(unittest.TestCase):
    def fixture(self, root):
        app = root / package.APP_ID
        for name in package.RELEASE_FILES:
            path = app / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("release fixture\n")
        return app

    def test_private_files_are_excluded_and_inventory_is_preserved(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            app = self.fixture(root)
            inventory = app / package.LIVE_INVENTORY
            inventory.write_text("customer inventory must remain local\n")
            private_files = ("local/facility_ops_agent.conf", "lookups/customer.csv", "bin/.env", "metadata/local.meta")
            for name in private_files:
                path = app / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("private fixture\n")
            target = package.create_package(app, root / "first.spl")
            with tarfile.open(target, "r:gz") as archive:
                names = archive.getnames()
                for name in private_files:
                    self.assertNotIn(package.APP_ID + "/" + name, names)
                shipped = archive.extractfile(package.APP_ID + "/" + package.LIVE_INVENTORY).read().decode()
                self.assertEqual(shipped.splitlines(), ["entity_id,name,vertical,layer,site,owner,category,control_id,depends_on,enabled"])
            self.assertEqual(inventory.read_text(), "customer inventory must remain local\n")
            second = package.create_package(app, root / "second.spl")
            self.assertEqual(target.read_bytes(), second.read_bytes())

    def test_missing_release_inputs_fail_before_writing(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            app = self.fixture(root)
            path = app / "default/app.conf"
            path.unlink()
            target = root / "candidate.spl"
            with self.assertRaises(FileNotFoundError):
                package.create_package(app, target)
            self.assertFalse(target.exists())

    def test_linked_release_inputs_fail_before_writing(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            app = self.fixture(root)
            path = app / "default/app.conf"
            path.unlink()
            target = root / "candidate.spl"
            private = root / "private.conf"
            private.write_text("private fixture")
            try:
                path.symlink_to(private)
            except OSError as error:
                if error.errno in (errno.EPERM, errno.EACCES, errno.ENOTSUP) or getattr(error, "winerror", None) == 1314:
                    self.skipTest("Host cannot create symlinks; linked-input rejection requires another host")
                raise
            with self.assertRaises(ValueError):
                package.create_package(app, target)
            self.assertFalse(target.exists())

    def test_missing_preview_bundle_explains_the_build_step(self):
        with TemporaryDirectory() as directory:
            with self.assertRaisesRegex(SystemExit, "Run npm run package"):
                preview.require_bundle(Path(directory))


if __name__ == "__main__":
    unittest.main()
