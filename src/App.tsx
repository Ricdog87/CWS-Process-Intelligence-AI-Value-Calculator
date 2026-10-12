import { Compass } from 'lucide-react';
import { AppShell } from './components/layout/AppShell';
import { LinkButton } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { EmptyState } from './components/ui/EmptyState';
import { CalculatorPage } from './pages/CalculatorPage';
import { DashboardPage } from './pages/DashboardPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { ProcessDetailPage } from './pages/ProcessDetailPage';
import { ProcessesPage } from './pages/ProcessesPage';
import { ProcessFormPage } from './pages/ProcessFormPage';
import { ProcessStoreProvider } from './state/ProcessStore';
import { paths, useRoute, type Route } from './state/router';
import { ToastProvider } from './state/Toast';

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'dashboard':
      return <DashboardPage />;
    case 'processes':
      return <ProcessesPage />;
    case 'process-new':
      return <ProcessFormPage />;
    case 'process-edit':
      return <ProcessFormPage id={route.id} />;
    case 'process-detail':
      return <ProcessDetailPage key={route.id} id={route.id} />;
    case 'calculator':
      return <CalculatorPage id={route.id} />;
    case 'methodology':
      return <MethodologyPage />;
    case 'not-found':
      return (
        <Card>
          <EmptyState
            icon={Compass}
            title="Seite nicht gefunden"
            text="Die aufgerufene Adresse existiert nicht."
            actions={<LinkButton href={paths.dashboard()}>Zum Dashboard</LinkButton>}
          />
        </Card>
      );
  }
}

export default function App() {
  const route = useRoute();
  return (
    <ToastProvider>
      <ProcessStoreProvider>
        <AppShell route={route}>
          <Page route={route} />
        </AppShell>
      </ProcessStoreProvider>
    </ToastProvider>
  );
}
