import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { fetchJson, postJson } from "../lib/api";
import { dialog } from "../lib/dialog";

export function Activation() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [activatedAt, setActivatedAt] = useState("");
  const [expireAt, setExpireAt] = useState("");
  
  const [formData, setFormData] = useState({
    code: "",
    secret_key: ""
  });

  useEffect(() => {
    fetchJson("/api/activation/").then((res: any) => {
      setStatus(res.status);
      if (res.status === "activated") {
        setActivatedAt(res.activated_at);
        setExpireAt(res.expire_at);
      }
    }).catch(() => setStatus("unactivated"));
  }, []);

  const handleActivate = async () => {
    if (!formData.code || !formData.secret_key) {
      await dialog.alert("请输入激活码和密钥");
      return;
    }
    try {
      const res: any = await postJson("/api/activation/", formData);
      await dialog.alert(res.message);
      setStatus("activated");
      setExpireAt(res.expire_at);
      setActivatedAt(new Date().toISOString().split("T")[0]);
    } catch (e: any) {
      await dialog.alert(e.message || "激活失败");
    }
  };

  return (
    <div className="bg-white rounded border p-6" style={{ borderColor: "#e4e7ed", maxWidth: 600, margin: "0 auto", marginTop: 40 }}>
      <h2 className="text-lg font-semibold mb-6" style={{ color: "#303133" }}>系统激活管理</h2>
      
      <div className="space-y-4 text-sm" style={{ color: "#606266" }}>
        <div className="flex items-center">
          <span className="w-24 text-right pr-4">激活状态：</span>
          {status === "loading" ? (
            <span>加载中...</span>
          ) : status === "activated" ? (
            <span className="px-2 py-0.5 rounded text-xs" style={{ background: "#f6ffed", color: "#52c41a", border: "1px solid #b7eb8f" }}>
              已激活
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-xs" style={{ background: "#fff1f0", color: "#f5222d", border: "1px solid #ffa39e" }}>
              未激活
            </span>
          )}
        </div>
        
        {status === "activated" && (
          <>
            <div className="flex items-center">
              <span className="w-24 text-right pr-4">激活日期：</span>
              <span>{activatedAt}</span>
            </div>
            
            <div className="flex items-center">
              <span className="w-24 text-right pr-4">到期日期：</span>
              <span>{expireAt}</span>
            </div>
          </>
        )}
        
        <div className="flex items-start mt-4">
          <span className="w-24 text-right pr-4 pt-2">激活码：</span>
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="请输入激活码" 
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border rounded outline-none transition-colors"
              style={{ borderColor: "#dcdfe6" }}
            />
          </div>
        </div>
        
        <div className="flex items-start mt-4">
          <span className="w-24 text-right pr-4 pt-2">密钥：</span>
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="请输入防篡改密钥" 
              value={formData.secret_key}
              onChange={e => setFormData({ ...formData, secret_key: e.target.value })}
              className="w-full px-3 py-2 border rounded outline-none transition-colors"
              style={{ borderColor: "#dcdfe6" }}
            />
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-6 py-2 rounded text-sm transition-colors border"
          style={{ borderColor: "#dcdfe6", color: "#606266" }}
        >
          返回上一页
        </button>
        <button
          type="button"
          onClick={handleActivate}
          className="px-6 py-2 rounded text-sm transition-colors text-white"
          style={{ background: "#1677ff" }}
        >
          立即激活
        </button>
      </div>
    </div>
  );
}