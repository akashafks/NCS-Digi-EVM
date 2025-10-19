import { useState, useEffect } from 'react';
import { VotingBooth, VotingSession, Vote } from './types';
import { AdminPanel } from './components/AdminPanel';
import { VotingInterface } from './components/VotingInterface';
import { HashRouter as Router, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { VotingBoothManager } from './components/VotingBoothManager';
import { Results } from './components/Results';
import {
  loadBooths,
  saveBooth,
  saveVotes,
  loadVotes,
  validatePassword
} from './utils/dataApi';

type AppMode = 'admin' | 'voting';

interface WrapperProps {
  booths: VotingBooth[];
  onUpdateBooth?: (booth: VotingBooth) => void;
  onBack?: () => void;
  onStartVoting?: (boothId: string) => void;
  onStopVoting?: (boothId: string) => void;
  onViewResults?: () => void;
  onVote?: (votes: any) => void;
}

function VotingBoothManagerWrapper(props: WrapperProps) {
  const { boothId } = useParams();
  const booth = props.booths.find((b: VotingBooth) => b.id === boothId);
  const navigate = useNavigate();
  if (!booth) return <div>Booth not found</div>;
  return (
    <VotingBoothManager
      booth={booth}
      onUpdateBooth={props.onUpdateBooth!}
      onBack={() => navigate('/')}
      onStartVoting={props.onStartVoting!}
      onStopVoting={props.onStopVoting!}
      onViewResults={props.onViewResults!}
    />
  );
}

function VotingInterfaceWrapper(props: WrapperProps & { setActiveBoothById: (id: string) => void }) {
  const { boothId } = useParams();
  const booth = props.booths.find((b: VotingBooth) => b.id === boothId);
  const navigate = useNavigate();
  useEffect(() => {
    if (boothId) props.setActiveBoothById(boothId);
  }, [boothId]);
  if (!booth) return <div>Booth not found</div>;
  return (
    <VotingInterface
      booth={booth}
      onVote={props.onVote!}
      onClose={() => navigate(`/booth/${boothId}`)}
      onStopVoting={() => {
        if (props.onStopVoting) props.onStopVoting(boothId!);
        navigate('/');
      }}
    />
  );
}

function ResultsWrapper() {
  const { boothId } = useParams();
  const navigate = useNavigate();
  return <Results boothId={boothId!} onBack={() => navigate('/')} />;
}

function App() {
  const [booths, setBooths] = useState<VotingBooth[]>([]);
  const [mode, setMode] = useState<AppMode>('admin');
  const [activeBoothId, setActiveBoothId] = useState<string | null>(null);
  const [appUnlocked, setAppUnlocked] = useState<boolean>(false);
  const [startupPassword, setStartupPassword] = useState<string>('');
  const [startupError, setStartupError] = useState<string>('');

  // Debug: Log state on every render
  useEffect(() => {
    console.log('booths:', booths);
    console.log('mode:', mode);
    console.log('activeBoothId:', activeBoothId);
  }, [booths, mode, activeBoothId]);

  // Load booths and sessions from file on mount
  useEffect(() => {
    const reload = () => {
      loadBooths().then((loaded) => {
        setBooths(Array.isArray(loaded) ? loaded : []);
      });
    };
    window.addEventListener('booth-updated', reload);
    // Initial load
    reload();
    return () => window.removeEventListener('booth-updated', reload);
  }, []);

  // No settings needed at startup; password is validated via IPC

  // Auto-save booths to file whenever they change
  useEffect(() => {
    booths.forEach((booth) => {
      saveBooth(booth.name, booth);
    });
  }, [booths]);

  const handleCreateBooth = (name: string, options?: { tokensEnabled?: boolean; numTokens?: number }) => {
    const newBooth: VotingBooth = {
      id: Date.now().toString(),
      name,
      roles: [],
      isActive: false,
      totalVotes: 0,
      tokensEnabled: options?.tokensEnabled ?? false,
      tokens: options?.tokensEnabled ? [] : undefined
    };
    // If tokens are requested at creation, generate now
    if (options?.tokensEnabled && options?.numTokens && options.numTokens > 0) {
      // Lazy import to avoid circular deps
      const { generateTokens } = require('./utils/tokens');
      newBooth.tokens = generateTokens(newBooth.id, options.numTokens);
    }
    setBooths(prev => [...prev, newBooth]);
  };

  const handleUpdateBooth = (updatedBooth: VotingBooth) => {
    setBooths(prev => prev.map(booth =>
      booth.id === updatedBooth.id ? updatedBooth : booth
    ));
  };

  const handleStartVoting = (boothId: string) => {
    setBooths(prev => prev.map(booth =>
      booth.id === boothId
        ? { ...booth, isActive: true, startTime: new Date().toISOString() }
        : booth
    ));
  };

  const handleStopVoting = (boothId: string) => {
    setBooths(prev => prev.map(booth =>
      booth.id === boothId
        ? { ...booth, isActive: false, endTime: new Date().toISOString() }
        : booth
    ));
    setActiveBoothId(null);
    setMode('admin');
  };

  const handleVote = async (votes: Vote[]) => {
    if (!activeBoothId) return;

    const session: VotingSession = {
      boothId: activeBoothId,
      votes,
      timestamp: new Date().toISOString()
    };

    const booth = booths.find(b => b.id === activeBoothId);
    if (!booth) return;

    try {
      // Load current votes from disk, append, and save
      const currentSessions = await loadVotes(booth.name) || [];
      const updatedSessions = [...currentSessions, session];
      await saveVotes(booth.name, updatedSessions);

      // Update booth's totalVotes and save to disk
      const updatedBooth = { ...booth, totalVotes: updatedSessions.length };
      await saveBooth(booth.name, updatedBooth);

      // Update in-memory state
      setBooths(prev => prev.map(b =>
        b.id === activeBoothId ? updatedBooth : b
      ));

      // Notify all components to reload data
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('booth-updated', { detail: { boothId: activeBoothId } }));
      }

      console.log('Vote saved successfully. Total votes for booth:', booth.name, ':', updatedSessions.length);
    } catch (error) {
      console.error('Error saving vote:', error);
      // You could show an error message to the user here
    }
  };

  const handleCloseVoting = () => {
    setMode('admin');
  };

  const removeBooth = (boothId: string) => {
    setBooths(prev => prev.filter(booth => booth.id !== boothId));
  };

  const activeBooth = booths.find(b => b.id === activeBoothId);

  if (mode === 'voting' && activeBooth) {
    return (
      <>
        <VotingInterface
          booth={activeBooth}
          onVote={handleVote}
          onClose={handleCloseVoting}
          onStopVoting={() => handleStopVoting(activeBooth.id)}
        />
        <footer style={{
          position: 'fixed',
          left: 0,
          bottom: 0,
          width: '100%',
          textAlign: 'center',
          padding: '16px 0',
          background: 'none',
          color: '#64748b', // subtle slate-500
          fontSize: '1rem',
          fontWeight: 500,
          letterSpacing: '0.01em',
          zIndex: 10000,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          Voting Made Smarter. Not Harder.
        </footer>
      </>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <AdminPanel
              booths={booths}
              onCreateBooth={handleCreateBooth}
              onUpdateBooth={handleUpdateBooth}
              onStartVoting={handleStartVoting}
              onStopVoting={handleStopVoting}
              removeBooth={removeBooth}
            />
          }
        />
        <Route
          path="/vote/:boothId"
          element={
            <VotingInterfaceWrapper
              booths={booths}
              onVote={handleVote}
              onStopVoting={handleStopVoting}
              setActiveBoothById={setActiveBoothId}
            />
          }
        />
        <Route
          path="/booth/:boothId"
          element={
            <VotingBoothManagerWrapper
              booths={booths}
              onUpdateBooth={handleUpdateBooth}
              onBack={() => window.history.back()}
              onStartVoting={handleStartVoting}
              onStopVoting={handleStopVoting}
              onViewResults={() => {}}
            />
          }
        />
        <Route
          path="/results/:boothId"
          element={<ResultsWrapper />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!appUnlocked && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-duolingo p-8 max-w-md w-full fade-in">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Admin Password</h3>
              <p className="text-gray-600">Enter admin password to open the app.</p>
            </div>
            <form onSubmit={async (e) => { e.preventDefault(); const res = await validatePassword(startupPassword); if (res?.ok) { setAppUnlocked(true); setStartupPassword(''); setStartupError(''); } else { setStartupError('Incorrect password'); } }}>
              <input
                type="password"
                value={startupPassword}
                onChange={(e) => { setStartupPassword(e.target.value); setStartupError(''); }}
                className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium mb-4"
                placeholder="Enter password"
                autoFocus
              />
              {startupError && <div className="text-red-500 mb-2">{startupError}</div>}
              <div className="flex gap-4">
                <button type="submit" className="flex-1 btn-primary-duolingo">Continue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;