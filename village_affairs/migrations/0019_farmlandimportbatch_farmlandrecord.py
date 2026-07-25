from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('village_affairs', '0018_operationlog_databasebackuprecord'),
    ]

    operations = [
        migrations.CreateModel(
            name='FarmlandImportBatch',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('original_filename', models.CharField(max_length=255, verbose_name='原始文件名')),
                ('file_path', models.CharField(max_length=500, verbose_name='文件路径')),
                ('source_headers', models.JSONField(blank=True, default=list, verbose_name='源表头')),
                ('field_mapping', models.JSONField(blank=True, default=dict, verbose_name='字段映射')),
                ('status', models.CharField(choices=[('uploaded', '已上传'), ('previewed', '已预览'), ('imported', '已导入'), ('failed', '导入失败')], default='uploaded', max_length=16, verbose_name='状态')),
                ('total_rows', models.PositiveIntegerField(default=0, verbose_name='总行数')),
                ('valid_rows', models.PositiveIntegerField(default=0, verbose_name='有效行数')),
                ('invalid_rows', models.PositiveIntegerField(default=0, verbose_name='无效行数')),
                ('imported_rows', models.PositiveIntegerField(default=0, verbose_name='导入行数')),
                ('created_rows', models.PositiveIntegerField(default=0, verbose_name='新增行数')),
                ('updated_rows', models.PositiveIntegerField(default=0, verbose_name='更新行数')),
                ('error_details', models.JSONField(blank=True, default=list, verbose_name='错误详情')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
            ],
            options={
                'verbose_name': '耕地导入批次',
                'verbose_name_plural': '耕地导入批次',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='FarmlandRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('plot_code', models.CharField(db_index=True, max_length=64, unique=True, verbose_name='地块编号')),
                ('village_group', models.CharField(blank=True, db_index=True, max_length=64, verbose_name='村组')),
                ('contractor_name', models.CharField(blank=True, max_length=64, verbose_name='承包户')),
                ('contractor_identity_number', models.CharField(blank=True, db_index=True, max_length=32, verbose_name='承包户身份证号')),
                ('linked_resident_id', models.PositiveIntegerField(blank=True, null=True, verbose_name='关联居民ID')),
                ('plot_location', models.CharField(blank=True, max_length=255, verbose_name='地块位置')),
                ('area_mu', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, verbose_name='面积（亩）')),
                ('east_boundary', models.CharField(blank=True, max_length=255, verbose_name='东至')),
                ('south_boundary', models.CharField(blank=True, max_length=255, verbose_name='南至')),
                ('west_boundary', models.CharField(blank=True, max_length=255, verbose_name='西至')),
                ('north_boundary', models.CharField(blank=True, max_length=255, verbose_name='北至')),
                ('plot_status', models.CharField(blank=True, max_length=64, verbose_name='地块状态')),
                ('transfer_status', models.CharField(blank=True, max_length=64, verbose_name='流转情况')),
                ('confirmation_status', models.CharField(blank=True, max_length=64, verbose_name='确权情况')),
                ('current_planting', models.CharField(blank=True, max_length=128, verbose_name='当前种植')),
                ('latest_change', models.CharField(blank=True, max_length=255, verbose_name='最新变更')),
                ('change_date', models.DateField(blank=True, null=True, verbose_name='变更日期')),
                ('notes', models.TextField(blank=True, verbose_name='备注')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('household', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='farmland_records', to='village_affairs.household', verbose_name='关联家庭')),
                ('resident', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='farmland_records', to='village_affairs.resident', verbose_name='关联居民')),
            ],
            options={
                'verbose_name': '耕地台账',
                'verbose_name_plural': '耕地台账',
                'ordering': ['village_group', 'contractor_name', 'plot_code', 'id'],
            },
        ),
    ]
