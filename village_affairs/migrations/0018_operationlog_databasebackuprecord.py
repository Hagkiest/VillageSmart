from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('village_affairs', '0017_mediationrecord'),
    ]

    operations = [
        migrations.CreateModel(
            name='OperationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('module', models.CharField(db_index=True, max_length=64, verbose_name='模块')),
                ('action', models.CharField(max_length=32, verbose_name='操作')),
                ('operator', models.CharField(default='系统管理员', max_length=64, verbose_name='操作人')),
                ('summary', models.CharField(max_length=255, verbose_name='摘要')),
                ('target', models.CharField(blank=True, max_length=128, verbose_name='对象')),
                ('result', models.CharField(choices=[('成功', '成功'), ('失败', '失败')], default='成功', max_length=8, verbose_name='结果')),
                ('detail', models.TextField(blank=True, verbose_name='详情')),
                ('ip_address', models.CharField(blank=True, max_length=64, verbose_name='IP地址')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='创建时间')),
            ],
            options={
                'verbose_name': '操作日志',
                'verbose_name_plural': '操作日志',
                'ordering': ['-created_at', '-id'],
            },
        ),
        migrations.CreateModel(
            name='DatabaseBackupRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_name', models.CharField(max_length=255, verbose_name='文件名')),
                ('file_path', models.CharField(max_length=512, verbose_name='文件路径')),
                ('file_size', models.BigIntegerField(default=0, verbose_name='文件大小')),
                ('record_count', models.PositiveIntegerField(default=0, verbose_name='记录数')),
                ('created_by', models.CharField(default='系统管理员', max_length=64, verbose_name='创建人')),
                ('status', models.CharField(choices=[('成功', '成功'), ('失败', '失败')], default='成功', max_length=8, verbose_name='状态')),
                ('error_message', models.TextField(blank=True, verbose_name='错误信息')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='创建时间')),
            ],
            options={
                'verbose_name': '数据库备份记录',
                'verbose_name_plural': '数据库备份记录',
                'ordering': ['-created_at', '-id'],
            },
        ),
    ]
