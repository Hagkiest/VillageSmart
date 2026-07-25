import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Download, Plus, Trash2 } from "lucide-react";
import { fetchJson, postJson, putJson } from "../lib/api";

type PartyFormState = {
  name: string;
  gender: string;
  ethnicity: string;
  age: string;
  identity_number: string;
  phone: string;
  occupation: string;
  address: string;
};

type FormState = {
  archive_number: string;
  dispute_type: string;
  status: string;
  application_date: string;
  occurrence_date: string;
  occurrence_location: string;
  applicants: PartyFormState[];
  respondents: PartyFormState[];
  dispute_summary: string;
  application_requests: string[];
};

type MetadataPayload = {
  archive_number: string;
  dispute_types: string[];
  statuses: string[];
};

const EMPTY_PARTY: PartyFormState = {
  name: "",
  gender: "",
  ethnicity: "",
  age: "",
  identity_number: "",
  phone: "",
  occupation: "",
  address: "",
};

const DEFAULT_FORM: FormState = {
  archive_number: "",
  dispute_type: "",
  status: "进行中",
  application_date: "",
  occurrence_date: "",
  occurrence_location: "",
  applicants: [{ ...EMPTY_PARTY }],
  respondents: [{ ...EMPTY_PARTY }],
  dispute_summary: "",
  application_requests: ["", "", ""],
};

const TAB_ITEMS = [
  { key: "application", label: "调解申请书" },
  { key: "record", label: "调解记录" },
  { key: "agreement", label: "调解协议书" },
] as const;

const GENDER_OPTIONS = ["男", "女"];

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div style={{ width: 3, height: 14, borderRadius: 2, background: "#1677ff" }} />
        <span className="text-sm font-medium" style={{ color: "#303133" }}>
          {title}
        </span>
      </div>
      {action}
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
  options: string[];
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
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function normalizeParty(party?: Partial<PartyFormState>): PartyFormState {
  return {
    name: party?.name || "",
    gender: party?.gender || "",
    ethnicity: party?.ethnicity || "",
    age: party?.age == null || party?.age === "" ? "" : String(party.age),
    identity_number: party?.identity_number || "",
    phone: party?.phone || "",
    occupation: party?.occupation || "",
    address: party?.address || "",
  };
}

function ensureRequestLines(requests?: string[]) {
  const normalized = [...(requests || [])];
  while (normalized.length < 3) {
    normalized.push("");
  }
  return normalized.slice(0, 3);
}

