import { useEffect } from "react";
import { useUiStore } from "../../stores/uiStore";

function Toast() {
  const { toast, clearToast } = useUiStore();

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => clearToast(), 2500);
    return () => clearTimeout(timeout);
  }, [toast, clearToast]);

  if (!toast) return null;

  const bg = toast.type === "error" ? "bg-red-600" : "bg-green-700";
  return (
    <div className={`fixed right-4 top-20 z-50 rounded-md px-4 py-2 text-white ${bg}`}>
      {toast.message}
    </div>
  );
}

export default Toast;
