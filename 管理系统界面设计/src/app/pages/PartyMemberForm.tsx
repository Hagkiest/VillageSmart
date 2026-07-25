import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Plus, Search, Trash2, User, X } from "lucide-react";
import { fetchJson, postJson, putJson } from "../lib/api";

type ResidentOption = {
  id: number;
  full_name: string;
  gender: string;
  identity_number: string;
  birth_date?: string;
  age?: number | null;
  ethnicity?: string;
  phone?: string;
  address?: string;
  education_level?: string;
  political_status?: string;
};

type ResidentListPayload = {
  items: ResidentOption[];
};

type TransferRecord = {
  id?: number;
  transfer_type: string;
  transfer_date: string;
  from_branch: string;
  to_branch: string;
  reason: string;
  notes: string;
};

type PositionRecord = {
  id?: number;
  branch_name: string;
  position_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  notes: string;
};

type FormState = {
  source: "居民档案" | "手工新增";
  full_name: string;
  identity_number: string;
  gender: string;
  birth_date: string;
  ethnicity: string;
  education_level: string;
  phone: string;
  address: string;
  member_type: string;
  join_party_date: string;
  becoming_full_member_date: string;
  party_branch: string;
  current_position: string;
  monthly_party_fee: string;
  status: string;
  notes: string;
};

const DEFAULT_FORM: FormState = {
  source: "居民档案",
  full_name: "",
  identity_number: "",
  gender: "",
  birth_date: "",
  ethnicity: "",
  education_level: "",
  phone: "",
  address: "",
  member_type: "中共党员",
  join_party_date: "",
  becoming_full_member_date: "",
  party_branch: "",
  current_position: "",
  monthly_party_fee: "10.00",
  status: "正常",
  notes: "",
};

const DEFAULT_TRANSFER: TransferRecord = {
  transfer_type: "组织关系转接",
  transfer_date: "",
  from_branch: "",
  to_branch: "",
  reason: "",
  notes: "",
};

const DEFAULT_POSITION: PositionRecord = {
  branch_name: "",
  position_name: "",
  start_date: "",
  end_date: "",
  is_current: false,
  notes: "",
};

