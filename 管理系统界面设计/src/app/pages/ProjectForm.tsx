import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { fetchJson, postJson, putJson } from "../lib/api";

type FormState = {
  project_name: string;
  project_source: string;
  project_type: string;
  secondary_type: string;
  project_status: string;
  planning_year: string;
  implementation_year: string;
  included_in_plan: string;
  responsible_person: string;
  project_location: string;
  total_investment: string;
  settled_amount: string;
  audited_amount: string;
  project_description: string;
  notes: string;
};

const DEFAULT_FORM: FormState = {
  project_name: "",
  project_source: "",
  project_type: "",
  secondary_type: "",
  project_status: "规划中",
  planning_year: String(new Date().getFullYear()),
  implementation_year: String(new Date().getFullYear()),
  included_in_plan: "false",
  responsible_person: "",
  project_location: "",
  total_investment: "",
  settled_amount: "",
  audited_amount: "",
  project_description: "",
  notes: "",
};

const PROJECT_SOURCE_OPTIONS = ["乡村振兴项目库", "财政衔接资金项目库", "行业部门项目库", "其他来源"];
const PROJECT_TYPE_OPTIONS = ["基础设施", "产业发展", "社会事业", "生态环境"];
const PROJECT_STATUS_OPTIONS = ["规划中", "实施中", "已完成", "已终止"];
const PLAN_OPTIONS = [
  { value: "true", label: "是" },
  { value: "false", label: "否" },
];

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
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="w-full appearance-none rounded px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
      style={{ border: "1px solid #dcdfe6", background: disabled ? "#f5f7fa" : "#fff", color: value ? "#303133" : "#c0c4cc" }}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => {
        const normalized = typeof option === "string" ? { value: option, label: option } : option;
        return (
          <option key={normalized.value} value={normalized.value}>
            {normalized.label}
          </option>
        );
      })}
    </select>
  );
}

