from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('village_affairs', '0013_projectimportbatch_projectrecord'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='subsidyimportbatch',
            options={'ordering': ['-created_at'], 'verbose_name': '政策性补贴导入批次', 'verbose_name_plural': '政策性补贴导入批次'},
        ),
        migrations.AlterModelOptions(
            name='subsidyrecord',
            options={'ordering': ['-grant_year', '-updated_at', '-id'], 'verbose_name': '政策性补贴记录', 'verbose_name_plural': '政策性补贴记录'},
        ),
        migrations.AlterField(
            model_name='subsidyrecord',
            name='subsidy_type',
            field=models.CharField(
                choices=[
                    ('耕地地力保护补贴', '耕地地力保护补贴'),
                    ('水稻补贴', '水稻补贴'),
                    ('产业奖补', '产业奖补'),
                    ('产业发展奖补', '产业发展奖补'),
                    ('危房补助', '危房补助'),
                    ('跨省务工交通补贴', '跨省务工交通补贴'),
                    ('县内务工稳岗补贴', '县内务工稳岗补贴'),
                    ('雨露计划补助', '雨露计划补助'),
                ],
                max_length=64,
                verbose_name='补贴类型',
            ),
        ),
    ]
