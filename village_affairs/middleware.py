import json
import re

from django.http import JsonResponse
from django.utils import timezone
from .models import OperationLog, SystemActivation
from .services import get_request_ip_address, get_request_operator_name, record_operation_log

class LANRestrictionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        client_ip = request.META.get('REMOTE_ADDR', '')
        is_localhost = client_ip in ['127.0.0.1', '::1', 'localhost']
        
        # Always allow static files, media files, activation APIs, and frontend routes
        allowed_paths = [
            '/api/activation/',
            '/static/',
            '/media/',
        ]
        is_allowed_path = any(request.path.startswith(p) for p in allowed_paths)
        
        # If it's not an API path, it's likely a frontend route. We should let it load the HTML.
        # The frontend itself will fetch API and see it's blocked, then handle it.
        if not request.path.startswith('/api/') and not request.path.startswith('/admin/'):
            is_allowed_path = True

        
        if not is_localhost and not is_allowed_path:
            try:
                activation = SystemActivation.objects.filter(is_active=True).order_by('-activated_at').first()
                if not activation or activation.expire_at < timezone.now():
                    if activation and activation.expire_at < timezone.now():
                        activation.is_active = False
                        activation.save()
                    return JsonResponse({
                        'error': '系统未激活或已过期，无法在局域网中使用。',
                        'code': 'NOT_ACTIVATED'
                    }, status=403)
            except Exception:
                # 数据库连接失败时默认未激活，但不阻断前端页面加载
                return JsonResponse({
                    'error': '无法连接数据库，请检查网络连接。系统局域网功能不可用。',
                    'code': 'DB_ERROR'
                }, status=503)
        
        response = self.get_response(request)
        return response

MODULE_PATH_MAP = [
    ('/api/settings/ui/', '系统设置'),
    ('/api/reminder-rules/', '系统设置'),
    ('/api/operation-logs/', '系统设置'),
    ('/api/data-security/backups/', '数据安全'),
    ('/api/residents/', '居民管理'),
    ('/api/migrant-workers/', '居民管理'),
    ('/api/risk-checks/', '居民管理'),
    ('/api/low-income/', '特殊人群管理'),
    ('/api/disabled/', '特殊人群管理'),
    ('/api/care-objects/', '特殊人群管理'),
    ('/api/org-structure/', '机构管理'),
    ('/api/party-members/', '机构管理'),
    ('/api/party-fees/', '机构管理'),
    ('/api/todos/', '待办提醒'),
    ('/api/projects/', '乡村振兴'),
    ('/api/farmland/', '耕地管理'),
    ('/api/subsidies/', '乡村振兴'),
    ('/api/public-jobs/', '乡村振兴'),
    ('/api/mediations/', '人民调解'),
]


class OperationLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # 若视图中发生了事务回滚（如 IntegrityError），需先清理脏连接再记日志
        try:
            from django.db import connection as _conn
            if _conn.connection and _conn.needs_rollback:
                _conn.rollback()
        except Exception:
            pass
        try:
            self.log_request(request, response)
        except Exception:
            pass  # 日志记录失败不应影响响应
        return response

    def should_track_request(self, request):
        path = request.path
        method = request.method.upper()
        if not path.startswith('/api/'):
            return False
        if path == '/api/operation-logs/' and method == 'GET':
            return False
        if path == '/api/data-security/backups/' and method == 'GET':
            return False
        # 清除所有数据操作不记录日志（用户要求）
        if path == '/api/data-security/backups/clear-all/':
            return False
        if method in {'POST', 'PUT', 'DELETE'}:
            return True
        if method == 'GET' and any(keyword in path for keyword in ('/export/', '/application-document/', '/download/')):
            return True
        return False

    def resolve_module(self, path):
        for prefix, module in MODULE_PATH_MAP:
            if path.startswith(prefix):
                return module
        return '未分类模块'

    def resolve_action(self, request):
        path = request.path
        method = request.method.upper()
        if method == 'GET':
            if '/application-document/' in path:
                return '下载文书'
            if '/download/' in path:
                return '下载备份'
            if '/export/' in path:
                return '导出'
            return '查询'
        if method == 'PUT':
            return '修改'
        if method == 'DELETE':
            return '删除'
        if '/restore/' in path:
            return '恢复'
        if '/cleanup/' in path:
            return '清理'
        if '/create/' in path:
            return '新增'
        if '/bulk-delete/' in path:
            return '批量删除'
        if '/bulk-read/' in path:
            return '批量已读'
        if '/mark-all-read/' in path:
            return '全部已读'
        if '/mark-paid/' in path:
            return '标记已缴费'
        if '/generate/' in path:
            return '生成'
        if '/import/upload/' in path:
            return '导入上传'
        if '/import/preview/' in path:
            return '导入预览'
        if '/import/commit/' in path:
            return '导入提交'
        return '提交'

    def extract_response_payload(self, response):
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' not in content_type:
            return None
        try:
            return json.loads(response.content.decode('utf-8'))
        except Exception:
            return None

    def resolve_target(self, request, response, payload):
        if request.path.startswith('/api/data-security/backups/') and '/download/' in request.path:
            disposition = response.headers.get('Content-Disposition', '')
            match = re.search(r'filename="?([^";]+)"?', disposition)
            if match:
                return match.group(1)

        item = payload.get('item') if isinstance(payload, dict) else None
        if isinstance(item, dict):
            for key in ('archive_number', 'file_name', 'full_name', 'project_name', 'title', 'rule_name', 'id'):
                value = item.get(key)
                if value:
                    return str(value)
        if isinstance(payload, dict):
            for key in ('source_file_name', 'safety_backup_file_name', 'message', 'backup_dir'):
                value = payload.get(key)
                if value:
                    return str(value)
        match = re.search(r'/(\d+)(?:/|$)', request.path)
        if match:
            return f'ID {match.group(1)}'
        return ''

    def resolve_summary(self, module, action, target):
        if module == '数据安全' and action == '新增':
            return f'创建数据库本地备份{f"：{target}" if target else ""}'
        if module == '数据安全' and action == '下载备份':
            return f'下载数据库备份{f"：{target}" if target else ""}'
        if module == '数据安全' and action == '恢复':
            return f'恢复数据库备份{f"：{target}" if target else ""}'
        if module == '数据安全' and action == '删除':
            return f'删除数据库备份{f"：{target}" if target else ""}'
        if module == '系统设置' and action == '清理':
            return '清理过期操作日志'
        return f'{action}{module}{f"：{target}" if target else ""}'

    def resolve_detail(self, request, payload):
        if isinstance(payload, dict) and payload.get('message'):
            return str(payload['message'])
        return request.path

    def log_request(self, request, response):
        if not self.should_track_request(request):
            return
        payload = self.extract_response_payload(response)
        module = self.resolve_module(request.path)
        action = self.resolve_action(request)
        target = self.resolve_target(request, response, payload or {})
        record_operation_log(
            module=module,
            action=action,
            summary=self.resolve_summary(module, action, target),
            operator=get_request_operator_name(request),
            target=target,
            result=OperationLog.RESULT_SUCCESS if response.status_code < 400 else OperationLog.RESULT_FAILED,
            detail=self.resolve_detail(request, payload or {}),
            ip_address=get_request_ip_address(request),
        )


class LoginRequiredMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        whitelist = ['/api/auth/', '/static/', '/media/', '/activation/', '/api/system/']
        if any(path.startswith(p) for p in whitelist) or not path.startswith('/api/'):
            return self.get_response(request)

        try:
            from .models import SystemUser
            has_users = SystemUser.objects.exists()
        except Exception:
            has_users = False

        if not has_users:
            return self.get_response(request)

        user_id = request.session.get('user_id')
        if not user_id:
            return JsonResponse({'error': '请先登录', 'code': 'LOGIN_REQUIRED'}, status=401)

        return self.get_response(request)
