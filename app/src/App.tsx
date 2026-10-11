import { ModalSheet } from "./components/ModalSheet";
import { AppShell } from "./screens/AppShell";
import { Onboarding } from "./screens/Onboarding";
import { Splash } from "./screens/Splash";
import { useApp } from "./state/store";
import { useReminders } from "./state/useReminders";

export function App() {
  const { p } = useApp();
  useReminders();
  return (
    <div className="shell">
      {p.screen === "splash" ? <Splash /> : p.screen === "app" ? <AppShell /> : <Onboarding />}
      <ModalSheet />
    </div>
  );
}
