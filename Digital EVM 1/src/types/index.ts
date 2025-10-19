export interface Candidate {
  id: string;
  name: string;
  class: string;
  section: string;
  house: string;
  image: string;
  roleId: string;
  photoRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Role {
  id: string;
  name: string;
  candidates: Candidate[];
  numberOfVotes: number; // NEW: Number of votes allowed for this role
}

export interface VotingBooth {
  id: string;
  name: string;
  roles: Role[];
  isActive: boolean;
  startTime?: string;
  endTime?: string;
  totalVotes: number;
  expectedVoters?: number; // Optional: total expected voters for participation calculation
  tokensEnabled?: boolean;
  tokens?: { code: string; used: boolean }[];
  tokensSingleUse?: boolean;
}

export interface Vote {
  roleId: string;
  candidateId: string;
  timestamp: string;
}

export interface VotingSession {
  boothId: string;
  votes: Vote[];
  timestamp: string;
}

export interface VoteCount {
  candidateId: string;
  candidateName: string;
  count: number;
}

export interface RoleResults {
  roleId: string;
  roleName: string;
  votes: VoteCount[];
  totalVotes: number;
  uniqueVoters?: number; // Number of unique voters for this role
}

export interface Results {
  boothId: string;
  boothName: string;
  roles: RoleResults[];
  totalVotes: number;
  endTime: string;
}