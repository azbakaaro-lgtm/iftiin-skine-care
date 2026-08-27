import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "so" | "en";
type LanguageValue = { language: AppLanguage; setLanguage: (language: AppLanguage) => void; ready: boolean };
const LanguageContext = createContext<LanguageValue | null>(null);
const KEY = "iftiin-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("so");
  const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then((saved) => { if (saved === "so" || saved === "en") setLanguageState(saved); }).finally(() => setReady(true)); }, []);
  const setLanguage = (next: AppLanguage) => { setLanguageState(next); AsyncStorage.setItem(KEY, next).catch(() => undefined); };
  const value = useMemo(() => ({ language, setLanguage, ready }), [language, ready]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { const context = useContext(LanguageContext); if (!context) throw new Error("useLanguage must be used within LanguageProvider"); return context; }
