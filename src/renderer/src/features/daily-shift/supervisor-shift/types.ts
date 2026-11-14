import type { ComponentType } from 'react';
import type { ConsolidatedShifts } from '@/features/shift/types';

export interface SupervisorShiftProps {
  // Leaves the flow, e.g. back to the home screen.
  onExit: () => void;
}

// Passed to every step so the shell's Next button can submit a step's form.
export interface SupervisorStepProps {
  formId: string;
  onNext: () => void;
}

export interface SupervisorStep {
  id: string;
  title: string;
  // Set when the step is a form; Next then submits that form.
  formId?: string;
  component: ComponentType<SupervisorStepProps>;
}

export interface UseStepper {
  stepIndex: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  back: () => void;
}

export interface FuelGradeEntry {
  grade: string;
  // Litres in hundredths, so sums stay exact.
  volumeCentiLitres: number;
  totalCents: number;
}

export interface FuelData {
  grades: FuelGradeEntry[];
  totalVolumeCentiLitres: number;
}

export interface FuelDeliveryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  bolNumber: string;
  // Litres in hundredths, so sums stay exact.
  regCentiLitres: number;
  premCentiLitres: number;
  dieselCentiLitres: number;
  totalCentiLitres: number;
}

export interface FuelDipEntry {
  product: string;
  // Litres in hundredths, so sums stay exact.
  tcVolumeCentiLitres: number;
  ullage90CentiLitres: number;
}

export interface FuelDipsData {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm, 24-hour
  products: FuelDipEntry[];
}

export interface SupervisorShiftState {
  selectedShiftIds: string[];
  setSelectedShiftIds: (ids: string[]) => void;
  consolidated: ConsolidatedShifts | null;
  setConsolidated: (consolidated: ConsolidatedShifts | null) => void;
  fuel: FuelData | null;
  setFuel: (fuel: FuelData) => void;
  fuelDeliveries: FuelDeliveryEntry[];
  setFuelDeliveries: (deliveries: FuelDeliveryEntry[]) => void;
  fuelDips: FuelDipsData | null;
  setFuelDips: (dips: FuelDipsData) => void;
}
