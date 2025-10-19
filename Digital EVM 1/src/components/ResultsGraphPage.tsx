import React, { useEffect, useState } from 'react';
import { VotingBooth, VotingSession } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';
import { loadBooths, loadVotes, saveVotes } from '../utils/dataApi';

export const ResultsGraphPage: React.FC = () => {
  const [booths, setBooths] = useState<VotingBooth[]>([]);
  // If you want to show sessions, add a loadSessions API and useState for sessions
  const [sessions, setSessions] = useState<VotingSession[]>([]);
  const navigate = useNavigate();
  const { boothId } = useParams();

  useEffect(() => {
    loadBooths().then(setBooths);
  }, []);

  // Find booth by id, not name
  const booth = booths.find(b => b.id === boothId);

  useEffect(() => {
    if (booth) {
      loadVotes(booth.name).then(votes => setSessions(Array.isArray(votes) ? votes : []));
    }
  }, [booth]);

  const boothSessions: VotingSession[] = booth ? sessions.filter(s => s.boothId === booth.id) : [];

  // Add reset handler
  const handleResetResults = async () => {
    if (booth) {
      await saveVotes(booth.name, []);
      setSessions([]);
      // Also reset totalVotes and update booth if possible
      booth.totalVotes = 0;
      // Optionally, trigger a parent update if a prop is provided
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('booth-updated', { detail: { boothId: booth.id } }));
      }
    }
  };

  if (!booth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="card-duolingo p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">No Booth Data Found</h2>
          <button className="btn-primary-duolingo" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>
    );
  }

  // Prepare data for each role
  const roleData = booth.roles.map(role => {
    const voteCounts: Record<string, number> = {};
    role.candidates.forEach(candidate => {
      voteCounts[candidate.name] = 0;
    });
    boothSessions.forEach(session => {
      session.votes.forEach(vote => {
        if (vote.roleId === role.id) {
          const candidate = role.candidates.find(c => c.id === vote.candidateId);
          if (candidate) voteCounts[candidate.name] += 1;
        }
      });
    });
    const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
    const chartData = Object.entries(voteCounts).map(([name, count]) => ({
      name,
      count,
      percent: totalVotes > 0 ? ((count / totalVotes) * 100) : 0
    }));
    return { role, chartData, totalVotes };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden" style={{ paddingBottom: 64 }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img src={'images.png'} alt="School Logo" style={{width: 32, height: 32, borderRadius: '8px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'}} />
            <h1 className="text-3xl font-bold text-navy-700">📊 Election Results Graphs</h1>
          </div>
          <div className="flex gap-4">
            <button className="btn-secondary-duolingo" onClick={() => navigate(-1)}>Back to Results</button>
            <button className="btn-danger-duolingo" onClick={handleResetResults}>Reset Results</button>
          </div>
        </div>
        <div className="space-y-12">
          {roleData.map(({ role, chartData, totalVotes }) => (
            <div key={role.id} className="card-duolingo p-8 fade-in">
              <h2 className="text-2xl font-bold mb-6 text-navy-700">{role.name}</h2>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 20, right: 40, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontWeight: 'bold', fontSize: 16 }} />
                  <YAxis allowDecimals={false} tick={{ fontWeight: 'bold', fontSize: 16 }} />
                  <Tooltip formatter={(value: number) => `${value} votes`} />
                  <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]}>
                    <LabelList dataKey="count" position="top" formatter={(label) => typeof label === 'number' ? `${label}` : ''} />
                    <LabelList dataKey="percent" position="insideTop" formatter={(label) => typeof label === 'number' ? `(${label.toFixed(1)}%)` : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="text-right text-gray-500 mt-2">Total votes: {totalVotes}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 