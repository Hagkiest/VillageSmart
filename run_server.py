#!/usr/bin/env python
"""
Entry point for the Nuitka-packaged CountryManageSystem.

Starts Django, runs migrations, and starts the HTTP server.
This script is compiled by Nuitka into an executable.
"""
import os
import sys

# Set Django settings module FIRST (before any Django imports)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Force SQLite for standalone packaged exe (no external DB dependency)
os.environ.setdefault('DJANGO_DB_BACKEND', 'sqlite3')

# Ensure the project root is on sys.path (for Nuitka standalone mode)
_project_root = os.path.dirname(os.path.abspath(__file__))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# ---------------------------------------------------------------------------
# Phase 1: minimal Django setup — must happen BEFORE heavy imports below
# ---------------------------------------------------------------------------
# 打包环境：关闭 DEBUG（通过 --insecure 服务静态文件，同时避免泄露错误详情）
os.environ.setdefault('DJANGO_DEBUG', 'False')

# Ensure runtime directory exists (for logging)
_runtime_dir = os.path.join(_project_root, 'runtime')
os.makedirs(_runtime_dir, exist_ok=True)

import django
django.setup()

# ---------------------------------------------------------------------------
# Phase 2: force-import EVERY module so Nuitka traces & includes them.
# Without this, dynamic / lazy imports may be MISSING at runtime.
# ---------------------------------------------------------------------------

# Django management commands needed by this script
from django.core.management import call_command
from django.conf import settings

# 1) Project config package
import config.urls as _
import config.wsgi as _
import config.asgi as _

# 2) App — models, views, services, urls, admin, middleware, activation
import village_affairs.apps as _
import village_affairs.models as _
import village_affairs.views as _
import village_affairs.urls as _
import village_affairs.admin as _
import village_affairs.middleware as _
import village_affairs.services as _
import village_affairs.extended_services as _
import village_affairs.activation_service as _

# 3) All migration modules (so Nuitka doesn't skip them)
try:
    from pathlib import Path as _Path
    _mig_dir = _Path(__file__).parent / 'village_affairs' / 'migrations'
    if _mig_dir.is_dir():
        for _f in sorted(_mig_dir.iterdir()):
            if _f.suffix == '.py' and _f.stem != '__init__':
                _mod_name = f'village_affairs.migrations.{_f.stem}'
                try:
                    __import__(_mod_name)
                except Exception:
                    pass  # some may have syntax issues or be unneeded
except Exception:
    pass

# 4) Third-party packages that might shadow
import openpyxl as _
# MySQL via PyMySQL (pure Python, included as fallback)
import pymysql as _          # PyMySQL pip package
# Only install as MySQLdb if the real MySQLdb is not available
try:
    import MySQLdb as _
except ImportError:
    pymysql.install_as_MySQLdb()
import PIL as _
import docx as _
import xlrd as _
import sqlparse as _
import tzdata as _
import asgiref as _
import psycopg2 as _
import dotenv as _
import et_xmlfile as _
import lxml as _

# 5) Django management commands — without these, 'migrate' / 'runserver' fail
import django.core.management.commands.migrate as _
import django.core.management.commands.runserver as _
import django.core.management.commands.sqlmigrate as _
import django.core.management.commands.showmigrations as _

# 6) Template loaders / engines used by Django
import django.template.loaders.app_directories as _
import django.template.loaders.filesystem as _

# 7) Static files infrastructure
import django.contrib.staticfiles.finders as _
import django.contrib.staticfiles.storage as _
import django.contrib.staticfiles.management.commands.runserver as _

# 8) Auth / session / messages contrib apps used in INSTALLED_APPS
import django.contrib.admin as _
import django.contrib.auth as _
import django.contrib.contenttypes as _
import django.contrib.sessions as _
import django.contrib.messages as _
import django.contrib.staticfiles as _


# ---------------------------------------------------------------------------


def main():
    """Start the Django application server."""

    # ── Database migrations ──────────────────────────────────────────────
    # Create all tables if they don't exist yet.
    print("正在检查并执行数据库迁移...")
    call_command('migrate', '--run-syncdb')
    call_command('migrate', 'village_affairs')

    # ── Parse user-overridable settings ───────────────────────────────────
    import_port = os.environ.get('PORT', '8000')
    bind_address = os.environ.get('BIND', '0.0.0.0')

    # ── Startup banner ────────────────────────────────────────────────────
    print()
    print("=" * 55)
    print("  农村村务管理系统 — CountryManageSystem")
    print("=" * 55)
    print(f"  服务地址: http://{bind_address}:{import_port}")
    print(f"  本机访问: http://127.0.0.1:{import_port}")
    print(f"  按 Ctrl+C 停止服务器")
    print("=" * 55)
    print()

    # ── 自动打开浏览器 ────────────────────────────────────────────────────
    import threading
    import webbrowser

    def _open_browser():
        """延迟一秒后打开默认浏览器"""
        threading.Timer(1.5, lambda: webbrowser.open(
            f'http://127.0.0.1:{import_port}'
        )).start()

    _open_browser()

    # ── Run the server ────────────────────────────────────────────────────
    call_command('runserver', f'{bind_address}:{import_port}', '--insecure')


if __name__ == '__main__':
    main()
