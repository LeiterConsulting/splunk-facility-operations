"""Short-lived, user-owned investigation progress shared across REST processes.

Only normalized evidence, public activity and answer text are stored. Credentials,
session tokens and provider reasoning stay in the worker's memory.
"""
import hashlib
import json
import os
import re
import secrets
import sqlite3
import time
import threading
from pathlib import Path
from contextlib import contextmanager


class JobError(ValueError):
    def __init__(self, status, message):
        self.status, self.message = status, message


class InvestigationStopped(Exception):
    pass


class JobStore:
    TTL = 300

    def __init__(self, directory=None):
        self.directory = Path(directory) if directory else Path(os.environ['SPLUNK_HOME']) / 'var/run/splunk/facility_operations'
        self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
        if self.directory.is_symlink():
            raise JobError(503, 'Investigation progress storage is unavailable.')
        os.chmod(self.directory, 0o700)
        self.path = self.directory / 'investigations.sqlite'
        # Create privately before SQLite opens it; refuse a substituted symlink.
        descriptor = os.open(self.path, os.O_CREAT | os.O_WRONLY | getattr(os, 'O_NOFOLLOW', 0), 0o600)
        os.close(descriptor)
        os.chmod(self.path, 0o600)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, owner TEXT, created REAL, status TEXT, data TEXT)')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(str(self.path), timeout=5)
        try:
            db.execute('PRAGMA secure_delete=ON')
            with db:
                yield db
        finally:
            db.close()

    @staticmethod
    def owner(user):
        return hashlib.sha256(user.encode()).hexdigest()

    def purge(self):
        with self.connect() as db:
            db.execute('DELETE FROM jobs WHERE created < ?', (time.time() - self.TTL,))

    def create(self, user):
        now, owner, identity = time.time(), self.owner(user), secrets.token_hex(24)
        state = {'job_id': identity, 'status': 'running', 'created_at': now, 'activities': [], 'partial': '', 'turn': 0}
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM jobs WHERE created < ?', (now - self.TTL,))
            if db.execute("SELECT count(*) FROM jobs WHERE owner=? AND status='running'", (owner,)).fetchone()[0]:
                raise JobError(429, 'An investigation is already running for this user. Stop it or wait for completion.')
            if db.execute('SELECT count(*) FROM jobs WHERE owner=? AND created>?', (owner, now - 60)).fetchone()[0] >= 6:
                raise JobError(429, 'The investigation rate limit has been reached. Wait briefly before retrying.')
            if db.execute("SELECT count(*) FROM jobs WHERE status='running'").fetchone()[0] >= 8 or db.execute('SELECT count(*) FROM jobs').fetchone()[0] >= 64:
                raise JobError(429, 'Investigation capacity is busy. Wait briefly before retrying.')
            db.execute('INSERT INTO jobs VALUES (?,?,?,?,?)', (identity, owner, now, 'running', json.dumps(state)))
        cleanup = threading.Timer(self.TTL + 1, self.purge)
        cleanup.daemon = True
        cleanup.start()
        return state

    def read(self, user, identity, cancel=False):
        if not isinstance(identity, str) or not re.fullmatch(r'[a-f0-9]{48}', identity):
            raise JobError(404, 'Investigation unavailable or expired. Start a new investigation.')
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM jobs WHERE created < ?', (time.time() - self.TTL,))
            row = db.execute('SELECT data FROM jobs WHERE id=? AND owner=?', (identity, self.owner(user))).fetchone()
            state = json.loads(row[0]) if row else None
            if state and cancel and state['status'] == 'running':
                state.update(status='cancelled', partial='', error='Investigation stopped. No further tools will be started.')
                db.execute('UPDATE jobs SET status=?,data=? WHERE id=?', ('cancelled', json.dumps(state), identity))
        if state is None:
            raise JobError(404, 'Investigation unavailable or expired. Start a new investigation.')
        return state

    def write(self, user, state):
        encoded = json.dumps(state)
        if len(encoded.encode()) > 2_000_000:
            raise JobError(502, 'Investigation progress exceeded its size limit. Refine the scope.')
        with self.connect() as db:
            cursor = db.execute("UPDATE jobs SET status=?,data=? WHERE id=? AND owner=? AND status='running' AND created>?",
                                (state['status'], encoded, state['job_id'], self.owner(user), time.time() - self.TTL))
            if cursor.rowcount != 1:
                raise InvestigationStopped()


class JobProgress:
    def __init__(self, store, user, state):
        self.store, self.user, self.state = store, user, dict(state)
        self.last_write = 0
        self.last_check = 0

    def check(self):
        if time.monotonic() - self.last_check < 0.1:
            return
        state = self.store.read(self.user, self.state['job_id'])
        if state['status'] != 'running':
            raise InvestigationStopped()
        self.last_check = time.monotonic()

    def emit(self, kind, **values):
        if kind == 'answer_delta':
            self.state['partial'] = (self.state['partial'] + values.get('text', ''))[:64000]
            if time.monotonic() - self.last_write < 0.25:
                return
        else:
            if kind == 'model_start':
                self.state.update(partial='', turn=values.get('turn', 0))
            if kind == 'evidence_ready':
                self.state['assessment'] = values.pop('assessment')
            self.state['activities'] = (self.state['activities'] + [{'kind': kind, 'at': time.time(), **values}])[-40:]
        self.store.write(self.user, self.state)
        self.last_write = time.monotonic()

    def finish(self, result=None, error=None):
        self.state.update(status='failed' if error else 'completed', partial='')
        if error:
            self.state['error'] = error
        else:
            self.state['result'] = result
        self.store.write(self.user, self.state)
