import React, { useState } from 'react';
import { Plus, Play, Square, ArrowLeft, Users, Trophy, Star } from 'lucide-react';
import { VotingBooth, Role, Candidate } from '../types';
import { CandidateCard } from './CandidateCard';
import { CandidateForm } from './CandidateForm';
import { useNavigate } from 'react-router-dom';
import ProfileImageEditor from './ProfileImageEditor';
import { generateTokens } from '../utils/tokens';
import { validatePassword } from '../utils/dataApi';

interface VotingBoothManagerProps {
  booth: VotingBooth;
  onUpdateBooth: (booth: VotingBooth) => void;
  onBack: () => void;
  onStartVoting: (boothId: string) => void;
  onStopVoting: (boothId: string) => void;
  onViewResults: () => void;
}

const HOUSES = ['Udaygiri', 'Nilgiri', 'Dunagiri', 'Himgiri'];

export const VotingBoothManager: React.FC<VotingBoothManagerProps> = ({
  booth,
  onUpdateBooth,
  onBack,
  onStartVoting,
  onStopVoting,
  onViewResults
}) => {
  const navigate = useNavigate();
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleVotes, setNewRoleVotes] = useState(1);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleVotes, setEditRoleVotes] = useState(1);
  const [editingCandidate, setEditingCandidate] = useState<{roleId: string, candidate?: Candidate} | null>(null);
  const [stopVotingPassword, setStopVotingPassword] = useState('');
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [votePassword, setVotePassword] = useState('');
  const [votePasswordError, setVotePasswordError] = useState('');
  const [showVotePrompt, setShowVotePrompt] = useState(false);
  const [editRoleError, setEditRoleError] = useState('');
  const [showImageEditor, setShowImageEditor] = useState<{candidate: Candidate, roleId: string} | null>(null);
  const [tokensCountInput, setTokensCountInput] = useState<number>(0);
  const [tokenMessage, setTokenMessage] = useState<string>('');

  React.useEffect(() => {
    if (editingCandidate) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditingCandidate(null); };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [editingCandidate]);

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoleName.trim()) {
      const newRole: Role = {
        id: Date.now().toString(),
        name: newRoleName.trim(),
        candidates: [],
        numberOfVotes: newRoleVotes,
      };
      
      onUpdateBooth({
        ...booth,
        roles: [...booth.roles, newRole]
      });
      
      setNewRoleName('');
      setNewRoleVotes(1);
      setShowRoleForm(false);
    }
  };

  const handleDeleteRole = (roleId: string) => {
    if (confirm('Are you sure you want to delete this role and all its candidates?')) {
      onUpdateBooth({
        ...booth,
        roles: booth.roles.filter(role => role.id !== roleId)
      });
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleVotes(role.numberOfVotes);
  };

  const handleSaveRoleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    const trimmedName = editRoleName.trim();
    // Duplicate name check
    if (booth.roles.some(role => role.id !== editingRole.id && role.name.toLowerCase() === trimmedName.toLowerCase())) {
      setEditRoleError('Role name must be unique.');
      return;
    }
    // Positive integer check
    if (!Number.isInteger(editRoleVotes) || editRoleVotes < 1) {
      setEditRoleError('Vote limit must be a positive integer.');
      return;
    }
    // Check for existing votes exceeding new limit
    // (Assume window.api.loadVotes is available)
    if (window.api && window.api.loadVotes) {
      window.api.loadVotes(booth.name).then((sessions) => {
        const overLimit = (Array.isArray(sessions) ? sessions : []).some((session: any) => {
          const roleVotes = session.votes.filter((v: any) => v.roleId === editingRole.id);
          return roleVotes.length > editRoleVotes;
        });
        if (overLimit) {
          setEditRoleError('Cannot reduce vote limit below existing selections.');
          return;
        }
        // All validation passed
        const updatedRoles = booth.roles.map(role => 
          role.id === editingRole.id 
            ? { ...role, name: trimmedName, numberOfVotes: editRoleVotes }
            : role
        );
        onUpdateBooth({
          ...booth,
          roles: updatedRoles
        });
        setEditingRole(null);
        setEditRoleName('');
        setEditRoleVotes(1);
        setEditRoleError('');
      });
      return;
    }
    // Fallback: skip vote check if no API
    const updatedRoles = booth.roles.map(role => 
      role.id === editingRole.id 
        ? { ...role, name: trimmedName, numberOfVotes: editRoleVotes }
        : role
    );
    onUpdateBooth({
      ...booth,
      roles: updatedRoles
    });
    setEditingRole(null);
    setEditRoleName('');
    setEditRoleVotes(1);
    setEditRoleError('');
  };

  const handleSaveCandidate = (candidate: Candidate) => {
    // Debug log to check candidate object
    console.log('Saving candidate:', candidate);
    if (!candidate.image) {
      alert('No image found in candidate object!');
    }
    const updatedRoles = booth.roles.map(role => {
      if (role.id === candidate.roleId) {
        const existingIndex = role.candidates.findIndex(c => c.id === candidate.id);
        if (existingIndex >= 0) {
          // Update existing candidate
          return {
            ...role,
            candidates: role.candidates.map(c => c.id === candidate.id ? { ...candidate } : c)
          };
        } else {
          // Add new candidate
          return {
            ...role,
            candidates: [...role.candidates, { ...candidate }]
          };
        }
      }
      return role;
    });

    onUpdateBooth({
      ...booth,
      roles: updatedRoles
    });
    
    setEditingCandidate(null);
  };

  const handleDeleteCandidate = (roleId: string, candidateId: string) => {
    if (confirm('Are you sure you want to delete this candidate?')) {
      const updatedRoles = booth.roles.map(role => {
        if (role.id === roleId) {
          return {
            ...role,
            candidates: role.candidates.filter(c => c.id !== candidateId)
          };
        }
        return role;
      });

      onUpdateBooth({
        ...booth,
        roles: updatedRoles
      });
    }
  };

  const handleStartVoting = () => {
    if (booth.roles.length === 0) {
      alert('Please add at least one role before starting voting.');
      return;
    }
    
    const hasEmptyRoles = booth.roles.some(role => role.candidates.length === 0);
    if (hasEmptyRoles) {
      alert('Please add candidates to all roles before starting voting.');
      return;
    }
    
    onStartVoting(booth.id);
  };

  const handleStopVoting = async () => {
    // Accept primary or configured secondary password via centralized validator
    const { ok: isOk } = await validatePassword(stopVotingPassword);
    if (isOk) {
      onStopVoting(booth.id);
      setShowStopDialog(false);
      setStopVotingPassword('');
    } else {
      alert('Incorrect password!');
    }
  };

  const isLocked = booth.isActive;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden" style={{ paddingBottom: 64 }}>
      {/* Decorative background elements */}
      <div className="decoration-circle-1 floating"></div>
      <div className="decoration-circle-2 floating-delayed"></div>
      <div className="decoration-circle-3 floating"></div>

      {/* School Logo Fixed Top-Left */}
      <div style={{position: 'fixed', top: 24, left: 32, zIndex: 1100, display: 'flex', alignItems: 'center'}}>
        <img src="images.png" alt="School Logo" style={{width: 56, height: 56, borderRadius: '14px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.10)'}} />
      </div>

      <div className="header-gradient text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={onBack}
                className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-all duration-300"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <img src={'images.png'} alt="School Logo" style={{width: 32, height: 32, borderRadius: '8px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}} />
                  <h1 className="text-4xl font-bold">{booth.name}</h1>
                </div>
                <p className="text-blue-100 text-xl">Voting Booth Management</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className={booth.isActive ? 'badge-active' : 'badge-inactive'}>
                {booth.isActive ? '🟢 Voting Active' : '⚪ Voting Inactive'}
              </div>
              {!booth.isActive && booth.totalVotes > 0 && (
                <button
                  onClick={onViewResults}
                  className="btn-primary-duolingo flex items-center gap-2"
                >
                  <Star size={20} />
                  View Results
                </button>
              )}
              {booth.isActive ? (
                <>
                  <button
                    onClick={() => setShowStopDialog(true)}
                    className="btn-danger-duolingo flex items-center gap-2"
                  >
                    <Square size={20} />
                    Stop Voting
                  </button>
                  <button
                    onClick={() => setShowVotePrompt(true)}
                    className="btn-primary-duolingo flex items-center gap-2"
                  >
                    <Play size={20} />
                    Continue to Vote
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartVoting}
                  className="btn-primary-duolingo flex items-center gap-2"
                >
                  <Play size={20} />
                  Start Voting
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Token Management */}
          <div className="card-duolingo p-6 mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Tokens</h3>
              <p className="text-gray-600">Enable tokens to require a unique code before voting.</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!!booth.tokensEnabled}
                onChange={(e) => {
                  onUpdateBooth({ ...booth, tokensEnabled: e.target.checked, tokens: e.target.checked ? (booth.tokens || []) : undefined });
                }}
              />
              <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all relative peer-checked:bg-blue-600" />
            </label>
          </div>
          {booth.tokensEnabled && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!booth.tokensSingleUse}
                    onChange={(e) => onUpdateBooth({ ...booth, tokensSingleUse: e.target.checked })}
                  />
                  <span className="font-semibold text-gray-800">Single-use tokens</span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={tokensCountInput}
                  onChange={(e) => setTokensCountInput(Math.max(1, Number(e.target.value)))}
                  placeholder="Number of tokens"
                  className="w-56 px-4 py-3 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300"
                />
                <button
                  className="btn-secondary-duolingo"
                  onClick={() => {
                    const newlyGenerated = generateTokens(booth.id, tokensCountInput || 0);
                    const updatedTokens = [ ...(booth.tokens || []), ...newlyGenerated ];
                    onUpdateBooth({ ...booth, tokens: updatedTokens });
                    setTokenMessage(`Generated ${newlyGenerated.length} tokens.`);
                    setTimeout(() => setTokenMessage(''), 3000);
                  }}
                >
                  Generate Tokens
                </button>
                {tokenMessage && <span className="text-green-600 font-semibold">{tokenMessage}</span>}
              </div>
              <div className="max-h-64 overflow-auto border border-gray-200 rounded-xl">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2">Code</th>
                      <th className="px-4 py-2">Used</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(booth.tokens || []).map((t) => (
                      <tr key={t.code} className="border-t">
                        <td className="px-4 py-2 font-mono">{t.code}</td>
                        <td className="px-4 py-2">{t.used ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-2">
                          <button
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            onClick={() => {
                              const next = (booth.tokens || []).filter(x => x.code !== t.code);
                              onUpdateBooth({ ...booth, tokens: next });
                            }}
                          >Delete</button>
                        </td>
                      </tr>
                    ))}
                    {(!booth.tokens || booth.tokens.length === 0) && (
                      <tr>
                        <td className="px-4 py-3 text-gray-500" colSpan={2}>No tokens generated yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        {!isLocked && (
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-2">Manage Roles & Candidates</h2>
              <p className="text-gray-600 text-lg">Add roles and candidates for your election</p>
            </div>
            <button
              onClick={() => setShowRoleForm(true)}
              className="btn-primary-duolingo flex items-center gap-3 text-lg"
            >
              <Plus size={24} />
              Add Role
            </button>
          </div>
        )}

        {showRoleForm && (
          <div className="card-duolingo p-8 mb-12 fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <Plus size={24} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Add New Role</h3>
            </div>
            <form onSubmit={handleAddRole} className="flex gap-6">
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Enter role name (e.g., Head Boy, Sports Captain)"
                className="flex-1 px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium"
                required
              />
              <input
                type="number"
                min={1}
                value={newRoleVotes}
                onChange={e => setNewRoleVotes(Math.max(1, Number(e.target.value)))}
                placeholder="Number of Votes"
                className="w-48 px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium"
                required
              />
              <button
                type="submit"
                className="btn-secondary-duolingo text-lg"
              >
                Add Role
              </button>
              <button
                type="button"
                onClick={() => setShowRoleForm(false)}
                className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold text-lg"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        <div className="space-y-12">
          {booth.roles.map((role, roleIndex) => (
            <div 
              key={role.id} 
              className="card-duolingo overflow-hidden fade-in"
              style={{ animationDelay: `${roleIndex * 0.1}s` }}
            >
              <div className="bg-gradient-to-r from-navy-50 to-purple-50 px-8 py-6 border-b-4 border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                      <img src={'images.png'} alt="School Logo" style={{width: 32, height: 32, borderRadius: '8px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-gray-800">{role.name}</h3>
                      <p className="text-gray-600 text-lg flex items-center gap-2">
                        <Users size={20} />
                        {role.candidates.length} candidates
                      </p>
                      <p className="text-gray-500 text-sm flex items-center gap-2">
                        <span>Votes allowed: {role.numberOfVotes}</span>
                      </p>
                    </div>
                  </div>
                  {!isLocked && (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleEditRole(role)}
                        className="btn-secondary-duolingo flex items-center gap-2"
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => setEditingCandidate({roleId: role.id})}
                        className="btn-secondary-duolingo flex items-center gap-2"
                      >
                        <Plus size={20} />
                        Add Candidate
                      </button>
                    </div>
                  )}
                  {isLocked && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="text-sm font-medium">Voting Active - Edit Disabled</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-8">
                {role.candidates.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-8">
                      <Users size={48} className="text-gray-400" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-600 mb-4">No candidates added yet</h4>
                    <p className="text-gray-500 mb-8 text-lg">Add candidates to get started with this role</p>
                    {!isLocked && (
                      <button
                        onClick={() => setEditingCandidate({roleId: role.id})}
                        className="btn-primary-duolingo flex items-center gap-3 mx-auto text-lg"
                      >
                        <Plus size={24} />
                        Add First Candidate
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {role.candidates.map((candidate, candidateIndex) => (
                      <div 
                        key={candidate.id}
                        className="fade-in"
                        style={{ animationDelay: `${(roleIndex * 0.1) + (candidateIndex * 0.05)}s` }}
                      >
                        <CandidateCard
                          candidate={candidate}
                          onEdit={isLocked ? undefined : () => setEditingCandidate({roleId: role.id, candidate})}
                          onDelete={isLocked ? undefined : () => handleDeleteCandidate(role.id, candidate.id)}
                          onUpdateCandidate={(updatedCandidate) => {
                            const updatedRoles = booth.roles.map(r =>
                              r.id === role.id
                                ? {
                                    ...r,
                                    candidates: r.candidates.map(c =>
                                      c.id === updatedCandidate.id ? updatedCandidate : c
                                    )
                                  }
                                : r
                            );
                            onUpdateBooth({ ...booth, roles: updatedRoles });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {booth.roles.length === 0 && (
          <div className="text-center py-20 fade-in">
            <div className="card-duolingo p-16 max-w-2xl mx-auto">
              <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-8 pulse-gentle">
                <Trophy size={64} className="text-white" />
              </div>
              <h3 className="text-4xl font-bold text-gray-800 mb-6">No Roles Added Yet</h3>
              <p className="text-gray-600 mb-12 text-xl">Add roles like Head Boy, Sports Captain, etc. to get started with your election.</p>
              <button
                onClick={() => setShowRoleForm(true)}
                className="btn-primary-duolingo flex items-center gap-3 mx-auto text-xl"
              >
                <Plus size={28} />
                Add First Role
              </button>
            </div>
          </div>
        )}
      </div>

      {editingCandidate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={(e) => { if (e.target === e.currentTarget) setEditingCandidate(null); }}>
          <CandidateForm
            roleId={editingCandidate.roleId}
            candidate={editingCandidate.candidate}
            houses={HOUSES}
            onSave={handleSaveCandidate}
            onCancel={() => setEditingCandidate(null)}
          />
        </div>
      )}

      {editingRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-duolingo p-8 max-w-md w-full fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trophy size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Edit Role</h3>
              <p className="text-gray-600">Update role details or delete the role</p>
            </div>
            <form onSubmit={handleSaveRoleEdit}>
              <div className="space-y-4 mb-6">
                <input
                  type="text"
                  value={editRoleName}
                  onChange={(e) => { setEditRoleName(e.target.value); setEditRoleError(''); }}
                  placeholder="Role name"
                  className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium"
                  required
                />
                <input
                  type="number"
                  min={1}
                  value={editRoleVotes}
                  onChange={e => { setEditRoleVotes(Math.max(1, Number(e.target.value))); setEditRoleError(''); }}
                  placeholder="Number of Votes"
                  className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium"
                  required
                />
                {editRoleError && <div className="text-red-500 text-center font-bold">{editRoleError}</div>}
              </div>
              <div className="space-y-3">
                <button
                  type="submit"
                  className="w-full btn-primary-duolingo"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete the role "${editingRole.name}" and all its candidates?`)) {
                      handleDeleteRole(editingRole.id);
                      setEditingRole(null);
                      setEditRoleName('');
                      setEditRoleVotes(1);
                    }
                  }}
                  className="w-full btn-danger-duolingo"
                >
                  Delete Role
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRole(null);
                    setEditRoleName('');
                    setEditRoleVotes(1);
                  }}
                  className="w-full px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold text-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStopDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-duolingo p-8 max-w-md w-full fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Square size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Stop Voting</h3>
              <p className="text-gray-600">Enter admin password to stop voting:</p>
            </div>
            <input
              type="password"
              value={stopVotingPassword}
              onChange={(e) => setStopVotingPassword(e.target.value)}
              className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-200 focus:border-red-400 transition-all duration-300 text-lg font-medium mb-6"
              placeholder="Enter password"
            />
            <div className="flex gap-4">
              <button
                onClick={handleStopVoting}
                className="flex-1 btn-danger-duolingo"
              >
                Stop Voting
              </button>
              <button
                onClick={() => setShowStopDialog(false)}
                className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showVotePrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-duolingo p-8 max-w-md w-full fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Admin Password Required</h3>
              <p className="text-gray-600">Enter admin password to continue voting.</p>
            </div>
            <form onSubmit={async e => {
              e.preventDefault();
              const { ok } = await validatePassword(votePassword);
              if (ok) {
                navigate(`/vote/${booth.id}`);
                setShowVotePrompt(false);
                setVotePassword('');
                setVotePasswordError('');
              } else {
                setVotePasswordError('Incorrect password!');
              }
            }}>
              <input
                type="password"
                value={votePassword}
                onChange={e => setVotePassword(e.target.value)}
                className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium mb-4"
                placeholder="Enter password"
                autoFocus
              />
              {votePasswordError && <div className="text-red-500 mb-2">{votePasswordError}</div>}
              <div className="flex gap-4">
                <button type="submit" className="flex-1 btn-primary-duolingo">Continue</button>
                <button type="button" onClick={() => { setShowVotePrompt(false); setVotePassword(''); setVotePasswordError(''); }} className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImageEditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-duolingo p-8 max-w-md w-full fade-in">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Edit Candidate Image</h3>
            <ProfileImageEditor
              initialImage={showImageEditor.candidate.image || ''}
              onApply={(croppedImage) => {
                // Update candidate image in booth.roles
                const updatedRoles = booth.roles.map(role =>
                  role.id === showImageEditor.roleId
                    ? {
                        ...role,
                        candidates: role.candidates.map(c =>
                          c.id === showImageEditor.candidate.id ? { ...c, image: croppedImage } : c
                        )
                      }
                    : role
                );
                onUpdateBooth({ ...booth, roles: updatedRoles });
                setShowImageEditor(null);
              }}
            />
            <button
              className="mt-4 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl font-bold"
              onClick={() => setShowImageEditor(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};