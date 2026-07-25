import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ChevronDown, Search, User, X } from "lucide-react";
import { fetchJson, postJson, putJson } from "../lib/api";

type ResidentOption = {
  id: number;
  full_name: string;
  gender: string;
  identity_number: string;
  birth_date: string;
  age: number | null;
  ethnicity: string;
  phone: string;
  head_name: string;
  relation_to_head: string;
  village_group: string;
  household_no: string;
  household_type: string;
};

type ResidentListPayload = {
  items: ResidentOption[];
};

type FormState = {
  policy_type: string;
  benefit_level: string;
  subsidy_amount: string;
  subsidy_cycle: string;
  start_date: string;
  end_date: string;
  household_member_count: string;
  beneficiary_count: string;
  household_month_amount: string;
  status: string;
  notes: string;
};

const DEFAULT_FORM: FormState = {
  policy_type: "",
  benefit_level: "",
  subsidy_amount: "",
  subsidy_cycle: "",
  start_date: "",
  end_date: "",
  household_member_count: "",
  beneficiary_count: "1",
  household_month_amount: "",
  status: "在享",
  notes: "",
};

const POLICY_OPTIONS = ["低保", "特困供养", "低保边缘家庭", "临时救助"];
const BENEFIT_LEVEL_OPTIONS = ["A档", "B档", "C档", "一类", "二类", "三类"];
const CYCLE_OPTIONS = ["按月", "按季度", "按半年", "按年"];
const STATUS_OPTIONS = ["在享", "停享"];

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
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full appearance-none rounded px-3 py-2 pr-8 text-sm focus:outline-none disabled:cursor-not-allowed"
        style={{ border: "1px solid #dcdfe6", background: disabled ? "#f5f7fa" : "#fff", color: value ? "#303133" : "#c0c4cc" }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ width: 14, height: 14, color: "#c0c4cc" }} />
    </div>
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

