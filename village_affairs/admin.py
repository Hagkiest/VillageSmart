from django.contrib import admin

from .models import (
    Household,
    PartyFeeRecord,
    PartyMember,
    PartyMemberPositionRecord,
    PartyMemberTransferRecord,
    PublicJobImportBatch,
    PublicJobRecord,
    ReminderRule,
    Resident,
    ResidentImportBatch,
    TodoReminder,
)


@admin.register(Household)
class HouseholdAdmin(admin.ModelAdmin):
    list_display = ('household_no', 'head_name', 'head_identity_number', 'village_group', 'household_type', 'grid_name')
    search_fields = ('household_no', 'head_name', 'head_identity_number', 'address')


@admin.register(Resident)
class ResidentAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'identity_number', 'gender', 'relation_to_head', 'village_group', 'household_type', 'status')
    search_fields = ('full_name', 'identity_number', 'phone')
    list_filter = ('gender', 'village_group', 'household_type', 'status')


@admin.register(ResidentImportBatch)
class ResidentImportBatchAdmin(admin.ModelAdmin):
    list_display = ('original_filename', 'status', 'total_rows', 'imported_rows', 'created_at')
    search_fields = ('original_filename',)


@admin.register(PublicJobRecord)
class PublicJobRecordAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'identity_number', 'job_name', 'department', 'status', 'subsidy_amount')
    search_fields = ('full_name', 'identity_number', 'job_name', 'department')
    list_filter = ('status', 'department', 'job_name')


@admin.register(PublicJobImportBatch)
class PublicJobImportBatchAdmin(admin.ModelAdmin):
    list_display = ('original_filename', 'status', 'total_rows', 'imported_rows', 'created_at')
    search_fields = ('original_filename',)


@admin.register(PartyMember)
class PartyMemberAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'identity_number', 'member_type', 'party_branch', 'current_position', 'status')
    search_fields = ('full_name', 'identity_number', 'phone', 'party_branch')
    list_filter = ('member_type', 'party_branch', 'status', 'source')


@admin.register(PartyMemberTransferRecord)
class PartyMemberTransferRecordAdmin(admin.ModelAdmin):
    list_display = ('party_member', 'transfer_type', 'transfer_date', 'from_branch', 'to_branch')
    search_fields = ('party_member__full_name', 'from_branch', 'to_branch', 'reason')
    list_filter = ('transfer_type',)


@admin.register(PartyMemberPositionRecord)
class PartyMemberPositionRecordAdmin(admin.ModelAdmin):
    list_display = ('party_member', 'position_name', 'branch_name', 'start_date', 'end_date', 'is_current')
    search_fields = ('party_member__full_name', 'position_name', 'branch_name')
    list_filter = ('is_current', 'branch_name')


@admin.register(PartyFeeRecord)
class PartyFeeRecordAdmin(admin.ModelAdmin):
    list_display = ('party_member', 'fee_year', 'fee_month', 'amount_due', 'amount_paid', 'payment_status')
    search_fields = ('party_member__full_name', 'party_member__identity_number')
    list_filter = ('fee_year', 'fee_month', 'payment_status')


@admin.register(TodoReminder)
class TodoReminderAdmin(admin.ModelAdmin):
    list_display = ('title', 'reminder_type', 'progress', 'is_read', 'reminder_at', 'source_type')
    search_fields = ('title', 'content')
    list_filter = ('reminder_type', 'progress', 'is_read', 'source_type')


@admin.register(ReminderRule)
class ReminderRuleAdmin(admin.ModelAdmin):
    list_display = ('rule_name', 'category', 'age_value', 'remind_days', 'reminder_day', 'is_month_end', 'is_enabled')
    search_fields = ('rule_name', 'notes')
    list_filter = ('category', 'is_enabled', 'is_month_end')
