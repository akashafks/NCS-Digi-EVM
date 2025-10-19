import { Results } from '../types';
import * as XLSX from 'xlsx';
import { VotingBooth } from '../types';

export const exportToTxt = (results: Results) => {
  let output = `NAVY CHILDREN SCHOOL VIZAG – VOTING RESULTS\n\n`;
  output += `Booth: ${results.boothName}\n`;
  output += `Voting Ended: ${new Date(results.endTime).toLocaleString()}\n\n`;

  results.roles.forEach(role => {
    output += `${role.roleName}:\n`;
    role.votes.forEach(vote => {
      output += `- ${vote.candidateName}: ${vote.count}\n`;
    });
    output += `Total votes for ${role.roleName}: ${role.totalVotes}\n\n`;
  });

  output += `Total Votes Cast: ${results.totalVotes}\n`;
  output += `Generated on: ${new Date().toLocaleString()}`;

  return output;
};

export const exportToJson = (results: Results) => {
  return JSON.stringify(results, null, 2);
};

export const exportBoothToExcel = (booth: VotingBooth, votes: { [candidateId: string]: number }) => {
  // Prepare data rows
  let rows: any[] = [];
  booth.roles.forEach(role => {
    // Gather candidates and their vote counts
    const candidatesWithVotes = role.candidates.map(candidate => ({
      ...candidate,
      totalVotes: votes[candidate.id] || 0
    }));
    // Sort by votes descending for ranking
    candidatesWithVotes.sort((a, b) => b.totalVotes - a.totalVotes);
    // Calculate total votes for this role
    const totalRoleVotes = candidatesWithVotes.reduce((sum, c) => sum + c.totalVotes, 0) || 1;
    candidatesWithVotes.forEach((candidate, idx) => {
      rows.push({
        'Role Name': role.name,
        'Candidate Name': candidate.name,
        'Class': candidate.class,
        'Section': candidate.section,
        'House': candidate.house,
        'Total Votes': candidate.totalVotes,
        'Rank (Position)': idx + 1,
        'Vote % in Role': ((candidate.totalVotes / totalRoleVotes) * 100).toFixed(2) + '%',
        'Photo': candidate.image || '' // base64 or file link
      });
    });
  });
  // Create worksheet and workbook
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, booth.name);
  // Download Excel file
  XLSX.writeFile(wb, `${booth.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.xlsx`);
};

export const exportBoothToJson = (booth: VotingBooth, votes: any[]) => {
  // DO NOT remove images, keep them for portability
  const boothCopy = JSON.parse(JSON.stringify(booth));
  // Attach votes
  return JSON.stringify({ booth: boothCopy, votes }, null, 2);
};

export const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};