import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { fetchJson } from "../lib/api";
import { dialog } from "../lib/dialog";

export function RoleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    desc: "",
    status: true,
    permissions: [] as string[]
  });

  useEffect(() => {
    if (isEdit) {
      fetchJson(`/api/roles/${id}/`).then((data: any) => {
        setFormData({
          name: data.name,
          code: data.code,
          desc: data.desc,
          status: data.status,
          permissions: data.permissions || []
        });
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await fetchJson(`/api/roles/${id}/`, {
          method: "PUT",
          body: JSON.stringify(formData)
        });
      } else {
        await fetchJson("/api/roles/", {
          method: "POST",
          body: JSON.stringify(formData)
        });
      }
      navigate("/roles");
    } catch (err) {
      await dialog.alert("保存失败");
    }
  };

  const handleTogglePermission = (perm: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const allPermissions = [
    { label: "居民管理", value: "resident" },
    { label: "特殊人群管理", value: "special" },
    { label: "机构管理", value: "org" },
    { label: "乡村振兴", value: "rural" },
    { label: "耕地管理", value: "farmland" },
    { label: "权限管理", value: "auth" },
    { label: "系统设置", value: "system" },
  ];

  return (
    <div className="bg-white rounded border p-6" style={{ borderColor: "#e4e7ed", maxWidth: 800, margin: "0 auto" }}>
      <h2 className="text-lg font-semibold mb-6" style={{ color: "#303133" }}>
        {isEdit ? "编辑角色" : "新增角色"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center">
          <label className="w-24 text-right pr-4 text-sm" style={{ color: "#606266" }}><span className="text-red-500 mr-1">*</span>角色名称</label>
          <input
            required
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="flex-1 px-3 py-2 border rounded text-sm outline-none"
            style={{ borderColor: "#dcdfe6" }}
          />
        </div>
        <div className="flex items-center">
          <label className="w-24 text-right pr-4 text-sm" style={{ color: "#606266" }}><span className="text-red-500 mr-1">*</span>角色编码</label>
          <input
            required
            type="text"
            value={formData.code}
            onChange={e => setFormData({ ...formData, code: e.target.value })}
            className="flex-1 px-3 py-2 border rounded text-sm outline-none"
            style={{ borderColor: "#dcdfe6" }}
          />
        </div>
        <div className="flex items-start">
          <label className="w-24 text-right pr-4 pt-2 text-sm" style={{ color: "#606266" }}>描述</label>
          <textarea
            value={formData.desc}
            onChange={e => setFormData({ ...formData, desc: e.target.value })}
            className="flex-1 px-3 py-2 border rounded text-sm outline-none h-20"
            style={{ borderColor: "#dcdfe6" }}
          />
        </div>
        
        <div className="flex items-start">
          <label className="w-24 text-right pr-4 pt-2 text-sm" style={{ color: "#606266" }}>模块权限</label>
          <div className="flex-1 flex flex-wrap gap-4 pt-2">
            {allPermissions.map(p => (
              <label key={p.value} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "#606266" }}>
                <input
                  type="checkbox"
                  checked={formData.permissions.includes(p.value)}
                  onChange={() => handleTogglePermission(p.value)}
                  className="w-4 h-4 cursor-pointer"
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <label className="w-24 text-right pr-4 text-sm" style={{ color: "#606266" }}>状态</label>
          <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "#606266" }}>
            <input
              type="checkbox"
              checked={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
            />
            启用
          </label>
        </div>

        <div className="flex justify-center gap-4 mt-8 pt-4">
          <button
            type="button"
            onClick={() => navigate("/roles")}
            className="px-6 py-2 rounded text-sm transition-colors border"
            style={{ borderColor: "#dcdfe6", color: "#606266" }}
          >
            取消
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded text-sm transition-colors text-white"
            style={{ background: "#1677ff" }}
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
}