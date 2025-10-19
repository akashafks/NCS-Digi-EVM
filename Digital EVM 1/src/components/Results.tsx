import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, FileText, Code, Star, Award, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { VotingBooth, Results as ResultsType, VotingSession } from '../types';
import { exportToTxt, exportToJson, downloadFile } from '../utils/export';

import { loadBooths, loadVotes, saveVotes, saveBooth, validatePassword } from '../utils/dataApi';

interface ResultsProps {
  boothId: string;
  onBack: () => void;
}

export const Results: React.FC<ResultsProps> = ({ boothId, onBack }) => {
  const [booths, setBooths] = useState<VotingBooth[]>([]);
  const [sessions, setSessions] = useState<VotingSession[]>([]);
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError('');
        const loadedBooths = await loadBooths();
        setBooths(Array.isArray(loadedBooths) ? loadedBooths : []);
      } catch (error) {
        console.error('Error loading booths:', error);
        setLoadError('Failed to load booth data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const booth = booths.find(b => b.id === boothId);

  // Always reload votes.json when booth or boothId changes
  useEffect(() => {
    if (booth) {
      const loadVotesData = async () => {
        try {
          const votes = await loadVotes(booth.name);
          setSessions(Array.isArray(votes) ? votes : []);
          console.log('Votes loaded for booth:', booth.name, 'Count:', Array.isArray(votes) ? votes.length : 0);
        } catch (error) {
          console.error('Error loading votes for booth:', booth.name, error);
          setLoadError('Failed to load vote data. Please try again.');
        }
      };
      loadVotesData();
    }
  }, [booth, boothId]);

  // Listen for booth-updated events to refresh votes in real-time
  useEffect(() => {
    const handleBoothUpdate = async (e: any) => {
      const updatedBoothId = e.detail?.boothId;
      if (updatedBoothId === boothId && booth) {
        try {
          const votes = await loadVotes(booth.name);
          setSessions(Array.isArray(votes) ? votes : []);
        } catch (error) {
          console.error('Error refreshing votes:', error);
        }
      }
    };

    const handleVotesReset = (e: any) => {
      const resetBoothId = e.detail?.boothId;
      if (resetBoothId === boothId) {
        setSessions([]);
      }
    };

    window.addEventListener('booth-updated', handleBoothUpdate);
    window.addEventListener('votes-reset', handleVotesReset);
    
    return () => {
      window.removeEventListener('booth-updated', handleBoothUpdate);
      window.removeEventListener('votes-reset', handleVotesReset);
    };
  }, [booth, boothId]);

  useEffect(() => {
    console.log('boothSessions', sessions.filter(s => s.boothId === boothId));
  }, [sessions, boothId]);

  // Reset Results handler
  const handleResetResults = async () => {
    setShowResetPrompt(true);
  };
  const confirmResetResults = async () => {
    const { ok } = await validatePassword(resetPassword);
    if (!ok) {
      setResetError('Incorrect password!');
      return;
    }
    if (booth) {
      try {
        console.log('Starting reset process for booth:', booth.name);
        
        // Clear votes.json file
        await saveVotes(booth.name, []);
        console.log('Votes cleared from file');
        
        // Update booth data with totalVotes = 0
        const updatedBooth = { ...booth, totalVotes: 0 };
        await saveBooth(booth.name, updatedBooth);
        console.log('Booth data updated');
        
        // Update local state immediately
        setSessions([]);
        setBooths(prev => prev.map(b => b.id === booth.id ? updatedBooth : b));
        console.log('Local state updated');
        
        // Force reload votes to ensure UI is updated
        const reloadedVotes = await loadVotes(booth.name);
        console.log('Reloaded votes:', reloadedVotes);
        
        // Small delay to ensure file operations complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Notify all components to reload data
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('booth-updated', { detail: { boothId: booth.id } }));
          window.dispatchEvent(new CustomEvent('votes-reset', { detail: { boothId: booth.id } }));
          console.log('Events dispatched');
        }
        
        console.log('Results reset successfully for booth:', booth.name);
        setResetSuccess(true);
        // Clear success message after 3 seconds
        setTimeout(() => setResetSuccess(false), 3000);
      } catch (error) {
        console.error('Error resetting results:', error);
        setResetError('Failed to reset results. Please try again.');
        return;
      }
    }
    setShowResetPrompt(false);
    setResetPassword('');
    setResetError('');
  };

  const boothSessions = sessions.filter(s => s.boothId === boothId);

  const results = useMemo(() => {
    if (!booth) return null;

    const roleResults = booth.roles.map(role => {
      const voteCounts = new Map<string, number>();
      const uniqueVoters = new Set<string>();
      // Initialize counts for all candidates
      role.candidates.forEach(candidate => {
        voteCounts.set(candidate.id, 0);
      });

      // Count votes from all sessions
      boothSessions.forEach(session => {
        let votedInRole = false;
        session.votes.forEach(vote => {
          if (vote.roleId === role.id) {
            const currentCount = voteCounts.get(vote.candidateId) || 0;
            voteCounts.set(vote.candidateId, currentCount + 1);
            votedInRole = true;
          }
        });
        if (votedInRole) {
          uniqueVoters.add(session.timestamp); // timestamp as unique session id
        }
      });

      const votes = Array.from(voteCounts.entries()).map(([candidateId, count]) => {
        const candidate = role.candidates.find(c => c.id === candidateId);
        return {
          candidateId,
          candidateName: candidate?.name || 'Unknown',
          count
        };
      }).sort((a, b) => b.count - a.count);

      return {
        roleId: role.id,
        roleName: role.name,
        votes,
        totalVotes: votes.reduce((sum, vote) => sum + vote.count, 0),
        uniqueVoters: uniqueVoters.size
      };
    });

    const totalVotes = boothSessions.length;
    // Add expectedVoters to results if present on booth
    return {
      boothId: booth.id,
      boothName: booth.name,
      roles: roleResults,
      totalVotes,
      endTime: booth.endTime || new Date().toISOString(),
      expectedVoters: booth.expectedVoters || null
    } as ResultsType & { expectedVoters?: number | null };
  }, [booth, boothSessions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="card-duolingo p-8 max-w-md w-full fade-in">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-spin">
              <Loader2 size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Loading Results...</h3>
            <p className="text-gray-600">Please wait while we load the voting data.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="card-duolingo p-8 max-w-md w-full fade-in">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Data</h3>
            <p className="text-gray-600 mb-6">{loadError}</p>
            <button onClick={() => window.location.reload()} className="btn-primary-duolingo">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (!booth || !results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="card-duolingo p-12 text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-red-400 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <img src={'images.png'} alt="School Logo" style={{width: 48, height: 48, borderRadius: '12px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}} />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Booth Not Found</h2>
          <button
            onClick={onBack}
            className="btn-primary-duolingo flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={20} />
            Back to Admin Panel
          </button>
        </div>
      </div>
    );
  }

  const handleExportTxt = () => {
    const txtContent = exportToTxt(results);
    const filename = `${booth.name.replace(/\s+/g, '_')}_results.txt`;
    downloadFile(txtContent, filename, 'text/plain');
  };

  const handleExportJson = () => {
    const jsonContent = exportToJson(results);
    const filename = `${booth.name.replace(/\s+/g, '_')}_results.json`;
    downloadFile(jsonContent, filename, 'application/json');
  };

  const handleExportExcel = async () => {
    if (!results) return;
    try {
      // Dynamically import xlsx to avoid build-time errors
      const xlsx = await import('xlsx');
      // Prepare data for Excel
      const rows: { Role: string; Candidate: string; Votes: number }[] = [];
      results.roles.forEach(role => {
        role.votes.forEach(vote => {
          rows.push({
            Role: role.roleName,
            Candidate: vote.candidateName,
            Votes: vote.count
          });
        });
      });
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Results');
      xlsx.writeFile(wb, `${results.boothName.replace(/\s+/g, '_')}_results.xlsx`);
    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('Excel export is not available in this environment. Please use TXT or JSON export instead.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden" style={{ paddingBottom: 64 }}>
      {/* Decorative background elements */}
      <div className="decoration-circle-1 floating"></div>
      <div className="decoration-circle-2 floating-delayed"></div>
      <div className="decoration-circle-3 floating"></div>

      <div className="header-gradient text-white py-8 confetti">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-all duration-300"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src={'images.png'} alt="School Logo" style={{width: 40, height: 40, borderRadius: '10px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}} />
                <Sparkles size={24} className="text-yellow-300 floating" />
                <h1 className="text-4xl font-bold">🏆 Election Results</h1>
              </div>
              <p className="text-blue-100 text-xl">{booth.name}</p>
            </div>
            <div className="flex gap-4 ml-8">
              <button 
                className="btn-secondary-duolingo" 
                onClick={async () => {
                  if (booth) {
                    const votes = await loadVotes(booth.name);
                    setSessions(Array.isArray(votes) ? votes : []);
                    console.log('Manual refresh completed');
                  }
                }}
              >
                Refresh
              </button>
              <button className="btn-danger-duolingo" onClick={handleResetResults}>Reset Results</button>
            </div>
          </div>
        </div>
      </div>

      {/* Success message for reset */}
      {resetSuccess && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="card-duolingo p-4 bg-green-50 border-green-200 fade-in">
            <div className="flex items-center gap-3 text-green-700">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
              <span className="font-semibold">Results reset successfully! All votes have been cleared.</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="card-duolingo p-8 mb-12 fade-in">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <Award size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800">Election Summary</h2>
              <p className="text-gray-600 text-lg">Complete voting results overview</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-3xl">
              <div className="text-5xl font-bold text-green-600 mb-2">{results.totalVotes}</div>
              <div className="text-gray-700 font-semibold text-lg">🗳️ Total Votes Cast</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl">
              <div className="text-5xl font-bold text-blue-600 mb-2">{results.roles.length}</div>
              <div className="text-gray-700 font-semibold text-lg">🏆 Roles Contested</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl">
              <div className="text-5xl font-bold text-purple-600 mb-2">
                {results.roles.reduce((sum, role) => sum + role.votes.length, 0)}
              </div>
              <div className="text-gray-700 font-semibold text-lg">👥 Total Candidates</div>
            </div>
          </div>
        </div>

        {/* Full-width section for each role */}
        <div className="space-y-12">
          {results.roles.map((role, roleIndex) => (
            <div 
              key={role.roleId} 
              className="card-duolingo overflow-hidden fade-in w-full"
              style={{ animationDelay: `${roleIndex * 0.1}s` }}
            >
              <div className="bg-gradient-to-r from-navy-50 to-purple-50 px-8 py-6 border-b-4 border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                      <img src={'images.png'} alt="School Logo" style={{width: 32, height: 32, borderRadius: '8px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-gray-800">{role.roleName}</h3>
                      <p className="text-gray-600 text-lg">{role.totalVotes} votes cast</p>
                    </div>
                  </div>
                </div>
              <div className="p-8">
                <div className="space-y-6">
                  {role.votes.map((vote, index) => {
                    const percentage = role.totalVotes > 0 ? (vote.count / role.totalVotes) * 100 : 0;
                    const isWinner = index === 0 && vote.count > 0;
                    return (
                      <div 
                        key={vote.candidateId} 
                        className={`p-6 rounded-3xl border-3 transition-all duration-500 ${
                          isWinner 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-lg' 
                            : 'bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200'
                        }`}
                        style={{ animationDelay: `${(roleIndex * 0.1) + (index * 0.05)}s` }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            {isWinner && (
                              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white text-xl font-bold">👑</span>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <Star size={24} className={isWinner ? 'text-yellow-500' : 'text-gray-400'} />
                              <span className="font-bold text-xl text-gray-800">{vote.candidateName}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-gray-800">{vote.count}</div>
                            <div className="text-lg text-gray-600 font-semibold">{percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="progress-duolingo">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              isWinner 
                                ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                                : 'bg-gradient-to-r from-blue-400 to-purple-500'
                            }`}
                            style={{ 
                              width: `${percentage}%`,
                              animationDelay: `${(roleIndex * 0.2) + (index * 0.1)}s`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card-duolingo p-8 mt-12 fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <Download size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Export Options</h3>
              <p className="text-gray-600 text-lg">Download the election results in your preferred format</p>
            </div>
          </div>
          <div className="flex gap-6">
            <button
              onClick={handleExportTxt}
              className="btn-primary-duolingo flex items-center gap-3 text-lg"
            >
              <FileText size={24} />
              Export as TXT
            </button>
            <button
              onClick={handleExportJson}
              className="btn-secondary-duolingo flex items-center gap-3 text-lg"
            >
              <Code size={24} />
              Export as JSON
            </button>
            <button
              onClick={handleExportExcel}
              className="btn-secondary-duolingo flex items-center gap-3 text-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              Export as Excel
            </button>
          </div>
        </div>
      </div>
      {showResetPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-duolingo p-8 max-w-md w-full fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Admin Password Required</h3>
              <p className="text-gray-600">Enter admin password to reset results.</p>
            </div>
            <form onSubmit={e => { e.preventDefault(); confirmResetResults(); }}>
              <input
                type="password"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium mb-4"
                placeholder="Enter password"
                autoFocus
              />
              {resetError && <div className="text-red-500 mb-2">{resetError}</div>}
              <div className="flex gap-4">
                <button type="submit" className="flex-1 btn-danger-duolingo">Reset</button>
                <button type="button" onClick={() => { setShowResetPrompt(false); setResetPassword(''); setResetError(''); }} className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};