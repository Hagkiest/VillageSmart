import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { fetchJson, postJson, putJson } from "../lib/api";

type FormState = {
  title: string;
  content: string;
  reminder_type: string;
  progress: string;
  reminder_at: string;
  notes: string;
  is_read: boolean;
};

const DEFAULT_FORM: FormState = {
  title: "",
  content: "",
  reminder_type: "任务",
  progress: "未开始",
  reminder_at: "",
  notes: "",
  is_read: false,
};

const TYPE_OPTIONS = ["任务", "事件", "系统"];
const PROGRESS_OPTIONS = ["未开始", "处理中", "已完成"];
const TODO_SUMMARY_EVENT = "todo-summary-changed";

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div style={{ width: 3, height: 14, borderRadius: 2, background: "#1677ff" }} />
      <span className="text-sm font-medium" style={{ color: "#303133" }}>
        {title}
      </span>
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

function TextInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  type = "text",
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value)}
      className="w-full rounded px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
      style={{ border: "1px solid #dcdfe6", background: disabled ? "#f5f7fa" : "#fff", color: "#303133" }}
    />
  );
}

function SelectField({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="w-full appearance-none rounded px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
      style={{ border: "1px solid #dcdfe6", background: disabled ? "#f5f7fa" : "#fff", color: "#303133" }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function toDatetimeLocal(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function TodoForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isDetail = location.pathname.includes("/detail");
  const isEdit = location.pathname.includes("/edit");

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const pageTitle = useMemo(() => {
    if (isDetail) {
      return "待办提醒详情";
    }
    if (isEdit) {
      return "编辑待办提醒";
    }
    return "新增待办提醒";
  }, [isDetail, isEdit]);

  useEffect(() => {
    if (!id) {
      return;
    }
    setLoading(true);
    setErrorMessage("");
    fetchJson<any>(`/api/todos/${id}/`)
      .then((data) => {
        setForm({
          title: data.title || "",
          content: data.content || "",
          reminder_type: data.reminder_type || "任务",
          progress: data.progress || "未开始",
          reminder_at: toDatetimeLocal(data.reminder_at),
          notes: data.notes || "",
          is_read: Boolean(data.is_read),
        });
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    if (isDetail) {
      navigate("/todos");
      return;
    }
    if (!form.title.trim()) {
      setErrorMessage("请填写待办标题");
      return;
    }
    try {
      setSaving(true);
      setErrorMessage("");
      const payload = {
        ...form,
        title: form.title.trim(),
        content: form.content.trim(),
        notes: form.notes.trim(),
        reminder_at: form.reminder_at ? new Date(form.reminder_at).toISOString() : "",
      };
      if (id) {
        await putJson(`/api/todos/${id}/`, payload);
        window.dispatchEvent(new Event(TODO_SUMMARY_EVENT));
        navigate("/todos", { state: { message: "待办提醒更新成功" } });
        return;
      }
      await postJson("/api/todos/create/", payload);
      window.dispatchEvent(new Event(TODO_SUMMARY_EVENT));
      navigate("/todos", { state: { message: "待办提醒创建成功" } });
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {(message || errorMessage) && (
        <div className="space-y-2">
          {message && (
            <div className="rounded px-3 py-2 text-xs" style={{ background: "#f6ffed", color: "#389e0d", border: "1px solid #b7eb8f" }}>
              {message}
            </div>
          )}
          {errorMessage && (
            <div className="rounded px-3 py-2 text-xs" style={{ background: "#fff2f0", color: "#cf1322", border: "1px solid #ffccc7" }}>
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="rounded border bg-white px-5 py-4" style={{ borderColor: "#e4e7ed" }}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium" style={{ color: "#303133" }}>{pageTitle}</h2>
            <p className="mt-1 text-xs" style={{ color: "#909399" }}>
              支持设置具体提醒时间，到点或逾期后会在右上角提醒图标显示数量。
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: "#909399" }}>加载中...</div>
        ) : (
          <div className="space-y-6">
            <section>
              <SectionTitle title="基本信息" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <FieldLabel text="标题" required />
                  <TextInput value={form.title} onChange={(value) => setField("title", value)} placeholder="请输入待办标题" disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="类型" required />
                  <SelectField value={form.reminder_type} onChange={(value) => setField("reminder_type", value)} options={TYPE_OPTIONS} disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="进度" required />
                  <SelectField value={form.progress} onChange={(value) => setField("progress", value)} options={PROGRESS_OPTIONS} disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="提醒时间" />
                  <TextInput value={form.reminder_at} onChange={(value) => setField("reminder_at", value)} type="datetime-local" disabled={isDetail} />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm" style={{ color: "#606266" }}>
                    <input
                      type="checkbox"
                      checked={form.is_read}
                      disabled={isDetail}
                      onChange={(event) => setField("is_read", event.target.checked)}
                      style={{ accentColor: "#1677ff" }}
                    />
                    设为已读
                  </label>
                </div>
              </div>
            </section>

            <section>
              <SectionTitle title="内容说明" />
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <FieldLabel text="待办内容" />
                  <textarea
                    value={form.content}
                    onChange={(event) => setField("content", event.target.value)}
                    disabled={isDetail}
                    rows={6}
                    placeholder="请输入待办内容"
                    className="w-full rounded px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
                    style={{ border: "1px solid #dcdfe6", background: isDetail ? "#f5f7fa" : "#fff", color: "#303133", resize: "vertical" }}
                  />
                </div>
                <div>
                  <FieldLabel text="备注" />
                  <textarea
                    value={form.notes}
                    onChange={(event) => setField("notes", event.target.value)}
                    disabled={isDetail}
                    rows={4}
                    placeholder="请输入备注"
                    className="w-full rounded px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
                    style={{ border: "1px solid #dcdfe6", background: isDetail ? "#f5f7fa" : "#fff", color: "#303133", resize: "vertical" }}
                  />
                </div>
              </div>
            </section>

            <div className="flex items-center justify-center gap-3 border-t pt-4" style={{ borderColor: "#f0f0f0" }}>
              {!isDetail && (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={saving}
                  className="rounded px-6 py-2 text-sm text-white disabled:opacity-60"
                  style={{ background: "#1677ff" }}
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate("/todos")}
                className="rounded px-6 py-2 text-sm"
                style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}
              >
                返回
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