export function LowIncomeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isDetail = location.pathname.includes("/detail");
  const isEdit = location.pathname.includes("/edit");

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [selectedResident, setSelectedResident] = useState<ResidentOption | null>(null);
  const [showResidentModal, setShowResidentModal] = useState(false);
  const [residentFilters, setResidentFilters] = useState({ full_name: "", identity_number: "" });
  const [residentLoading, setResidentLoading] = useState(false);
  const [residentList, setResidentList] = useState<ResidentOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(!!id);

  useEffect(() => {
    if (id) {
      setLoadingDetail(true);
      fetchJson<any>(`/api/low-income/${id}/`)
        .then((data) => {
          setForm({
            policy_type: data.policy_type || "",
            benefit_level: data.benefit_level || "",
            subsidy_amount: data.subsidy_amount || "",
            subsidy_cycle: data.subsidy_cycle || "",
            start_date: data.start_date ? data.start_date.split("T")[0] : "",
            end_date: data.end_date ? data.end_date.split("T")[0] : "",
            household_member_count: String(data.household_member_count || ""),
            beneficiary_count: String(data.beneficiary_count || ""),
            household_month_amount: data.household_month_amount || "",
            status: data.status || "在享",
            notes: data.notes || "",
          });
          setSelectedResident({
            id: data.resident_id,
            full_name: data.full_name,
            gender: data.gender,
            identity_number: data.identity_number,
            birth_date: "", // Not returned by default, can be derived or left empty
            age: data.age,
            ethnicity: data.ethnicity,
            phone: data.phone,
            head_name: data.head_name,
            relation_to_head: data.relation_to_head,
            village_group: data.village_group,
            household_no: data.household_no,
            household_type: "",
          });
        })
        .catch((error) => {
          setErrorMessage((error as Error).message);
        })
        .finally(() => setLoadingDetail(false));
    }
  }, [id]);

  useEffect(() => {
    if (!id && selectedResident && !form.household_member_count) {
      setForm((current) => ({
        ...current,
        household_member_count: current.household_member_count || "1",
        household_month_amount: current.household_month_amount || current.subsidy_amount,
      }));
    }
  }, [selectedResident, form.household_member_count, form.subsidy_amount, form.household_month_amount]);

  const residentSummary = useMemo(
    () => [
      { label: "居民姓名", value: selectedResident?.full_name ?? "" },
      { label: "身份证号", value: selectedResident?.identity_number ?? "" },
      { label: "性别", value: selectedResident?.gender ?? "" },
      { label: "出生日期", value: selectedResident?.birth_date ?? "" },
      { label: "年龄", value: selectedResident?.age == null ? "" : String(selectedResident.age) },
      { label: "联系电话", value: selectedResident?.phone ?? "" },
    ],
    [selectedResident]
  );

  const householdSummary = useMemo(
    () => [
      { label: "户主姓名", value: selectedResident?.head_name ?? "" },
      { label: "与户主关系", value: selectedResident?.relation_to_head ?? "" },
      { label: "村组", value: selectedResident?.village_group ?? "" },
      { label: "户号", value: selectedResident?.household_no ?? "" },
    ],
    [selectedResident]
  );

  const setField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
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

  const handleSubmit = async () => {
    if (!selectedResident) {
      setErrorMessage("请先选择居民。");
      return;
    }
    if (!form.policy_type) {
      setErrorMessage("请选择政策类型。");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    setMessage("");
    try {
      if (id) {
        await putJson(`/api/low-income/${id}/`, {
          resident_id: selectedResident.id,
          ...form,
        });
        setMessage("低收入人员信息已更新。");
      } else {
        await postJson("/api/low-income/create/", {
          resident_id: selectedResident.id,
          ...form,
        });
        setMessage("低收入人员信息已保存。");
      }
      setTimeout(() => navigate("/low-income"), 800);
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
          <SectionTitle title="居民基本信息" />
          <div className="mb-4 flex items-center justify-between rounded border px-4 py-3" style={{ borderColor: "#ebeef5", background: "#fafafa" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "#e6f4ff" }}>
                <User style={{ width: 18, height: 18, color: "#1677ff" }} />
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: "#303133" }}>
                  {selectedResident ? `${selectedResident.full_name} / ${selectedResident.identity_number}` : "请先选择居民"}
                </div>
                <div className="text-xs" style={{ color: "#909399" }}>
                  已自动带出居民基础信息和家庭信息
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowResidentModal(true)}
              disabled={isDetail}
              className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white disabled:opacity-50"
              style={{ background: "#1677ff" }}
            >
              <Search style={{ width: 14, height: 14 }} />
              选择居民
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {residentSummary.map((item) => (
              <div key={item.label}>
                <FieldLabel text={item.label} />
                <TextInput value={item.value} disabled />
              </div>
            ))}
          </div>
        </section>

        <div className="my-6" style={{ borderTop: "1px solid #f0f0f0" }} />

        <section>
          <SectionTitle title="低收入人员信息" />
          <div className="grid grid-cols-4 gap-4">
            <div>
              <FieldLabel text="政策类型" required />
              <SelectField value={form.policy_type} onChange={(value) => setField("policy_type", value)} options={POLICY_OPTIONS} placeholder="请选择政策类型" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="享受档次" />
              <SelectField value={form.benefit_level} onChange={(value) => setField("benefit_level", value)} options={BENEFIT_LEVEL_OPTIONS} placeholder="请选择享受档次" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="开始日期" />
              <TextInput value={form.start_date} onChange={(value) => setField("start_date", value)} type="date" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="状态" />
              <SelectField value={form.status} onChange={(value) => setField("status", value)} options={STATUS_OPTIONS} placeholder="请选择状态" disabled={isDetail} />
            </div>

            <div>
              <FieldLabel text="结束日期" />
              <TextInput value={form.end_date} onChange={(value) => setField("end_date", value)} type="date" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="补贴金额" />
              <TextInput value={form.subsidy_amount} onChange={(value) => setField("subsidy_amount", value)} placeholder="请输入补贴金额" type="number" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="补贴周期" />
              <SelectField value={form.subsidy_cycle} onChange={(value) => setField("subsidy_cycle", value)} options={CYCLE_OPTIONS} placeholder="请选择补贴周期" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="户月金额" />
              <TextInput value={form.household_month_amount} onChange={(value) => setField("household_month_amount", value)} placeholder="请输入户月金额" type="number" disabled={isDetail} />
            </div>

            <div>
              <FieldLabel text="全户人数" />
              <TextInput value={form.household_member_count} onChange={(value) => setField("household_member_count", value)} placeholder="请输入全户人数" type="number" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="享受人数" />
              <TextInput value={form.beneficiary_count} onChange={(value) => setField("beneficiary_count", value)} placeholder="请输入享受人数" type="number" disabled={isDetail} />
            </div>
            {householdSummary.map((item) => (
              <div key={item.label}>
                <FieldLabel text={item.label} />
                <TextInput value={item.value} disabled />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <FieldLabel text="备注" />
            <textarea
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
              rows={4}
              placeholder="请输入备注信息"
              disabled={isDetail}
              className="w-full rounded px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
              style={{ border: "1px solid #dcdfe6", background: isDetail ? "#f5f7fa" : "#fff", color: "#303133" }}
            />
          </div>
        </section>
      </div>

      <div className="flex items-center gap-3">
        {!isDetail && (
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
          onClick={() => navigate("/low-income")}
          className="rounded px-4 py-2 text-sm"
          style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}
        >
          {isDetail ? "返回" : "取消"}
        </button>
      </div>

      {showResidentModal && (
        <Modal title="选择居民" onClose={() => setShowResidentModal(false)}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <TextInput value={residentFilters.full_name} onChange={(value) => setResidentFilters((current) => ({ ...current, full_name: value }))} placeholder="请输入姓名" />
              <TextInput value={residentFilters.identity_number} onChange={(value) => setResidentFilters((current) => ({ ...current, identity_number: value }))} placeholder="请输入身份证号" />
              <button
                type="button"
                onClick={searchResidents}
                className="rounded px-4 py-2 text-sm text-white"
                style={{ background: "#1677ff" }}
              >
                搜索
              </button>
            </div>

            <div className="overflow-x-auto rounded border" style={{ borderColor: "#ebeef5" }}>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["姓名", "身份证号", "性别", "村组", "联系电话", "操作"].map((column) => (
                      <th key={column} className="whitespace-nowrap px-3 py-2 text-left" style={{ borderBottom: "1px solid #ebeef5", color: "#606266", fontWeight: 500 }}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {residentLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center" style={{ color: "#909399" }}>
                        搜索中...
                      </td>
                    </tr>
                  ) : residentList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center" style={{ color: "#909399" }}>
                        请输入条件后搜索居民
                      </td>
                    </tr>
                  ) : (
                    residentList.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid #f5f7fa" }}>
                        <td className="px-3 py-2">{item.full_name}</td>
                        <td className="px-3 py-2">{item.identity_number}</td>
                        <td className="px-3 py-2">{item.gender || "-"}</td>
                        <td className="px-3 py-2">{item.village_group || "-"}</td>
                        <td className="px-3 py-2">{item.phone || "-"}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedResident(item);
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
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
