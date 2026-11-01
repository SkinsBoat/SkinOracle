import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useGlobalShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey) {
        switch (e.key) {
          case "1":
            e.preventDefault();
            navigate("/");
            break;
          case "2":
            e.preventDefault();
            navigate("/soclose");
            break;
          case "3":
            e.preventDefault();
            navigate("/raid");
            break;
          case "4":
            e.preventDefault();
            navigate("/dmarket");
            break;
          case "5":
            e.preventDefault();
            navigate("/csfloat");
            break;
          case ",":
            e.preventDefault();
            navigate("/settings");
            break;
          case "b":
            e.preventDefault();
            // Toggle sidebar - will be handled via custom event or store
            window.dispatchEvent(new CustomEvent("toggleSidebar"));
            break;
          case "f":
            e.preventDefault();
            // Focus search - will be handled by individual screens
            window.dispatchEvent(new CustomEvent("focusSearch"));
            break;
          default:
            break;
        }
      }

      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("closeModals"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);
}
