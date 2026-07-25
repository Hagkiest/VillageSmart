import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { applyUISettings, getUISettings, loadUISettingsFromServer } from "./lib/ui-settings";
import { DialogProvider, setGlobalDialog } from "./lib/dialog";
import { useDialog } from "./lib/dialog";

/* ── 将 dialog 函数暴露到全局作用域，方便子组件导入 ────────────── */
function DialogBridge() {
  const d = useDialog();
  useEffect(() => { setGlobalDialog(d); }, [d]);
  return null;
}

export default function App() {
  useEffect(() => {
    applyUISettings(getUISettings());
    void loadUISettingsFromServer().catch((error) => {
      console.warn("Failed to load UI settings from server:", error);
    });
  }, []);

  return (
    <DialogProvider>
      <DialogBridge />
      <RouterProvider router={router} />
    </DialogProvider>
  );
}
