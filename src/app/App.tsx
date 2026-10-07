import { CalculatorPage } from '../features/calculator/CalculatorPage';
import { EinbauenPage } from '../features/info/einbauen/EinbauenPage';
import { ErklaerungPage } from '../features/info/ErklaerungPage';
import { FlaechenPage } from '../features/info/FlaechenPage';
import { ProjektPage } from '../features/info/ProjektPage';
import { ImportCheckPage } from '../features/importCheck/ImportCheckPage';
import { ImportCheckProvider } from '../features/importCheck/ImportCheckContext';
import { OutputPage } from '../features/output/OutputPage';
import { CalculatorProvider } from './CalculatorContext';
import { TABS, type TabId } from './tabs';
import { useHashTab } from './useHashTab';

function Page({ tab, go }: { tab: TabId; go: (t: TabId) => void }) {
  switch (tab) {
    case 'rechner':
      return <CalculatorPage onGoToOutput={() => go('ausgabe')} />;
    case 'ausgabe':
      return <OutputPage />;
    case 'import':
      return <ImportCheckPage onGoToCalculator={() => go('rechner')} />;
    case 'erklaerung':
      return <ErklaerungPage />;
    case 'projekt':
      return <ProjektPage />;
    case 'einbauen':
      return <EinbauenPage />;
    case 'flaechen':
      return <FlaechenPage />;
  }
}

export default function App() {
  const [tab, setTab] = useHashTab();
  return (
    <CalculatorProvider>
      <ImportCheckProvider>
        <div className="app">
          <header className="top">
            <div className="brand">
              <div>
                <div className="title">Überflutungsnachweis</div>
                <div className="subtitle">Prüfwerkzeug · DIN 1986-100 · DWA-A 138-1</div>
              </div>
            </div>
            <nav className="tabs" aria-label="Bereiche">
              {TABS.map((t) => (
                <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </nav>
          </header>

          <Page tab={tab} go={setTab} />

          <footer className="foot">
            Prüfwerkzeug und Prototyp, kein Ersatz für die Fachplanung. Beispielwerte sind keine echten KOSTRA-Daten. Formeln: DIN 1986-100 Gl. 20, 21, 22 (Quelle: Merkblätter Stadt Bielefeld 2025 und Gütersloh); Gl. 19 ist noch offen.
          </footer>
        </div>
      </ImportCheckProvider>
    </CalculatorProvider>
  );
}