export function MediationForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isDetail = location.pathname.includes("/detail");

  const [activeTab, setActiveTab] = useState<(typeof TAB_ITEMS)[number]["key"]>("application");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [disputeTypes, setDisputeTypes] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(!!id);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setLoadingMeta(true);
    fetchJson<MetadataPayload>("/api/mediations/next-archive-number/")
      .then((payload) => {
        setDisputeTypes(payload.dispute_types || []);
        setStatusOptions(payload.statuses || []);
        setForm((current) => ({
          ...current,
          archive_number: current.archive_number || payload.archive_number || "",
          status: current.status || payload.statuses?.[0] || "进行中",
        }));
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoadingMeta(false));
  }, []);

  useEffect(() => {
    if (!id) {
      setLoadingDetail(false);
      return;
    }
    setLoadingDetail(true);
    fetchJson<any>(`/api/mediations/${id}/`)
      .then((data) => {
        setForm({
          archive_number: data.archive_number || "",
          dispute_type: data.dispute_type || "",
          status: data.status || "进行中",
          application_date: data.application_date || "",
          occurrence_date: data.occurrence_date || "",
          occurrence_location: data.occurrence_location || "",
          applicants: (data.applicants || []).length ? data.applicants.map((party: PartyFormState) => normalizeParty(party)) : [{ ...EMPTY_PARTY }],
          respondents: (data.respondents || []).length ? data.respondents.map((party: PartyFormState) => normalizeParty(party)) : [{ ...EMPTY_PARTY }],
          dispute_summary: data.dispute_summary || "",
          application_requests: ensureRequestLines(data.application_requests),
        });
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoadingDetail(false));
  }, [id]);

  const pageTitle = useMemo(() => {
    if (isDetail) {
      return `调解档案 - ${form.archive_number || "--"}`;
    }
    return id ? `编辑调解档案 - ${form.archive_number || "--"}` : `调解档案 - ${form.archive_number || "--"}`;
  }, [form.archive_number, id, isDetail]);

  const setField = (key: keyof FormState, value: string | string[]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateParty = (group: "applicants" | "respondents", index: number, key: keyof PartyFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [group]: current[group].map((party, partyIndex) => (partyIndex === index ? { ...party, [key]: value } : party)),
    }));
  };

  const addParty = (group: "applicants" | "respondents") => {
    setForm((current) => ({
      ...current,
      [group]: [...current[group], { ...EMPTY_PARTY }],
    }));
  };

  const removeParty = (group: "applicants" | "respondents", index: number) => {
    setForm((current) => ({
      ...current,
      [group]: current[group].length === 1 ? current[group] : current[group].filter((_, partyIndex) => partyIndex !== index),
    }));
  };

  const updateRequestLine = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      application_requests: current.application_requests.map((line, lineIndex) => (lineIndex === index ? value : line)),
    }));
  };

  const buildPayload = () => ({
    archive_number: form.archive_number,
    dispute_type: form.dispute_type,
    status: form.status,
    application_date: form.application_date || null,
    occurrence_date: form.occurrence_date || null,
    occurrence_location: form.occurrence_location,
    applicants: form.applicants,
    respondents: form.respondents,
    dispute_summary: form.dispute_summary,
    application_requests: form.application_requests.filter((line) => line.trim()),
  });

  const validateBeforeSubmit = () => {
    if (!form.dispute_type) {
      return "请选择纠纷类型。";
    }
    if (!form.applicants.some((party) => party.name.trim())) {
      return "请至少填写一位申请人。";
    }
    if (!form.respondents.some((party) => party.name.trim())) {
      return "请至少填写一位被申请人。";
    }
    if (!form.application_requests.some((line) => line.trim())) {
      return "请至少填写一条申请事项。";
    }
    return "";
  };

  const saveForm = async (redirectToList = true) => {
    const validationMessage = validateBeforeSubmit();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return null;
    }
    setSubmitting(true);
    setErrorMessage("");
    setMessage("");
    try {
      const payload = buildPayload();
      if (id) {
        const response = await putJson<{ item: { id: number } }>(`/api/mediations/${id}/`, payload);
        setMessage("调解档案已更新。");
        if (redirectToList) {
          setTimeout(() => navigate("/mediation"), 800);
        }
        return Number(response.item.id || id);
      }
      const response = await postJson<{ item: { id: number; archive_number: string } }>("/api/mediations/create/", payload);
      setMessage("调解档案已保存。");
      if (redirectToList) {
        setTimeout(() => navigate("/mediation"), 800);
      }
      return response.item.id;
    } catch (error) {
      setErrorMessage((error as Error).message);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    await saveForm(true);
  };

  const handleDownloadApplication = async () => {
    setErrorMessage("");
    setMessage("");
    let recordId = id ? Number(id) : null;
    if (!isDetail) {
      recordId = await saveForm(false);
      if (!recordId) {
        return;
      }
      if (!id) {
        navigate(`/mediation/${recordId}/edit`, { replace: true });
      }
    }
    if (!recordId) {
      return;
    }
    window.open(`/api/mediations/${recordId}/application-document/`, "_blank");
    setMessage("调解申请书已生成，可在浏览器下载。");
  };

  const renderPartySection = (title: string, group: "applicants" | "respondents") => (
    <section>
      <SectionTitle
        title={title}
        action={
          !isDetail ? (
            <button
              type="button"
              onClick={() => addParty(group)}
              className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-sm"
              style={{ color: "#1677ff", border: "1px solid #91caff", background: "#f0f8ff" }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              新增
            </button>
          ) : null
        }
      />
      <div className="space-y-4">
        {form[group].map((party, index) => (
          <div key={`${group}-${index}`} className="rounded border px-4 py-4" style={{ borderColor: "#ebeef5", background: "#fafafa" }}>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium" style={{ color: "#1677ff" }}>
                {title.replace("信息", "")}
                {index + 1}
              </div>
              {!isDetail && form[group].length > 1 && (
                <button
                  type="button"
                  onClick={() => removeParty(group, index)}
                  className="inline-flex items-center gap-1 text-sm"
                  style={{ color: "#ff4d4f" }}
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                  删除
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <FieldLabel text="姓名" required />
                <TextInput value={party.name} onChange={(value) => updateParty(group, index, "name", value)} placeholder="请输入姓名" disabled={isDetail} />
              </div>
              <div>
                <FieldLabel text="身份证号" />
                <TextInput
                  value={party.identity_number}
                  onChange={(value) => updateParty(group, index, "identity_number", value)}
                  placeholder="身份证号"
                  disabled={isDetail}
                />
              </div>
              <div>
                <FieldLabel text="联系电话" />
                <TextInput value={party.phone} onChange={(value) => updateParty(group, index, "phone", value)} placeholder="联系电话" disabled={isDetail} />
              </div>
              <div>
                <FieldLabel text="性别" />
                <SelectField value={party.gender} onChange={(value) => updateParty(group, index, "gender", value)} options={GENDER_OPTIONS} placeholder="请选择" disabled={isDetail} />
              </div>
              <div>
                <FieldLabel text="民族" />
                <TextInput value={party.ethnicity} onChange={(value) => updateParty(group, index, "ethnicity", value)} placeholder="民族" disabled={isDetail} />
              </div>
              <div>
                <FieldLabel text="年龄" />
                <TextInput value={party.age} onChange={(value) => updateParty(group, index, "age", value)} placeholder="年龄" type="number" disabled={isDetail} />
              </div>
              <div>
                <FieldLabel text="职业/职务" />
                <TextInput value={party.occupation} onChange={(value) => updateParty(group, index, "occupation", value)} placeholder="职业或职务" disabled={isDetail} />
              </div>
              <div>
                <FieldLabel text="单位或住址" />
                <TextInput value={party.address} onChange={(value) => updateParty(group, index, "address", value)} placeholder="单位或住址" disabled={isDetail} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const isLoading = loadingDetail || loadingMeta;

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

      <div className="rounded border bg-white" style={{ borderColor: "#e4e7ed" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="flex items-center gap-2">
            <span className="text-base font-medium" style={{ color: "#303133" }}>
              {pageTitle}
            </span>
            {!id && (
              <span className="rounded px-2 py-0.5 text-xs" style={{ color: "#909399", background: "#f5f5f5" }}>
                草稿
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/mediation")}
              className="rounded px-4 py-2 text-sm"
              style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}
            >
              返回列表
            </button>
            {!isDetail && (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={submitting || isLoading}
                className="rounded px-4 py-2 text-sm text-white disabled:opacity-60"
                style={{ background: "#1677ff" }}
              >
                {submitting ? "保存中..." : "保存"}
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pt-4">
          <div className="flex items-center gap-6 border-b text-sm" style={{ borderColor: "#f0f0f0" }}>
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="pb-3"
                style={{
                  color: activeTab === tab.key ? "#1677ff" : "#909399",
                  borderBottom: activeTab === tab.key ? "2px solid #1677ff" : "2px solid transparent",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-5">
          {activeTab !== "application" ? (
            <div className="rounded border px-4 py-8 text-center text-sm" style={{ borderColor: "#ebeef5", background: "#fafafa", color: "#909399" }}>
              {activeTab === "record" ? "调解记录页签预留中，当前先完成申请书档案与下载闭环。" : "调解协议书页签预留中，当前先完成申请书档案与下载闭环。"}
            </div>
          ) : isLoading ? (
            <div className="py-16 text-center text-sm" style={{ color: "#909399" }}>
              数据加载中...
            </div>
          ) : (
            <div className="space-y-6">
              <section>
                <SectionTitle title="档案基本信息" />
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <FieldLabel text="档案编号" />
                    <TextInput value={form.archive_number} disabled />
                  </div>
                  <div>
                    <FieldLabel text="纠纷类型" required />
                    <SelectField value={form.dispute_type} onChange={(value) => setField("dispute_type", value)} options={disputeTypes} placeholder="请选择" disabled={isDetail} />
                  </div>
                  <div>
                    <FieldLabel text="发生日期" />
                    <TextInput value={form.occurrence_date} onChange={(value) => setField("occurrence_date", value)} type="date" disabled={isDetail} />
                  </div>
                  <div>
                    <FieldLabel text="申请日期" />
                    <TextInput value={form.application_date} onChange={(value) => setField("application_date", value)} type="date" disabled={isDetail} />
                  </div>
                  <div>
                    <FieldLabel text="状态" />
                    <SelectField value={form.status} onChange={(value) => setField("status", value)} options={statusOptions} placeholder="请选择" disabled={isDetail} />
                  </div>
                  <div className="col-span-3">
                    <FieldLabel text="发生地点" />
                    <TextInput value={form.occurrence_location} onChange={(value) => setField("occurrence_location", value)} placeholder="请输入地点" disabled={isDetail} />
                  </div>
                </div>
              </section>

              <div style={{ borderTop: "1px solid #f0f0f0" }} />

              {renderPartySection("申请人信息", "applicants")}

              <div style={{ borderTop: "1px solid #f0f0f0" }} />

              {renderPartySection("被申请人信息", "respondents")}

              <div style={{ borderTop: "1px solid #f0f0f0" }} />

              <section>
                <SectionTitle title="纠纷详情" />
                <div>
                  <FieldLabel text="纠纷描述" />
                  <textarea
                    value={form.dispute_summary}
                    onChange={(event) => setField("dispute_summary", event.target.value)}
                    rows={6}
                    maxLength={500}
                    placeholder="请详细描述纠纷情况"
                    disabled={isDetail}
                    className="w-full rounded px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
                    style={{ border: "1px solid #dcdfe6", background: isDetail ? "#f5f7fa" : "#fff", color: "#303133" }}
                  />
                </div>

                <div className="mt-4">
                  <FieldLabel text="申请事项" required />
                  <div className="rounded border" style={{ borderColor: "#dcdfe6", background: isDetail ? "#f5f7fa" : "#fff" }}>
                    {form.application_requests.map((line, index) => (
                      <div key={index} className="flex items-center" style={{ borderTop: index === 0 ? "none" : "1px solid #ebeef5" }}>
                        <div className="flex h-10 w-12 items-center justify-center text-sm" style={{ color: "#909399", background: "#fafafa" }}>
                          {index + 1}
                        </div>
                        <input
                          value={line}
                          onChange={(event) => updateRequestLine(index, event.target.value)}
                          disabled={isDetail}
                          placeholder="请输入申请事项"
                          className="h-10 flex-1 bg-transparent px-3 text-sm focus:outline-none disabled:cursor-not-allowed"
                          style={{ color: "#303133" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void handleDownloadApplication()}
                    disabled={submitting || isLoading}
                    className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm disabled:opacity-60"
                    style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}
                  >
                    <Download style={{ width: 14, height: 14 }} />
                    调解申请书
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
