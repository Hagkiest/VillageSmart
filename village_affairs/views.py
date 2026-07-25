import json
import re
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.db import OperationalError, ProgrammingError
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_GET, require_POST
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator
import json

from .models import (
    CareObject,
    CareObjectImportBatch,
    DatabaseBackupRecord,
    DisabledImportBatch,
    DisabledPerson,
    FarmlandImportBatch,
    FarmlandRecord,
    LowIncomeImportBatch,
    LowIncomeRecord,
    MediationRecord,
    MigrantWorker,
    OrganizationMember,
    PartyFeeRecord,
    PartyMember,
    PublicJobImportBatch,
    PublicJobRecord,
    ProjectImportBatch,
    ProjectRecord,
    OperationLog,
    ReminderRule,
    Resident,
    ResidentImportBatch,
    RiskCheckImportBatch,
    SubsidyImportBatch,
    SubsidyRecord,
    TodoReminder,
    VillageGroup,
    Role,
    SystemUser,
    SystemActivation,
)
import os
import signal
from .activation_service import verify_activation_code_remote
from .services import (
    SYSTEM_FIELDS,
    build_export_workbook,
    build_preview,
    calculate_age,
    cascade_update_village_group_name,
    commit_import,
    create_import_batch,
    create_resident,
    create_database_backup,
    delete_resident,
    delete_database_backup,
    clear_all_database_data,
    get_database_backup_file,
    get_request_operator_name,
    generate_error_report_workbook,
    cleanup_expired_operation_logs,
    get_population_age_structure,
    get_ui_settings_payload,
    get_resident_detail,
    get_resident_options,
    get_resident_prefill,
    list_database_backups,
    list_operation_logs,
    list_households,
    list_residents,
    restore_database_backup,
    restore_uploaded_database_backup,
    serialize_resident,
    suggest_mapping,
    update_ui_settings,
    list_migrant_workers,
    get_migrant_stats,
    get_employment_trend,
    create_migrant_worker,
    update_migrant_worker,
    delete_migrant_worker,
    get_migrant_worker_detail,
    list_risk_checks,
    create_risk_check,
    delete_risk_check,
)
from .extended_services import (
    CARE_OBJECT_SYSTEM_FIELDS,
    DISABLED_SYSTEM_FIELDS,
    FARMLAND_SYSTEM_FIELDS,
    LOW_INCOME_SYSTEM_FIELDS,
    MEDIATION_DISPUTE_TYPE_OPTIONS,
    PROJECT_SYSTEM_FIELDS,
    PUBLIC_JOB_SYSTEM_FIELDS,
    RISK_CHECK_SYSTEM_FIELDS,
    SUBSIDY_SYSTEM_FIELDS,
    build_error_report_response_batch,
    build_care_object_export_workbook,
    build_disabled_export_workbook,
    build_farmland_export_workbook,
    build_mediation_application_document,
    build_mediation_export_workbook,
    build_organization_export_workbook,
    build_party_fee_export_workbook,
    build_party_member_export_workbook,
    build_public_job_export_workbook,
    build_project_export_workbook,
    build_care_object_preview,
    build_disabled_preview,
    build_farmland_preview,
    build_low_income_export_workbook,
    build_low_income_preview,
    build_project_preview,
    build_public_job_preview,
    build_risk_check_preview,
    build_subsidy_export_workbook,
    build_subsidy_preview,
    commit_care_object_import,
    commit_disabled_import,
    commit_farmland_import,
    commit_low_income_import,
    commit_project_import,
    commit_public_job_import,
    commit_risk_check_import,
    commit_subsidy_import,
    create_care_object,
    create_disabled_person,
    create_mediation_record,
    create_organization_member,
    create_party_member,
    create_project_record,
    create_generic_import_batch,
    create_low_income_record,
    create_public_job_record,
    create_subsidy_record,
    delete_care_object,
    delete_disabled_person,
    delete_mediation_record,
    delete_organization_member,
    delete_party_member,
    delete_project_record,
    generate_party_fee_records,
    get_care_object_detail,
    get_low_income_record_detail,
    get_disabled_person_detail,
    get_mediation_record_detail,
    get_organization_member_detail,
    get_party_fee_record_detail,
    get_party_member_detail,
    get_public_job_record_detail,
    get_project_record_detail,
    get_subsidy_record_detail,
    list_care_objects,
    list_disabled_people,
    list_farmland_households,
    list_farmland_records,
    list_mediation_records,
    list_organization_members,
    list_party_fee_records,
    list_party_members,
    list_public_job_records,
    list_projects,
    update_care_object,
    update_low_income_record,
    update_disabled_person,
    update_mediation_record,
    update_organization_member,
    update_party_fee_record,
    update_party_member,
    update_public_job_record,
    update_project_record,
    update_subsidy_record,
    delete_low_income_record,
    delete_public_job_record,
    delete_subsidy_record,
    bulk_delete_todo_reminders,
    bulk_update_todo_read_status,
    create_reminder_rule,
    create_todo_reminder,
    delete_reminder_rule,
    delete_todo_reminder,
    get_reminder_rule_detail,
    get_todo_reminder_detail,
    get_todo_summary,
    list_low_income_households,
    list_low_income_records,
    list_reminder_rules,
    mark_party_fee_paid,
    mark_all_todo_read,
    list_subsidy_records,
    list_todo_reminders,
    suggest_mapping_for_fields,
    update_reminder_rule,
    update_todo_reminder,
    generate_next_mediation_archive_number,
)


