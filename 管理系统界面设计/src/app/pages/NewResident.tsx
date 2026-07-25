import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Info } from "lucide-react";

import { fetchJson, postJson } from "../lib/api";

// ── Shared form primitives ────────────────────────────────────────────────────

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <div className="text-xs mb-1" style={{ color: "#606266" }}>
      {required && <span style={{ color: "#f56c6c" }} className="mr-0.5">*</span>}
      {text}
    </div>
  );
}

function TextInput({
  placeholder,
  disabled,
  value,
  onChange,
}: {
  placeholder?: string;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none transition-colors"
      style={{
        border: "1px solid #dcdfe6",
        background: disabled ? "#f5f7fa" : "#fff",
        color: disabled ? "#c0c4cc" : "#303133",
      }}
    />
  );
}

function SelectField({
  placeholder,
  options = [],
  value,
  onChange,
}: {
  placeholder?: string;
  options?: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-7 transition-colors"
        style={{
          border: "1px solid #dcdfe6",
          background: "#fff",
          color: value ? "#303133" : "#c0c4cc",
        }}
      >
        {placeholder && (
          <option value="">
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o} value={o} style={{ color: "#303133" }}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ width: 13, height: 13, color: "#c0c4cc" }}
      />
    </div>
  );
}

function DateField({
  value,
  onChange,
  placeholder = "请选择日期",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none"
        style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#303133" }}
      />
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className="rounded-sm flex-shrink-0" style={{ width: 3, height: 14, background: "#1677ff" }} />
      <span className="text-sm font-medium" style={{ color: "#303133" }}>
        {children}
      </span>
    </div>
  );
}

type OptionsPayload = {
  options: Record<string, string[]>;
};

type ResidentFormState = {
  head_name: string;
  household_no: string;
  head_gender: string;
  ethnicity: string;
  head_identity_number: string;
  head_phone: string;
  account_type: string;
  household_type: string;
  grid_name: string;
  housing_type: string;
  village_group: string;
  address: string;
  full_name: string;
  gender: string;
  birth_date: string;
  identity_number: string;
  relation_to_head: string;
  marital_status: string;
  political_status: string;
  military_status: string;
  bank_account: string;
  bank_name: string;
  education_level: string;
  occupation: string;
  phone: string;
  health_status: string;
  residency_status: string;
  notes: string;
};

