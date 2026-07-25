import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ChevronDown, Info, Search, X } from "lucide-react";
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
  bank_account?: string;
  bank_name?: string;
};

type ResidentListPayload = {
  items: ResidentOption[];
};

type FormState = {
  grant_year: string;
  batch_name: string;
  subsidy_type: string;
  bank_account: string;
  bank_name: string;
  admin_village: string;
  village_group: string;
  household_population: string;
  subsidy_item: string;
  subsidy_standard: string;
  unit: string;
  declared_amount: string;
  actual_amount: string;
  payment_status: string;
  payment_date: string;
  notes: string;
  // 耕地地力保护补贴 specific fields
  confirmed_area: string;
  total_declared_area: string;
  rice: string;
  corn: string;
  wheat: string;
  other_crop: string;
};

const DEFAULT_FORM: FormState = {
  grant_year: String(new Date().getFullYear()),
  batch_name: "",
  subsidy_type: "",
  bank_account: "",
  bank_name: "",
  admin_village: "",
  village_group: "",
  household_population: "1",
  subsidy_item: "",
  subsidy_standard: "",
  unit: "",
  declared_amount: "",
  actual_amount: "",
  payment_status: "待发放",
  payment_date: "",
  notes: "",
  confirmed_area: "",
  total_declared_area: "",
  rice: "",
  corn: "",
  wheat: "",
  other_crop: "",
};

const SUBSIDY_TYPES = [
  "耕地地力保护补贴",
  "水稻补贴",
  "产业奖补",
  "产业发展奖补",
  "危房补助",
  "跨省务工交通补贴",
  "县内务工稳岗补贴",
  "雨露计划补助",
];

const PAYMENT_STATUS = ["待发放", "已发放"];