def parse_json_body(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError as exc:
        raise ValueError('请求体不是合法的 JSON 数据。') from exc


PROJECT_MODULE_TABLES = (
    'village_affairs_projectrecord',
    'village_affairs_projectimportbatch',
)
PROJECT_MODULE_MIGRATE_COMMAND = r'venv\Scripts\python.exe manage.py migrate'
MEDIATION_MODULE_TABLES = ('village_affairs_mediationrecord',)
FARMLAND_MODULE_TABLES = (
    'village_affairs_farmlandrecord',
    'village_affairs_farmlandimportbatch',
)


def get_project_module_setup_error_response(exc):
    message = str(exc)
    if any(table_name in message for table_name in PROJECT_MODULE_TABLES):
        return JsonResponse(
            {
                'message': (
                    '项目综合查询的数据表尚未初始化，请先执行 '
                    f'`{PROJECT_MODULE_MIGRATE_COMMAND}` 完成数据库迁移后再重试。'
                ),
                'error_code': 'project_tables_missing',
            },
            status=503,
        )
    return None


def get_mediation_module_setup_error_response(exc):
    message = str(exc)
    if any(table_name in message for table_name in MEDIATION_MODULE_TABLES):
        return JsonResponse(
            {
                'message': (
                    '人民调解的数据表尚未初始化，请先执行 '
                    f'`{PROJECT_MODULE_MIGRATE_COMMAND}` 完成数据库迁移后再重试。'
                ),
                'error_code': 'mediation_tables_missing',
            },
            status=503,
        )
    return None


def get_farmland_module_setup_error_response(exc):
    message = str(exc)
    if any(table_name in message for table_name in FARMLAND_MODULE_TABLES):
        return JsonResponse(
            {
                'message': (
                    '耕地查询的数据表尚未初始化，请先执行 '
                    f'`{PROJECT_MODULE_MIGRATE_COMMAND}` 完成数据库迁移后再重试。'
                ),
                'error_code': 'farmland_tables_missing',
            },
            status=503,
        )
    return None


def system_status(request):
    """Return a simple status payload for deployment and LAN checks."""
    return JsonResponse(
        {
            'project': '农村村务管理系统',
            'framework': 'Django',
            'status': 'ok',
            'message': '基础框架已就绪，可继续扩展业务模块。',
        }
    )


@csrf_exempt
@require_POST
def auth_login_view(request):
    try:
        data = parse_json_body(request)
    except ValueError as exc:
        return JsonResponse({'error': str(exc)}, status=400)
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if not username or not password:
        return JsonResponse({'error': '用户名和密码不能为空'}, status=400)
    try:
        user = SystemUser.objects.get(username=username, status=True)
    except SystemUser.DoesNotExist:
        return JsonResponse({'error': '用户名或密码错误'}, status=401)
    if not user.check_password(password):
        return JsonResponse({'error': '用户名或密码错误'}, status=401)
    request.session['user_id'] = user.id
    request.session['user_name'] = user.name
    request.session['username'] = user.username
    role_info = {}
    if user.role:
        role_info = {
            'id': user.role.id,
            'name': user.role.name,
            'code': user.role.code,
            'permissions': user.role.permissions,
        }
    return JsonResponse({
        'user': {
            'id': user.id,
            'username': user.username,
            'name': user.name,
            'role': role_info,
        },
        'message': '登录成功',
    })


@require_GET
def auth_status_view(request):
    user_id = request.session.get('user_id')
    has_users = SystemUser.objects.exists()
    if not user_id:
        return JsonResponse({
            'logged_in': False,
            'has_users': has_users,
            'user': None,
        })
    try:
        user = SystemUser.objects.select_related('role').get(id=user_id, status=True)
    except SystemUser.DoesNotExist:
        request.session.flush()
        return JsonResponse({
            'logged_in': False,
            'has_users': has_users,
            'user': None,
        })
    role_info = {}
    if user.role:
        role_info = {
            'id': user.role.id,
            'name': user.role.name,
            'code': user.role.code,
            'permissions': user.role.permissions,
        }
    return JsonResponse({
        'logged_in': True,
        'has_users': has_users,
        'user': {
            'id': user.id,
            'username': user.username,
            'name': user.name,
            'role': role_info,
        },
    })


@csrf_exempt
@require_POST
def auth_logout_view(request):
    request.session.flush()
    return JsonResponse({'message': '已退出登录'})


def frontend_app(request):
    """Serve the management frontend shell."""
    frontend_index_path = Path(settings.BASE_DIR) / 'village_affairs' / 'static' / 'frontend' / 'index.html'
    script_src = '/static/frontend/assets/index.js'
    style_href = '/static/frontend/assets/index.css'
    if frontend_index_path.exists():
        html = frontend_index_path.read_text(encoding='utf-8')
        script_match = re.search(r'<script[^>]+src="([^"]+)"', html)
        style_match = re.search(r'<link[^>]+href="([^"]+)"', html)
        if script_match:
            script_src = script_match.group(1)
        if style_match:
            style_href = style_match.group(1)
    return render(
        request,
        'village_affairs/frontend_app.html',
        {
            'frontend_script_src': script_src,
            'frontend_style_href': style_href,
        },
    )


@csrf_exempt
@require_http_methods(['GET', 'PUT'])
def ui_settings_view(request):
    if request.method == 'GET':
        return JsonResponse(get_ui_settings_payload())

    try:
        payload = parse_json_body(request)
        return JsonResponse({'item': update_ui_settings(payload)})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@require_GET
def operation_log_list_view(request):
    return JsonResponse(list_operation_logs(request.GET))


@csrf_exempt
@require_POST
def operation_log_cleanup_view(request):
    try:
        payload = parse_json_body(request)
        retention_days = payload.get('retention_days') if isinstance(payload, dict) else None
        return JsonResponse(cleanup_expired_operation_logs(retention_days))
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@require_GET
def database_backup_list_view(request):
    return JsonResponse(list_database_backups())


@csrf_exempt
@require_POST
def database_backup_create_view(request):
    try:
        item = create_database_backup(get_request_operator_name(request))
        return JsonResponse({'item': item}, status=201)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@require_GET
def database_backup_download_view(request, record_id):
    try:
        item, file_path = get_database_backup_file(record_id)
    except DatabaseBackupRecord.DoesNotExist:
        return JsonResponse({'message': '备份记录不存在'}, status=404)
    except FileNotFoundError as exc:
        return JsonResponse({'message': str(exc)}, status=404)

    response = HttpResponse(file_path.read_bytes(), content_type='application/json; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{item.file_name}"'
    return response


@csrf_exempt
@require_POST
def database_backup_restore_view(request, record_id):
    try:
        payload = restore_database_backup(record_id, get_request_operator_name(request))
        return JsonResponse(payload)
    except DatabaseBackupRecord.DoesNotExist:
        return JsonResponse({'message': '备份记录不存在'}, status=404)
    except FileNotFoundError as exc:
        return JsonResponse({'message': str(exc)}, status=404)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@csrf_exempt
@require_POST
def database_backup_upload_restore_view(request):
    try:
        payload = restore_uploaded_database_backup(request.FILES.get('file'), get_request_operator_name(request))
        return JsonResponse(payload)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@csrf_exempt
@require_http_methods(['DELETE'])
def database_backup_detail_view(request, record_id):
    try:
        return JsonResponse(delete_database_backup(record_id))
    except DatabaseBackupRecord.DoesNotExist:
        return JsonResponse({'message': '备份记录不存在'}, status=404)


@csrf_exempt
@require_POST
def database_clear_all_view(request):
    """清除所有业务数据（不记录操作日志）。"""
    try:
        result = clear_all_database_data(get_request_operator_name(request))
        return JsonResponse(result)
    except Exception as exc:
        return JsonResponse({'message': str(exc)}, status=500)


@require_GET
def resident_options(request):
    return JsonResponse({'options': get_resident_options()})


@require_GET
def resident_prefill(request):
    try:
        result = get_resident_prefill(request.GET)
        return JsonResponse(result)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@csrf_exempt
@require_http_methods(['GET', 'POST'])
def resident_collection(request):
    if request.method == 'GET':
        return JsonResponse(list_residents(request.GET))

    try:
        payload = parse_json_body(request)
        resident, created = create_resident(payload)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse({'item': resident, 'created': created}, status=201 if created else 200)


@require_GET
def resident_household_summary(request):
    return JsonResponse(list_households(request.GET))


@csrf_exempt
@require_POST
def resident_import_upload(request):
    uploaded_file = request.FILES.get('file')
    if uploaded_file is None:
        return JsonResponse({'message': '请先选择要上传的 Excel 文件。'}, status=400)
    try:
        batch, headers, rows = create_import_batch(uploaded_file)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Exception as exc:  # pragma: no cover - defensive
        return JsonResponse({'message': f'Excel 解析失败：{exc}'}, status=400)

    return JsonResponse(
        {
            'batch_id': str(batch.id),
            'filename': batch.original_filename,
            'headers': headers,
            'total_rows': len(rows),
            'sample_rows': rows[:5],
            'system_fields': SYSTEM_FIELDS,
            'suggested_mapping': suggest_mapping(headers),
        }
    )


@csrf_exempt
@require_POST
def resident_import_preview(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(ResidentImportBatch, pk=payload.get('batch_id'))
        preview = build_preview(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(preview)


@csrf_exempt
@require_POST
def resident_import_commit(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(ResidentImportBatch, pk=payload.get('batch_id'))
        result = commit_import(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(result)


@require_GET
def resident_export(request):
    view = request.GET.get('view', 'detail')
    workbook = build_export_workbook(view, request.GET)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    filename = '居民按户汇总.xlsx' if view == 'household' else '居民明细.xlsx'
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@require_GET
def resident_detail(request, resident_id):
    try:
        return JsonResponse(get_resident_detail(resident_id))
    except Resident.DoesNotExist:
        return JsonResponse({'message': '居民不存在'}, status=404)


@csrf_exempt
@require_http_methods(['DELETE'])
def resident_delete(request, resident_id):
    try:
        return JsonResponse(delete_resident(resident_id))
    except Resident.DoesNotExist:
        return JsonResponse({'message': '居民不存在'}, status=404)
    except Exception as e:
        return JsonResponse({'message': f'删除失败: {str(e)}'}, status=400)

@csrf_exempt
@require_POST
def resident_bulk_delete(request):
    try:
        from django.db import connection as _conn
        # 清理可能的脏连接状态
        if _conn.connection and _conn.needs_rollback:
            _conn.rollback()
    except Exception:
        pass
    try:
        data = parse_json_body(request)
        ids = data.get('ids', [])
        success = 0
        failed = 0
        for rid in ids:
            try:
                delete_resident(rid)
                success += 1
            except Resident.DoesNotExist:
                pass
            except Exception:
                failed += 1
                # 事务失败后清理脏连接，避免影响后续操作
                try:
                    from django.db import connection as _conn
                    if _conn.connection and _conn.needs_rollback:
                        _conn.rollback()
                except Exception:
                    pass
        if failed > 0:
            return JsonResponse({'message': f'成功删除 {success} 条记录，{failed} 条删除失败'})
        return JsonResponse({'message': f'成功删除 {success} 条记录'})
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=400)


@require_GET
def resident_error_report(request, batch_id):
    batch = get_object_or_404(ResidentImportBatch, id=batch_id)
    if not batch.error_details:
        return JsonResponse({'message': '没有错误详情可下载'}, status=400)
    
    workbook = generate_error_report_workbook(batch)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    
    filename = f'错误详情_{batch.original_filename}.xlsx'
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@require_GET
def population_age_structure(request):
    return JsonResponse(get_population_age_structure())


@require_GET
def residents_by_age_group(request, age_group):
    residents = Resident.objects.filter(status='正常')
    filtered_residents = []
    
    for resident in residents:
        if resident.birth_date:
            age = calculate_age(resident.birth_date)
            if age_group == '0-14岁' and age <= 14:
                filtered_residents.append(resident)
            elif age_group == '15-18岁' and 15 <= age <= 18:
                filtered_residents.append(resident)
            elif age_group == '19-59岁' and 19 <= age <= 59:
                filtered_residents.append(resident)
            elif age_group == '60岁及以上' and age >= 60:
                filtered_residents.append(resident)
    
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 20))
    
    start = (page - 1) * page_size
    end = start + page_size
    
    items = [serialize_resident(r, i + start) for i, r in enumerate(filtered_residents[start:end])]
    
    return JsonResponse({
        'items': items,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': len(filtered_residents),
            'total_pages': (len(filtered_residents) + page_size - 1) // page_size,
        }
    })


@require_GET
def migrant_workers_list(request):
    return JsonResponse(list_migrant_workers(request.GET))


@require_GET
def migrant_stats(request):
    village_group = request.GET.get('village_group')
    return JsonResponse(get_migrant_stats(village_group))


@require_GET
def employment_trend(request):
    view_mode = request.GET.get('view_mode', 'month')
    return JsonResponse({'data': get_employment_trend(view_mode), 'view_mode': view_mode})


@csrf_exempt
@require_POST
def migrant_worker_create(request):
    try:
        data = parse_json_body(request)
        resident_id = data.get('resident_id')
        if not resident_id:
            return JsonResponse({'message': '缺少resident_id'}, status=400)
        worker = create_migrant_worker(resident_id, data)
        return JsonResponse({'item': worker}, status=201)
    except Resident.DoesNotExist:
            return JsonResponse({'message': '居民不存在'}, status=404)
    except ValueError as e:
        return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
@require_POST
def migrant_worker_bulk_delete(request):
    try:
        data = parse_json_body(request)
        ids = data.get('ids', [])
        deleted_count = 0
        for worker_id in ids:
            try:
                delete_migrant_worker(worker_id)
                deleted_count += 1
            except MigrantWorker.DoesNotExist:
                continue
        return JsonResponse({'message': f'成功删除 {deleted_count} 条记录'})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@require_GET
def list_risk_checks_view(request):
    return JsonResponse(list_risk_checks(request.GET))

@csrf_exempt
@require_POST
def risk_check_create_view(request):
    try:
        data = parse_json_body(request)
        risk = create_risk_check(data)
        return JsonResponse({'item': risk}, status=201)
    except ValueError as e:
        return JsonResponse({'message': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=400)

@csrf_exempt
@require_http_methods(['DELETE'])
def risk_check_delete_view(request, risk_id):
    try:
        return JsonResponse(delete_risk_check(risk_id))
    except Exception as e:
        return JsonResponse({'message': '记录不存在或删除失败'}, status=404)


@csrf_exempt
@require_POST
def risk_check_bulk_delete(request):
    try:
        data = parse_json_body(request)
        ids = data.get('ids', [])
        deleted_count = 0
        for risk_id in ids:
            try:
                delete_risk_check(risk_id)
                deleted_count += 1
            except Exception:
                continue
        return JsonResponse({'message': f'成功删除 {deleted_count} 条记录'})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)

@csrf_exempt
@require_POST
def risk_check_import_upload_view(request):
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return JsonResponse({'message': '请选择文件'}, status=400)
    try:
        batch, headers, rows = create_generic_import_batch(RiskCheckImportBatch, uploaded_file)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({'message': f'Excel 解析失败：{exc}'}, status=400)

    return JsonResponse(
        {
            'batch_id': str(batch.id),
            'filename': batch.original_filename,
            'headers': headers,
            'total_rows': len(rows),
            'sample_rows': rows[:5],
            'system_fields': RISK_CHECK_SYSTEM_FIELDS,
            'suggested_mapping': suggest_mapping_for_fields(headers, RISK_CHECK_SYSTEM_FIELDS),
        }
    )


@csrf_exempt
@require_POST
def risk_check_import_preview_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(RiskCheckImportBatch, pk=payload.get('batch_id'))
        preview = build_risk_check_preview(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(preview)


@csrf_exempt
@require_POST
def risk_check_import_commit_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(RiskCheckImportBatch, pk=payload.get('batch_id'))
        result = commit_risk_check_import(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(result)


@require_GET
def risk_check_error_report_view(request, batch_id):
    batch = get_object_or_404(RiskCheckImportBatch, pk=batch_id)
    if not batch.error_details:
        return JsonResponse({'message': '没有错误详情可下载'}, status=400)
    workbook = build_error_report_response_batch(batch)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="风险排查错误详情_{batch.original_filename}.xlsx"'
    return response


@require_GET
def disabled_list_view(request):
    return JsonResponse(list_disabled_people(request.GET))


@csrf_exempt
@require_POST
def disabled_create_view(request):
    try:
        payload = parse_json_body(request)
        item = create_disabled_person(payload)
        return JsonResponse({'item': item}, status=201)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Resident.DoesNotExist:
        return JsonResponse({'message': '居民不存在'}, status=404)


@require_GET
def disabled_export_view(request):
    workbook = build_disabled_export_workbook(request.GET)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="残疾人明细.xlsx"'
    return response


@csrf_exempt
@require_POST
def disabled_import_upload_view(request):
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return JsonResponse({'message': '请选择文件'}, status=400)
    try:
        batch, headers, rows = create_generic_import_batch(DisabledImportBatch, uploaded_file)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({'message': f'Excel 解析失败：{exc}'}, status=400)

    return JsonResponse(
        {
            'batch_id': str(batch.id),
            'filename': batch.original_filename,
            'headers': headers,
            'total_rows': len(rows),
            'sample_rows': rows[:5],
            'system_fields': DISABLED_SYSTEM_FIELDS,
            'suggested_mapping': suggest_mapping_for_fields(headers, DISABLED_SYSTEM_FIELDS),
        }
    )


@csrf_exempt
@require_POST
def disabled_import_preview_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(DisabledImportBatch, pk=payload.get('batch_id'))
        preview = build_disabled_preview(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(preview)


@csrf_exempt
@require_POST
def disabled_import_commit_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(DisabledImportBatch, pk=payload.get('batch_id'))
        result = commit_disabled_import(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(result)


@require_GET
def disabled_error_report_view(request, batch_id):
    batch = get_object_or_404(DisabledImportBatch, pk=batch_id)
    if not batch.error_details:
        return JsonResponse({'message': '没有错误详情可下载'}, status=400)
    workbook = build_error_report_response_batch(batch)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="残疾人错误详情_{batch.original_filename}.xlsx"'
    return response


@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def disabled_detail_view(request, record_id):
    if request.method == 'GET':
        try:
            return JsonResponse(get_disabled_person_detail(record_id))
        except DisabledPerson.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
    if request.method == 'PUT':
        try:
            payload = parse_json_body(request)
            item = update_disabled_person(record_id, payload)
            return JsonResponse({'item': item})
        except DisabledPerson.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
        except Resident.DoesNotExist:
            return JsonResponse({'message': '居民不存在'}, status=404)
        except ValueError as exc:
            return JsonResponse({'message': str(exc)}, status=400)
    try:
        return JsonResponse(delete_disabled_person(record_id))
    except DisabledPerson.DoesNotExist:
        return JsonResponse({'message': '记录不存在'}, status=404)


@csrf_exempt
@require_POST
def disabled_bulk_delete_view(request):
    try:
        data = parse_json_body(request)
        ids = data.get('ids', [])
        deleted_count = 0
        for record_id in ids:
            try:
                delete_disabled_person(record_id)
                deleted_count += 1
            except DisabledPerson.DoesNotExist:
                continue
        return JsonResponse({'message': f'成功删除 {deleted_count} 条记录'})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@require_GET
def organization_member_list_view(request):
    return JsonResponse(list_organization_members(request.GET))


@csrf_exempt
@require_POST
def organization_member_create_view(request):
    try:
        payload = parse_json_body(request)
        item = create_organization_member(payload)
        return JsonResponse({'item': item}, status=201)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Resident.DoesNotExist:
        return JsonResponse({'message': '居民不存在'}, status=404)


@require_GET
def organization_member_export_view(request):
    workbook = build_organization_export_workbook(request.GET)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="组织架构成员.xlsx"'
    return response


@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def organization_member_detail_view(request, record_id):
    if request.method == 'GET':
        try:
            return JsonResponse(get_organization_member_detail(record_id))
        except OrganizationMember.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
    if request.method == 'PUT':
        try:
            payload = parse_json_body(request)
            item = update_organization_member(record_id, payload)
            return JsonResponse({'item': item})
        except OrganizationMember.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
        except Resident.DoesNotExist:
            return JsonResponse({'message': '居民不存在'}, status=404)
        except ValueError as exc:
            return JsonResponse({'message': str(exc)}, status=400)
    try:
        return JsonResponse(delete_organization_member(record_id))
    except OrganizationMember.DoesNotExist:
        return JsonResponse({'message': '记录不存在'}, status=404)


@csrf_exempt
@require_POST
def organization_member_bulk_delete_view(request):
    try:
        data = parse_json_body(request)
        ids = data.get('ids', [])
        deleted_count = 0
        for record_id in ids:
            try:
                delete_organization_member(record_id)
                deleted_count += 1
            except OrganizationMember.DoesNotExist:
                continue
        return JsonResponse({'message': f'成功删除 {deleted_count} 条记录'})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@require_GET
def party_member_list_view(request):
    return JsonResponse(list_party_members(request.GET))


@csrf_exempt
@require_POST
def party_member_create_view(request):
    try:
        payload = parse_json_body(request)
        item, created = create_party_member(payload)
        return JsonResponse({'item': item, 'created': created}, status=201 if created else 200)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Resident.DoesNotExist:
        return JsonResponse({'message': '居民不存在'}, status=404)


@require_GET
def party_member_export_view(request):
    workbook = build_party_member_export_workbook(request.GET)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="党员名册.xlsx"'
    return response


@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def party_member_detail_view(request, record_id):
    if request.method == 'GET':
        try:
            return JsonResponse(get_party_member_detail(record_id))
        except PartyMember.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
    if request.method == 'PUT':
        try:
            payload = parse_json_body(request)
            item = update_party_member(record_id, payload)
            return JsonResponse({'item': item})
        except PartyMember.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
        except Resident.DoesNotExist:
            return JsonResponse({'message': '居民不存在'}, status=404)
        except ValueError as exc:
            return JsonResponse({'message': str(exc)}, status=400)
    try:
        return JsonResponse(delete_party_member(record_id))
    except PartyMember.DoesNotExist:
        return JsonResponse({'message': '记录不存在'}, status=404)


@csrf_exempt
@require_POST
def party_member_bulk_delete_view(request):
    try:
        data = parse_json_body(request)
        ids = data.get('ids', [])
        deleted_count = 0
        for record_id in ids:
            try:
                delete_party_member(record_id)
                deleted_count += 1
            except PartyMember.DoesNotExist:
                continue
        return JsonResponse({'message': f'成功删除 {deleted_count} 条记录'})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@require_GET
def public_job_list_view(request):
    return JsonResponse(list_public_job_records(request.GET))


@csrf_exempt
@require_POST
def public_job_create_view(request):
    try:
        payload = parse_json_body(request)
        item = create_public_job_record(payload)
        return JsonResponse({'item': item}, status=201)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Resident.DoesNotExist:
        return JsonResponse({'message': '居民不存在'}, status=404)


@require_GET
def public_job_export_view(request):
    workbook = build_public_job_export_workbook(request.GET)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="公益性岗位台账.xlsx"'
    return response


@csrf_exempt
@require_POST
def public_job_import_upload_view(request):
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return JsonResponse({'message': '请选择文件'}, status=400)
    try:
        batch, headers, rows = create_generic_import_batch(PublicJobImportBatch, uploaded_file)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({'message': f'Excel 解析失败：{exc}'}, status=400)

    return JsonResponse(
        {
            'batch_id': str(batch.id),
            'filename': batch.original_filename,
            'headers': headers,
            'total_rows': len(rows),
            'sample_rows': rows[:5],
            'system_fields': PUBLIC_JOB_SYSTEM_FIELDS,
            'suggested_mapping': suggest_mapping_for_fields(headers, PUBLIC_JOB_SYSTEM_FIELDS),
        }
    )


@csrf_exempt
@require_POST
def public_job_import_preview_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(PublicJobImportBatch, pk=payload.get('batch_id'))
        preview = build_public_job_preview(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(preview)


@csrf_exempt
@require_POST
def public_job_import_commit_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(PublicJobImportBatch, pk=payload.get('batch_id'))
        result = commit_public_job_import(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(result)


@require_GET
def public_job_error_report_view(request, batch_id):
    batch = get_object_or_404(PublicJobImportBatch, pk=batch_id)
    if not batch.error_details:
        return JsonResponse({'message': '没有错误详情可下载'}, status=400)
    workbook = build_error_report_response_batch(batch)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="公益性岗位错误详情_{batch.original_filename}.xlsx"'
    return response


@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def public_job_detail_view(request, record_id):
    if request.method == 'GET':
        try:
            return JsonResponse(get_public_job_record_detail(record_id))
        except PublicJobRecord.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
    if request.method == 'PUT':
        try:
            payload = parse_json_body(request)
            item = update_public_job_record(record_id, payload)
            return JsonResponse({'item': item})
        except PublicJobRecord.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
        except Resident.DoesNotExist:
            return JsonResponse({'message': '居民不存在'}, status=404)
        except ValueError as exc:
            return JsonResponse({'message': str(exc)}, status=400)
    try:
        return JsonResponse(delete_public_job_record(record_id))
    except PublicJobRecord.DoesNotExist:
        return JsonResponse({'message': '记录不存在'}, status=404)


@require_GET
def care_object_list_view(request):
    return JsonResponse(list_care_objects(request.GET))


@csrf_exempt
@require_POST
def care_object_create_view(request):
    try:
        payload = parse_json_body(request)
        item = create_care_object(payload)
        return JsonResponse({'item': item}, status=201)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Resident.DoesNotExist:
        return JsonResponse({'message': '居民不存在'}, status=404)


@require_GET
def care_object_export_view(request):
    workbook = build_care_object_export_workbook(request.GET)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="关爱对象台账.xlsx"'
    return response


@csrf_exempt
@require_POST
def care_object_import_upload_view(request):
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return JsonResponse({'message': '请选择文件'}, status=400)
    try:
        batch, headers, rows = create_generic_import_batch(CareObjectImportBatch, uploaded_file)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({'message': f'Excel 解析失败：{exc}'}, status=400)

    return JsonResponse(
        {
            'batch_id': str(batch.id),
            'filename': batch.original_filename,
            'headers': headers,
            'total_rows': len(rows),
            'sample_rows': rows[:5],
            'system_fields': CARE_OBJECT_SYSTEM_FIELDS,
            'suggested_mapping': suggest_mapping_for_fields(headers, CARE_OBJECT_SYSTEM_FIELDS),
        }
    )


@csrf_exempt
@require_POST
def care_object_import_preview_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(CareObjectImportBatch, pk=payload.get('batch_id'))
        preview = build_care_object_preview(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(preview)


@csrf_exempt
@require_POST
def care_object_import_commit_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(CareObjectImportBatch, pk=payload.get('batch_id'))
        result = commit_care_object_import(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(result)


@require_GET
def care_object_error_report_view(request, batch_id):
    batch = get_object_or_404(CareObjectImportBatch, pk=batch_id)
    if not batch.error_details:
        return JsonResponse({'message': '没有错误详情可下载'}, status=400)
    workbook = build_error_report_response_batch(batch)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="关爱对象错误详情_{batch.original_filename}.xlsx"'
    return response


@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def care_object_detail_view(request, record_id):
    if request.method == 'GET':
        try:
            return JsonResponse(get_care_object_detail(record_id))
        except CareObject.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
    if request.method == 'PUT':
        try:
            payload = parse_json_body(request)
            item = update_care_object(record_id, payload)
            return JsonResponse({'item': item})
        except CareObject.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
        except Resident.DoesNotExist:
            return JsonResponse({'message': '居民不存在'}, status=404)
        except ValueError as exc:
            return JsonResponse({'message': str(exc)}, status=400)
    try:
        return JsonResponse(delete_care_object(record_id))
    except CareObject.DoesNotExist:
        return JsonResponse({'message': '记录不存在'}, status=404)


@csrf_exempt
@require_POST
def care_object_bulk_delete_view(request):
    try:
        data = parse_json_body(request)
        ids = data.get('ids', [])
        deleted_count = 0
        for record_id in ids:
            try:
                delete_care_object(record_id)
                deleted_count += 1
            except CareObject.DoesNotExist:
                continue
        return JsonResponse({'message': f'成功删除 {deleted_count} 条记录'})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@require_GET
def mediation_next_archive_number_view(request):
    try:
        return JsonResponse(
            {
                'archive_number': generate_next_mediation_archive_number(),
                'dispute_types': MEDIATION_DISPUTE_TYPE_OPTIONS,
                'statuses': [choice[0] for choice in MediationRecord.STATUS_CHOICES],
            }
        )
    except (ProgrammingError, OperationalError) as exc:
        response = get_mediation_module_setup_error_response(exc)
        if response:
            return response
        raise


@require_GET
def mediation_list_view(request):
    try:
        return JsonResponse(list_mediation_records(request.GET))
    except (ProgrammingError, OperationalError) as exc:
        response = get_mediation_module_setup_error_response(exc)
        if response:
            return response
        raise


@csrf_exempt
@require_POST
def mediation_create_view(request):
    try:
        payload = parse_json_body(request)
        item = create_mediation_record(payload)
        return JsonResponse({'item': item}, status=201)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except (ProgrammingError, OperationalError) as exc:
        response = get_mediation_module_setup_error_response(exc)
        if response:
            return response
        raise


@require_GET
def mediation_trend_view(request):
    """返回当前年度调解纠纷趋势数据（按月统计）。"""
    from django.db.models import Count
    from django.db.models.functions import TruncMonth
    import datetime as _dt

    current_year = _dt.date.today().year
    try:
        qs = (
            MediationRecord.objects
            .filter(created_at__year=current_year)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        month_map = {i: 0 for i in range(1, 13)}
        for row in qs:
            month_map[row['month'].month] = row['count']
        result = [
            {'name': f'{m}月', 'value': month_map[m]} for m in range(1, 13)
        ]
        return JsonResponse(result, safe=False)
    except Exception:
        return JsonResponse(
            [{'name': f'{m}月', 'value': 0} for m in range(1, 13)],
            safe=False,
        )


@require_GET
def mediation_export_view(request):
    try:
        workbook = build_mediation_export_workbook(request.GET)
        output = BytesIO()
        workbook.save(output)
        output.seek(0)
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="人民调解台账.xlsx"'
        return response
    except (ProgrammingError, OperationalError) as exc:
        response = get_mediation_module_setup_error_response(exc)
        if response:
            return response
        raise


@require_GET
def mediation_application_document_view(request, record_id):
    try:
        record = get_object_or_404(MediationRecord, pk=record_id)
        document = build_mediation_application_document(record)
        output = BytesIO()
        document.save(output)
        output.seek(0)
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        response['Content-Disposition'] = f'attachment; filename="人民调解申请书_{record.archive_number}.docx"'
        return response
    except (ProgrammingError, OperationalError) as exc:
        response = get_mediation_module_setup_error_response(exc)
        if response:
            return response
        raise


@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def mediation_detail_view(request, record_id):
    try:
        if request.method == 'GET':
            try:
                return JsonResponse(get_mediation_record_detail(record_id))
            except MediationRecord.DoesNotExist:
                return JsonResponse({'message': '记录不存在'}, status=404)
        if request.method == 'PUT':
            try:
                payload = parse_json_body(request)
                item = update_mediation_record(record_id, payload)
                return JsonResponse({'item': item})
            except MediationRecord.DoesNotExist:
                return JsonResponse({'message': '记录不存在'}, status=404)
            except ValueError as exc:
                return JsonResponse({'message': str(exc)}, status=400)
        try:
            return JsonResponse(delete_mediation_record(record_id))
        except MediationRecord.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
    except (ProgrammingError, OperationalError) as exc:
        response = get_mediation_module_setup_error_response(exc)
        if response:
            return response
        raise


@require_GET
def party_fee_list_view(request):
    return JsonResponse(list_party_fee_records(request.GET))


@csrf_exempt
@require_POST
def party_fee_generate_view(request):
    try:
        payload = parse_json_body(request)
        return JsonResponse(generate_party_fee_records(payload))
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@require_GET
def party_fee_export_view(request):
    workbook = build_party_fee_export_workbook(request.GET)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="党费缴纳.xlsx"'
    return response


@csrf_exempt
@require_http_methods(['GET', 'PUT'])
def party_fee_detail_view(request, record_id):
    if request.method == 'GET':
        try:
            return JsonResponse(get_party_fee_record_detail(record_id))
        except PartyFeeRecord.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
    try:
        payload = parse_json_body(request)
        item = update_party_fee_record(record_id, payload)
        return JsonResponse({'item': item})
    except PartyFeeRecord.DoesNotExist:
        return JsonResponse({'message': '记录不存在'}, status=404)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@csrf_exempt
@require_POST
def party_fee_mark_paid_view(request, record_id):
    try:
        item = mark_party_fee_paid(record_id)
        return JsonResponse({'item': item})
    except PartyFeeRecord.DoesNotExist:
        return JsonResponse({'message': '记录不存在'}, status=404)


@require_GET
def todo_list_view(request):
    return JsonResponse(list_todo_reminders(request.GET))


@require_GET
def todo_summary_view(request):
    return JsonResponse(get_todo_summary())


@csrf_exempt
@require_POST
def todo_create_view(request):
    try:
        payload = parse_json_body(request)
        item = create_todo_reminder(payload)
        return JsonResponse({'item': item}, status=201)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def todo_detail_view(request, record_id):
    if request.method == 'GET':
        try:
            return JsonResponse(get_todo_reminder_detail(record_id))
        except TodoReminder.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
    if request.method == 'PUT':
        try:
            payload = parse_json_body(request)
            item = update_todo_reminder(record_id, payload)
            return JsonResponse({'item': item})
        except TodoReminder.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
        except ValueError as exc:
            return JsonResponse({'message': str(exc)}, status=400)
    try:
        return JsonResponse(delete_todo_reminder(record_id))
    except TodoReminder.DoesNotExist:
        return JsonResponse({'message': '记录不存在'}, status=404)


@csrf_exempt
@require_POST
def todo_bulk_delete_view(request):
    try:
        payload = parse_json_body(request)
        return JsonResponse(bulk_delete_todo_reminders(payload.get('ids') or []))
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@csrf_exempt
@require_POST
def todo_bulk_read_view(request):
    try:
        payload = parse_json_body(request)
        ids = payload.get('ids') or []
        is_read = bool(payload.get('is_read'))
        return JsonResponse(bulk_update_todo_read_status(ids, is_read))
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@csrf_exempt
@require_POST
def todo_mark_all_read_view(request):
    try:
        payload = parse_json_body(request)
        return JsonResponse(mark_all_todo_read(payload))
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@require_GET
def reminder_rule_list_view(request):
    return JsonResponse(list_reminder_rules())


@csrf_exempt
@require_POST
def reminder_rule_create_view(request):
    try:
        payload = parse_json_body(request)
        item = create_reminder_rule(payload)
        return JsonResponse({'item': item}, status=201)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def reminder_rule_detail_view(request, record_id):
    if request.method == 'GET':
        try:
            return JsonResponse(get_reminder_rule_detail(record_id))
        except ReminderRule.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
    if request.method == 'PUT':
        try:
            payload = parse_json_body(request)
            item = update_reminder_rule(record_id, payload)
            return JsonResponse({'item': item})
        except ReminderRule.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
        except ValueError as exc:
            return JsonResponse({'message': str(exc)}, status=400)
    try:
        return JsonResponse(delete_reminder_rule(record_id))
    except ReminderRule.DoesNotExist:
        return JsonResponse({'message': '记录不存在'}, status=404)


@require_GET
def subsidy_list_view(request):
    return JsonResponse(list_subsidy_records(request.GET))


@csrf_exempt
@require_POST
def subsidy_create_view(request):
    try:
        payload = parse_json_body(request)
        item = create_subsidy_record(payload)
        return JsonResponse({'item': item}, status=201)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Resident.DoesNotExist:
        return JsonResponse({'message': '居民不存在'}, status=404)


@require_GET
def subsidy_export_view(request):
    workbook = build_subsidy_export_workbook(request.GET)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="政策性补贴台账.xlsx"'
    return response


@csrf_exempt
@require_POST
def subsidy_import_upload_view(request):
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return JsonResponse({'message': '请选择文件'}, status=400)
    try:
        batch, headers, rows = create_generic_import_batch(SubsidyImportBatch, uploaded_file)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({'message': f'Excel 解析失败：{exc}'}, status=400)

    return JsonResponse(
        {
            'batch_id': str(batch.id),
            'filename': batch.original_filename,
            'headers': headers,
            'total_rows': len(rows),
            'sample_rows': rows[:5],
            'system_fields': SUBSIDY_SYSTEM_FIELDS,
            'suggested_mapping': suggest_mapping_for_fields(headers, SUBSIDY_SYSTEM_FIELDS),
        }
    )


@csrf_exempt
@require_POST
def subsidy_import_preview_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(SubsidyImportBatch, pk=payload.get('batch_id'))
        preview = build_subsidy_preview(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(preview)


@csrf_exempt
@require_POST
def subsidy_import_commit_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(SubsidyImportBatch, pk=payload.get('batch_id'))
        result = commit_subsidy_import(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(result)


@require_GET
def subsidy_error_report_view(request, batch_id):
    batch = get_object_or_404(SubsidyImportBatch, pk=batch_id)
    if not batch.error_details:
        return JsonResponse({'message': '没有错误详情可下载'}, status=400)
    workbook = build_error_report_response_batch(batch)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="政策性补贴错误详情_{batch.original_filename}.xlsx"'
    return response


@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def subsidy_detail_view(request, record_id):
    if request.method == 'GET':
        try:
            return JsonResponse(get_subsidy_record_detail(record_id))
        except SubsidyRecord.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
    if request.method == 'PUT':
        try:
            payload = parse_json_body(request)
            item = update_subsidy_record(record_id, payload)
            return JsonResponse({'item': item})
        except SubsidyRecord.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
        except Resident.DoesNotExist:
            return JsonResponse({'message': '居民不存在'}, status=404)
        except ValueError as exc:
            return JsonResponse({'message': str(exc)}, status=400)
    try:
        return JsonResponse(delete_subsidy_record(record_id))
    except SubsidyRecord.DoesNotExist:
        return JsonResponse({'message': '记录不存在'}, status=404)


@csrf_exempt
@require_POST
def subsidy_bulk_delete_view(request):
    try:
        data = parse_json_body(request)
        ids = data.get('ids', [])
        deleted_count = 0
        for record_id in ids:
            try:
                delete_subsidy_record(record_id)
                deleted_count += 1
            except SubsidyRecord.DoesNotExist:
                continue
        return JsonResponse({'message': f'成功删除 {deleted_count} 条记录'})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)


@require_GET
def project_list_view(request):
    try:
        return JsonResponse(list_projects(request.GET))
    except (ProgrammingError, OperationalError) as exc:
        response = get_project_module_setup_error_response(exc)
        if response:
            return response
        raise


@csrf_exempt
@require_POST
def project_create_view(request):
    try:
        payload = parse_json_body(request)
        item = create_project_record(payload)
        return JsonResponse({'item': item}, status=201)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except (ProgrammingError, OperationalError) as exc:
        response = get_project_module_setup_error_response(exc)
        if response:
            return response
        raise


@require_GET
def project_export_view(request):
    try:
        workbook = build_project_export_workbook(request.GET)
        output = BytesIO()
        workbook.save(output)
        output.seek(0)
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="项目综合查询.xlsx"'
        return response
    except (ProgrammingError, OperationalError) as exc:
        response = get_project_module_setup_error_response(exc)
        if response:
            return response
        raise


@csrf_exempt
@require_POST
def project_import_upload_view(request):
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return JsonResponse({'message': '请选择文件'}, status=400)
    try:
        batch, headers, rows = create_generic_import_batch(ProjectImportBatch, uploaded_file)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except (ProgrammingError, OperationalError) as exc:
        response = get_project_module_setup_error_response(exc)
        if response:
            return response
        raise
    except Exception as exc:
        return JsonResponse({'message': f'Excel 解析失败：{exc}'}, status=400)

    return JsonResponse(
        {
            'batch_id': str(batch.id),
            'filename': batch.original_filename,
            'headers': headers,
            'total_rows': len(rows),
            'sample_rows': rows[:5],
            'system_fields': PROJECT_SYSTEM_FIELDS,
            'suggested_mapping': suggest_mapping_for_fields(headers, PROJECT_SYSTEM_FIELDS),
        }
    )


@csrf_exempt
@require_POST
def project_import_preview_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(ProjectImportBatch, pk=payload.get('batch_id'))
        preview = build_project_preview(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except (ProgrammingError, OperationalError) as exc:
        response = get_project_module_setup_error_response(exc)
        if response:
            return response
        raise
    return JsonResponse(preview)


@csrf_exempt
@require_POST
def project_import_commit_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(ProjectImportBatch, pk=payload.get('batch_id'))
        result = commit_project_import(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except (ProgrammingError, OperationalError) as exc:
        response = get_project_module_setup_error_response(exc)
        if response:
            return response
        raise
    return JsonResponse(result)


@require_GET
def project_error_report_view(request, batch_id):
    try:
        batch = get_object_or_404(ProjectImportBatch, pk=batch_id)
        if not batch.error_details:
            return JsonResponse({'message': '没有错误详情可下载'}, status=400)
        workbook = build_error_report_response_batch(batch)
        output = BytesIO()
        workbook.save(output)
        output.seek(0)
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="项目台账错误详情_{batch.original_filename}.xlsx"'
        return response
    except (ProgrammingError, OperationalError) as exc:
        response = get_project_module_setup_error_response(exc)
        if response:
            return response
        raise


@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def project_detail_view(request, record_id):
    try:
        if request.method == 'GET':
            try:
                return JsonResponse(get_project_record_detail(record_id))
            except ProjectRecord.DoesNotExist:
                return JsonResponse({'message': '记录不存在'}, status=404)
        if request.method == 'PUT':
            try:
                payload = parse_json_body(request)
                item = update_project_record(record_id, payload)
                return JsonResponse({'item': item})
            except ProjectRecord.DoesNotExist:
                return JsonResponse({'message': '记录不存在'}, status=404)
            except ValueError as exc:
                return JsonResponse({'message': str(exc)}, status=400)
        try:
            return JsonResponse(delete_project_record(record_id))
        except ProjectRecord.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
    except (ProgrammingError, OperationalError) as exc:
        response = get_project_module_setup_error_response(exc)
        if response:
            return response
        raise


@require_GET
def farmland_list_view(request):
    try:
        return JsonResponse(list_farmland_records(request.GET))
    except (ProgrammingError, OperationalError) as exc:
        response = get_farmland_module_setup_error_response(exc)
        if response:
            return response
        raise


@require_GET
def farmland_household_view(request):
    try:
        return JsonResponse(list_farmland_households(request.GET))
    except (ProgrammingError, OperationalError) as exc:
        response = get_farmland_module_setup_error_response(exc)
        if response:
            return response
        raise


@require_GET
def farmland_export_view(request):
    view = request.GET.get('view', 'detail')
    try:
        workbook = build_farmland_export_workbook(view, request.GET)
    except (ProgrammingError, OperationalError) as exc:
        response = get_farmland_module_setup_error_response(exc)
        if response:
            return response
        raise
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    filename = '耕地按户汇总.xlsx' if view == 'summary' else '耕地明细.xlsx'
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@csrf_exempt
@require_POST
def farmland_import_upload_view(request):
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return JsonResponse({'message': '请选择文件'}, status=400)
    try:
        batch, headers, rows = create_generic_import_batch(FarmlandImportBatch, uploaded_file)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except (ProgrammingError, OperationalError) as exc:
        response = get_farmland_module_setup_error_response(exc)
        if response:
            return response
        raise
    except Exception as exc:
        return JsonResponse({'message': f'Excel 解析失败：{exc}'}, status=400)

    return JsonResponse(
        {
            'batch_id': str(batch.id),
            'filename': batch.original_filename,
            'headers': headers,
            'total_rows': len(rows),
            'sample_rows': rows[:5],
            'system_fields': FARMLAND_SYSTEM_FIELDS,
            'suggested_mapping': suggest_mapping_for_fields(headers, FARMLAND_SYSTEM_FIELDS),
        }
    )


@csrf_exempt
@require_POST
def farmland_import_preview_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(FarmlandImportBatch, pk=payload.get('batch_id'))
        preview = build_farmland_preview(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except (ProgrammingError, OperationalError) as exc:
        response = get_farmland_module_setup_error_response(exc)
        if response:
            return response
        raise
    return JsonResponse(preview)


@csrf_exempt
@require_POST
def farmland_import_commit_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(FarmlandImportBatch, pk=payload.get('batch_id'))
        result = commit_farmland_import(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except (ProgrammingError, OperationalError) as exc:
        response = get_farmland_module_setup_error_response(exc)
        if response:
            return response
        raise
    return JsonResponse(result)


@require_GET
def farmland_error_report_view(request, batch_id):
    try:
        batch = get_object_or_404(FarmlandImportBatch, pk=batch_id)
        if not batch.error_details:
            return JsonResponse({'message': '没有错误详情可下载'}, status=400)
        workbook = build_error_report_response_batch(batch)
    except (ProgrammingError, OperationalError) as exc:
        response = get_farmland_module_setup_error_response(exc)
        if response:
            return response
        raise
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="耕地导入错误详情_{batch.original_filename}.xlsx"'
    return response


@require_GET
def low_income_list_view(request):
    return JsonResponse(list_low_income_records(request.GET))


@require_GET
def low_income_household_view(request):
    return JsonResponse(list_low_income_households(request.GET))


@csrf_exempt
@require_POST
def low_income_create_view(request):
    try:
        payload = parse_json_body(request)
        item = create_low_income_record(payload)
        return JsonResponse({'item': item}, status=201)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Resident.DoesNotExist:
        return JsonResponse({'message': '居民不存在'}, status=404)


@require_GET
def low_income_export_view(request):
    view = request.GET.get('view', 'detail')
    workbook = build_low_income_export_workbook(view, request.GET)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    filename = '低收入按户汇总.xlsx' if view == 'household' else '低收入人员明细.xlsx'
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@csrf_exempt
@require_POST
def low_income_import_upload_view(request):
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return JsonResponse({'message': '请选择文件'}, status=400)
    try:
        batch, headers, rows = create_generic_import_batch(LowIncomeImportBatch, uploaded_file)
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({'message': f'Excel 解析失败：{exc}'}, status=400)

    return JsonResponse(
        {
            'batch_id': str(batch.id),
            'filename': batch.original_filename,
            'headers': headers,
            'total_rows': len(rows),
            'sample_rows': rows[:5],
            'system_fields': LOW_INCOME_SYSTEM_FIELDS,
            'suggested_mapping': suggest_mapping_for_fields(headers, LOW_INCOME_SYSTEM_FIELDS),
        }
    )


@csrf_exempt
@require_POST
def low_income_import_preview_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(LowIncomeImportBatch, pk=payload.get('batch_id'))
        preview = build_low_income_preview(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(preview)


@csrf_exempt
@require_POST
def low_income_import_commit_view(request):
    try:
        payload = parse_json_body(request)
        batch = get_object_or_404(LowIncomeImportBatch, pk=payload.get('batch_id'))
        result = commit_low_income_import(batch, payload.get('mapping') or {})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)
    return JsonResponse(result)


@require_GET
def low_income_error_report_view(request, batch_id):
    batch = get_object_or_404(LowIncomeImportBatch, pk=batch_id)
    if not batch.error_details:
        return JsonResponse({'message': '没有错误详情可下载'}, status=400)
    workbook = build_error_report_response_batch(batch)
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="低收入错误详情_{batch.original_filename}.xlsx"'
    return response

@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def low_income_detail_view(request, record_id):
    if request.method == 'GET':
        try:
            return JsonResponse(get_low_income_record_detail(record_id))
        except LowIncomeRecord.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
    elif request.method == 'PUT':
        try:
            data = parse_json_body(request)
            item = update_low_income_record(record_id, data)
            return JsonResponse({'item': item})
        except LowIncomeRecord.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)
        except ValueError as e:
            return JsonResponse({'message': str(e)}, status=400)
    elif request.method == 'DELETE':
        try:
            return JsonResponse(delete_low_income_record(record_id))
        except LowIncomeRecord.DoesNotExist:
            return JsonResponse({'message': '记录不存在'}, status=404)


@csrf_exempt
@require_POST
def low_income_bulk_delete_view(request):
    try:
        data = parse_json_body(request)
        ids = data.get('ids', [])
        deleted_count = 0
        for record_id in ids:
            try:
                delete_low_income_record(record_id)
                deleted_count += 1
            except LowIncomeRecord.DoesNotExist:
                continue
        return JsonResponse({'message': f'成功删除 {deleted_count} 条记录'})
    except ValueError as exc:
        return JsonResponse({'message': str(exc)}, status=400)

@csrf_exempt
@require_http_methods(['GET', 'PUT', 'DELETE'])
def migrant_worker_detail(request, worker_id):
    if request.method == 'GET':
        try:
            return JsonResponse(get_migrant_worker_detail(worker_id))
        except MigrantWorker.DoesNotExist:
            return JsonResponse({'message': '务工信息不存在'}, status=404)
    elif request.method == 'PUT':
        try:
            data = parse_json_body(request)
            worker = update_migrant_worker(worker_id, data)
            return JsonResponse({'item': worker})
        except MigrantWorker.DoesNotExist:
            return JsonResponse({'message': '务工信息不存在'}, status=404)
        except ValueError as e:
            return JsonResponse({'message': str(e)}, status=400)
    elif request.method == 'DELETE':
        try:
            return JsonResponse(delete_migrant_worker(worker_id))
        except MigrantWorker.DoesNotExist:
            return JsonResponse({'message': '务工信息不存在'}, status=404)

@csrf_exempt
@require_http_methods(['GET', 'POST'])
def village_group_collection(request):
    if request.method == 'GET':
        groups = VillageGroup.objects.all().order_by('id')
        data = [
            {
                'id': g.id,
                'name': g.name,
                'map_image': request.build_absolute_uri(g.map_image.url) if g.map_image else None,
                'count': Resident.objects.filter(village_group=g.name).count(),
            }
            for g in groups
        ]
        return JsonResponse({'items': data})

    # POST create
    name = request.POST.get('name')
    if not name:
        return JsonResponse({'message': '名称不能为空'}, status=400)
    if VillageGroup.objects.filter(name=name).exists():
        return JsonResponse({'message': '小组名称已存在'}, status=400)
    
    group = VillageGroup(name=name)
    if 'map_image' in request.FILES:
        group.map_image = request.FILES['map_image']
    group.save()
    return JsonResponse({
        'id': group.id,
        'name': group.name,
        'map_image': request.build_absolute_uri(group.map_image.url) if group.map_image else None,
        'count': 0
    }, status=201)

@csrf_exempt
@require_http_methods(['POST', 'DELETE'])
def village_group_detail(request, group_id):
    group = get_object_or_404(VillageGroup, id=group_id)
    if request.method == 'DELETE':
        group.delete()
        return JsonResponse({'message': '删除成功'})

    # POST for update (multipart/form-data doesn't support PUT well in Django)
    new_name = request.POST.get('name')
    if new_name and new_name != group.name:
        if VillageGroup.objects.filter(name=new_name).exclude(id=group.id).exists():
            return JsonResponse({'message': '小组名称已存在'}, status=400)
        old_name = group.name
        group.name = new_name
        group.save(update_fields=['name', 'updated_at'])
        cascade_update_village_group_name(old_name, new_name)
    
    if 'map_image' in request.FILES:
        if group.map_image:
            group.map_image.delete(save=False)
        group.map_image = request.FILES['map_image']
        group.save(update_fields=['map_image', 'updated_at'])
        
    return JsonResponse({
        'id': group.id,
        'name': group.name,
        'map_image': request.build_absolute_uri(group.map_image.url) if group.map_image else None,
        'count': Resident.objects.filter(village_group=group.name).count()
    })

@csrf_exempt
@require_http_methods(["GET"])
def about_view(request):
    """返回项目关于信息（从 about.json 读取，方便修改）"""
    import os, json
    from django.conf import settings
    about_path = os.path.join(settings.BASE_DIR, 'village_affairs', 'static', 'about.json')
    try:
        with open(about_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return JsonResponse(data)
    except FileNotFoundError:
        return JsonResponse({'error': '关于信息文件未找到'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': '关于信息文件格式错误'}, status=500)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def activation_view(request):
    if request.method == "GET":
        try:
            activation = SystemActivation.objects.filter(is_active=True).order_by('-activated_at').first()
            if activation and activation.expire_at >= timezone.now():
                return JsonResponse({
                    "status": "activated",
                    "activated_at": activation.activated_at.strftime('%Y-%m-%d'),
                    "expire_at": activation.expire_at.strftime('%Y-%m-%d')
                })
            else:
                # 如果记录存在但已过期，标记为未激活
                if activation and activation.expire_at < timezone.now():
                    activation.is_active = False
                    activation.save()
                return JsonResponse({"status": "unactivated"})
        except Exception:
            # 数据库连接失败时，默认未激活并提示网络异常
            return JsonResponse({
                "status": "unactivated",
                "error": "无法连接数据库，请检查网络连接"
            })
    
    elif request.method == "POST":
        data = json.loads(request.body)
        code = data.get('code')
        secret_key = data.get('secret_key')
        
        if not code or not secret_key:
            return JsonResponse({"message": "激活码和密钥不能为空"}, status=400)
        
        is_valid, expire_time, message = verify_activation_code_remote(code, secret_key)
        
        if is_valid:
            # save local
            SystemActivation.objects.create(
                code=code,
                expire_at=expire_time,
                is_active=True
            )
            return JsonResponse({"message": "激活成功", "expire_at": expire_time.strftime('%Y-%m-%d')})
        else:
            return JsonResponse({"message": message}, status=400)

@csrf_exempt
@require_POST
def system_shutdown(request):
    try:
        os.kill(os.getpid(), signal.SIGTERM)
        return JsonResponse({'message': 'Shutting down'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET", "POST"])
def role_list_create(request):
    if request.method == "GET":
        roles = Role.objects.all().order_by('-created_at')
        data = [{
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "desc": r.desc,
            "permissions": r.permissions,
            "status": r.status,
            "created_at": r.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } for r in roles]
        return JsonResponse(data, safe=False)
    
    elif request.method == "POST":
        data = json.loads(request.body)
        role = Role.objects.create(
            name=data.get('name', ''),
            code=data.get('code', ''),
            desc=data.get('desc', ''),
            permissions=data.get('permissions', []),
            status=data.get('status', True)
        )
        return JsonResponse({"id": role.id, "message": "success"})

@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def role_detail(request, pk):
    role = get_object_or_404(Role, pk=pk)
    if request.method == "GET":
        return JsonResponse({
            "id": role.id,
            "name": role.name,
            "code": role.code,
            "desc": role.desc,
            "permissions": role.permissions,
            "status": role.status
        })
    elif request.method == "PUT":
        data = json.loads(request.body)
        role.name = data.get('name', role.name)
        role.code = data.get('code', role.code)
        role.desc = data.get('desc', role.desc)
        role.permissions = data.get('permissions', role.permissions)
        role.status = data.get('status', role.status)
        role.save()
        return JsonResponse({"message": "success"})
    elif request.method == "DELETE":
        role.delete()
        return JsonResponse({"message": "success"})

@csrf_exempt
@require_http_methods(["GET", "POST"])
def user_list_create(request):
    if request.method == "GET":
        users = SystemUser.objects.all().select_related('role').order_by('-created_at')
        data = [{
            "id": u.id,
            "username": u.username,
            "name": u.name,
            "role_id": u.role.id if u.role else None,
            "role_name": u.role.name if u.role else "无角色",
            "status": u.status,
            "created_at": u.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } for u in users]
        return JsonResponse(data, safe=False)
    
    elif request.method == "POST":
        data = json.loads(request.body)
        role_id = data.get('role_id')
        role = Role.objects.get(id=role_id) if role_id else None
        raw_password = data.get('password', '') or '123456'
        user = SystemUser(
            username=data.get('username', ''),
            name=data.get('name', ''),
            role=role,
            status=data.get('status', True)
        )
        user.set_password(raw_password)
        user.save()
        return JsonResponse({"id": user.id, "message": "success"})

@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def user_detail(request, pk):
    user = get_object_or_404(SystemUser, pk=pk)
    if request.method == "GET":
        return JsonResponse({
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "role_id": user.role.id if user.role else None,
            "status": user.status
        })
    elif request.method == "PUT":
        data = json.loads(request.body)
        user.username = data.get('username', user.username)
        user.name = data.get('name', user.name)
        role_id = data.get('role_id')
        if role_id is not None:
            user.role = Role.objects.get(id=role_id) if role_id else None
        user.status = data.get('status', user.status)
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        user.save()
        return JsonResponse({"message": "success"})
    elif request.method == "DELETE":
        user.delete()
        return JsonResponse({"message": "success"})
