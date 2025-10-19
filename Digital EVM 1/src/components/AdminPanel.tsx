import React, { useState, useEffect, useRef } from 'react';
import { Plus, Settings, Download, Users, Star, MoreVertical } from 'lucide-react';
import { VotingBooth } from '../types';
import { VotingBoothManager } from './VotingBoothManager';
import { useNavigate } from 'react-router-dom';
import { downloadFile } from '../utils/export';
import { saveBooth, saveVotes, loadVotes, getSettings, setSettings, validatePassword, setSecondaryPassword } from '../utils/dataApi';
import { generateTokens } from '../utils/tokens';
import { v4 as uuidv4 } from 'uuid';

interface AdminPanelProps {
  booths: VotingBooth[];
  onCreateBooth: (name: string, options?: { tokensEnabled?: boolean; numTokens?: number }) => void;
  onUpdateBooth: (booth: VotingBooth) => void;
  onStartVoting: (boothId: string) => void;
  onStopVoting: (boothId: string) => void;
  removeBooth: (boothId: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  booths,
  onCreateBooth,
  onUpdateBooth,
  onStartVoting,
  onStopVoting,
  removeBooth
}) => {
  console.log('AdminPanel render', { booths });
  const navigate = useNavigate();
  const [selectedBooth, setSelectedBooth] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<string | null>(null);
  const [newBoothName, setNewBoothName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<{boothId: string | null, action: 'manage' | 'vote' | 'results' | null}>({boothId: null, action: null});
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showBoothMenu, setShowBoothMenu] = useState<string | null>(null);
  const boothMenuRef = useRef<HTMLDivElement | null>(null);
  const [disbandBoothId, setDisbandBoothId] = useState<string | null>(null);
  // Add state to track votes per booth
  const [boothVotes, setBoothVotes] = useState<Record<string, number>>({});
  const [editBoothId, setEditBoothId] = useState<string | null>(null);
  const [editBoothName, setEditBoothName] = useState('');
  const [editTokensEnabled, setEditTokensEnabled] = useState<boolean>(false);
  const [editGenerateCount, setEditGenerateCount] = useState<number>(0);
  const [createTokensEnabled, setCreateTokensEnabled] = useState<boolean>(false);
  const [createNumTokens, setCreateNumTokens] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsGate, setSettingsGate] = useState<string>('');
  const [settingsGateError, setSettingsGateError] = useState<string>('');
  const [settings, setSettingsState] = useState<{ hotkey: string; hasSecondary: boolean } | null>(null);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [hotkeyEditing, setHotkeyEditing] = useState<boolean>(false);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (boothMenuRef.current && !boothMenuRef.current.contains(event.target as Node)) {
        setShowBoothMenu(null);
      }
    }
    if (showBoothMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBoothMenu]);

  useEffect(() => {
    // Load votes for all booths
    const loadVotesForAllBooths = async () => {
      try {
        for (const booth of booths) {
          const votes = await loadVotes(booth.name);
          const voteCount = Array.isArray(votes) ? votes.length : 0;
          setBoothVotes(prev => ({ ...prev, [booth.id]: voteCount }));
        }
      } catch (error) {
        console.error('Error loading votes for booths:', error);
      }
    };

    loadVotesForAllBooths();

    // Listen for booth-updated event to reload votes
    const boothUpdatedHandler = async (e: any) => {
      const boothId = e.detail?.boothId;
      const booth = booths.find(b => b.id === boothId);
      if (booth) {
        try {
          const votes = await loadVotes(booth.name);
          const voteCount = Array.isArray(votes) ? votes.length : 0;
          setBoothVotes(prev => ({ ...prev, [booth.id]: voteCount }));
        } catch (error) {
          console.error('Error reloading votes for booth:', booth.name, error);
        }
      }
    };

    // Listen for votes-reset event
    const votesResetHandler = async (e: any) => {
      const boothId = e.detail?.boothId;
      console.log('Votes reset event received for booth:', boothId);
      setBoothVotes(prev => ({ ...prev, [boothId]: 0 }));
      
      // Also reload the booth data to ensure consistency
      const booth = booths.find(b => b.id === boothId);
      if (booth) {
        try {
          const votes = await loadVotes(booth.name);
          const voteCount = Array.isArray(votes) ? votes.length : 0;
          console.log('Reloaded votes after reset for booth:', booth.name, 'Count:', voteCount);
          setBoothVotes(prev => ({ ...prev, [boothId]: voteCount }));
        } catch (error) {
          console.error('Error reloading votes after reset:', error);
        }
      }
    };

    window.addEventListener('booth-updated', boothUpdatedHandler);
    window.addEventListener('votes-reset', votesResetHandler);
    
    return () => {
      window.removeEventListener('booth-updated', boothUpdatedHandler);
      window.removeEventListener('votes-reset', votesResetHandler);
    };
  }, [booths]);


  // Load settings once
  useEffect(() => {
    getSettings().then(setSettingsState).catch(() => {});
  }, []);

  const handleCreateBooth = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBoothName.trim()) {
      onCreateBooth(newBoothName.trim(), {
        tokensEnabled: createTokensEnabled,
        numTokens: createTokensEnabled ? Math.max(0, Number(createNumTokens)) : undefined,
      });
      setNewBoothName('');
      setCreateTokensEnabled(false);
      setCreateNumTokens(0);
      setShowCreateForm(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok } = await validatePassword(adminPassword);
    if (ok) {
      if (passwordPrompt.action === 'manage' && passwordPrompt.boothId) {
        setSelectedBooth(passwordPrompt.boothId);
      } else if (passwordPrompt.action === 'vote' && passwordPrompt.boothId) {
        // Use React Router navigation instead of window.open
        navigate(`/vote/${passwordPrompt.boothId}`);
      } else if (passwordPrompt.action === 'results' && passwordPrompt.boothId) {
        setShowResults(passwordPrompt.boothId);
      }
      setPasswordPrompt({boothId: null, action: null});
      setAdminPassword('');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password!');
    }
  };

  const handleDisbandBooth = async (boothId: string) => {
    // Remove booth from storage and votes
    const booth = booths.find(b => b.id === boothId);
    if (booth) {
      // Remove booth.json and votes.json for this booth
      if (window.api && window.api.deleteBoothFiles) {
        await window.api.deleteBoothFiles(booth.name);
      }
    }
    removeBooth(boothId);
    setDisbandBoothId(null);
  };

  const handleImportBooth = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let booth, votes;
      if (data.booth && data.votes) {
        booth = data.booth;
        votes = data.votes;
      } else if (data.roles && data.name) {
        booth = data;
        votes = [];
      } else {
        throw new Error('Invalid booth JSON');
      }
      // Deep clone booth and all nested data, assign new ids
      const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj));
      const clonedBooth = deepClone(booth);
      clonedBooth.id = uuidv4();
      clonedBooth.roles = (clonedBooth.roles || []).map((role: any) => ({
        ...role,
        id: uuidv4(),
        candidates: (role.candidates || []).map((candidate: any) => ({ ...candidate, id: uuidv4() }))
      }));
      let newName = clonedBooth.name;
      const baseName = newName;
      let suffix = 1;
      // Avoid name collision
      while (booths.some(b => b.name === newName)) {
        newName = `${baseName} (${suffix++})`;
      }
      clonedBooth.name = newName;
      // Save booth and votes
      await saveBooth(newName, clonedBooth);
      await saveVotes(newName, votes);
      window.dispatchEvent(new CustomEvent('booth-updated', { detail: { boothId: clonedBooth.id } }));
      alert(`Booth '${newName}' imported successfully!`);
    } catch (err) {
      alert('Failed to import booth: ' + (err as Error).message);
    }
    e.target.value = '';
  };

  const selectedBoothData = booths.find(b => b.id === selectedBooth);

  if (showResults) {
    navigate(`/results/${showResults}`);
    setShowResults(null);
    return null;
  }

  if (selectedBooth && selectedBoothData) {
    return (
      <VotingBoothManager
        booth={selectedBoothData}
        onUpdateBooth={onUpdateBooth}
        onBack={() => setSelectedBooth(null)}
        onStartVoting={onStartVoting}
        onStopVoting={onStopVoting}
        onViewResults={() => setShowResults(selectedBooth)}
      />
    );
  }

  return (
    <div>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="decoration-circle-1 floating"></div>
        <div className="decoration-circle-2 floating-delayed"></div>
        <div className="decoration-circle-3 floating"></div>
        {/* Password Prompt Modal */}
        {passwordPrompt.boothId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="card-duolingo p-8 max-w-md w-full fade-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Star size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Admin Password Required</h3>
                <p className="text-gray-600">Enter admin password to continue.</p>
              </div>
              <form onSubmit={handlePasswordSubmit}>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium mb-4"
                  placeholder="Enter password"
                  autoFocus
                />
                {passwordError && <div className="text-red-500 mb-2">{passwordError}</div>}
                <div className="flex gap-4">
                  <button type="submit" className="flex-1 btn-primary-duolingo">Continue</button>
                  <button type="button" onClick={() => { setPasswordPrompt({boothId: null, action: null}); setAdminPassword(''); setPasswordError(''); }} className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {disbandBoothId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="card-duolingo p-8 max-w-md w-full fade-in">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Disband Booth?</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to disband this booth? <b>All results will be deleted forever and cannot be retrieved.</b></p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleDisbandBooth(disbandBoothId)}
                  className="flex-1 btn-danger-duolingo"
                >
                  Yes, Disband
                </button>
                <button
                  onClick={() => setDisbandBoothId(null)}
                  className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Edit Booth Name Dialog */}
        {editBoothId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="card-duolingo p-8 max-w-md w-full fade-in">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Edit Booth Settings</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const booth = booths.find(b => b.id === editBoothId);
                if (booth && editBoothName.trim()) {
                  const oldName = booth.name;
                  const newName = editBoothName.trim();
                  const updatedBooth = { ...booth, name: newName, tokensEnabled: editTokensEnabled, tokens: editTokensEnabled ? (booth.tokens || []) : undefined };
                  // Load votes from old booth name
                  const votes = await loadVotes(oldName);
                  // Save booth and votes under new name
                  await saveBooth(newName, updatedBooth);
                  await saveVotes(newName, votes);
                  // Optionally generate new tokens
                  if (editTokensEnabled && editGenerateCount > 0) {
                    const extra = generateTokens(updatedBooth.id, editGenerateCount);
                    await saveBooth(newName, { ...updatedBooth, tokens: [...(updatedBooth.tokens || []), ...extra] });
                  }
                  onUpdateBooth({
                    ...updatedBooth,
                    tokens: editTokensEnabled
                      ? [
                          ...(updatedBooth.tokens || []),
                          ...(editGenerateCount > 0 ? generateTokens(updatedBooth.id, editGenerateCount) : [])
                        ]
                      : undefined
                  });
                  setEditBoothId(null);
                }
              }}>
                <input
                  type="text"
                  value={editBoothName}
                  onChange={e => setEditBoothName(e.target.value)}
                  className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium mb-4"
                  placeholder="Enter new booth name"
                  required
                />
                <div className="flex items-center gap-3 mb-3">
                  <label className="inline-flex items-center gap-3">
                    <input type="checkbox" checked={editTokensEnabled} onChange={(e) => setEditTokensEnabled(e.target.checked)} />
                    <span className="font-semibold text-gray-800">Enable Tokens</span>
                  </label>
                  {editTokensEnabled && (
                    <input
                      type="number"
                      min={1}
                      value={editGenerateCount}
                      onChange={(e) => setEditGenerateCount(Math.max(1, Number(e.target.value)))}
                      placeholder="Generate more tokens"
                      className="w-56 px-4 py-3 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300"
                    />
                  )}
                </div>
                <div className="flex gap-4">
                  <button type="submit" className="flex-1 btn-primary-duolingo">Save</button>
                  <button type="button" onClick={() => setEditBoothId(null)} className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
        <div className="header-gradient text-white py-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          <div className="max-w-6xl mx-auto px-4 relative z-10">
            <div className="text-center fade-in">
              <div className="flex flex-col items-center justify-center mb-4">
                <img src="images.png" alt="School Logo" className="h-16 w-16 object-contain shadow-md mb-2" style={{position: 'static', objectFit: 'contain'}} />
                <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  Navy Children School Vizag
                </h1>
              </div>
              <p className="text-2xl text-blue-100 font-semibold">Digital EVM</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full">
                <Star size={20} className="text-yellow-300" />
                <span className="text-white font-medium">Voting Made Smarter. Not Harder.</span>
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', top: 16, right: 24 }}>
            <button
              onClick={() => { setShowSettings(true); setSettingsGate(''); setSettingsGateError(''); }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12" style={{ paddingBottom: 64 }}>
          <div className="flex justify-between items-center mb-12">
            <div className="slide-in-right">
              <h2 className="text-4xl font-bold text-gray-800 mb-2">Voting Booths</h2>
              <p className="text-gray-600 text-lg">Create and manage your election booths</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary-duolingo flex items-center gap-3 text-lg slide-in-right"
                style={{ animationDelay: '0.2s' }}
              >
                <Plus size={24} />
                Create New Voting Booth
              </button>
              <label className="btn-secondary-duolingo flex items-center gap-2 cursor-pointer">
                <Download size={20} />
                Import Booth
                <input
                  type="file"
                  accept=".xlsx,.json"
                  style={{ display: 'none' }}
                  onChange={handleImportBooth}
                />
              </label>
            </div>
          </div>

          {showCreateForm && (
            <div className="card-duolingo p-8 mb-12 fade-in z-30 relative bg-white/90">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <Plus size={24} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Create New Voting Booth</h3>
              </div>
              <form onSubmit={handleCreateBooth} className="space-y-4">
                <div className="flex gap-6">
                  <input
                    type="text"
                    value={newBoothName}
                    onChange={(e) => setNewBoothName(e.target.value)}
                    placeholder="Enter booth name (e.g., School Council 2025)"
                    className="flex-1 px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium"
                    required
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={createTokensEnabled}
                      onChange={(e) => setCreateTokensEnabled(e.target.checked)}
                    />
                    <span className="font-semibold text-gray-800">Enable Tokens?</span>
                  </label>
                  {createTokensEnabled && (
                    <input
                      type="number"
                      min={1}
                      value={createNumTokens}
                      onChange={(e) => setCreateNumTokens(Math.max(1, Number(e.target.value)))}
                      placeholder="# of tokens"
                      className="w-48 px-6 py-3 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg"
                    />
                  )}
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="btn-secondary-duolingo text-lg"
                  >
                    Create Booth
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold text-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {booths.map((booth, index) => (
              <div 
                key={booth.id} 
                className="card-duolingo overflow-hidden hover:shadow-2xl fade-in relative"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Three-dot menu for inactive booths */}
                {!booth.isActive && (
                  <div style={{position: 'absolute', top: 12, right: 12, zIndex: 10}}>
                    <button
                      onClick={() => setShowBoothMenu(booth.id === showBoothMenu ? null : booth.id)}
                      className="p-2 rounded-full hover:bg-gray-200 focus:outline-none"
                    >
                      <MoreVertical size={20} />
                    </button>
                    {showBoothMenu === booth.id && (
                      <div ref={boothMenuRef} className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <button
                          onClick={async () => {
                            const votes = await loadVotes(booth.name);
                            // Export only this booth and its votes
                            const exportData = { booth, votes };
                            downloadFile(JSON.stringify(exportData, null, 2), `${booth.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`, 'application/json');
                            setShowBoothMenu(null);
                          }}
                          className="block w-full text-left px-6 py-3 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          Export Booth (JSON)
                        </button>
                        <button
                          onClick={() => {
                            setEditBoothId(booth.id);
                            setEditBoothName(booth.name);
                            setEditTokensEnabled(!!booth.tokensEnabled);
                            setEditGenerateCount(0);
                            setShowBoothMenu(null);
                          }}
                          className="block w-full text-left px-6 py-3 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          Edit Booth Settings
                        </button>
                        <button
                          onClick={() => { setDisbandBoothId(booth.id); setShowBoothMenu(null); }}
                          className="block w-full text-left px-6 py-3 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Disband Booth
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                        <img src={'images.png'} alt="School Logo" style={{width: 24, height: 24, borderRadius: '8px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">{booth.name}</h3>
                    </div>
                    <div className={booth.isActive ? 'badge-active' : 'badge-inactive'}>
                      {booth.isActive ? '🟢 Active' : '⚪ Inactive'}
                    </div>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-gray-600">
                      <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                        <Users size={16} className="text-green-600" />
                      </div>
                      <span className="font-semibold">{booth.roles.length} Roles</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Star size={16} className="text-purple-600" />
                      </div>
                      <span className="font-semibold">{booth.roles.reduce((acc, role) => acc + role.candidates.length, 0)} Candidates</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Download size={16} className="text-blue-600" />
                      </div>
                      <div className="text-gray-700 font-semibold text-lg flex items-center gap-2">
                        <span className="text-2xl">{boothVotes[booth.id] ?? 0}</span>
                        Total Votes
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setPasswordPrompt({boothId: booth.id, action: 'manage'})}
                      className="flex-1 btn-secondary-duolingo flex items-center justify-center gap-2 text-base"
                    >
                      <Settings size={18} />
                      Manage
                    </button>
                    {(boothVotes[booth.id] || 0) > 0 && (
                      <button
                        onClick={() => setPasswordPrompt({ boothId: booth.id, action: 'results' })}
                        className="btn-primary-duolingo flex items-center gap-2 text-base px-6"
                      >
                        <Star size={20} />
                        Results
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {booths.length === 0 && (
            <div className="text-center py-20 fade-in">
              <div className="card-duolingo p-12 max-w-lg mx-auto">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-8 pulse-gentle">
                  <Users size={48} className="text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4">No Voting Booths Yet</h3>
                <p className="text-gray-600 mb-8 text-lg">Create your first voting booth to get started with the election process.</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary-duolingo flex items-center gap-3 mx-auto text-lg"
                >
                  <Plus size={24} />
                  Create First Booth
                </button>
              </div>
            </div>
          )}
        </div>

        {showSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="card-duolingo p-8 max-w-md w-full fade-in">
              {settingsGate !== 'UNLOCKED' ? (
                <>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Admin Password</h3>
                  <input
                    type="password"
                    value={settingsGate}
                    onChange={(e) => { setSettingsGate(e.target.value); setSettingsGateError(''); }}
                    className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium mb-3"
                    placeholder="Enter admin password"
                    autoFocus
                  />
                  {settingsGateError && <div className="text-red-500 mb-2">{settingsGateError}</div>}
                  <div className="flex gap-3">
                    <button
                      className="flex-1 btn-primary-duolingo"
                      onClick={async () => {
                        const { ok } = await validatePassword(settingsGate);
                        if (ok) {
                          setSettingsGate('UNLOCKED');
                          setSettingsGateError('');
                        } else {
                          setSettingsGateError('Incorrect password');
                        }
                      }}
                    >Continue</button>
                    <button className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold" onClick={() => setShowSettings(false)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Settings</h3>
                  <div className="space-y-5 mb-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Update Secondary Password</label>
                      <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full px-4 py-3 border-3 border-gray-200 rounded-2xl mb-2" />
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-full px-4 py-3 border-3 border-gray-200 rounded-2xl mb-2" />
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full px-4 py-3 border-3 border-gray-200 rounded-2xl" />
                      <button
                        className="mt-2 btn-secondary-duolingo"
                        onClick={async () => {
                          if (!settings) return;
                          if (!newPassword || newPassword !== confirmPassword) { alert('Passwords do not match'); return; }
                          const res = await setSecondaryPassword({ currentInput: currentPassword, newPassword });
                          if (!res.ok) { alert(res.error || 'Failed to update password'); return; }
                          const updated = await getSettings();
                          setSettingsState(updated);
                          setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
                          alert('Secondary password updated');
                        }}
                      >Update Password</button>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Hotkey</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className={`px-4 py-3 rounded-2xl border ${hotkeyEditing ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}
                          onClick={() => setHotkeyEditing(true)}
                          onKeyDown={async (e) => {
                            if (!hotkeyEditing) return;
                            e.preventDefault();
                            const rawKey = e.key;
                            // Only finalize when a non-modifier key is pressed so user can hold multiple modifiers
                            if (['Control', 'Shift', 'Alt', 'Meta'].includes(rawKey)) {
                              return; // wait for the actual key
                            }
                            const parts: string[] = [];
                            if (e.ctrlKey) parts.push('Ctrl');
                            if (e.shiftKey) parts.push('Shift');
                            if (e.altKey) parts.push('Alt');
                            if (e.metaKey) parts.push('Meta');
                            let key = rawKey.length === 1 ? rawKey.toUpperCase() : rawKey;
                            // Normalize some common keys
                            if (key === ' ') key = 'Space';
                            if (key.startsWith('Arrow')) key = key.replace('Arrow', '');
                            parts.push(key);
                            const combo = parts.join('+');
                            const updated = await setSettings({ hotkey: combo });
                            setSettingsState(updated);
                            setHotkeyEditing(false);
                          }}
                          tabIndex={0}
                        >{settings?.hotkey || 'Alt+H'}</button>
                        <span className="text-sm text-gray-500">Click, then press desired key combo</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 btn-primary-duolingo" onClick={() => setShowSettings(false)}>Close</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};