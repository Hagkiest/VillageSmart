import uuid
from datetime import date
from decimal import Decimal

from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone


class VillageGroup(models.Model):
    name = models.CharField('小组名称', max_length=64, unique=True)
    map_image = models.ImageField('高清图', upload_to='land_maps/', null=True, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '村民小组'
        verbose_name_plural = '村民小组'
        ordering = ['id']

    def __str__(self):
        return self.name


class Household(models.Model):
    household_no = models.CharField('户编号', max_length=32, unique=True)
    head_name = models.CharField('户主姓名', max_length=64, blank=True)
    head_identity_number = models.CharField('户主身份证号码', max_length=32, blank=True, db_index=True)
    head_gender = models.CharField('户主性别', max_length=16, blank=True)
    village_group = models.CharField('村组', max_length=64, blank=True)
    address = models.CharField('家庭地址', max_length=255, blank=True)
    household_type = models.CharField('户属性', max_length=64, blank=True)
    account_type = models.CharField('户口类型', max_length=64, blank=True)
    grid_name = models.CharField('所属网格', max_length=64, blank=True)
    housing_type = models.CharField('住房类型', max_length=64, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '户信息'
        verbose_name_plural = '户信息'
        ordering = ['household_no']

    def __str__(self):
        return f'{self.household_no} - {self.head_name or "未设置户主"}'


class Resident(models.Model):
    household = models.ForeignKey(
        Household,
        verbose_name='所属户',
        on_delete=models.SET_NULL,
        related_name='residents',
        null=True,
        blank=True,
    )
    full_name = models.CharField('居民姓名', max_length=64, db_index=True)
    gender = models.CharField('性别', max_length=16, blank=True)
    identity_number = models.CharField('身份证号码', max_length=32, unique=True, db_index=True)
    birth_date = models.DateField('出生日期', null=True, blank=True)
    ethnicity = models.CharField('民族', max_length=32, blank=True)
    phone = models.CharField('联系电话', max_length=32, blank=True)
    relation_to_head = models.CharField('与户主关系', max_length=32, blank=True)
    village_group = models.CharField('村组', max_length=64, blank=True, db_index=True)
    address = models.CharField('家庭地址', max_length=255, blank=True)
    household_type = models.CharField('户属性', max_length=64, blank=True)
    account_type = models.CharField('户口类型', max_length=64, blank=True)
    grid_name = models.CharField('所属网格', max_length=64, blank=True)
    political_status = models.CharField('政治面貌', max_length=64, blank=True)
    marital_status = models.CharField('婚姻状况', max_length=32, blank=True)
    health_status = models.CharField('健康状态', max_length=32, blank=True)
    residency_status = models.CharField('居住状态', max_length=32, blank=True)
    education_level = models.CharField('文化程度', max_length=32, blank=True)
    occupation = models.CharField('职业', max_length=64, blank=True)
    bank_account = models.CharField('银行账号', max_length=64, blank=True)
    bank_name = models.CharField('开户行', max_length=64, blank=True)
    military_status = models.CharField('兵役状况', max_length=32, blank=True)
    status = models.CharField('状态', max_length=32, blank=True, default='正常')
    is_household_head = models.BooleanField('是否户主', default=False)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '居民信息'
        verbose_name_plural = '居民信息'
        ordering = ['id']

    def __str__(self):
        return f'{self.full_name}({self.identity_number})'

    @property
    def age(self):
        if not self.birth_date:
            return None
        today = timezone.localdate()
        years = today.year - self.birth_date.year
        if (today.month, today.day) < (self.birth_date.month, self.birth_date.day):
            years -= 1
        return years


class ResidentImportBatch(models.Model):
    STATUS_UPLOADED = 'uploaded'
    STATUS_PREVIEWED = 'previewed'
    STATUS_IMPORTED = 'imported'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = [
        (STATUS_UPLOADED, '已上传'),
        (STATUS_PREVIEWED, '已预览'),
        (STATUS_IMPORTED, '已导入'),
        (STATUS_FAILED, '导入失败'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_filename = models.CharField('原始文件名', max_length=255)
    file_path = models.CharField('文件路径', max_length=500)
    source_headers = models.JSONField('源表头', default=list, blank=True)
    field_mapping = models.JSONField('字段映射', default=dict, blank=True)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    total_rows = models.PositiveIntegerField('总行数', default=0)
    valid_rows = models.PositiveIntegerField('有效行数', default=0)
    invalid_rows = models.PositiveIntegerField('无效行数', default=0)
    imported_rows = models.PositiveIntegerField('导入行数', default=0)
    created_rows = models.PositiveIntegerField('新增行数', default=0)
    updated_rows = models.PositiveIntegerField('更新行数', default=0)
    error_details = models.JSONField('错误详情', default=list, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '居民导入批次'
        verbose_name_plural = '居民导入批次'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_filename} ({self.status})'


class MigrantWorker(models.Model):
    STATUS_CHOICES = [
        ('在外务工', '在外务工'),
        ('已返乡', '已返乡'),
    ]

    resident = models.OneToOneField(
        Resident,
        verbose_name='关联居民',
        on_delete=models.CASCADE,
        related_name='migrant_worker',
        null=True,
        blank=True,
    )
    full_name = models.CharField('姓名', max_length=64, db_index=True)
    identity_number = models.CharField('身份证号码', max_length=32, db_index=True)
    gender = models.CharField('性别', max_length=16, blank=True)
    village_group = models.CharField('村组', max_length=64, blank=True)
    phone = models.CharField('联系电话', max_length=32, blank=True)
    household_type = models.CharField('户属性', max_length=64, blank=True)
    work_status = models.CharField('务工状态', max_length=16, choices=STATUS_CHOICES, default='在外务工')
    is_employed = models.BooleanField('是否就业', default=True)
    work_area = models.CharField('务工区域', max_length=255, blank=True)
    work_address = models.CharField('务工地址', max_length=255, blank=True)
    work_industry = models.CharField('行业', max_length=128, blank=True)
    work_type = models.CharField('工种', max_length=128, blank=True)
    employer = models.CharField('单位名称', max_length=255, blank=True)
    start_date = models.DateField('开始时间', null=True, blank=True)
    expected_return_date = models.DateField('预计返乡时间', null=True, blank=True)
    actual_return_date = models.DateField('实际返乡时间', null=True, blank=True)
    is_special_group = models.BooleanField('是否特殊人群', default=False)
    month_income = models.CharField('月收入', max_length=32, blank=True)
    year_income = models.CharField('年收入', max_length=32, blank=True)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '务工信息'
        verbose_name_plural = '务工信息'
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.full_name} - {self.work_status}'


class RiskCheck(models.Model):
    RISK_LEVEL_CHOICES = [
        ('高风险', '高风险'),
        ('中风险', '中风险'),
        ('低风险', '低风险'),
    ]

    resident = models.ForeignKey(
        Resident,
        verbose_name='关联居民',
        on_delete=models.CASCADE,
        related_name='risk_checks',
        null=True,
        blank=True,
    )
    full_name = models.CharField('姓名', max_length=64)
    identity_number = models.CharField('身份证号', max_length=32, db_index=True)
    head_name = models.CharField('户主姓名', max_length=64, blank=True)
    head_identity_number = models.CharField('户主证件号', max_length=32, blank=True)
    household_type = models.CharField('户属性', max_length=64, blank=True)
    risk_level = models.CharField('风险等级', max_length=16, choices=RISK_LEVEL_CHOICES, blank=True)
    warning_content = models.TextField('预警内容', blank=True, max_length=2000)
    medical_amount = models.DecimalField('医疗自付费用金额', max_digits=10, decimal_places=2, null=True, blank=True)
    warning_time = models.DateField('预警时间')
    alert_time = models.DateTimeField('告警时间', auto_now_add=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '风险排查'
        verbose_name_plural = '风险排查'
        ordering = ['-warning_time', '-id']

    def __str__(self):
        return f'{self.full_name} - {self.risk_level}'


class RiskCheckImportBatch(models.Model):
    STATUS_UPLOADED = 'uploaded'
    STATUS_PREVIEWED = 'previewed'
    STATUS_IMPORTED = 'imported'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = [
        (STATUS_UPLOADED, '已上传'),
        (STATUS_PREVIEWED, '已预览'),
        (STATUS_IMPORTED, '已导入'),
        (STATUS_FAILED, '导入失败'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_filename = models.CharField('原始文件名', max_length=255)
    file_path = models.CharField('文件路径', max_length=500)
    source_headers = models.JSONField('源表头', default=list, blank=True)
    field_mapping = models.JSONField('字段映射', default=dict, blank=True)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    total_rows = models.PositiveIntegerField('总行数', default=0)
    valid_rows = models.PositiveIntegerField('有效行数', default=0)
    invalid_rows = models.PositiveIntegerField('无效行数', default=0)
    imported_rows = models.PositiveIntegerField('导入行数', default=0)
    created_rows = models.PositiveIntegerField('新增行数', default=0)
    updated_rows = models.PositiveIntegerField('更新行数', default=0)
    error_details = models.JSONField('错误详情', default=list, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '风险排查导入批次'
        verbose_name_plural = '风险排查导入批次'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_filename} ({self.status})'


class LowIncomeRecord(models.Model):
    STATUS_CHOICES = [
        ('在享', '在享'),
        ('停享', '停享'),
    ]

    resident = models.ForeignKey(
        Resident,
        verbose_name='关联居民',
        on_delete=models.CASCADE,
        related_name='low_income_records',
        null=True,
        blank=True,
    )
    household = models.ForeignKey(
        Household,
        verbose_name='关联家庭',
        on_delete=models.SET_NULL,
        related_name='low_income_records',
        null=True,
        blank=True,
    )
    full_name = models.CharField('居民姓名', max_length=64)
    identity_number = models.CharField('身份证号', max_length=32, db_index=True)
    gender = models.CharField('性别', max_length=16, blank=True)
    ethnicity = models.CharField('民族', max_length=32, blank=True)
    phone = models.CharField('联系电话', max_length=32, blank=True)
    head_name = models.CharField('户主姓名', max_length=64, blank=True)
    relation_to_head = models.CharField('与户主关系', max_length=32, blank=True)
    village_group = models.CharField('村组', max_length=64, blank=True)
    policy_type = models.CharField('享受政策类型', max_length=64, blank=True)
    benefit_level = models.CharField('享受档次', max_length=64, blank=True)
    subsidy_amount = models.DecimalField('补贴金额', max_digits=10, decimal_places=2, null=True, blank=True)
    subsidy_cycle = models.CharField('补贴周期', max_length=64, blank=True)
    start_date = models.DateField('开始时间', null=True, blank=True)
    end_date = models.DateField('结束时间', null=True, blank=True)
    household_member_count = models.PositiveIntegerField('全户人数', default=0)
    beneficiary_count = models.PositiveIntegerField('享受人数', default=1)
    household_month_amount = models.DecimalField('户月金额', max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default='在享')
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '低收入人员'
        verbose_name_plural = '低收入人员'
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return f'{self.full_name} - {self.policy_type or "低收入"}'


class LowIncomeImportBatch(models.Model):
    STATUS_UPLOADED = 'uploaded'
    STATUS_PREVIEWED = 'previewed'
    STATUS_IMPORTED = 'imported'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = [
        (STATUS_UPLOADED, '已上传'),
        (STATUS_PREVIEWED, '已预览'),
        (STATUS_IMPORTED, '已导入'),
        (STATUS_FAILED, '导入失败'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_filename = models.CharField('原始文件名', max_length=255)
    file_path = models.CharField('文件路径', max_length=500)
    source_headers = models.JSONField('源表头', default=list, blank=True)
    field_mapping = models.JSONField('字段映射', default=dict, blank=True)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    total_rows = models.PositiveIntegerField('总行数', default=0)
    valid_rows = models.PositiveIntegerField('有效行数', default=0)
    invalid_rows = models.PositiveIntegerField('无效行数', default=0)
    imported_rows = models.PositiveIntegerField('导入行数', default=0)
    created_rows = models.PositiveIntegerField('新增行数', default=0)
    updated_rows = models.PositiveIntegerField('更新行数', default=0)
    error_details = models.JSONField('错误详情', default=list, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '低收入导入批次'
        verbose_name_plural = '低收入导入批次'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_filename} ({self.status})'


class DisabledPerson(models.Model):
    STATUS_CHOICES = [
        ('有效', '有效'),
        ('停用', '停用'),
    ]

    resident = models.OneToOneField(
        Resident,
        verbose_name='关联居民',
        on_delete=models.CASCADE,
        related_name='disabled_profile',
        null=True,
        blank=True,
    )
    household = models.ForeignKey(
        Household,
        verbose_name='关联家庭',
        on_delete=models.SET_NULL,
        related_name='disabled_people',
        null=True,
        blank=True,
    )
    full_name = models.CharField('姓名', max_length=64)
    identity_number = models.CharField('身份证号', max_length=32, unique=True, db_index=True)
    gender = models.CharField('性别', max_length=16, blank=True)
    ethnicity = models.CharField('民族', max_length=32, blank=True)
    phone = models.CharField('联系电话', max_length=32, blank=True)
    village_group = models.CharField('村组', max_length=64, blank=True)
    address = models.CharField('家庭地址', max_length=255, blank=True)
    disability_type = models.CharField('残疾类型', max_length=64, blank=True)
    disability_level = models.CharField('残疾等级', max_length=32, blank=True)
    disability_card_number = models.CharField('残疾证号', max_length=64, blank=True)
    issue_date = models.DateField('办证日期', null=True, blank=True)
    guardian_name = models.CharField('监护人姓名', max_length=64, blank=True)
    guardian_phone = models.CharField('监护人电话', max_length=32, blank=True)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default='有效')
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '残疾人信息'
        verbose_name_plural = '残疾人信息'
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return f'{self.full_name} - {self.disability_type or "残疾人"}'


class DisabledImportBatch(models.Model):
    STATUS_UPLOADED = 'uploaded'
    STATUS_PREVIEWED = 'previewed'
    STATUS_IMPORTED = 'imported'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = [
        (STATUS_UPLOADED, '已上传'),
        (STATUS_PREVIEWED, '已预览'),
        (STATUS_IMPORTED, '已导入'),
        (STATUS_FAILED, '导入失败'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_filename = models.CharField('原始文件名', max_length=255)
    file_path = models.CharField('文件路径', max_length=500)
    source_headers = models.JSONField('源表头', default=list, blank=True)
    field_mapping = models.JSONField('字段映射', default=dict, blank=True)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    total_rows = models.PositiveIntegerField('总行数', default=0)
    valid_rows = models.PositiveIntegerField('有效行数', default=0)
    invalid_rows = models.PositiveIntegerField('无效行数', default=0)
    imported_rows = models.PositiveIntegerField('导入行数', default=0)
    created_rows = models.PositiveIntegerField('新增行数', default=0)
    updated_rows = models.PositiveIntegerField('更新行数', default=0)
    error_details = models.JSONField('错误详情', default=list, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '残疾人导入批次'
        verbose_name_plural = '残疾人导入批次'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_filename} ({self.status})'


class SubsidyRecord(models.Model):
    SUBSIDY_TYPE_CHOICES = [
        ('耕地地力保护补贴', '耕地地力保护补贴'),
        ('水稻补贴', '水稻补贴'),
        ('产业奖补', '产业奖补'),
        ('产业发展奖补', '产业发展奖补'),
        ('危房补助', '危房补助'),
        ('跨省务工交通补贴', '跨省务工交通补贴'),
        ('县内务工稳岗补贴', '县内务工稳岗补贴'),
        ('雨露计划补助', '雨露计划补助'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('待发放', '待发放'),
        ('已发放', '已发放'),
    ]

    resident = models.ForeignKey(
        Resident,
        verbose_name='关联居民',
        on_delete=models.CASCADE,
        related_name='subsidy_records',
        null=True,
        blank=True,
    )
    disabled_person = models.ForeignKey(
        DisabledPerson,
        verbose_name='关联残疾人档案',
        on_delete=models.SET_NULL,
        related_name='subsidy_records',
        null=True,
        blank=True,
    )
    household = models.ForeignKey(
        Household,
        verbose_name='关联家庭',
        on_delete=models.SET_NULL,
        related_name='subsidy_records',
        null=True,
        blank=True,
    )
    grant_year = models.PositiveIntegerField('年度', default=date.today().year)
    batch_name = models.CharField('批次', max_length=64, blank=True)
    subsidy_type = models.CharField('补贴类型', max_length=64, choices=SUBSIDY_TYPE_CHOICES)
    full_name = models.CharField('姓名', max_length=64)
    identity_number = models.CharField('身份证号', max_length=32, db_index=True)
    bank_account = models.CharField('银行账号', max_length=64, blank=True)
    village_group = models.CharField('村组', max_length=64, blank=True)
    household_population = models.PositiveIntegerField('家庭人口', default=1)
    subsidy_item = models.CharField('项目/事项', max_length=128, blank=True)
    subsidy_standard = models.CharField('规格', max_length=64, blank=True)
    unit = models.CharField('单位', max_length=32, blank=True)
    declared_amount = models.DecimalField('申报金额', max_digits=10, decimal_places=2, null=True, blank=True)
    actual_amount = models.DecimalField('实发金额', max_digits=10, decimal_places=2, null=True, blank=True)
    payment_status = models.CharField('发放状态', max_length=16, choices=PAYMENT_STATUS_CHOICES, default='待发放')
    payment_date = models.DateField('发放日期', null=True, blank=True)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '政策性补贴记录'
        verbose_name_plural = '政策性补贴记录'
        ordering = ['-grant_year', '-updated_at', '-id']

    def __str__(self):
        return f'{self.full_name} - {self.subsidy_type}'


class SubsidyImportBatch(models.Model):
    STATUS_UPLOADED = 'uploaded'
    STATUS_PREVIEWED = 'previewed'
    STATUS_IMPORTED = 'imported'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = [
        (STATUS_UPLOADED, '已上传'),
        (STATUS_PREVIEWED, '已预览'),
        (STATUS_IMPORTED, '已导入'),
        (STATUS_FAILED, '导入失败'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_filename = models.CharField('原始文件名', max_length=255)
    file_path = models.CharField('文件路径', max_length=500)
    source_headers = models.JSONField('源表头', default=list, blank=True)
    field_mapping = models.JSONField('字段映射', default=dict, blank=True)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    total_rows = models.PositiveIntegerField('总行数', default=0)
    valid_rows = models.PositiveIntegerField('有效行数', default=0)
    invalid_rows = models.PositiveIntegerField('无效行数', default=0)
    imported_rows = models.PositiveIntegerField('导入行数', default=0)
    created_rows = models.PositiveIntegerField('新增行数', default=0)
    updated_rows = models.PositiveIntegerField('更新行数', default=0)
    error_details = models.JSONField('错误详情', default=list, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '政策性补贴导入批次'
        verbose_name_plural = '政策性补贴导入批次'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_filename} ({self.status})'


class PublicJobRecord(models.Model):
    STATUS_ON_DUTY = '在岗'
    STATUS_LEFT = '离岗'
    STATUS_PENDING = '待岗'
    STATUS_CHOICES = [
        (STATUS_ON_DUTY, '在岗'),
        (STATUS_LEFT, '离岗'),
        (STATUS_PENDING, '待岗'),
    ]

    resident = models.ForeignKey(
        Resident,
        verbose_name='关联居民',
        on_delete=models.CASCADE,
        related_name='public_job_records',
        null=True,
        blank=True,
    )
    household = models.ForeignKey(
        Household,
        verbose_name='关联家庭',
        on_delete=models.SET_NULL,
        related_name='public_job_records',
        null=True,
        blank=True,
    )
    low_income_record = models.ForeignKey(
        LowIncomeRecord,
        verbose_name='关联低收入记录',
        on_delete=models.SET_NULL,
        related_name='public_job_records',
        null=True,
        blank=True,
    )
    full_name = models.CharField('姓名', max_length=64)
    identity_number = models.CharField('身份证号', max_length=32, db_index=True)
    gender = models.CharField('性别', max_length=16, blank=True)
    phone = models.CharField('联系电话', max_length=32, blank=True)
    head_name = models.CharField('户主姓名', max_length=64, blank=True)
    village_group = models.CharField('村组', max_length=64, blank=True)
    household_type = models.CharField('户属性', max_length=64, blank=True)
    low_income_type = models.CharField('低收入类型', max_length=64, blank=True)
    job_name = models.CharField('岗位名称', max_length=128)
    department = models.CharField('主管部门', max_length=128, blank=True)
    start_date = models.DateField('合同开始日期', null=True, blank=True)
    end_date = models.DateField('合同结束日期', null=True, blank=True)
    subsidy_amount = models.DecimalField('月补贴标准', max_digits=10, decimal_places=2, null=True, blank=True)
    required_attendance_days = models.PositiveIntegerField('规定出勤天数', default=0)
    actual_attendance_days = models.PositiveIntegerField('实际出勤天数', default=0)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_ON_DUTY)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '公益性岗位记录'
        verbose_name_plural = '公益性岗位记录'
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return f'{self.full_name} - {self.job_name}'


class PublicJobImportBatch(models.Model):
    STATUS_UPLOADED = 'uploaded'
    STATUS_PREVIEWED = 'previewed'
    STATUS_IMPORTED = 'imported'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = [
        (STATUS_UPLOADED, '已上传'),
        (STATUS_PREVIEWED, '已预览'),
        (STATUS_IMPORTED, '已导入'),
        (STATUS_FAILED, '导入失败'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_filename = models.CharField('原始文件名', max_length=255)
    file_path = models.CharField('文件路径', max_length=500)
    source_headers = models.JSONField('源表头', default=list, blank=True)
    field_mapping = models.JSONField('字段映射', default=dict, blank=True)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    total_rows = models.PositiveIntegerField('总行数', default=0)
    valid_rows = models.PositiveIntegerField('有效行数', default=0)
    invalid_rows = models.PositiveIntegerField('无效行数', default=0)
    imported_rows = models.PositiveIntegerField('导入行数', default=0)
    created_rows = models.PositiveIntegerField('新增行数', default=0)
    updated_rows = models.PositiveIntegerField('更新行数', default=0)
    error_details = models.JSONField('错误详情', default=list, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '公益性岗位导入批次'
        verbose_name_plural = '公益性岗位导入批次'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_filename} ({self.status})'


class CareObject(models.Model):
    resident = models.OneToOneField(
        Resident,
        verbose_name='关联居民',
        on_delete=models.CASCADE,
        related_name='care_object_profile',
        null=True,
        blank=True,
    )
    household = models.ForeignKey(
        Household,
        verbose_name='关联家庭',
        on_delete=models.SET_NULL,
        related_name='care_objects',
        null=True,
        blank=True,
    )
    full_name = models.CharField('姓名', max_length=64)
    identity_number = models.CharField('身份证号', max_length=32, unique=True, db_index=True)
    gender = models.CharField('性别', max_length=16, blank=True)
    ethnicity = models.CharField('民族', max_length=32, blank=True)
    phone = models.CharField('联系电话', max_length=32, blank=True)
    village_group = models.CharField('村组', max_length=64, blank=True)
    address = models.CharField('家庭地址', max_length=255, blank=True)
    care_type = models.CharField('关爱类型', max_length=64, blank=True)
    care_level = models.CharField('关爱等级', max_length=64, blank=True)
    caregiver_name = models.CharField('关爱人员', max_length=64, blank=True)
    caregiver_phone = models.CharField('联系方式', max_length=32, blank=True)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '关爱对象'
        verbose_name_plural = '关爱对象'
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return f'{self.full_name} - {self.care_type or "关爱对象"}'


class CareObjectImportBatch(models.Model):
    STATUS_UPLOADED = 'uploaded'
    STATUS_PREVIEWED = 'previewed'
    STATUS_IMPORTED = 'imported'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = [
        (STATUS_UPLOADED, '已上传'),
        (STATUS_PREVIEWED, '已预览'),
        (STATUS_IMPORTED, '已导入'),
        (STATUS_FAILED, '导入失败'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_filename = models.CharField('原始文件名', max_length=255)
    file_path = models.CharField('文件路径', max_length=500)
    source_headers = models.JSONField('源表头', default=list, blank=True)
    field_mapping = models.JSONField('字段映射', default=dict, blank=True)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    total_rows = models.PositiveIntegerField('总行数', default=0)
    valid_rows = models.PositiveIntegerField('有效行数', default=0)
    invalid_rows = models.PositiveIntegerField('无效行数', default=0)
    imported_rows = models.PositiveIntegerField('导入行数', default=0)
    created_rows = models.PositiveIntegerField('新增行数', default=0)
    updated_rows = models.PositiveIntegerField('更新行数', default=0)
    error_details = models.JSONField('错误详情', default=list, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '关爱对象导入批次'
        verbose_name_plural = '关爱对象导入批次'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_filename} ({self.status})'


class MediationRecord(models.Model):
    STATUS_IN_PROGRESS = '进行中'
    STATUS_RESOLVED = '已调解'
    STATUS_FAILED = '调解失败'
    STATUS_ARCHIVED = '已归档'

    STATUS_CHOICES = [
        (STATUS_IN_PROGRESS, '进行中'),
        (STATUS_RESOLVED, '已调解'),
        (STATUS_FAILED, '调解失败'),
        (STATUS_ARCHIVED, '已归档'),
    ]

    archive_number = models.CharField('档案编号', max_length=32, unique=True, db_index=True)
    dispute_type = models.CharField('纠纷类型', max_length=64)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_IN_PROGRESS)
    application_date = models.DateField('申请日期', null=True, blank=True)
    occurrence_date = models.DateField('发生日期', null=True, blank=True)
    occurrence_location = models.CharField('发生地点', max_length=255, blank=True)
    applicants = models.JSONField('申请人信息', default=list, blank=True)
    respondents = models.JSONField('被申请人信息', default=list, blank=True)
    dispute_summary = models.TextField('纠纷概述', blank=True)
    application_requests = models.JSONField('申请事项', default=list, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '人民调解档案'
        verbose_name_plural = '人民调解档案'
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return f'{self.archive_number} - {self.dispute_type}'


class ProjectRecord(models.Model):
    SOURCE_CHOICES = [
        ('乡村振兴项目库', '乡村振兴项目库'),
        ('财政衔接资金项目库', '财政衔接资金项目库'),
        ('行业部门项目库', '行业部门项目库'),
        ('其他来源', '其他来源'),
    ]

    TYPE_CHOICES = [
        ('基础设施', '基础设施'),
        ('产业发展', '产业发展'),
        ('社会事业', '社会事业'),
        ('生态环境', '生态环境'),
    ]

    STATUS_CHOICES = [
        ('规划中', '规划中'),
        ('实施中', '实施中'),
        ('已完成', '已完成'),
        ('已终止', '已终止'),
    ]

    project_name = models.CharField('项目名称', max_length=128, db_index=True)
    project_source = models.CharField('项目库来源', max_length=64, choices=SOURCE_CHOICES, blank=True)
    project_type = models.CharField('项目类型', max_length=32, choices=TYPE_CHOICES, blank=True)
    secondary_type = models.CharField('二级类型', max_length=64, blank=True)
    project_status = models.CharField('项目状态', max_length=32, choices=STATUS_CHOICES, default='规划中')
    planning_year = models.PositiveIntegerField('规划年度', null=True, blank=True)
    implementation_year = models.PositiveIntegerField('实施年度', null=True, blank=True)
    included_in_plan = models.BooleanField('纳入计划', default=False)
    total_investment = models.DecimalField('项目预算总投资(万元)', max_digits=12, decimal_places=2, null=True, blank=True)
    settled_amount = models.DecimalField('结算金额(万元)', max_digits=12, decimal_places=2, null=True, blank=True)
    audited_amount = models.DecimalField('决算审计金额(万元)', max_digits=12, decimal_places=2, null=True, blank=True)
    responsible_person = models.CharField('督护人/责任人', max_length=64, blank=True)
    project_location = models.CharField('项目地点', max_length=255, blank=True)
    project_description = models.TextField('项目描述', blank=True)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '项目台账'
        verbose_name_plural = '项目台账'
        ordering = ['-implementation_year', '-updated_at', '-id']

    def __str__(self):
        return self.project_name


class ProjectImportBatch(models.Model):
    STATUS_UPLOADED = 'uploaded'
    STATUS_PREVIEWED = 'previewed'
    STATUS_IMPORTED = 'imported'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = [
        (STATUS_UPLOADED, '已上传'),
        (STATUS_PREVIEWED, '已预览'),
        (STATUS_IMPORTED, '已导入'),
        (STATUS_FAILED, '导入失败'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_filename = models.CharField('原始文件名', max_length=255)
    file_path = models.CharField('文件路径', max_length=500)
    source_headers = models.JSONField('源表头', default=list, blank=True)
    field_mapping = models.JSONField('字段映射', default=dict, blank=True)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    total_rows = models.PositiveIntegerField('总行数', default=0)
    valid_rows = models.PositiveIntegerField('有效行数', default=0)
    invalid_rows = models.PositiveIntegerField('无效行数', default=0)
    imported_rows = models.PositiveIntegerField('导入行数', default=0)
    created_rows = models.PositiveIntegerField('新增行数', default=0)
    updated_rows = models.PositiveIntegerField('更新行数', default=0)
    error_details = models.JSONField('错误详情', default=list, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '项目台账导入批次'
        verbose_name_plural = '项目台账导入批次'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_filename} ({self.status})'


class FarmlandRecord(models.Model):
    resident = models.ForeignKey(
        Resident,
        verbose_name='关联居民',
        on_delete=models.SET_NULL,
        related_name='farmland_records',
        null=True,
        blank=True,
    )
    household = models.ForeignKey(
        Household,
        verbose_name='关联家庭',
        on_delete=models.SET_NULL,
        related_name='farmland_records',
        null=True,
        blank=True,
    )
    plot_code = models.CharField('地块编号', max_length=64, unique=True, db_index=True)
    village_group = models.CharField('村组', max_length=64, blank=True, db_index=True)
    contractor_name = models.CharField('承包户', max_length=64, blank=True)
    contractor_identity_number = models.CharField('承包户身份证号', max_length=32, blank=True, db_index=True)
    linked_resident_id = models.PositiveIntegerField('关联居民ID', null=True, blank=True)
    plot_location = models.CharField('地块位置', max_length=255, blank=True)
    area_mu = models.DecimalField('面积（亩）', max_digits=10, decimal_places=2, null=True, blank=True)
    east_boundary = models.CharField('东至', max_length=255, blank=True)
    south_boundary = models.CharField('南至', max_length=255, blank=True)
    west_boundary = models.CharField('西至', max_length=255, blank=True)
    north_boundary = models.CharField('北至', max_length=255, blank=True)
    plot_status = models.CharField('地块状态', max_length=64, blank=True)
    transfer_status = models.CharField('流转情况', max_length=64, blank=True)
    confirmation_status = models.CharField('确权情况', max_length=64, blank=True)
    current_planting = models.CharField('当前种植', max_length=128, blank=True)
    latest_change = models.CharField('最新变更', max_length=255, blank=True)
    change_date = models.DateField('变更日期', null=True, blank=True)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '耕地台账'
        verbose_name_plural = '耕地台账'
        ordering = ['village_group', 'contractor_name', 'plot_code', 'id']

    def __str__(self):
        return f'{self.plot_code} - {self.contractor_name or "未登记承包户"}'


class FarmlandImportBatch(models.Model):
    STATUS_UPLOADED = 'uploaded'
    STATUS_PREVIEWED = 'previewed'
    STATUS_IMPORTED = 'imported'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = [
        (STATUS_UPLOADED, '已上传'),
        (STATUS_PREVIEWED, '已预览'),
        (STATUS_IMPORTED, '已导入'),
        (STATUS_FAILED, '导入失败'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_filename = models.CharField('原始文件名', max_length=255)
    file_path = models.CharField('文件路径', max_length=500)
    source_headers = models.JSONField('源表头', default=list, blank=True)
    field_mapping = models.JSONField('字段映射', default=dict, blank=True)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_UPLOADED)
    total_rows = models.PositiveIntegerField('总行数', default=0)
    valid_rows = models.PositiveIntegerField('有效行数', default=0)
    invalid_rows = models.PositiveIntegerField('无效行数', default=0)
    imported_rows = models.PositiveIntegerField('导入行数', default=0)
    created_rows = models.PositiveIntegerField('新增行数', default=0)
    updated_rows = models.PositiveIntegerField('更新行数', default=0)
    error_details = models.JSONField('错误详情', default=list, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '耕地导入批次'
        verbose_name_plural = '耕地导入批次'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_filename} ({self.status})'


class OrganizationMember(models.Model):
    ORG_TYPE_PARTY_BRANCH = '党(总)支部委员会'
    ORG_TYPE_VILLAGE_COMMITTEE = '村居民委员会'
    ORG_TYPE_SUPERVISORY = '村务监督委员会'
    ORG_TYPE_YOUTH_WOMEN = '青年团妇组织'
    ORG_TYPE_ECONOMIC_COUNCIL = '集体经济组织理事会'
    ORG_TYPE_ECONOMIC_SUPERVISOR = '集体经济组织监事会'
    ORG_TYPE_GROUP_LEADER = '村民小组长'
    ORG_TYPE_REPRESENTATIVE = '村民代表'

    ORG_TYPE_CHOICES = [
        (ORG_TYPE_PARTY_BRANCH, '党(总)支部委员会'),
        (ORG_TYPE_VILLAGE_COMMITTEE, '村居民委员会'),
        (ORG_TYPE_SUPERVISORY, '村务监督委员会'),
        (ORG_TYPE_YOUTH_WOMEN, '青年团妇组织'),
        (ORG_TYPE_ECONOMIC_COUNCIL, '集体经济组织理事会'),
        (ORG_TYPE_ECONOMIC_SUPERVISOR, '集体经济组织监事会'),
        (ORG_TYPE_GROUP_LEADER, '村民小组长'),
        (ORG_TYPE_REPRESENTATIVE, '村民代表'),
    ]

    STATUS_CURRENT = '现任'
    STATUS_PAST = '历届'
    STATUS_CHOICES = [
        (STATUS_CURRENT, '现任'),
        (STATUS_PAST, '历届'),
    ]

    resident = models.ForeignKey(
        Resident,
        verbose_name='关联居民',
        on_delete=models.SET_NULL,
        related_name='organization_memberships',
        null=True,
        blank=True,
    )
    household = models.ForeignKey(
        Household,
        verbose_name='关联家庭',
        on_delete=models.SET_NULL,
        related_name='organization_members',
        null=True,
        blank=True,
    )
    org_type = models.CharField('组织类型', max_length=64, choices=ORG_TYPE_CHOICES, default=ORG_TYPE_PARTY_BRANCH)
    source = models.CharField('来源', max_length=32, blank=True, default='居民档案')
    full_name = models.CharField('姓名', max_length=64)
    ethnicity = models.CharField('民族', max_length=32, blank=True)
    gender = models.CharField('性别', max_length=16, blank=True)
    identity_number = models.CharField('身份证号', max_length=32, db_index=True)
    birth_date = models.DateField('出生日期', null=True, blank=True)
    address = models.CharField('家庭住址', max_length=255, blank=True)
    phone = models.CharField('联系电话', max_length=32, blank=True)
    position = models.CharField('职务', max_length=64, blank=True)
    political_status = models.CharField('政治面貌', max_length=64, blank=True)
    term_number = models.CharField('届数', max_length=32, blank=True)
    term_start = models.DateField('任期开始', null=True, blank=True)
    term_end = models.DateField('任期结束', null=True, blank=True)
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_CURRENT)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '组织架构成员'
        verbose_name_plural = '组织架构成员'
        ordering = ['org_type', '-status', '-updated_at', '-id']

    def __str__(self):
        return f'{self.full_name} - {self.org_type}'


class PartyMember(models.Model):
    SOURCE_RESIDENT = '居民档案'
    SOURCE_MANUAL = '手工新增'
    SOURCE_CHOICES = [
        (SOURCE_RESIDENT, '居民档案'),
        (SOURCE_MANUAL, '手工新增'),
    ]

    MEMBER_TYPE_FULL = '中共党员'
    MEMBER_TYPE_PROBATIONARY = '预备党员'
    MEMBER_TYPE_ACTIVE = '入党积极分子'
    MEMBER_TYPE_CHOICES = [
        (MEMBER_TYPE_FULL, '中共党员'),
        (MEMBER_TYPE_PROBATIONARY, '预备党员'),
        (MEMBER_TYPE_ACTIVE, '入党积极分子'),
    ]

    STATUS_ACTIVE = '正常'
    STATUS_TRANSFERRED = '已转出'
    STATUS_SUSPENDED = '停止党籍'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, '正常'),
        (STATUS_TRANSFERRED, '已转出'),
        (STATUS_SUSPENDED, '停止党籍'),
    ]

    resident = models.OneToOneField(
        Resident,
        verbose_name='关联居民',
        on_delete=models.SET_NULL,
        related_name='party_profile',
        null=True,
        blank=True,
    )
    household = models.ForeignKey(
        Household,
        verbose_name='关联家庭',
        on_delete=models.SET_NULL,
        related_name='party_members',
        null=True,
        blank=True,
    )
    source = models.CharField('来源', max_length=16, choices=SOURCE_CHOICES, default=SOURCE_RESIDENT)
    full_name = models.CharField('姓名', max_length=64)
    identity_number = models.CharField('身份证号', max_length=32, unique=True, db_index=True)
    gender = models.CharField('性别', max_length=16, blank=True)
    birth_date = models.DateField('出生日期', null=True, blank=True)
    ethnicity = models.CharField('民族', max_length=32, blank=True)
    education_level = models.CharField('学历', max_length=32, blank=True)
    phone = models.CharField('联系电话', max_length=32, blank=True)
    address = models.CharField('现居住址', max_length=255, blank=True)
    member_type = models.CharField('人员类别', max_length=16, choices=MEMBER_TYPE_CHOICES, default=MEMBER_TYPE_FULL)
    join_party_date = models.DateField('入党日期', null=True, blank=True)
    becoming_full_member_date = models.DateField('转正日期', null=True, blank=True)
    party_branch = models.CharField('所在党支部', max_length=64, blank=True)
    current_position = models.CharField('当前职务', max_length=64, blank=True)
    monthly_party_fee = models.DecimalField('默认月党费', max_digits=8, decimal_places=2, null=True, blank=True, default=Decimal('10.00'))
    status = models.CharField('状态', max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '党员信息'
        verbose_name_plural = '党员信息'
        ordering = ['party_branch', 'full_name', '-updated_at', '-id']

    def __str__(self):
        return f'{self.full_name} - {self.member_type}'


class PartyMemberTransferRecord(models.Model):
    TYPE_TRANSFER_IN = '转入'
    TYPE_TRANSFER_OUT = '转出'
    TYPE_BRANCH_CHANGE = '组织关系转接'
    TYPE_STATUS_CHANGE = '状态变更'
    TRANSFER_TYPE_CHOICES = [
        (TYPE_TRANSFER_IN, '转入'),
        (TYPE_TRANSFER_OUT, '转出'),
        (TYPE_BRANCH_CHANGE, '组织关系转接'),
        (TYPE_STATUS_CHANGE, '状态变更'),
    ]

    party_member = models.ForeignKey(
        PartyMember,
        verbose_name='党员',
        on_delete=models.CASCADE,
        related_name='transfer_records',
    )
    transfer_type = models.CharField('流转类型', max_length=32, choices=TRANSFER_TYPE_CHOICES, default=TYPE_BRANCH_CHANGE)
    transfer_date = models.DateField('流转日期')
    from_branch = models.CharField('转出组织', max_length=64, blank=True)
    to_branch = models.CharField('转入组织', max_length=64, blank=True)
    reason = models.CharField('原因', max_length=255, blank=True)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '党员流转记录'
        verbose_name_plural = '党员流转记录'
        ordering = ['-transfer_date', '-id']

    def __str__(self):
        return f'{self.party_member.full_name} - {self.transfer_type}'


class PartyMemberPositionRecord(models.Model):
    party_member = models.ForeignKey(
        PartyMember,
        verbose_name='党员',
        on_delete=models.CASCADE,
        related_name='position_records',
    )
    branch_name = models.CharField('党组织', max_length=64, blank=True)
    position_name = models.CharField('职务名称', max_length=64)
    start_date = models.DateField('开始日期', null=True, blank=True)
    end_date = models.DateField('结束日期', null=True, blank=True)
    is_current = models.BooleanField('是否当前职务', default=False)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '党员任职记录'
        verbose_name_plural = '党员任职记录'
        ordering = ['-is_current', '-start_date', '-id']

    def __str__(self):
        return f'{self.party_member.full_name} - {self.position_name}'


class PartyFeeRecord(models.Model):
    PAYMENT_STATUS_PENDING = '待缴纳'
    PAYMENT_STATUS_PAID = '已缴纳'
    PAYMENT_STATUS_CHOICES = [
        (PAYMENT_STATUS_PENDING, '待缴纳'),
        (PAYMENT_STATUS_PAID, '已缴纳'),
    ]

    party_member = models.ForeignKey(
        PartyMember,
        verbose_name='党员',
        on_delete=models.CASCADE,
        related_name='fee_records',
    )
    fee_year = models.PositiveIntegerField('年度')
    fee_month = models.PositiveIntegerField('月份')
    amount_due = models.DecimalField('应缴金额', max_digits=8, decimal_places=2, default=Decimal('0.00'))
    amount_paid = models.DecimalField('实缴金额', max_digits=8, decimal_places=2, default=Decimal('0.00'))
    payment_status = models.CharField('缴纳状态', max_length=16, choices=PAYMENT_STATUS_CHOICES, default=PAYMENT_STATUS_PENDING)
    payment_date = models.DateField('缴纳日期', null=True, blank=True)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '党费缴纳记录'
        verbose_name_plural = '党费缴纳记录'
        ordering = ['-fee_year', '-fee_month', 'party_member__full_name', '-id']
        constraints = [
            models.UniqueConstraint(fields=['party_member', 'fee_year', 'fee_month'], name='unique_party_fee_month'),
        ]

    def __str__(self):
        return f'{self.party_member.full_name} {self.fee_year}-{self.fee_month}'


class TodoReminder(models.Model):
    TYPE_TASK = '任务'
    TYPE_BIRTHDAY = '生日'
    TYPE_EVENT = '事件'
    TYPE_SYSTEM = '系统'
    TYPE_CHOICES = [
        (TYPE_TASK, '任务'),
        (TYPE_BIRTHDAY, '生日'),
        (TYPE_EVENT, '事件'),
        (TYPE_SYSTEM, '系统'),
    ]

    PROGRESS_NOT_STARTED = '未开始'
    PROGRESS_IN_PROGRESS = '处理中'
    PROGRESS_COMPLETED = '已完成'
    PROGRESS_CHOICES = [
        (PROGRESS_NOT_STARTED, '未开始'),
        (PROGRESS_IN_PROGRESS, '处理中'),
        (PROGRESS_COMPLETED, '已完成'),
    ]

    SOURCE_MANUAL = 'manual'
    SOURCE_BIRTHDAY_RULE = 'birthday_rule'
    SOURCE_PARTY_FEE_RULE = 'party_fee_rule'
    SOURCE_CHOICES = [
        (SOURCE_MANUAL, '手工创建'),
        (SOURCE_BIRTHDAY_RULE, '生日规则'),
        (SOURCE_PARTY_FEE_RULE, '党费规则'),
    ]

    title = models.CharField('标题', max_length=128)
    content = models.TextField('内容', blank=True)
    reminder_type = models.CharField('类型', max_length=16, choices=TYPE_CHOICES, default=TYPE_TASK)
    progress = models.CharField('进度', max_length=16, choices=PROGRESS_CHOICES, default=PROGRESS_NOT_STARTED)
    reminder_at = models.DateTimeField('提醒时间', null=True, blank=True, db_index=True)
    is_read = models.BooleanField('是否已读', default=False)
    read_at = models.DateTimeField('已读时间', null=True, blank=True)
    source_type = models.CharField('来源类型', max_length=32, choices=SOURCE_CHOICES, default=SOURCE_MANUAL)
    source_identifier = models.CharField('来源唯一标识', max_length=128, unique=True, null=True, blank=True)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '待办提醒'
        verbose_name_plural = '待办提醒'
        ordering = ['is_read', 'reminder_at', '-created_at', '-id']

    def __str__(self):
        return f'{self.title} - {self.reminder_type}'


class ReminderRule(models.Model):
    CATEGORY_BIRTHDAY = 'birthday'
    CATEGORY_PARTY_FEE = 'party_fee'
    CATEGORY_CHOICES = [
        (CATEGORY_BIRTHDAY, '生日提醒'),
        (CATEGORY_PARTY_FEE, '党费提醒'),
    ]

    category = models.CharField('规则分类', max_length=16, choices=CATEGORY_CHOICES, default=CATEGORY_BIRTHDAY)
    rule_name = models.CharField('规则名称', max_length=64)
    age_value = models.PositiveIntegerField('年龄条件', null=True, blank=True)
    remind_days = models.PositiveIntegerField('提前提醒天数', default=0)
    reminder_time = models.TimeField('提醒时间', null=True, blank=True)
    reminder_day = models.PositiveIntegerField('提醒日期', null=True, blank=True)
    is_month_end = models.BooleanField('是否月底提醒', default=False)
    is_enabled = models.BooleanField('是否启用', default=True)
    notes = models.TextField('备注', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '提醒规则'
        verbose_name_plural = '提醒规则'
        ordering = ['category', '-is_enabled', 'rule_name', '-id']

    def __str__(self):
        return f'{self.get_category_display()} - {self.rule_name}'


class UISettings(models.Model):
    LOGO_MODE_IMAGE = 'image'
    LOGO_MODE_TEXT = 'text'
    LOGO_MODE_BOTH = 'both'

    LOGO_MODE_CHOICES = [
        (LOGO_MODE_IMAGE, '仅图片'),
        (LOGO_MODE_TEXT, '仅文字'),
        (LOGO_MODE_BOTH, '图片+文字'),
    ]

    system_title = models.CharField('系统标题', max_length=128, default='村务管理系统')
    logo_mode = models.CharField('Logo显示方式', max_length=16, choices=LOGO_MODE_CHOICES, default=LOGO_MODE_BOTH)
    logo_text = models.CharField('Logo文字', max_length=128, blank=True, default='村务管理系统')
    logo_image = models.ImageField('Logo图片', upload_to='ui_settings/', blank=True, null=True)
    favicon = models.ImageField('浏览器图标', upload_to='ui_settings/', blank=True, null=True)
    village_overview = models.TextField('村情概况', blank=True)
    village_image = models.ImageField('村情概况图片', upload_to='ui_settings/', blank=True, null=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '界面设置'
        verbose_name_plural = '界面设置'

    def __str__(self):
        return self.system_title or '界面设置'


class OperationLog(models.Model):
    RESULT_SUCCESS = '成功'
    RESULT_FAILED = '失败'
    RESULT_CHOICES = [
        (RESULT_SUCCESS, '成功'),
        (RESULT_FAILED, '失败'),
    ]

    module = models.CharField('模块', max_length=64, db_index=True)
    action = models.CharField('操作', max_length=32)
    operator = models.CharField('操作人', max_length=64, default='系统管理员')
    summary = models.CharField('摘要', max_length=255)
    target = models.CharField('对象', max_length=128, blank=True)
    result = models.CharField('结果', max_length=8, choices=RESULT_CHOICES, default=RESULT_SUCCESS)
    detail = models.TextField('详情', blank=True)
    ip_address = models.CharField('IP地址', max_length=64, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = '操作日志'
        verbose_name_plural = '操作日志'
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'{self.module} - {self.action} - {self.result}'


class DatabaseBackupRecord(models.Model):
    STATUS_SUCCESS = '成功'
    STATUS_FAILED = '失败'
    STATUS_CHOICES = [
        (STATUS_SUCCESS, '成功'),
        (STATUS_FAILED, '失败'),
    ]

    file_name = models.CharField('文件名', max_length=255)
    file_path = models.CharField('文件路径', max_length=512)
    file_size = models.BigIntegerField('文件大小', default=0)
    record_count = models.PositiveIntegerField('记录数', default=0)
    created_by = models.CharField('创建人', max_length=64, default='系统管理员')
    status = models.CharField('状态', max_length=8, choices=STATUS_CHOICES, default=STATUS_SUCCESS)
    error_message = models.TextField('错误信息', blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = '数据库备份记录'
        verbose_name_plural = '数据库备份记录'
        ordering = ['-created_at', '-id']

    def __str__(self):
        return self.file_name

class SystemActivation(models.Model):
    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=255, verbose_name="激活码")
    activated_at = models.DateTimeField(auto_now_add=True, verbose_name="激活时间")
    expire_at = models.DateTimeField(verbose_name="到期时间")
    is_active = models.BooleanField(default=True, verbose_name="是否激活")

    class Meta:
        db_table = 'village_system_activation'
        verbose_name = '系统激活'
        verbose_name_plural = '系统激活'
        ordering = ['-activated_at']

class Role(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=50, verbose_name="角色名称")
    code = models.CharField(max_length=50, unique=True, verbose_name="角色编码")
    desc = models.TextField(blank=True, null=True, verbose_name="描述")
    permissions = models.JSONField(default=list, verbose_name="权限列表")
    status = models.BooleanField(default=True, verbose_name="状态")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = 'village_role'
        verbose_name = '角色'
        verbose_name_plural = '角色'
        ordering = ['-created_at']

class SystemUser(models.Model):
    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True, verbose_name="用户名")
    password = models.CharField(max_length=128, verbose_name="密码")
    name = models.CharField(max_length=50, verbose_name="姓名")
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="角色")
    status = models.BooleanField(default=True, verbose_name="状态")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        db_table = 'village_system_user'
        verbose_name = '系统用户'
        verbose_name_plural = '系统用户'
        ordering = ['-created_at']

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)
