import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, X, Star, Trophy, Sparkles, Square } from 'lucide-react';
import { VotingBooth, Vote, Candidate } from '../types';
import { validateToken } from '../utils/tokens';
import { CandidateCard } from './CandidateCard';
import { getSettings, validatePassword, validateAdmin } from '../utils/dataApi';


interface VotingInterfaceProps {
  booth: VotingBooth;
  onVote: (votes: Vote[]) => void;
  onClose: () => void;
  onStopVoting: () => void;
}

export const VotingInterface: React.FC<VotingInterfaceProps> = ({
  booth,
  onVote,
  onClose,
  onStopVoting
}) => {
  // All hooks at the top
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [selectedVotes, setSelectedVotes] = useState<{[roleId: string]: string[]}>({});
  const [showReview, setShowReview] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  // Admin password gate removed; token gate only when enabled
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelPassword, setCancelPassword] = useState('');
  const [cancelPasswordError, setCancelPasswordError] = useState('');
  const [showStopPrompt, setShowStopPrompt] = useState(false);
  const [stopPassword, setStopPassword] = useState('');
  const [stopPasswordError, setStopPasswordError] = useState('');
  const [isEditingFromReview, setIsEditingFromReview] = useState(false);
  const [waitingForStaff, setWaitingForStaff] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [tokenValidated, setTokenValidated] = useState(false);
  const [hasSecondary, setHasSecondary] = useState<boolean>(false);
  const [hotkey, setHotkey] = useState<string>('Alt+H');
  const [showTokenCancelPrompt, setShowTokenCancelPrompt] = useState(false);
  const [tokenCancelPassword, setTokenCancelPassword] = useState('');
  const [tokenCancelError, setTokenCancelError] = useState('');
  // Remove showHotkeyHint state and related useEffect

  useEffect(() => {
    getSettings().then((s) => { setHasSecondary(!!s?.hasSecondary); setHotkey(s?.hotkey || 'Alt+H'); }).catch(() => {});
  }, []);

  useEffect(() => {
    const resetForNextVoter = () => {
      setSelectedVotes({});
      setCurrentRoleIndex(0);
      setShowReview(false);
      setShowConfirmation(false);
      setWaitingForStaff(false);
      setTokenValidated(false);
      setTokenInput('');
      setTokenError('');
    };
    if (window.api && window.api.onNextVoter) {
      window.api.onNextVoter(() => resetForNextVoter());
    }
    // Fallback local key handler using configured hotkey (e.g., "Alt+H")
    const keyHandler = (e: KeyboardEvent) => {
      const parts = (hotkey || '').split('+');
      const needCtrl = parts.includes('Ctrl');
      const needShift = parts.includes('Shift');
      const needAlt = parts.includes('Alt');
      const needMeta = parts.includes('Meta');
      const keyPart = parts.find(p => !['Ctrl','Shift','Alt','Meta'].includes(p));
      const pressedKey = e.key.length === 1 ? e.key.toUpperCase() : (e.key === ' ' ? 'Space' : e.key);
      if ((needCtrl ? e.ctrlKey : true)
        && (needShift ? e.shiftKey : true)
        && (needAlt ? e.altKey : true)
        && (needMeta ? e.metaKey : true)
        && (!keyPart || keyPart.toUpperCase() === pressedKey.toUpperCase())) {
        e.preventDefault();
        // Only advance when we're on the confirmation screen
        resetForNextVoter();
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
    };
  }, [hotkey, waitingForStaff, showConfirmation]);

  // Admin password flow removed

  // Now, after all hooks, do conditional returns
  if (booth.tokensEnabled && !tokenValidated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="card-duolingo p-8 max-w-md w-full fade-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Star size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Enter Voting Token</h3>
            <p className="text-gray-600">Please enter your token to start voting.</p>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const result = validateToken(booth, tokenInput.trim().toUpperCase());
            if (!result.success) {
              setTokenError(result.message);
              return;
            }
            setTokenValidated(true);
            setTokenError('');
          }}>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium mb-4 font-mono"
              placeholder="e.g., ABCD-12EF34"
              autoFocus
            />
            {tokenError && <div className="text-red-500 mb-2">{tokenError}</div>}
            <div className="flex gap-4">
              <button type="submit" className="flex-1 btn-primary-duolingo">Continue</button>
              <button type="button" onClick={() => setShowTokenCancelPrompt(true)} className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold">Cancel</button>
            </div>
          </form>
        </div>

        {showTokenCancelPrompt && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="card-duolingo p-8 max-w-md w-full fade-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Star size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Password Required</h3>
                <p className="text-gray-600">Enter admin or secondary password to cancel token prompt.</p>
              </div>
              <form onSubmit={async e => {
                e.preventDefault();
                const { ok } = await validatePassword(tokenCancelPassword);
                if (ok) {
                  setShowTokenCancelPrompt(false);
                  setTokenCancelPassword('');
                  setTokenCancelError('');
                  onClose();
                } else {
                  setTokenCancelError('Incorrect password!');
                }
              }}>
                <input
                  type="password"
                  value={tokenCancelPassword}
                  onChange={e => setTokenCancelPassword(e.target.value)}
                  className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium mb-4"
                  placeholder="Enter password"
                  autoFocus
                />
                {tokenCancelError && <div className="text-red-500 mb-2">{tokenCancelError}</div>}
                <div className="flex gap-4">
                  <button type="submit" className="flex-1 btn-primary-duolingo">Continue</button>
                  <button type="button" onClick={() => { setShowTokenCancelPrompt(false); setTokenCancelPassword(''); setTokenCancelError(''); }} className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold">Back</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }
  // Removed admin password gate entirely

  const currentRole = booth.roles[currentRoleIndex];
  const isLastRole = currentRoleIndex === booth.roles.length - 1;
  const currentRoleVotes = selectedVotes[currentRole?.id] || [];

  const handleCandidateSelect = (candidateId: string) => {
    setSelectedVotes(prev => {
      const currentVotes = prev[currentRole.id] || [];
      if (currentRole.numberOfVotes === 1) {
        // For single-vote roles, always set the clicked candidate as the only selection
        return {
          ...prev,
          [currentRole.id]: [candidateId]
        };
      }
      const isSelected = currentVotes.includes(candidateId);
      if (isSelected) {
        // Remove candidate if already selected
        return {
          ...prev,
          [currentRole.id]: currentVotes.filter(id => id !== candidateId)
        };
      } else {
        // Add candidate if not selected and under limit
        if (currentVotes.length < currentRole.numberOfVotes) {
          return {
            ...prev,
            [currentRole.id]: [...currentVotes, candidateId]
          };
        }
        return prev; // Don't add if at limit
      }
    });
  };

  const handleNext = () => {
    if (isLastRole) {
      setShowReview(true);
    } else {
      setCurrentRoleIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentRoleIndex > 0) {
      setCurrentRoleIndex(prev => prev - 1);
    }
  };

  const handleConfirmVote = () => {
    const votes: Vote[] = Object.entries(selectedVotes).flatMap(([roleId, candidateIds]) => 
      candidateIds.map(candidateId => ({
        roleId,
        candidateId,
        timestamp: new Date().toISOString()
      }))
    );
    // Persist token used state if tokensEnabled
    if (booth.tokensEnabled) {
      // validateToken already marked it used in local booth object above when tokenValidated was set.
    }
    onVote(votes);
    setShowConfirmation(true);
    setWaitingForStaff(true);
  };

  const getSelectedCandidate = (roleId: string) => {
    const candidateIds = selectedVotes[roleId] || [];
    const role = booth.roles.find(r => r.id === roleId);
    return candidateIds
      .map(candidateId => role?.candidates.find(c => c.id === candidateId))
      .filter((candidate): candidate is Candidate => candidate !== undefined);
  };

  if (showConfirmation && waitingForStaff) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 flex items-center justify-center confetti">
        <div className="card-duolingo p-12 max-w-md w-full text-center bounce-in">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-8 pulse-gentle">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="checkmark__circle" fill="none" cx="26" cy="26" r="25"/>
              <path className="checkmark__check" fill="none" d="m14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-black-800 mb-4">🎉 Vote Submitted! 🎉</h2>
          <p className="text-black-600 mb-8 text-lg">Thank you for participating in the election. Your vote has been recorded successfully!</p>
          <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-xl">
            <span>✅ Waiting for staff to continue…</span>
          </div>
        </div>
      </div>
    );
  }

  if (showReview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="header-gradient text-white py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Trophy size={32} className="text-yellow-300" />
                <Sparkles size={24} className="text-yellow-300" />
              </div>
              <h1 className="text-4xl font-bold mb-2">Review Your Votes</h1>
              <p className="text-blue-100 text-xl">Please review your selections before submitting</p>
            </div>
          </div>
        </div>
        <div className="review-wrapper">
          <div className="review-grid">
            {booth.roles.map((role) => {
              const selectedCandidates = getSelectedCandidate(role.id);
              if (selectedCandidates.length === 0) return null;
              return (
                <div 
                  key={role.id} 
                  className="role-card relative cursor-pointer"
                  onClick={() => { 
                    setShowReview(false); 
                    setCurrentRoleIndex(booth.roles.findIndex(r => r.id === role.id)); 
                    setIsEditingFromReview(true);
                    // Clear the editing flag after 3 seconds
                    setTimeout(() => setIsEditingFromReview(false), 3000);
                  }}
                  title="Click to edit votes for this role"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg text-gray-800">{role.name}</span>
                    <div className="absolute top-3 right-3 p-2 rounded-full bg-blue-100 text-blue-600 transition-all duration-200 hover:bg-blue-200">
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/>
                      </svg>
                    </div>
                  </div>
                  {role.numberOfVotes > 1 && (
                    <div className="text-xs text-blue-600 font-semibold mb-1">{selectedCandidates.length} of {role.numberOfVotes} selected</div>
                  )}
                  <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                    {selectedCandidates.map((candidate) => (
                      <div key={candidate.id} className="candidate-card">
                        <div className="flex flex-col items-center">
                          <img src={candidate.image || ''} alt={candidate.name} className="w-16 h-16 rounded-full object-cover mb-1 border border-gray-200" />
                          <div className="font-bold text-sm text-gray-800 truncate w-full">{candidate.name}</div>
                          <div className="text-xs text-gray-500">Class: {candidate.class} - {candidate.section}</div>
                          <div className="text-xs text-gray-500">House: {candidate.house}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-3 left-3 text-xs text-blue-600 font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    Click to edit
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => setShowReview(false)}
            className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold text-lg flex items-center gap-3"
          >
            <ArrowLeft size={20} />
            Back to Voting
          </button>
          <div className="flex gap-6">
            <button
              onClick={() => setShowCancelPrompt(true)}
              className="btn-danger-duolingo flex items-center gap-3 text-lg"
            >
              <X size={20} />
              Cancel Vote
            </button>
            <button
              onClick={handleConfirmVote}
              className="btn-primary-duolingo flex items-center gap-3 text-lg"
            >
              <Check size={20} />
              Confirm Vote
            </button>
          </div>
        </div>
        <style>{`
          .review-wrapper {
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
          }
          .review-grid {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: flex-start;
            gap: 24px;
            padding: 32px 16px;
          }
          .role-card {
            background: #fff;
            border: 1px solid #e3e6ea;
            border-radius: 14px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.10);
            padding: 16px;
            min-width: 380px;
            max-width: 420px;
            min-height: 180px;
            position: relative;
            transition: all 0.3s ease;
            cursor: pointer;
          }
          .role-card:hover {
            box-shadow: 0 8px 24px rgba(0,0,0,0.13);
            border: 2px solid #3b82f6;
            transform: translateY(-2px);
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          }
          .role-card:active {
            transform: translateY(0px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.10);
          }
          .candidate-card {
            width: 180px;
            height: 220px;
            background: #f7f9fc;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            padding: 10px 8px 8px 8px;
            margin: 6px 0;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: box-shadow 0.2s, border 0.2s;
            justify-content: flex-start;
          }
          .candidate-card:hover {
            box-shadow: 0 6px 18px rgba(0,0,0,0.13);
            border: 1.5px solid #b6c2d1;
          }
          .candidate-card img {
            width: 120px;
            height: 120px;
            border-radius: 12px;
            object-fit: cover;
            margin-bottom: 6px;
            margin-top: 1px;
            background: #f0f0f0;
            display: block;
          }
          @media (max-width: 600px) {
            .review-grid {
              flex-direction: column;
              align-items: center;
              gap: 18px;
              padding: 18px 4px;
            }
            .role-card {
              min-width: 90vw;
              max-width: 98vw;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden" style={{ paddingBottom: 64 }}>
      <div className="header-gradient text-white py-8 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <img src={'images.png'} alt="School Logo" style={{width: 48, height: 48, borderRadius: '12px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}} />
          <div style={{marginLeft: 64}}>
            <h1 className="text-4xl font-bold mb-2">Navy Children School Vizag</h1>
            <h2 className="text-2xl text-blue-100">{booth.name}</h2>
          </div>
        </div>
        <button
          onClick={() => setShowStopPrompt(true)}
          className="btn-danger-duolingo flex items-center gap-2"
        >
          <Square size={20} />
          Stop Voting
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Editing from review banner */}
        {isEditingFromReview && (
          <div className="card-duolingo p-4 mb-6 bg-blue-50 border-2 border-blue-200 fade-in">
            <div className="flex items-center gap-3 text-blue-700">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/>
                </svg>
              </div>
              <span className="font-semibold">Editing votes for {currentRole.name} - Make your changes and continue</span>
            </div>
          </div>
        )}
        
        <div className="card-duolingo p-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <img src={'images.png'} alt="School Logo" style={{width: 32, height: 32, borderRadius: '8px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}} />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-800">
                  Vote for {currentRole.name}
                </h3>
                <p className="text-gray-600 text-lg">Choose your preferred candidate</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-2">Progress</div>
              <div className="text-2xl font-bold text-navy-600">
                {currentRoleIndex + 1} of {booth.roles.length}
              </div>
            </div>
          </div>
          <div className="progress-duolingo mb-6">
            <div
              className="progress-fill"
              style={{ width: `${((currentRoleIndex + 1) / booth.roles.length) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 justify-center items-stretch mb-2">
            {currentRole.candidates.map((candidate) => (
              <div key={candidate.id} className="transform scale-90">
                <CandidateCard
                  candidate={candidate}
                  selected={currentRoleVotes.includes(candidate.id)}
                  onClick={() => handleCandidateSelect(candidate.id)}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-6">
            {isEditingFromReview ? (
              <button
                onClick={() => {
                  setShowReview(true);
                  setIsEditingFromReview(false);
                }}
                className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl transition-all duration-300 font-bold text-lg flex items-center gap-3 hover:scale-105"
              >
                <ArrowLeft size={20} />
                Review Page
              </button>
            ) : (
              <button
                onClick={handlePrevious}
                disabled={currentRoleIndex === 0}
                className={`px-8 py-4 rounded-2xl transition-all duration-300 font-bold text-lg flex items-center gap-3 ${
                  currentRoleIndex === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-700 hover:scale-105'
                }`}
              >
                <ArrowLeft size={20} />
                Previous
              </button>
            )}
            <div className="flex items-center gap-2 mr-4">
              <span className="text-lg font-mono font-semibold bg-gray-100 px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                {currentRoleVotes.length} / {currentRole.numberOfVotes}
              </span>
            </div>
            <div className="flex gap-6">
              <button
                onClick={handleNext}
                disabled={currentRoleVotes.length !== currentRole.numberOfVotes}
                className={`px-8 py-4 rounded-2xl transition-all duration-300 font-bold text-lg flex items-center gap-3 ${
                  currentRoleVotes.length === currentRole.numberOfVotes
                    ? 'btn-primary-duolingo'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLastRole ? '📋 Review Votes' : 'Next Role'}
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {showCancelPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-duolingo p-8 max-w-md w-full fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Admin Password Required</h3>
              <p className="text-gray-600">Enter admin password to cancel voting.</p>
            </div>
            <form onSubmit={async e => {
              e.preventDefault();
              const { ok } = await validateAdmin(cancelPassword);
              if (ok) {
                setShowCancelPrompt(false);
                setCancelPassword('');
                setCancelPasswordError('');
                onClose();
              } else {
                setCancelPasswordError('Incorrect password!');
              }
            }}>
              <input
                type="password"
                value={cancelPassword}
                onChange={e => setCancelPassword(e.target.value)}
                className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium mb-4"
                placeholder="Enter password"
                autoFocus
              />
              {cancelPasswordError && <div className="text-red-500 mb-2">{cancelPasswordError}</div>}
              <div className="flex gap-4">
                <button type="submit" className="flex-1 btn-primary-duolingo">Continue</button>
                <button type="button" onClick={() => { setShowCancelPrompt(false); setCancelPassword(''); setCancelPasswordError(''); }} className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showStopPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-duolingo p-8 max-w-md w-full fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Square size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Stop Voting</h3>
              <p className="text-gray-600">Enter admin password to stop voting:</p>
            </div>
            <form onSubmit={async e => {
              e.preventDefault();
              const { ok } = await validatePassword(stopPassword);
              if (ok) {
                setShowStopPrompt(false);
                setStopPassword('');
                setStopPasswordError('');
                onStopVoting();
              } else {
                setStopPasswordError('Incorrect password!');
              }
            }}>
      {showTokenCancelPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-duolingo p-8 max-w-md w-full fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Admin Password Required</h3>
              <p className="text-gray-600">Enter admin password to cancel token prompt.</p>
            </div>
            <form onSubmit={async e => {
              e.preventDefault();
              const { ok } = await validateAdmin(tokenCancelPassword);
              if (ok) {
                setShowTokenCancelPrompt(false);
                setTokenCancelPassword('');
                setTokenCancelError('');
                onClose();
              } else {
                setTokenCancelError('Incorrect password!');
              }
            }}>
              <input
                type="password"
                value={tokenCancelPassword}
                onChange={e => setTokenCancelPassword(e.target.value)}
                className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium mb-4"
                placeholder="Enter password"
                autoFocus
              />
              {tokenCancelError && <div className="text-red-500 mb-2">{tokenCancelError}</div>}
              <div className="flex gap-4">
                <button type="submit" className="flex-1 btn-primary-duolingo">Continue</button>
                <button type="button" onClick={() => { setShowTokenCancelPrompt(false); setTokenCancelPassword(''); setTokenCancelError(''); }} className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
              <input
                type="password"
                value={stopPassword}
                onChange={e => setStopPassword(e.target.value)}
                className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-red-200 focus:border-red-400 transition-all duration-300 text-lg font-medium mb-4"
                placeholder="Enter password"
                autoFocus
              />
              {stopPasswordError && <div className="text-red-500 mb-2">{stopPasswordError}</div>}
              <div className="flex gap-4">
                <button type="submit" className="flex-1 btn-danger-duolingo">Stop Voting</button>
                <button type="button" onClick={() => { setShowStopPrompt(false); setStopPassword(''); setStopPasswordError(''); }} className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};