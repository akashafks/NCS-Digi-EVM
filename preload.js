const { contextBridge, ipcRenderer } = require('electron');

console.log('preload.js loaded');

contextBridge.exposeInMainWorld('api', {
  saveBooth: (boothName, data) => ipcRenderer.invoke('save-booth', boothName, data),
  loadBooths: () => ipcRenderer.invoke('load-booths'),
  saveCandidate: (boothName, roleName, candidateName, data) => ipcRenderer.invoke('save-candidate', boothName, roleName, candidateName, data),
  loadCandidates: (boothName, roleName) => ipcRenderer.invoke('load-candidates', boothName, roleName),
  saveVotes: (boothName, data) => ipcRenderer.invoke('save-votes', boothName, data),
  loadVotes: (boothName) => ipcRenderer.invoke('load-votes', boothName),
  savePhoto: (boothName, roleName, candidateName, photoBuffer) => ipcRenderer.invoke('save-photo', boothName, roleName, candidateName, photoBuffer),
  loadPhoto: (boothName, roleName, candidateName) => ipcRenderer.invoke('load-photo', boothName, roleName, candidateName),
  onNextVoter: (callback) => ipcRenderer.on('next-voter', callback),
  deleteBoothFiles: (boothName) => ipcRenderer.invoke('delete-booth-files', boothName),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (updates) => ipcRenderer.invoke('set-settings', updates),
  validatePassword: (input) => ipcRenderer.invoke('validate-password', input),
  validateAdmin: (input) => ipcRenderer.invoke('validate-admin', input),
  setSecondaryPassword: (payload) => ipcRenderer.invoke('set-secondary-password', payload),
}); 