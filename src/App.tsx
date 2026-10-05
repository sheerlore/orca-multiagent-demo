import { TaskPanel } from './components/TaskPanel';
import { DuckCanvas } from './components/DuckCanvas';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';

export function App() {
  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden relative">
      <TaskPanel />
      <main className="flex-1 h-full relative">
        <DuckCanvas />
      </main>
      <TaskDetailDrawer />
    </div>
  );
}

export default App;