export function ProjectForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isDetail = location.pathname.includes("/detail");

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(!!id);

  useEffect(() => {
    if (!id) {
      return;
    }
    setLoadingDetail(true);
    fetchJson<any>(`/api/projects/${id}/`)
      .then((data) => {
        setForm({
          project_name: data.project_name || "",
          project_source: data.project_source || "",
          project_type: data.project_type || "",
          secondary_type: data.secondary_type || "",
          project_status: data.project_status || "规划中",
          planning_year: data.planning_year ? String(data.planning_year) : "",
          implementation_year: data.implementation_year ? String(data.implementation_year) : "",
          included_in_plan: data.included_in_plan ? "true" : "false",
          responsible_person: data.responsible_person || "",
          project_location: data.project_location || "",
          total_investment: data.total_investment || "",
          settled_amount: data.settled_amount || "",
          audited_amount: data.audited_amount || "",
          project_description: data.project_description || "",
          notes: data.notes || "",
        });
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoadingDetail(false));
  }, [id]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.project_name.trim()) {
      setErrorMessage("请填写项目名称。");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    setMessage("");
    const payload = {
      ...form,
      included_in_plan: form.included_in_plan === "true",
      planning_year: form.planning_year || null,
      implementation_year: form.implementation_year || null,
    };
    try {
      if (id) {
        await putJson(`/api/projects/${id}/`, payload);
        setMessage("项目信息已更新。");
      } else {
        await postJson("/api/projects/create/", payload);
        setMessage("项目信息已保存。");
      }
      setTimeout(() => navigate("/projects"), 800);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {(message || errorMessage) && (
        <div className="space-y-2">
          {message && (
            <div className="rounded px-3 py-2 text-sm" style={{ background: "#f6ffed", color: "#389e0d", border: "1px solid #b7eb8f" }}>
              {message}
            </div>
          )}
          {errorMessage && (
            <div className="rounded px-3 py-2 text-sm" style={{ background: "#fff2f0", color: "#cf1322", border: "1px solid #ffccc7" }}>
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="rounded border bg-white px-6 py-5" style={{ borderColor: "#e4e7ed" }}>
        {loadingDetail ? (
          <div className="py-16 text-center text-sm" style={{ color: "#909399" }}>
            数据加载中...
          </div>
        ) : (
          <>
            <section>
              <SectionTitle title="项目基础信息" />
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <FieldLabel text="项目名称" required />
                  <TextInput value={form.project_name} onChange={(value) => setField("project_name", value)} placeholder="请输入项目名称" disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="项目库来源" />
                  <SelectField value={form.project_source} onChange={(value) => setField("project_source", value)} options={PROJECT_SOURCE_OPTIONS} placeholder="请选择项目库来源" disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="项目类型" />
                  <SelectField value={form.project_type} onChange={(value) => setField("project_type", value)} options={PROJECT_TYPE_OPTIONS} placeholder="请选择项目类型" disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="二级类型" />
                  <TextInput value={form.secondary_type} onChange={(value) => setField("secondary_type", value)} placeholder="请输入二级类型" disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="项目状态" />
                  <SelectField value={form.project_status} onChange={(value) => setField("project_status", value)} options={PROJECT_STATUS_OPTIONS} placeholder="请选择项目状态" disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="规划年度" />
                  <TextInput value={form.planning_year} onChange={(value) => setField("planning_year", value)} placeholder="请输入规划年度" type="number" disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="实施年度" />
                  <TextInput value={form.implementation_year} onChange={(value) => setField("implementation_year", value)} placeholder="请输入实施年度" type="number" disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="纳入计划" />
                  <SelectField value={form.included_in_plan} onChange={(value) => setField("included_in_plan", value)} options={PLAN_OPTIONS} placeholder="请选择是否纳入计划" disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="督护人/责任人" />
                  <TextInput value={form.responsible_person} onChange={(value) => setField("responsible_person", value)} placeholder="请输入责任人" disabled={isDetail} />
                </div>
                <div className="col-span-3">
                  <FieldLabel text="项目地点" />
                  <TextInput value={form.project_location} onChange={(value) => setField("project_location", value)} placeholder="请输入项目地点" disabled={isDetail} />
                </div>
              </div>
            </section>

            <div className="my-6" style={{ borderTop: "1px solid #f0f0f0" }} />

            <section>
              <SectionTitle title="投资及说明" />
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <FieldLabel text="项目预算总投资(万元)" />
                  <TextInput value={form.total_investment} onChange={(value) => setField("total_investment", value)} placeholder="请输入预算总投资" type="number" disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="结算金额(万元)" />
                  <TextInput value={form.settled_amount} onChange={(value) => setField("settled_amount", value)} placeholder="请输入结算金额" type="number" disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="决算审计金额(万元)" />
                  <TextInput value={form.audited_amount} onChange={(value) => setField("audited_amount", value)} placeholder="请输入决算审计金额" type="number" disabled={isDetail} />
                </div>
              </div>

              <div className="mt-4">
                <FieldLabel text="项目描述" />
                <textarea
                  value={form.project_description}
                  onChange={(event) => setField("project_description", event.target.value)}
                  rows={4}
                  placeholder="请输入项目描述"
                  disabled={isDetail}
                  className="w-full rounded px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
                  style={{ border: "1px solid #dcdfe6", background: isDetail ? "#f5f7fa" : "#fff", color: "#303133" }}
                />
              </div>

              <div className="mt-4">
                <FieldLabel text="备注" />
                <textarea
                  value={form.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                  rows={3}
                  placeholder="请输入备注信息"
                  disabled={isDetail}
                  className="w-full rounded px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
                  style={{ border: "1px solid #dcdfe6", background: isDetail ? "#f5f7fa" : "#fff", color: "#303133" }}
                />
              </div>
            </section>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!isDetail && !loadingDetail && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded px-4 py-2 text-sm text-white disabled:opacity-60"
            style={{ background: "#1677ff" }}
          >
            {submitting ? "保存中..." : "保存"}
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="rounded px-4 py-2 text-sm"
          style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}
        >
          {isDetail ? "返回" : "取消"}
        </button>
      </div>
    </div>
  );
}
