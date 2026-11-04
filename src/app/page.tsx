import { Dashboard } from "@/components/dashboard";
import { AuthGate } from "@/components/auth-gate";

export default function HomePage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}
