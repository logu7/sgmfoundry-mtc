import { Dashboard } from "@/components/dashboard";
import { PinGate } from "@/components/pin-gate";

export default function HomePage() {
  return (
    <PinGate>
      <Dashboard />
    </PinGate>
  );
}
