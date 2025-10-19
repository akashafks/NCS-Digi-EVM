// Data API for Electron file-based storage
// Use these methods in your React components instead of localStorage/IndexedDB

declare global {
  interface Window {
    api: {
      saveBooth: (boothName: string, data: any) => Promise<any>;
      loadBooths: () => Promise<any>;
      saveCandidate: (boothName: string, roleName: string, candidateName: string, data: any) => Promise<any>;
      loadCandidates: (boothName: string, roleName: string) => Promise<any>;
      saveVotes: (boothName: string, data: any) => Promise<any>;
      loadVotes: (boothName: string) => Promise<any>;
      savePhoto: (boothName: string, roleName: string, candidateName: string, photoBuffer: Uint8Array) => Promise<any>;
      loadPhoto: (boothName: string, roleName: string, candidateName: string) => Promise<string | null>;
      onNextVoter: (callback: () => void) => void;
      deleteBoothFiles: (boothName: string) => Promise<any>;
      getSettings: () => Promise<{ hotkey: string; hasSecondary: boolean }>;
      setSettings: (updates: Partial<{ hotkey: string }>) => Promise<{ hotkey: string; hasSecondary: boolean }>;
      validatePassword: (input: string) => Promise<{ ok: boolean }>;
      validateAdmin: (input: string) => Promise<{ ok: boolean }>;
      setSecondaryPassword: (payload: { currentInput: string; newPassword: string }) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}

// Booths
export async function saveBooth(boothName: string, data: any) {
  return window.api.saveBooth(boothName, data);
}

export async function loadBooths() {
  return window.api.loadBooths();
}

export async function getSettings() {
  return window.api.getSettings();
}

export async function setSettings(updates: Partial<{ hotkey: string }>) {
  return window.api.setSettings(updates);
}

export async function validatePassword(input: string) {
  return window.api.validatePassword(input);
}

export async function validateAdmin(input: string) {
  return window.api.validateAdmin(input);
}

export async function setSecondaryPassword(payload: { currentInput: string; newPassword: string }) {
  return window.api.setSecondaryPassword(payload);
}

// Candidates
export async function saveCandidate(boothName: string, roleName: string, candidateName: string, data: any) {
  return window.api.saveCandidate(boothName, roleName, candidateName, data);
}

export async function loadCandidates(boothName: string, roleName: string) {
  return window.api.loadCandidates(boothName, roleName);
}

// Votes
export async function saveVotes(boothName: string, data: any) {
  return window.api.saveVotes(boothName, data);
}

export async function loadVotes(boothName: string) {
  return window.api.loadVotes(boothName);
}

// Photos
// photoFile: File from input, or ArrayBuffer/Uint8Array
export async function savePhoto(boothName: string, roleName: string, candidateName: string, photoFile: File | ArrayBuffer | Uint8Array) {
  let buffer: ArrayBuffer;
  if (photoFile instanceof File) {
    buffer = await photoFile.arrayBuffer();
  } else if (photoFile instanceof ArrayBuffer) {
    buffer = photoFile;
  } else {
    // Ensure we produce a standalone ArrayBuffer instance
    const view = photoFile as Uint8Array;
    const copy = new Uint8Array(view.byteLength);
    copy.set(view);
    buffer = copy.buffer; // This is a fresh ArrayBuffer
  }
  // Cast to the correct type; ensure buffer is ArrayBuffer
  const arr = new Uint8Array(buffer as ArrayBuffer);
  return window.api.savePhoto(boothName, roleName, candidateName, arr);
}

// Returns base64 string (use as <img src={`data:image/jpeg;base64,${base64}`}/>)
export async function loadPhoto(boothName: string, roleName: string, candidateName: string) {
  return window.api.loadPhoto(boothName, roleName, candidateName);
} 