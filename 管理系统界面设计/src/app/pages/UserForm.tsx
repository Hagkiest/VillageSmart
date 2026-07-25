import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { fetchJson } from "../lib/api";
import { dialog } from "../lib/dialog";

export function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    role_id: "" as string | number,
    status: true,
  });

  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    fetchJson("/api/roles/").then(data => setRoles(data));

    if (isEdit) {
      fetchJson(`/api/users/${id}/`).then((data: any) => {
        setFormData({
          username: data.username,
          password: "",
          name: data.name,
          role_id: data.role_id || "",
          status: data.status,
        });
      });
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await fetchJson(`/api/users/${id}/`, {
          method: "PUT",
          body: JSON.stringify(formData)
        });
      } else {
        await fetchJson("/api/users/", {
          method: "POST",
          body: JSON.stringify(formData)
        });
      }
      navigate("/users");
    } catch (err) {
      await dialog.alert("保存失败");
    }
  };

  return (
    <div className="bg-white rounded border p-6" style={{ borderColor: "#e4e7ed", maxWidth: 600, margin: "0 auto" }}>
      <h2 className="text-lg font-semibold mb-6" style={{ color: "#303133" }}>
        {isEdit ? "编辑用户" : "新增用户"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center">
          <label className="w-24 text-right pr-4 text-sm" style={{ color: "#606266" }}><span className="text-red-500 mr-1">*</span>用户名</label>
          <input
            required
            type="text"
            value={formData.username}
            onChange={e => setFormData({ ...formData, username: e.target.value })}
            className="flex-1 px-3 py-2 border rounded text-sm outline-none"
            style={{ borderColor: "#dcdfe6" }}
            placeholder="登录账号"
          />
        </div>
        <div className="flex items-center">
          <label className="w-24 text-right pr-4 text-sm" style={{ color: "#606266" }}>
            {!isEdit && <span className="text-red-500 mr-1">*</span>}密码
          </label>
          <input
            required={!isEdit}
            type="text"
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            className="flex-1 px-3 py-2 border rounded text-sm outline-none"
            style={{ borderColor: "#dcdfe6" }}
            placeholder={isEdit ? "留空表示不修改" : "登录密码"}
          />
        </div>
        <div className="flex items-center">
          <label className="w-24 text-right pr-4 text-sm" style={{ color: "#606266" }}><span className="text-red-500 mr-1">*</span>姓名</label>
          <input
            required
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="flex-1 px-3 py-2 border rounded text-sm outline-none"
            style={{ borderColor: "#dcdfe6" }}
            placeholder="真实姓名"
          />
        </div>
        <div className="flex items-center">
          <label className="w-24 text-right pr-4 text-sm" style={{ color: "#606266" }}>角色</label>
          <select
            value={formData.role_id}
            onChange={e => setFormData({ ...formData, role_id: e.target.value })}
            className="flex-1 px-3 py-2 border rounded text-sm outline-none bg-white"
            style={{ borderColor: "#dcdfe6" }}
          >
            <option value="">请选择角色</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
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
            onClick={() => navigate("/users")}
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