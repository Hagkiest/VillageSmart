import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import {
  DEFAULT_UI_SETTINGS,
  fileToDataUrl,
  getUISettings,
  loadUISettingsFromServer,
  saveUISettings,
  saveUISettingsToServer,
  type LogoMode,
  type UISettingsState,
} from "../lib/ui-settings";

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3" style={{ borderBottom: "1px solid #f5f5f5" }}>
      <div className="flex-shrink-0 text-sm text-right pt-1.5"
        style={{ width: 110, color: "#606266" }}>
        {label}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function UploadInput({
  buttonText,
  value,
  placeholder,
  onClick,
}: {
  buttonText: string;
  value: string;
  placeholder: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 rounded text-sm px-3 py-1.5 transition-opacity hover:opacity-85"
        style={{ border: "1px solid #dcdfe6", color: "#606266", background: "#fff" }}
      >
        <Upload style={{ width: 13, height: 13 }} />
        {buttonText}
      </button>
      <input
        value={value}
        readOnly
        placeholder={placeholder}
        className="rounded text-sm px-2.5 py-1.5 focus:outline-none"
        style={{ border: "1px solid #dcdfe6", width: 280, background: "#fff", color: "#606266", fontSize: 12 }}
      />
    </div>
  );
}

export function UISettings() {
  const [form, setForm] = useState<UISettingsState>(getUISettings());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const villageImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLoading(true);
    void loadUISettingsFromServer()
      .then((settings) => {
        setForm(settings);
      })
      .catch((error) => {
        console.warn("Failed to load UI settings from server:", error);
        setMessage("读取界面设置失败，已显示本地缓存配置");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const logoLabel = form.logoText.trim() || form.systemTitle.trim() || DEFAULT_UI_SETTINGS.systemTitle;

  const updateField = <K extends keyof UISettingsState>(key: K, value: UISettingsState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
  };

  const loadStoredSettings = async () => {
    setLoading(true);
    try {
      const settings = await loadUISettingsFromServer();
      setForm(settings);
      setMessage("已从数据库刷新当前配置");
    } catch (error) {
      console.warn("Failed to reload UI settings from server:", error);
      setForm(getUISettings());
      setMessage("刷新失败，已回退为当前本地缓存配置");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const nextSettings: UISettingsState = {
      ...form,
      systemTitle: form.systemTitle.trim() || DEFAULT_UI_SETTINGS.systemTitle,
      logoText: form.logoText.trim(),
      villageOverview: form.villageOverview.trim() || DEFAULT_UI_SETTINGS.villageOverview,
    };

    setSaving(true);
    try {
      const savedSettings = await saveUISettingsToServer(nextSettings);
      setForm(savedSettings);
      setMessage("保存成功，已写入数据库并同步到顶部栏与首页");
    } catch (error) {
      console.warn("Failed to save UI settings to server:", error);
      saveUISettings(nextSettings);
      setForm(nextSettings);
      setMessage("接口保存失败，已临时保存在当前浏览器");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    key: "logoImage" | "favicon" | "villageImage"
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    updateField(key, dataUrl);
    event.target.value = "";
  };

  const logoFileText = form.logoImage ? "已上传 Logo 图片" : "";
  const faviconFileText = form.favicon ? "已上传浏览器图标" : "";
  const villageImageText = form.villageImage ? "已上传栏目图片" : "";

  return (
    <div className="bg-white rounded border" style={{ borderColor: "#e4e7ed" }}>
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFileChange(event, "logoImage")}
      />
      <input
        ref={faviconInputRef}
        type="file"
        accept="image/*,.ico"
        className="hidden"
        onChange={(event) => void handleFileChange(event, "favicon")}
      />
      <input
        ref={villageImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFileChange(event, "villageImage")}
      />

      {/* header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3"
        style={{ borderBottom: "1px solid #f0f0f0" }}>
        <div>
          <h2 className="text-sm font-medium mb-1" style={{ color: "#303133" }}>界面设置</h2>
          <p className="text-xs" style={{ color: "#909399" }}>
            管理系统标题、Logo、浏览器图标与首页展示内容
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => void loadStoredSettings()}
            disabled={loading || saving}
            className="rounded text-sm px-3 py-1.5 transition-opacity hover:opacity-85"
            style={{ border: "1px solid #dcdfe6", color: "#606266", background: "#fff" }}
          >
            {loading ? "刷新中..." : "刷新"}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || saving}
            className="rounded text-sm px-4 py-1.5 text-white transition-opacity hover:opacity-85"
            style={{ background: "#1677ff" }}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {/* form */}
      <div className="px-5 pb-6">
        {message && (
          <div
            className="mt-4 rounded px-3 py-2 text-sm"
            style={{ background: "#f0f9eb", border: "1px solid #e1f3d8", color: "#67c23a" }}
          >
            {message}
          </div>
        )}

        <FormRow label="系统标题">
          <input
            value={form.systemTitle}
            onChange={(event) => updateField("systemTitle", event.target.value)}
            placeholder="请输入系统标题"
            className="rounded text-sm px-3 py-1.5 focus:outline-none w-full max-w-md"
            style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#303133" }}
          />
        </FormRow>

        <FormRow label="Logo 显示方式">
          <div className="flex items-center gap-6 pt-1">
            {[
              { key: "image", label: "仅图片" },
              { key: "text",  label: "仅文字" },
              { key: "both",  label: "图片+文字" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer text-sm"
                style={{ color: "#303133" }}>
                <input type="radio" name="logoMode" value={key}
                  checked={form.logoMode === key}
                  onChange={() => updateField("logoMode", key as LogoMode)}
                  style={{ accentColor: "#1677ff" }} />
                {label}
              </label>
            ))}
          </div>
        </FormRow>

        <FormRow label="Logo 文字">
          <input
            value={form.logoText}
            onChange={(event) => updateField("logoText", event.target.value)}
            placeholder="请输入 Logo 文字"
            className="rounded text-sm px-3 py-1.5 focus:outline-none w-full max-w-md"
            style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#303133" }}
          />
          <p className="text-xs mt-1" style={{ color: "#909399" }}>为空时默认使用系统标题</p>
        </FormRow>

        <FormRow label="Logo 图片">
          <UploadInput
            buttonText="上传 Logo"
            value={logoFileText}
            placeholder="未配置 Logo 文件"
            onClick={() => logoInputRef.current?.click()}
          />
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <div className="w-14 h-14 rounded border flex items-center justify-center overflow-hidden"
              style={{ borderColor: "#e4e7ed", background: "#f5f7fa" }}>
              {form.logoImage ? (
                <img src={form.logoImage} alt="Logo 预览" className="w-full h-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "#1677ff" }}>Logo</div>
              )}
            </div>
            <div
              className="h-10 rounded px-3 flex items-center gap-2"
              style={{ background: "#1e2640" }}
            >
              {(form.logoMode === "image" || form.logoMode === "both") && (
                form.logoImage ? (
                  <img src={form.logoImage} alt="Logo 小图" className="w-6 h-6 rounded object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "#1677ff" }}>L</div>
                )
              )}
              {(form.logoMode === "text" || form.logoMode === "both") && (
                <span className="text-sm font-medium text-white">{logoLabel}</span>
              )}
            </div>
          </div>
        </FormRow>

        <FormRow label="浏览器图标">
          <UploadInput
            buttonText="上传 Favicon"
            value={faviconFileText}
            placeholder="未配置浏览器图标"
            onClick={() => faviconInputRef.current?.click()}
          />
          <div className="mt-2 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded border overflow-hidden flex items-center justify-center"
              style={{ borderColor: "#e4e7ed", background: "#f5f7fa" }}
            >
              {form.favicon ? (
                <img src={form.favicon} alt="Favicon 预览" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px]" style={{ color: "#909399" }}>ICO</span>
              )}
            </div>
            <p className="text-xs" style={{ color: "#909399" }}>
              保存后如果浏览器图标未立即变化，可强制刷新缓存。
            </p>
          </div>
        </FormRow>

        {/* section title */}
        <div className="py-3 mt-1" style={{ borderBottom: "1px solid #f5f5f5" }}>
          <span className="text-sm font-medium" style={{ color: "#303133" }}>首页村情概况</span>
        </div>

        <FormRow label="栏目正文">
          <div className="relative">
            <textarea
              value={form.villageOverview}
              onChange={(event) => updateField("villageOverview", event.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="填写村情情况及、历史沿革、产业特色、公共设施等内容"
              className="w-full max-w-xl rounded text-sm px-3 py-2 focus:outline-none resize-none"
              style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#303133" }}
            />
            <div className="text-xs text-right max-w-xl" style={{ color: "#c0c4cc" }}>
              {form.villageOverview.length} / 2000
            </div>
          </div>
        </FormRow>

        <FormRow label="栏目图片">
          <UploadInput
            buttonText="上传图片"
            value={villageImageText}
            placeholder="未配置栏目图片"
            onClick={() => villageImageInputRef.current?.click()}
          />
          <div
            className="mt-2 w-full max-w-xl rounded border overflow-hidden"
            style={{ borderColor: "#e4e7ed", background: "#f5f7fa", minHeight: 180 }}
          >
            {form.villageImage ? (
              <img src={form.villageImage} alt="栏目图片预览" className="w-full h-56 object-cover" />
            ) : (
              <div className="h-56 flex items-center justify-center text-sm" style={{ color: "#909399" }}>
                未配置栏目图片
              </div>
            )}
          </div>
        </FormRow>
      </div>
    </div>
  );
}
