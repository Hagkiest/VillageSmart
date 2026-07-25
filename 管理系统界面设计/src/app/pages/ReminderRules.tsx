import { useEffect, useMemo, useState } from "react";
import { fetchJson, postJson, putJson, deleteJson } from "../lib/api";
import { dialog } from "../lib/dialog";

type RuleItem = {
  id: number;
  category: "birthday" | "party_fee";
  rule_name: string;
  age_value: number | null;
  age_condition_label: string;
  remind_days: number;
  reminder_time: string;
  reminder_day: number | null;
  reminder_date_label: string;
  is_month_end: boolean;
  is_enabled: boolean;
  notes: string;
};

type RulePayload = {
  birthday_rules: RuleItem[];
  party_fee_rules: RuleItem[];
};

type RuleFormState = {
  category: "birthday" | "party_fee";
  rule_name: string;
  age_value: string;
  remind_days: string;
  reminder_time: string;
  reminder_day: string;
  is_month_end: boolean;
  is_enabled: boolean;
  notes: string;
};

const DEFAULT_FORM: RuleFormState = {
  category: "birthday",
  rule_name: "",
  age_value: "",
  remind_days: "0",
  reminder_time: "09:00:00",
  reminder_day: "",
  is_month_end: true,
  is_enabled: true,
  notes: "",
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{ width: 36, height: 20, background: checked ? "#1677ff" : "#dcdfe6" }}
    >
      <div
        className="absolute top-0.5 rounded-full bg-white transition-transform"
        style={{ width: 16, height: 16, transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function InfoNote({ text }: { text: string }) {
  return (
    <div className="mt-3 flex gap-2 rounded px-3 py-2.5 text-xs leading-relaxed" style={{ background: "#f8f9fa", color: "#909399" }}>
      <span className="flex-shrink-0">①</span>
      <span>{text}</span>
    </div>
  );
}

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm" style={{ color: "#606266" }}>
      {required && <span style={{ color: "#f56c6c", marginRight: 4 }}>*</span>}
      {text}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-2xl rounded bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-base font-medium" style={{ color: "#303133" }}>{title}</div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm" style={{ color: "#909399" }}>
            关闭
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function ReminderRules() {
  const [data, setData] = useState<RulePayload>({ birthday_rules: [], party_fee_rules: [] });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingRule, setEditingRule] = useState<RuleItem | null>(null);
  const [form, setForm] = useState<RuleFormState>(DEFAULT_FORM);

  const modalTitle = useMemo(() => {
    if (!editingRule) {
      return "新增党费提醒";
    }
    return "编辑党费提醒";
  }, [editingRule]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const payload = await fetchJson<RulePayload>("/api/reminder-rules/");
      setData(payload);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openCreate = (category: "birthday" | "party_fee") => {
    setEditingRule(null);
    setForm({
      ...DEFAULT_FORM,
      category,
      rule_name: category === "birthday" ? "生日提醒" : "党费提醒",
    });
  };

  const openEdit = (item: RuleItem) => {
    setEditingRule(item);
    setForm({
      category: item.category,
      rule_name: item.rule_name,
      age_value: item.age_value ? String(item.age_value) : "",
      remind_days: String(item.remind_days ?? 0),
      reminder_time: item.reminder_time || "09:00:00",
      reminder_day: item.reminder_day ? String(item.reminder_day) : "",
      is_month_end: item.is_month_end,
      is_enabled: item.is_enabled,
      notes: item.notes || "",
    });
  };

  const closeModal = () => {
    setEditingRule(null);
    setForm(DEFAULT_FORM);
  };

  const saveRule = async () => {
    try {
      setErrorMessage("");
      const payload = {
        ...form,
        age_value: form.age_value ? Number(form.age_value) : "",
        remind_days: form.remind_days ? Number(form.remind_days) : 0,
        reminder_day: form.reminder_day ? Number(form.reminder_day) : "",
      };
      if (editingRule) {
        await putJson(`/api/reminder-rules/${editingRule.id}/`, payload);
        setSuccessMessage("提醒规则更新成功");
      } else {
        await postJson("/api/reminder-rules/create/", payload);
        setSuccessMessage("提醒规则创建成功");
      }
      closeModal();
      await loadData();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleDelete = async (item: RuleItem) => {
    if (!await dialog.confirm("确定要删除这条提醒规则吗？")) {
      return;
    }
    try {
      const payload = await deleteJson<{ message: string }>(`/api/reminder-rules/${item.id}/`);
      setSuccessMessage(payload.message);
      await loadData();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleToggle = async (item: RuleItem, nextValue: boolean) => {
    try {
      await putJson(`/api/reminder-rules/${item.id}/`, {
        category: item.category,
        rule_name: item.rule_name,
        age_value: item.age_value ?? "",
        remind_days: item.remind_days,
        reminder_time: item.reminder_time,
        reminder_day: item.reminder_day ?? "",
        is_month_end: item.is_month_end,
        is_enabled: nextValue,
        notes: item.notes,
      });
      setSuccessMessage(nextValue ? "规则已启用" : "规则已停用");
      await loadData();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="mb-0.5 text-sm font-medium" style={{ color: "#303133" }}>提醒规则</h2>
        <p className="text-xs" style={{ color: "#909399" }}>当前仅保留党费缴纳提醒，生日关怀已取消</p>
      </div>

      {(errorMessage || successMessage) && (
        <div className="mb-3 space-y-2">
          {errorMessage && (
            <div className="rounded px-3 py-2 text-xs" style={{ background: "#fff2f0", color: "#cf1322", border: "1px solid #ffccc7" }}>
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="rounded px-3 py-2 text-xs" style={{ background: "#f6ffed", color: "#389e0d", border: "1px solid #b7eb8f" }}>
              {successMessage}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded border bg-white p-4" style={{ borderColor: "#e4e7ed" }}>
          <div className="mb-3">
            <div>
              <h3 className="text-sm font-medium" style={{ color: "#303133" }}>生日关怀</h3>
              <p className="mt-0.5 text-xs" style={{ color: "#909399" }}>该功能已取消，系统不再生成生日提醒</p>
            </div>
          </div>
          <div className="rounded border px-4 py-5 text-sm" style={{ borderColor: "#f0f0f0", background: "#fafafa", color: "#909399" }}>
            已停用生日提醒规则，并清理已有生日提醒事项。
          </div>
          <InfoNote text="如果之前列表里有生日提醒，进入待办页后会自动清理，不再继续生成。" />
        </div>

        <div className="rounded border bg-white p-4" style={{ borderColor: "#e4e7ed" }}>
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium" style={{ color: "#303133" }}>党费提醒</h3>
              <p className="mt-0.5 text-xs" style={{ color: "#909399" }}>根据已生成的党费清单统计未缴数及生成提醒</p>
            </div>
            <button type="button" onClick={() => openCreate("party_fee")} className="rounded px-3 py-1 text-sm text-white" style={{ background: "#1677ff" }}>
              新增
            </button>
          </div>

          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["规则名称", "提醒日期", "提醒时间", "启用", "操作"].map((col) => (
                  <th key={col} className="px-3 py-2 text-left whitespace-nowrap" style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500, fontSize: 13 }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm" style={{ color: "#909399" }}>加载中...</td>
                </tr>
              ) : data.party_fee_rules.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td className="px-3 py-2.5" style={{ color: "#303133", fontSize: 13 }}>{item.rule_name}</td>
                  <td className="px-3 py-2.5" style={{ color: "#606266", fontSize: 13 }}>{item.reminder_date_label}</td>
                  <td className="px-3 py-2.5" style={{ color: "#606266", fontSize: 13 }}>{item.reminder_time}</td>
                  <td className="px-3 py-2.5"><Toggle checked={item.is_enabled} onChange={(value) => void handleToggle(item, value)} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => openEdit(item)} className="text-sm" style={{ color: "#1677ff" }}>编辑</button>
                      <button type="button" onClick={() => void handleDelete(item)} className="text-sm" style={{ color: "#ff4d4f" }}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <InfoNote text="未生成当月党费清单时提醒先生成清单；已生成清单后按未缴记录统计待办提醒数量。" />
        </div>
      </div>

      {(editingRule !== null || form.rule_name) && (
        <Modal title={modalTitle} onClose={closeModal}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel text="规则名称" required />
              <input
                value={form.rule_name}
                onChange={(event) => setForm((current) => ({ ...current, rule_name: event.target.value }))}
                className="w-full rounded px-3 py-2 text-sm focus:outline-none"
                style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#303133" }}
              />
            </div>
            <div>
              <FieldLabel text="提醒时间" required />
              <input
                value={form.reminder_time}
                onChange={(event) => setForm((current) => ({ ...current, reminder_time: event.target.value }))}
                placeholder="09:00:00"
                className="w-full rounded px-3 py-2 text-sm focus:outline-none"
                style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#303133" }}
              />
            </div>

            {form.category === "birthday" ? (
              <>
                <div>
                  <FieldLabel text="年龄条件" required />
                  <input
                    type="number"
                    value={form.age_value}
                    onChange={(event) => setForm((current) => ({ ...current, age_value: event.target.value }))}
                    placeholder="例如 60"
                    className="w-full rounded px-3 py-2 text-sm focus:outline-none"
                    style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#303133" }}
                  />
                </div>
                <div>
                  <FieldLabel text="提醒天数" required />
                  <input
                    type="number"
                    value={form.remind_days}
                    onChange={(event) => setForm((current) => ({ ...current, remind_days: event.target.value }))}
                    placeholder="例如 7"
                    className="w-full rounded px-3 py-2 text-sm focus:outline-none"
                    style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#303133" }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="md:col-span-2">
                  <FieldLabel text="提醒日期" required />
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-sm" style={{ color: "#606266" }}>
                      <input type="radio" checked={form.is_month_end} onChange={() => setForm((current) => ({ ...current, is_month_end: true, reminder_day: "" }))} />
                      每月月底
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm" style={{ color: "#606266" }}>
                      <input type="radio" checked={!form.is_month_end} onChange={() => setForm((current) => ({ ...current, is_month_end: false }))} />
                      指定日期
                    </label>
                    {!form.is_month_end && (
                      <input
                        type="number"
                        value={form.reminder_day}
                        onChange={(event) => setForm((current) => ({ ...current, reminder_day: event.target.value }))}
                        placeholder="1-31"
                        className="w-28 rounded px-3 py-2 text-sm focus:outline-none"
                        style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#303133" }}
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm" style={{ color: "#606266" }}>
                <input
                  type="checkbox"
                  checked={form.is_enabled}
                  onChange={(event) => setForm((current) => ({ ...current, is_enabled: event.target.checked }))}
                  style={{ accentColor: "#1677ff" }}
                />
                启用规则
              </label>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-3 border-t pt-4" style={{ borderColor: "#f0f0f0" }}>
            <button type="button" onClick={() => void saveRule()} className="rounded px-6 py-2 text-sm text-white" style={{ background: "#1677ff" }}>
              保存
            </button>
            <button type="button" onClick={closeModal} className="rounded px-6 py-2 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
              取消
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