const YEAR_OPTIONS = [String(new Date().getFullYear() - 1), String(new Date().getFullYear()), String(new Date().getFullYear() + 1)];

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
  onClick,
}: {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  onClick?: () => void;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onClick={onClick}
      onChange={(event) => onChange?.(event.target.value)}
      className="w-full rounded px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
      style={{ border: "1px solid #dcdfe6", background: disabled ? "#f5f7fa" : "#fff", color: "#303133", cursor: onClick && !disabled ? "pointer" : "auto" }}
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

export function SubsidyForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isDetail = location.pathname.includes("/detail");

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [selectedResident, setSelectedResident] = useState<ResidentOption | null>(null);
  const [showResidentModal, setShowResidentModal] = useState(false);
  const [filters, setFilters] = useState({ full_name: "", identity_number: "" });
  const [residentLoading, setResidentLoading] = useState(false);
  const [residentList, setResidentList] = useState<ResidentOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(!!id);

  useEffect(() => {
    if (!id) {
      return;
    }
    setLoadingDetail(true);
    fetchJson<any>(`/api/subsidies/${id}/`)
      .then((data) => {
        setForm({
          ...DEFAULT_FORM,
          grant_year: String(data.grant_year || new Date().getFullYear()),
          batch_name: data.batch_name || "",
          subsidy_type: data.subsidy_type || "",
          bank_account: data.bank_account || "",
          village_group: data.village_group || "",
          household_population: String(data.household_population || 1),
          subsidy_item: data.subsidy_item || "",
          subsidy_standard: data.subsidy_standard || "",
          unit: data.unit || "",
          declared_amount: data.declared_amount || "",
          actual_amount: data.actual_amount || "",
          payment_status: data.payment_status || "待发放",
          payment_date: data.payment_date || "",
          notes: data.notes || "",
        });
        setSelectedResident({
          id: data.resident_id,
          full_name: data.full_name,
          gender: data.gender || "",
          identity_number: data.identity_number,
          birth_date: "",
          age: data.age ?? null,
          ethnicity: "",
          phone: data.phone || "",
          head_name: data.head_name || "",
          relation_to_head: data.relation_to_head || "",
          village_group: data.village_group || "",
          household_no: data.household_no || "",
          household_type: "",
          bank_account: data.bank_account || "",
        });
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoadingDetail(false));
  }, [id]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubsidyTypeChange = (value: string) => {
    setForm((current) => ({
      ...current,
      subsidy_type: value,
      subsidy_item: current.subsidy_item || (value !== "耕地地力保护补贴" ? value : ""),
    }));
  };

  const searchResidents = async () => {
    setResidentLoading(true);
    setErrorMessage("");
    try {
      const payload = await fetchJson<ResidentListPayload>("/api/residents/", {
        params: {
          ...filters,
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
    if (!selectedResident?.id) {
      setErrorMessage("请先搜索并选择居民对象。");
      return;
    }
    if (!form.subsidy_type || !form.grant_year) {
      setErrorMessage("请填写年度和补贴类型。");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    setMessage("");
    try {
      if (id) {
        await putJson(`/api/subsidies/${id}/`, { resident_id: selectedResident.id, ...form });
        setMessage("政策性补贴信息已更新。");
      } else {
        if (form.subsidy_type === "耕地地力保护补贴") {
          const crops = [
            { name: "水稻", value: form.rice },
            { name: "玉米", value: form.corn },
            { name: "小麦", value: form.wheat },
            { name: "其它", value: form.other_crop },
          ].filter((c) => c.value);

          const baseNotes = `确权面积: ${form.confirmed_area || "-"}, 申报面积合计: ${form.total_declared_area || "-"}`;
          const finalNotes = form.notes ? `${baseNotes} | ${form.notes}` : baseNotes;

          if (crops.length > 0) {
            for (const crop of crops) {
              await postJson("/api/subsidies/create/", {
                resident_id: selectedResident.id,
                ...form,
                subsidy_item: crop.name,
                subsidy_standard: crop.value,
                unit: form.unit || "亩",
                notes: finalNotes,
              });
            }
          } else {
            await postJson("/api/subsidies/create/", {
              resident_id: selectedResident.id,
              ...form,
              notes: finalNotes,
            });
          }
        } else {
          await postJson("/api/subsidies/create/", { resident_id: selectedResident.id, ...form });
        }
        setMessage("政策性补贴信息已保存。");
      }
      setTimeout(() => navigate("/subsidies"), 800);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setSubmitting(false);
    }
  };

  if (loadingDetail) {
    return (
      <div className="rounded border bg-white px-6 py-10 text-center text-sm" style={{ borderColor: "#e4e7ed", color: "#909399" }}>
        详情加载中...
      </div>
    );
  }

  const isFarmland = form.subsidy_type === "耕地地力保护补贴" && !id; // Custom fields only on create

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
          <SectionTitle title="类型年度" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <FieldLabel text="补贴类型" required />
              <SelectField value={form.subsidy_type} onChange={handleSubsidyTypeChange} options={SUBSIDY_TYPES} placeholder="请选择补贴类型" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="年度" required />
              <SelectField value={form.grant_year} onChange={(val) => setField("grant_year", val)} options={YEAR_OPTIONS} placeholder="请选择年度" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="批次" required />
              <TextInput value={form.batch_name} onChange={(value) => setField("batch_name", value)} placeholder="请选择或输入批次" disabled={isDetail} />
            </div>
          </div>

          {form.subsidy_type === "耕地地力保护补贴" && !isDetail && (
            <div className="mt-4 flex items-start gap-2 rounded px-4 py-3 text-sm" style={{ background: "#f4f4f5", color: "#606266" }}>
              <Info style={{ width: 16, height: 16, color: "#909399", marginTop: 2, flexShrink: 0 }} />
              <div>
                <div className="font-medium" style={{ color: "#303133" }}>耕地地力保护补贴模板</div>
                <div className="mt-0.5 text-xs">推荐先用居民姓名或身份证号搜索并回填基础信息，再填写确权面积、申报面积合计、水稻、玉米、小麦和其它字段。</div>
              </div>
            </div>
          )}
        </section>

        <div className="my-6" style={{ borderTop: "1px solid #f0f0f0" }} />

        <section>
          <SectionTitle title="基础信息" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <FieldLabel text="姓名" required />
              <div className="relative">
                <TextInput
                  value={selectedResident?.full_name || ""}
                  placeholder="输入姓名搜索居民"
                  disabled={isDetail}
                  onClick={() => {
                    if (!isDetail) setShowResidentModal(true);
                  }}
                />
              </div>
            </div>
            <div>
              <FieldLabel text="身份证号" required />
              <TextInput value={selectedResident?.identity_number || ""} disabled />
            </div>
            <div>
              <FieldLabel text="联系电话" />
              <TextInput value={selectedResident?.phone || ""} disabled />
            </div>
            <div>
              <FieldLabel text="行政村" />
              <TextInput value={form.admin_village} onChange={(value) => setField("admin_village", value)} disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="村组" />
              <TextInput value={form.village_group} onChange={(value) => setField("village_group", value)} disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="家庭人口数" />
              <TextInput value={form.household_population} onChange={(value) => setField("household_population", value)} type="number" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="户属性" />
              <TextInput value={selectedResident?.household_type || ""} disabled />
            </div>
            <div>
              <FieldLabel text="一卡通" />
              <TextInput value={form.bank_account} onChange={(value) => setField("bank_account", value)} disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="开户行" />
              <TextInput value={form.bank_name} onChange={(value) => setField("bank_name", value)} disabled={isDetail} />
            </div>
          </div>
        </section>

        <div className="my-6" style={{ borderTop: "1px solid #f0f0f0" }} />

        <section>
          <SectionTitle title="补贴内容" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {isFarmland ? (
              <>
                <div>
                  <FieldLabel text="确权面积" />
                  <TextInput value={form.confirmed_area} onChange={(value) => setField("confirmed_area", value)} type="number" />
                </div>
                <div>
                  <FieldLabel text="申报面积合计" />
                  <TextInput value={form.total_declared_area} onChange={(value) => setField("total_declared_area", value)} type="number" />
                </div>
                <div>
                  <FieldLabel text="水稻" />
                  <TextInput value={form.rice} onChange={(value) => setField("rice", value)} type="number" />
                </div>
                <div>
                  <FieldLabel text="玉米" />
                  <TextInput value={form.corn} onChange={(value) => setField("corn", value)} type="number" />
                </div>
                <div>
                  <FieldLabel text="其它" />
                  <TextInput value={form.other_crop} onChange={(value) => setField("other_crop", value)} type="number" />
                </div>
                <div>
                  <FieldLabel text="小麦" />
                  <TextInput value={form.wheat} onChange={(value) => setField("wheat", value)} type="number" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <FieldLabel text="项目/事项" />
                  <TextInput value={form.subsidy_item} onChange={(value) => setField("subsidy_item", value)} disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="规模" />
                  <TextInput value={form.subsidy_standard} onChange={(value) => setField("subsidy_standard", value)} disabled={isDetail} />
                </div>
                <div>
                  <FieldLabel text="单位" />
                  <TextInput value={form.unit} onChange={(value) => setField("unit", value)} disabled={isDetail} />
                </div>
              </>
            )}

            <div>
              <FieldLabel text="补贴标准" />
              {/* For farmland, we use declared_amount conceptually, but label as 补贴标准? No, the design has both. I will map it to declared_amount if standard is used, or we just map it to subsidy_standard if not farmland */}
              <TextInput value={form.subsidy_standard} onChange={(value) => setField("subsidy_standard", value)} disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="申报金额" />
              <TextInput value={form.declared_amount} onChange={(value) => setField("declared_amount", value)} type="number" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="实发金额" />
              <TextInput value={form.actual_amount} onChange={(value) => setField("actual_amount", value)} type="number" disabled={isDetail} />
            </div>
            <div>
              <FieldLabel text="发放日期" />
              <TextInput value={form.payment_date} onChange={(value) => setField("payment_date", value)} type="date" disabled={isDetail} />
            </div>
          </div>

          <div className="mt-4">
            <FieldLabel text="备注" />
            <textarea
              value={form.notes}
              onChange={(event) => setField("notes", event.target.value)}
              rows={3}
              placeholder="请根据实际填写"
              disabled={isDetail}
              className="w-full rounded px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed"
              style={{ border: "1px solid #dcdfe6", background: isDetail ? "#f5f7fa" : "#fff", color: "#303133" }}
            />
          </div>
        </section>
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => navigate("/subsidies")}
          className="rounded px-5 py-2 text-sm"
          style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}
        >
          取消
        </button>
        {!isDetail && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded px-5 py-2 text-sm text-white disabled:opacity-60"
            style={{ background: "#1677ff" }}
          >
            {submitting ? "保存中..." : "保存"}
          </button>
        )}
      </div>

      {showResidentModal && (
        <Modal title="选择居民对象" onClose={() => setShowResidentModal(false)}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <TextInput value={filters.full_name} onChange={(value) => setFilters((current) => ({ ...current, full_name: value }))} placeholder="请输入姓名" />
              <TextInput value={filters.identity_number} onChange={(value) => setFilters((current) => ({ ...current, identity_number: value }))} placeholder="请输入身份证号" />
              <button type="button" onClick={searchResidents} className="rounded px-4 py-2 text-sm text-white" style={{ background: "#1677ff" }}>
                搜索
              </button>
            </div>

            <div className="overflow-x-auto rounded border" style={{ borderColor: "#ebeef5" }}>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 920 }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["姓名", "身份证号", "性别", "年龄", "联系电话", "村组", "操作"].map((column) => (
                      <th key={column} className="whitespace-nowrap px-3 py-2 text-left" style={{ borderBottom: "1px solid #ebeef5", color: "#606266", fontWeight: 500 }}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {residentLoading ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center" style={{ color: "#909399" }}>
                        搜索中...
                      </td>
                    </tr>
                  ) : residentList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center" style={{ color: "#909399" }}>
                        请输入条件后搜索居民档案
                      </td>
                    </tr>
                  ) : (
                    residentList.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">{item.full_name}</td>
                        <td className="px-3 py-2">{item.identity_number}</td>
                        <td className="px-3 py-2">{item.gender || "-"}</td>
                        <td className="px-3 py-2">{item.age == null ? "-" : item.age}</td>
                        <td className="px-3 py-2">{item.phone || "-"}</td>
                        <td className="px-3 py-2">{item.village_group || "-"}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedResident(item);
                              setForm((current) => ({
                                ...current,
                                bank_account: current.bank_account || item.bank_account || "",
                                village_group: current.village_group || item.village_group || "",
                              }));
                              setShowResidentModal(false);
                            }}
                            className="rounded px-3 py-1 text-xs text-white"
                            style={{ background: "#1677ff" }}
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