const MEMBER_TYPES = ["中共党员", "预备党员", "入党积极分子"];
const STATUS_OPTIONS = ["正常", "已转出", "停止党籍"];
const TRANSFER_TYPES = ["转入", "转出", "组织关系转接", "状态变更"];

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
      <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-base font-medium" style={{ color: "#303133" }}>
            {title}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X style={{ width: 16, height: 16, color: "#909399" }} />
          </button>
        </div>
        <div className="max-h-[calc(88vh-56px)] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function PartyMemberForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isDetail = location.pathname.includes("/detail");
  const locationMessage = (location.state as { message?: string } | null)?.message ?? "";

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [selectedResident, setSelectedResident] = useState<ResidentOption | null>(null);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [positionRecords, setPositionRecords] = useState<PositionRecord[]>([]);
  const [message, setMessage] = useState(locationMessage);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showResidentModal, setShowResidentModal] = useState(false);
  const [residentFilters, setResidentFilters] = useState({ full_name: "", identity_number: "" });
  const [residentList, setResidentList] = useState<ResidentOption[]>([]);
  const [residentLoading, setResidentLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    fetchJson<any>(`/api/party-members/${id}/`)
      .then((data) => {
        setForm({
          source: data.source || "居民档案",
          full_name: data.full_name || "",
          identity_number: data.identity_number || "",
          gender: data.gender || "",
          birth_date: data.birth_date || "",
          ethnicity: data.ethnicity || "",
          education_level: data.education_level || "",
          phone: data.phone || "",
          address: data.address || "",
          member_type: data.member_type || "中共党员",
          join_party_date: data.join_party_date || "",
          becoming_full_member_date: data.becoming_full_member_date || "",
          party_branch: data.party_branch || "",
          current_position: data.current_position || "",
          monthly_party_fee: data.monthly_party_fee || "10.00",
          status: data.status || "正常",
          notes: data.notes || "",
        });
        if (data.resident_id) {
          setSelectedResident({
            id: data.resident_id,
            full_name: data.full_name,
            gender: data.gender,
            identity_number: data.identity_number,
            birth_date: data.birth_date,
            ethnicity: data.ethnicity,
            phone: data.phone,
            address: data.address,
            education_level: data.education_level,
          });
        }
        setTransferRecords(data.transfer_records || []);
        setPositionRecords(data.position_records || []);
      })
      .catch((error) => setErrorMessage((error as Error).message));
  }, [id]);

  const residentSummary = useMemo(
    () => [
      { label: "姓名", value: selectedResident?.full_name ?? "" },
      { label: "身份证号", value: selectedResident?.identity_number ?? "" },
      { label: "性别", value: selectedResident?.gender ?? "" },
      { label: "联系电话", value: selectedResident?.phone ?? "" },
    ],
    [selectedResident]
  );

  const setField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const fillFromResident = (resident: ResidentOption) => {
    setSelectedResident(resident);
    setForm((current) => ({
      ...current,
      source: "居民档案",
      full_name: resident.full_name || "",
      identity_number: resident.identity_number || "",
      gender: resident.gender || "",
      birth_date: resident.birth_date || "",
      ethnicity: resident.ethnicity || "",
      education_level: resident.education_level || "",
      phone: resident.phone || "",
      address: resident.address || "",
      member_type: resident.political_status === "预备党员" ? "预备党员" : resident.political_status === "入党积极分子" ? "入党积极分子" : current.member_type,
    }));
  };

  const searchResidents = async () => {
    setResidentLoading(true);
    setErrorMessage("");
    try {
      const payload = await fetchJson<ResidentListPayload>("/api/residents/", {
        params: {
          ...residentFilters,
          page: 1,
          page_size: 20,
        },
      });
      setResidentList(payload.items || []);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setResidentLoading(false);
    }
  };

  const updateTransferRecord = (index: number, key: keyof TransferRecord, value: string) => {
    setTransferRecords((current) => current.map((item, currentIndex) => (currentIndex === index ? { ...item, [key]: value } : item)));
  };

  const updatePositionRecord = (index: number, key: keyof PositionRecord, value: string | boolean) => {
    setPositionRecords((current) =>
      current.map((item, currentIndex) => {
        if (currentIndex !== index) {
          return key === "is_current" && value === true ? { ...item, is_current: false } : item;
        }
        return { ...item, [key]: value };
      })
    );
  };

  const buildPayload = () => ({
    source: form.source,
    ...(form.source === "居民档案" && selectedResident ? { resident_id: selectedResident.id } : {}),
    full_name: form.full_name,
    identity_number: form.identity_number,
    gender: form.gender,
    birth_date: form.birth_date,
    ethnicity: form.ethnicity,
    education_level: form.education_level,
    phone: form.phone,
    address: form.address,
    member_type: form.member_type,
    join_party_date: form.join_party_date,
    becoming_full_member_date: form.becoming_full_member_date,
    party_branch: form.party_branch,
    current_position: form.current_position,
    monthly_party_fee: form.monthly_party_fee,
    status: form.status,
    notes: form.notes,
    transfer_records: transferRecords,
    position_records: positionRecords,
  });

  const handleSubmit = async () => {
    if (form.source === "居民档案" && !selectedResident?.id) {
      setErrorMessage("请先查询并选择居民。");
      return;
    }
    if (!form.full_name || !form.identity_number || !form.member_type) {
      setErrorMessage("请先补全党员基本信息。");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    setMessage("");
    try {
      const payload = buildPayload();
      if (id) {
        await putJson(`/api/party-members/${id}/`, payload);
        setMessage("党员档案已保存。");
      } else {
        const result = await postJson<{ item: { id: number } }>("/api/party-members/create/", payload);
        navigate(`/party-members/${result.item.id}/edit`, {
          state: { message: "党员已创建，请继续补充详情、流转记录和任职记录。" },
        });
        return;
      }
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
        <section>
          <SectionTitle title="党员对象" />
          <div className="mb-4 flex items-center gap-8">
            {["居民档案", "手工新增"].map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm" style={{ color: "#303133" }}>
                <input
                  type="radio"
                  name="source"
                  value={option}
                  checked={form.source === option}
                  disabled={isDetail}
                  onChange={() => setField("source", option as FormState["source"])}
                  style={{ accentColor: "#1677ff" }}
                />
                {option}
              </label>
            ))}
          </div>

          <div className="mb-4 flex items-center justify-between rounded border px-4 py-3" style={{ borderColor: "#ebeef5", background: "#fafafa" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "#e6f4ff" }}>
                <User style={{ width: 18, height: 18, color: "#1677ff" }} />
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: "#303133" }}>
                  {form.source === "居民档案" ? (selectedResident ? `${selectedResident.full_name} / ${selectedResident.identity_number}` : "请先查询并选择居民") : "手工新增党员档案"}
                </div>
                <div className="text-xs" style={{ color: "#909399" }}>
                  {form.source === "居民档案" ? "从居民档案带入基础信息，仍可继续完善党员字段" : "非本村户籍党员可直接手工录入"}
                </div>
              </div>
            </div>
            {form.source === "居民档案" && (
              <button
                type="button"
                onClick={() => setShowResidentModal(true)}
                disabled={isDetail}
                className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white disabled:opacity-50"
                style={{ background: "#1677ff" }}
              >
                <Search style={{ width: 14, height: 14 }} />
                查询居民
              </button>
            )}
          </div>

          {form.source === "居民档案" && selectedResident && (
            <div className="mb-4 grid grid-cols-4 gap-4">
              {residentSummary.map((item) => (
                <div key={item.label}>
                  <FieldLabel text={item.label} />
                  <TextInput value={item.value} disabled />
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="my-6" style={{ borderTop: "1px solid #f0f0f0" }} />

        <section>
          <SectionTitle title="党员基本信息" />
          <div className="grid grid-cols-4 gap-4">
            <div>
              <FieldLabel text="姓名" required />
              <TextInput value={form.full_name} onChange={(value) => setField("full_name", value)} disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="身份证号" required />
              <TextInput value={form.identity_number} onChange={(value) => setField("identity_number", value)} disabled={isDetail || form.source === "居民档案"} />
            </div>
            <div>
              <FieldLabel text="性别" />
              <TextInput value={form.gender} onChange={(value) => setField("gender", value)} disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="出生日期" />
              <TextInput value={form.birth_date} onChange={(value) => setField("birth_date", value)} type="date" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="民族" />
              <TextInput value={form.ethnicity} onChange={(value) => setField("ethnicity", value)} disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="学历" />
              <TextInput value={form.education_level} onChange={(value) => setField("education_level", value)} disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="手机号码" />
              <TextInput value={form.phone} onChange={(value) => setField("phone", value)} disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="现居住址" />
              <TextInput value={form.address} onChange={(value) => setField("address", value)} disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="人员类别" required />
              <SelectField value={form.member_type} onChange={(value) => setField("member_type", value)} options={MEMBER_TYPES} placeholder="请选择人员类别" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="入党日期" />
              <TextInput value={form.join_party_date} onChange={(value) => setField("join_party_date", value)} type="date" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="转正日期" />
              <TextInput value={form.becoming_full_member_date} onChange={(value) => setField("becoming_full_member_date", value)} type="date" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="所在党支部" />
              <TextInput value={form.party_branch} onChange={(value) => setField("party_branch", value)} disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="当前职务" />
              <TextInput value={form.current_position} onChange={(value) => setField("current_position", value)} disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="默认月党费" />
              <TextInput value={form.monthly_party_fee} onChange={(value) => setField("monthly_party_fee", value)} type="number" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="状态" />
              <SelectField value={form.status} onChange={(value) => setField("status", value)} options={STATUS_OPTIONS} placeholder="请选择状态" disabled={isDetail} />
            </div>
          </div>
          <div className="mt-4">
            <FieldLabel text="备注" />
            <textarea
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
              rows={4}
              disabled={isDetail}
              className="w-full rounded px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
              style={{ border: "1px solid #dcdfe6", background: isDetail ? "#f5f7fa" : "#fff", color: "#303133" }}
            />
          </div>
        </section>

        <div className="my-6" style={{ borderTop: "1px solid #f0f0f0" }} />

        <section>
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle title="流转记录" />
            {!isDetail && (
              <button type="button" onClick={() => setTransferRecords((current) => [...current, { ...DEFAULT_TRANSFER }])} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white" style={{ background: "#1677ff" }}>
                <Plus style={{ width: 13, height: 13 }} />
                新增流转记录
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse", border: "1px solid #e4e7ed" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["流转类型", "流转日期", "转出组织", "转入组织", "原因", "备注", "操作"].map((column) => (
                    <th key={column} className="px-3 py-2.5 text-left" style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500 }}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transferRecords.length ? (
                  transferRecords.map((item, index) => (
                    <tr key={`${item.id ?? "new"}-${index}`} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td className="px-3 py-2.5"><SelectField value={item.transfer_type} onChange={(value) => updateTransferRecord(index, "transfer_type", value)} options={TRANSFER_TYPES} placeholder="请选择" disabled={isDetail} /></td>
                      <td className="px-3 py-2.5"><TextInput value={item.transfer_date} onChange={(value) => updateTransferRecord(index, "transfer_date", value)} type="date" disabled={isDetail} /></td>
                      <td className="px-3 py-2.5"><TextInput value={item.from_branch} onChange={(value) => updateTransferRecord(index, "from_branch", value)} disabled={isDetail} /></td>
                      <td className="px-3 py-2.5"><TextInput value={item.to_branch} onChange={(value) => updateTransferRecord(index, "to_branch", value)} disabled={isDetail} /></td>
                      <td className="px-3 py-2.5"><TextInput value={item.reason} onChange={(value) => updateTransferRecord(index, "reason", value)} disabled={isDetail} /></td>
                      <td className="px-3 py-2.5"><TextInput value={item.notes} onChange={(value) => updateTransferRecord(index, "notes", value)} disabled={isDetail} /></td>
                      <td className="px-3 py-2.5">
                        {!isDetail && (
                          <button type="button" onClick={() => setTransferRecords((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="text-sm" style={{ color: "#ff4d4f" }}>
                            删除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center" style={{ color: "#909399" }}>暂无流转记录</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="my-6" style={{ borderTop: "1px solid #f0f0f0" }} />

        <section>
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle title="任职记录" />
            {!isDetail && (
              <button type="button" onClick={() => setPositionRecords((current) => [...current, { ...DEFAULT_POSITION, branch_name: form.party_branch }])} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white" style={{ background: "#1677ff" }}>
                <Plus style={{ width: 13, height: 13 }} />
                新增职务
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse", border: "1px solid #e4e7ed" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["党组织", "职务名称", "开始日期", "结束日期", "当前职务", "备注", "操作"].map((column) => (
                    <th key={column} className="px-3 py-2.5 text-left" style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500 }}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positionRecords.length ? (
                  positionRecords.map((item, index) => (
                    <tr key={`${item.id ?? "new"}-${index}`} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td className="px-3 py-2.5"><TextInput value={item.branch_name} onChange={(value) => updatePositionRecord(index, "branch_name", value)} disabled={isDetail} /></td>
                      <td className="px-3 py-2.5"><TextInput value={item.position_name} onChange={(value) => updatePositionRecord(index, "position_name", value)} disabled={isDetail} /></td>
                      <td className="px-3 py-2.5"><TextInput value={item.start_date} onChange={(value) => updatePositionRecord(index, "start_date", value)} type="date" disabled={isDetail} /></td>
                      <td className="px-3 py-2.5"><TextInput value={item.end_date} onChange={(value) => updatePositionRecord(index, "end_date", value)} type="date" disabled={isDetail} /></td>
                      <td className="px-3 py-2.5">
                        <input type="checkbox" checked={item.is_current} disabled={isDetail} onChange={(event) => updatePositionRecord(index, "is_current", event.target.checked)} />
                      </td>
                      <td className="px-3 py-2.5"><TextInput value={item.notes} onChange={(value) => updatePositionRecord(index, "notes", value)} disabled={isDetail} /></td>
                      <td className="px-3 py-2.5">
                        {!isDetail && (
                          <button type="button" onClick={() => setPositionRecords((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="text-sm" style={{ color: "#ff4d4f" }}>
                            删除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center" style={{ color: "#909399" }}>暂无任职记录</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="flex items-center gap-3">
        {!isDetail && (
          <button type="button" onClick={() => void handleSubmit()} disabled={submitting} className="rounded px-4 py-2 text-sm text-white disabled:opacity-60" style={{ background: "#1677ff" }}>
            {submitting ? "保存中..." : id ? "保存" : "创建党员"}
          </button>
        )}
        {id && !isDetail && (
          <button type="button" onClick={() => navigate(`/party-members/${id}/detail`)} className="rounded px-4 py-2 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
            查看详情
          </button>
        )}
        <button type="button" onClick={() => navigate("/party-members")} className="rounded px-4 py-2 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
          返回列表
        </button>
      </div>

      {showResidentModal && (
        <Modal title="查询居民" onClose={() => setShowResidentModal(false)}>
          <div className="mb-4 flex items-center gap-2">
            <input value={residentFilters.full_name} onChange={(event) => setResidentFilters((current) => ({ ...current, full_name: event.target.value }))} placeholder="居民姓名" className="rounded px-3 py-2 text-sm focus:outline-none" style={{ width: 180, border: "1px solid #dcdfe6" }} />
            <input value={residentFilters.identity_number} onChange={(event) => setResidentFilters((current) => ({ ...current, identity_number: event.target.value }))} placeholder="身份证号" className="rounded px-3 py-2 text-sm focus:outline-none" style={{ width: 220, border: "1px solid #dcdfe6" }} />
            <button type="button" onClick={() => void searchResidents()} className="inline-flex items-center gap-1 rounded px-3 py-2 text-sm text-white" style={{ background: "#1677ff" }}>
              <Search style={{ width: 13, height: 13 }} />
              查询
            </button>
          </div>
          <table className="w-full text-sm" style={{ borderCollapse: "collapse", border: "1px solid #e4e7ed" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["姓名", "身份证号", "性别", "联系电话", "操作"].map((column) => (
                  <th key={column} className="px-3 py-2.5 text-left" style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500 }}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {residentList.length ? (
                residentList.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td className="px-3 py-2.5">{item.full_name}</td>
                    <td className="px-3 py-2.5">{item.identity_number}</td>
                    <td className="px-3 py-2.5">{item.gender || "-"}</td>
                    <td className="px-3 py-2.5">{item.phone || "-"}</td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          fillFromResident(item);
                          setShowResidentModal(false);
                        }}
                        className="text-sm"
                        style={{ color: "#1677ff" }}
                      >
                        选择
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center" style={{ color: "#909399" }}>
                    {residentLoading ? "查询中..." : "暂无居民数据"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}
