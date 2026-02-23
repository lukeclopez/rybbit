import { useEffect } from "react";

export const useSetPageTitle = (title: string) => {
  useEffect(() => {
    if (title) {
      const appName = process.env.NEXT_PUBLIC_APP_NAME || "Rybbit";
      document.title = `${appName} · ${title}`;
    }
  }, [title]);
};
