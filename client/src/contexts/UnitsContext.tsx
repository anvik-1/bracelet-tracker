import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type UnitSystem = "cm" | "in";

interface UnitsContextType {
  units: UnitSystem;
  setUnits: (u: UnitSystem) => void;
  toggleUnits: () => void;
  /** Convert cm to the current display unit */
  fromCm: (cm: number | null | undefined) => number | null;
  /** Convert from the current display unit back to cm for storage */
  toCm: (val: number | null | undefined) => number | null;
  /** Get the unit label */
  label: string;
  /** Format a cm value for display with unit label */
  formatLength: (cm: number | null | undefined, decimals?: number) => string;
}

const CM_PER_INCH = 2.54;

const UnitsContext = createContext<UnitsContextType | null>(null);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnitsState] = useState<UnitSystem>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("bracelet-tracker-units");
      if (stored === "in" || stored === "cm") return stored;
    }
    return "cm";
  });

  useEffect(() => {
    localStorage.setItem("bracelet-tracker-units", units);
  }, [units]);

  const setUnits = (u: UnitSystem) => setUnitsState(u);
  const toggleUnits = () => setUnitsState((prev) => (prev === "cm" ? "in" : "cm"));

  const fromCm = (cm: number | null | undefined): number | null => {
    if (cm == null) return null;
    if (units === "in") return cm / CM_PER_INCH;
    return cm;
  };

  const toCm = (val: number | null | undefined): number | null => {
    if (val == null) return null;
    if (units === "in") return val * CM_PER_INCH;
    return val;
  };

  const label = units === "in" ? "in" : "cm";

  const formatLength = (cm: number | null | undefined, decimals = 1): string => {
    if (cm == null) return "—";
    const converted = fromCm(cm);
    if (converted == null) return "—";
    return `${converted.toFixed(decimals)} ${label}`;
  };

  return (
    <UnitsContext.Provider value={{ units, setUnits, toggleUnits, fromCm, toCm, label, formatLength }}>
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used within UnitsProvider");
  return ctx;
}
