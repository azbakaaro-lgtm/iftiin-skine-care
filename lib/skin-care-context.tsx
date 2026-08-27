import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Assessment, ChoiceAnswer, RoutineProgress, VisualObservation } from "@/lib/skin-care";
import { createProfile, SCAN_DAY_SLOTS } from "@/lib/skin-care";

type StoredCare = { assessment: Assessment | null; progress: RoutineProgress; history: Assessment[] };
type CareContextValue = {
  hydrated: boolean;
  assessment: Assessment | null;
  progress: RoutineProgress;
  history: Assessment[];
  submitAssessment: (photoUri: string, answers: Record<string, ChoiceAnswer>, visual?: VisualObservation) => Assessment;
  addDailyScan: (photoUri: string, visual?: VisualObservation) => Assessment | null;
  toggleDailyItem: (id: string) => void;
  completeToday: () => void;
  deleteCareData: () => Promise<void>;
};

const CARE_KEY = "iftiin-care-local-v1";
const initialProgress: RoutineProgress = { completedDays: [], dailyItems: {} };
const CareContext = createContext<CareContextValue | null>(null);

export function CareProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [progress, setProgress] = useState<RoutineProgress>(initialProgress);
  const [history, setHistory] = useState<Assessment[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CARE_KEY)
      .then((value) => {
        if (value) {
          const stored = JSON.parse(value) as StoredCare;
          const historyWithSlots = (stored.history ?? []).map((item, index) => ({ ...item, daySlot: item.daySlot ?? SCAN_DAY_SLOTS[Math.min(index, SCAN_DAY_SLOTS.length - 1)] }));
          const matchingHistory = stored.assessment ? historyWithSlots.find((item) => item.id === stored.assessment?.id) : undefined;
          const assessmentWithSlot = stored.assessment ? { ...stored.assessment, daySlot: stored.assessment.daySlot ?? matchingHistory?.daySlot ?? SCAN_DAY_SLOTS[Math.min(historyWithSlots.length, SCAN_DAY_SLOTS.length - 1)] } : null;
          setAssessment(assessmentWithSlot);
          setProgress(stored.progress ?? initialProgress);
          setHistory(historyWithSlots);
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const stored: StoredCare = { assessment, progress, history };
    AsyncStorage.setItem(CARE_KEY, JSON.stringify(stored)).catch(() => undefined);
  }, [assessment, progress, history, hydrated]);

  const submitAssessment = useCallback((photoUri: string, answers: Record<string, ChoiceAnswer>, visual?: VisualObservation) => {
    const next: Assessment = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      daySlot: SCAN_DAY_SLOTS[Math.min(history.length, SCAN_DAY_SLOTS.length - 1)],
      photoUri,
      answers,
      profile: createProfile(answers),
      visual,
    };
    setAssessment(next);
    setHistory((current) => [next, ...current].slice(0, 5));
    return next;
  }, [history.length]);

  const addDailyScan = useCallback((photoUri: string, visual?: VisualObservation) => {
    if (!assessment) return null;
    const next: Assessment = { ...assessment, id: String(Date.now()), createdAt: new Date().toISOString(), daySlot: SCAN_DAY_SLOTS[Math.min(history.length, SCAN_DAY_SLOTS.length - 1)], photoUri, visual };
    setHistory((current) => [next, ...current].slice(0, 5));
    return next;
  }, [assessment, history.length]);

  const toggleDailyItem = useCallback((id: string) => {
    setProgress((current) => ({ ...current, dailyItems: { ...current.dailyItems, [id]: !current.dailyItems[id] } }));
  }, []);

  const completeToday = useCallback(() => {
    const day = Math.min(28, Math.max(1, progress.completedDays.length + 1));
    setProgress((current) => ({ ...current, completedDays: current.completedDays.includes(day) ? current.completedDays : [...current.completedDays, day], dailyItems: {} }));
  }, [progress.completedDays]);

  const deleteCareData = useCallback(async () => {
    setAssessment(null);
    setProgress(initialProgress);
    setHistory([]);
    await AsyncStorage.removeItem(CARE_KEY);
  }, []);

  const value = useMemo(() => ({ hydrated, assessment, progress, history, submitAssessment, addDailyScan, toggleDailyItem, completeToday, deleteCareData }), [hydrated, assessment, progress, history, submitAssessment, addDailyScan, toggleDailyItem, completeToday, deleteCareData]);
  return <CareContext.Provider value={value}>{children}</CareContext.Provider>;
}

export function useCare() {
  const value = useContext(CareContext);
  if (!value) throw new Error("useCare must be used inside CareProvider");
  return value;
}