const DEFAULT_FORM: ResidentFormState = {
  head_name: "",
  household_no: "",
  head_gender: "",
  ethnicity: "汉族",
  head_identity_number: "",
  head_phone: "",
  account_type: "",
  household_type: "",
  grid_name: "",
  housing_type: "",
  village_group: "",
  address: "",
  full_name: "",
  gender: "",
  birth_date: "",
  identity_number: "",
  relation_to_head: "",
  marital_status: "未婚",
  political_status: "群众",
  military_status: "未服兵役",
  bank_account: "",
  bank_name: "",
  education_level: "小学",
  occupation: "",
  phone: "",
  health_status: "健康",
  residency_status: "",
  notes: "",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export function NewResident() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ResidentFormState>(DEFAULT_FORM);
  const [options, setOptions] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // 自动查询户主信息并填充
  const fetchPrefill = async (headName: string, headId: string) => {
    if (!headName || !headId) {
      return;
    }
    try {
      const params = new URLSearchParams({ head_name: headName, identity_number: headId });
      const result = await fetchJson<{ found: boolean; item: Partial<ResidentFormState> | null }>(
        `/api/residents/prefill/?${params.toString()}`
      );
      if (result.found && result.item) {
        setForm((prev) => {
          const next: ResidentFormState = { ...prev };
          // 只填充当前为空的字段，不覆盖用户已填写的内容
          for (const [key, value] of Object.entries(result.item)) {
            if (value && !next[key as keyof ResidentFormState]) {
              (next as any)[key] = value;
            }
          }
          return next;
        });
        setMessage('已自动填充已存在的户主信息');
        setErrorMessage('');
      }
    } catch (err) {
      // 查询失败不影响用户继续填写
    }
  };

  useEffect(() => {
    fetchJson<OptionsPayload>("/api/residents/options/")
      .then((payload) => setOptions(payload.options))
      .catch((error) => setErrorMessage(error.message));
  }, []);

  const setField = (key: keyof ResidentFormState, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      // 当户主姓名或身份证号变化时，尝试自动填充
      if ((key === "head_name" || key === "head_identity_number") && next.head_name && next.head_identity_number) {
        fetchPrefill(next.head_name, next.head_identity_number);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage("");
    setMessage("");
    try {
      const payload = {
        ...form,
        phone: form.phone || form.head_phone,
        gender: form.gender || form.head_gender,
        head_name: form.head_name || (form.relation_to_head === "户主" ? form.full_name : ""),
        head_identity_number:
          form.head_identity_number || (form.relation_to_head === "户主" ? form.identity_number : ""),
      };
      await postJson("/api/residents/", payload);
      setMessage("居民信息已成功保存到数据库。");
      setForm(DEFAULT_FORM);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Info Banner */}
      <div
            className="flex items-center justify-between px-4 py-2.5 rounded"
            style={{ background: "#e8f4ff", border: "1px solid #b3d8ff" }}
          >
            <div className="flex items-center gap-2 text-sm" style={{ color: "#1677ff" }}>
              <Info className="flex-shrink-0" style={{ width: 15, height: 15 }} />
              <span>提示：输入户主姓名和身份证号后，系统会自动查询并填充已存在的信息</span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/residents")}
              className="flex-shrink-0 ml-4 px-4 py-1 text-sm text-white rounded transition-colors hover:opacity-90"
              style={{ background: "#1677ff" }}
            >
              导入
            </button>
          </div>

      {/* Form Card */}
      <div className="bg-white rounded border px-6 py-5 space-y-6" style={{ borderColor: "#e4e7ed" }}>
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

        {/* ── 户主信息 ─────────────────────────────────── */}
        <section>
          <SectionTitle>户主信息</SectionTitle>
          <div className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <FieldLabel text="户主姓名" />
                <TextInput value={form.head_name} onChange={(value) => setField("head_name", value)} placeholder="请输入户主姓名" />
              </div>
              <div>
                <FieldLabel text="户编号" />
                <TextInput value={form.household_no || "自动生成"} onChange={(value) => setField("household_no", value)} disabled placeholder="自动生成" />
              </div>
              <div>
                <FieldLabel text="性别" />
                <SelectField value={form.head_gender} onChange={(value) => setField("head_gender", value)} placeholder="请选择性别" options={options.gender ?? ["男", "女"]} />
              </div>
              <div>
                <FieldLabel text="民族" />
                <SelectField
                  value={form.ethnicity}
                  onChange={(value) => setField("ethnicity", value)}
                  placeholder="请选择民族"
                  options={options.ethnicity ?? ["汉族", "回族", "满族", "蒙古族", "藏族", "维吾尔族"]}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <FieldLabel text="身份证号" />
                <TextInput value={form.head_identity_number} onChange={(value) => setField("head_identity_number", value)} placeholder="请输入身份证号" />
              </div>
              <div>
                <FieldLabel text="联系电话" />
                <TextInput value={form.head_phone} onChange={(value) => setField("head_phone", value)} placeholder="请输入联系电话" />
              </div>
              <div>
                <FieldLabel text="户口类型" />
                <SelectField
                  value={form.account_type}
                  onChange={(value) => setField("account_type", value)}
                  placeholder="请选择户口类型"
                  options={options.account_type ?? ["农业户口", "非农业户口"]}
                />
              </div>
              <div>
                <FieldLabel text="户属性" />
                <SelectField
                  value={form.household_type}
                  onChange={(value) => setField("household_type", value)}
                  placeholder="请选择户属性"
                  options={options.household_type ?? ["普通户", "低保户", "贫困户", "五保户"]}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <FieldLabel text="所属网格" />
                <SelectField
                  value={form.grid_name}
                  onChange={(value) => setField("grid_name", value)}
                  placeholder="请选择所属网格"
                  options={options.grid_name ?? ["网格一", "网格二", "网格三"]}
                />
              </div>
              <div>
                <FieldLabel text="住房类型" />
                <SelectField
                  value={form.housing_type}
                  onChange={(value) => setField("housing_type", value)}
                  placeholder="请选择住房类型"
                  options={options.housing_type ?? ["自建房", "租房", "公租房", "商品房"]}
                />
              </div>
              <div>
                <FieldLabel text="村组" />
                <SelectField
                  value={form.village_group}
                  onChange={(value) => setField("village_group", value)}
                  placeholder="请选择村组"
                  options={options.village_group ?? ["一组", "二组", "三组", "四组", "五组"]}
                />
              </div>
            </div>

            {/* Row 4 – full width */}
            <div>
              <FieldLabel text="家庭地址" />
              <TextInput value={form.address} onChange={(value) => setField("address", value)} placeholder="请输入家庭地址" />
            </div>
          </div>
        </section>

        <div style={{ borderTop: "1px solid #f0f0f0" }} />

        {/* ── 居民信息 ─────────────────────────────────── */}
        <section>
          <SectionTitle>居民信息</SectionTitle>
          <div className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <FieldLabel text="居民姓名" required />
                <TextInput value={form.full_name} onChange={(value) => setField("full_name", value)} placeholder="请输入居民姓名" />
              </div>
              <div>
                <FieldLabel text="性别" required />
                <SelectField value={form.gender} onChange={(value) => setField("gender", value)} placeholder="请选择性别" options={options.gender ?? ["男", "女"]} />
              </div>
              <div>
                <FieldLabel text="出生日期" required />
                <DateField value={form.birth_date} onChange={(value) => setField("birth_date", value)} placeholder="请选择日期" />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <FieldLabel text="身份证号" required />
                <TextInput value={form.identity_number} onChange={(value) => setField("identity_number", value)} placeholder="请输入身份证号" />
              </div>
              <div>
                <FieldLabel text="与户主关系" required />
                <SelectField
                  value={form.relation_to_head}
                  onChange={(value) => setField("relation_to_head", value)}
                  placeholder="请选择与户主关系"
                  options={options.relation_to_head ?? ["户主", "配偶", "子女", "父母", "兄弟姐妹", "其他"]}
                />
              </div>
              <div>
                <FieldLabel text="民族" required />
                <SelectField
                  value={form.ethnicity}
                  onChange={(value) => setField("ethnicity", value)}
                  placeholder="请选择民族"
                  options={options.ethnicity ?? ["汉族", "回族", "满族", "蒙古族"]}
                />
              </div>
              <div>
                <FieldLabel text="婚姻状况" />
                <SelectField
                  value={form.marital_status}
                  onChange={(value) => setField("marital_status", value)}
                  placeholder="请选择婚姻状况"
                  options={options.marital_status ?? ["未婚", "已婚", "离婚", "丧偶"]}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <FieldLabel text="政治面貌" />
                <SelectField
                  value={form.political_status}
                  onChange={(value) => setField("political_status", value)}
                  placeholder="请选择政治面貌"
                  options={options.political_status ?? ["群众", "共产党员", "共青团员", "民主党派"]}
                />
              </div>
              <div>
                <FieldLabel text="兵役状况" />
                <SelectField
                  value={form.military_status}
                  onChange={(value) => setField("military_status", value)}
                  placeholder="请选择兵役状况"
                  options={options.military_status ?? ["未服兵役", "现役", "退役"]}
                />
              </div>
              <div>
                <FieldLabel text="银行账号" />
                <TextInput value={form.bank_account} onChange={(value) => setField("bank_account", value)} placeholder="请输入银行账号" />
              </div>
              <div>
                <FieldLabel text="开户行" />
                <SelectField
                  value={form.bank_name}
                  onChange={(value) => setField("bank_name", value)}
                  placeholder="请选择开户行"
                  options={options.bank_name ?? ["中国农业银行", "中国工商银行", "中国建设银行", "中国银行", "邮政储蓄银行"]}
                />
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <FieldLabel text="村组" required />
                <SelectField
                  value={form.village_group}
                  onChange={(value) => setField("village_group", value)}
                  placeholder="请选择村组"
                  options={options.village_group ?? ["一组", "二组", "三组", "四组", "五组"]}
                />
              </div>
              <div>
                <FieldLabel text="文化程度" />
                <SelectField
                  value={form.education_level}
                  onChange={(value) => setField("education_level", value)}
                  placeholder="请选择文化程度"
                  options={options.education_level ?? ["文盲", "小学", "初中", "高中", "大专", "本科", "硕士", "博士"]}
                />
              </div>
              <div>
                <FieldLabel text="职业" />
                <TextInput value={form.occupation} onChange={(value) => setField("occupation", value)} placeholder="请输入职业" />
              </div>
              <div>
                <FieldLabel text="联系电话" />
                <TextInput value={form.phone} onChange={(value) => setField("phone", value)} placeholder="请输入联系手机" />
              </div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <FieldLabel text="健康状况" />
                <SelectField
                  value={form.health_status}
                  onChange={(value) => setField("health_status", value)}
                  placeholder="请选择健康状况"
                  options={options.health_status ?? ["健康", "一般", "残疾", "重病"]}
                />
              </div>
              <div>
                <FieldLabel text="居住状态" />
                <SelectField
                  value={form.residency_status}
                  onChange={(value) => setField("residency_status", value)}
                  placeholder="请选择居住状态"
                  options={options.residency_status ?? ["常住", "流动", "外出务工", "已迁出"]}
                />
              </div>
              <div>
                <FieldLabel text="状态" />
                <SelectField
                  value="正常"
                  onChange={() => undefined}
                  placeholder="状态"
                  options={options.status ?? ["正常", "停用"]}
                />
              </div>
            </div>

            {/* Row 6 – full width */}
            <div>
              <FieldLabel text="家庭地址" />
              <TextInput value={form.address} onChange={(value) => setField("address", value)} placeholder="请输入家庭地址" />
            </div>
          </div>
        </section>

        {/* ── Action Buttons ───────────────────────────── */}
        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-1.5 text-sm text-white rounded transition-colors hover:opacity-90"
            style={{ background: "#1677ff", minWidth: 80 }}
          >
            {submitting ? "提交中" : "提交"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(DEFAULT_FORM);
              setMessage("");
              setErrorMessage("");
            }}
            className="px-8 py-1.5 text-sm rounded border transition-colors hover:bg-gray-50"
            style={{ minWidth: 80, color: "#606266", borderColor: "#dcdfe6", background: "#fff" }}
          >
            重置
          </button>
          <button
            type="button"
            onClick={() => navigate("/residents")}
            className="px-8 py-1.5 text-sm rounded border transition-colors hover:bg-gray-50"
            style={{ minWidth: 80, color: "#606266", borderColor: "#dcdfe6", background: "#fff" }}
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
