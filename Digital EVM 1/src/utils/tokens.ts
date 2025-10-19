export interface BoothToken {
  code: string;
  used: boolean;
}

export function generateTokens(boothId: string, count: number, length: number = 8): BoothToken[] {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const tokens: BoothToken[] = [];
  const prefix = (boothId || '').toString().slice(0, 4).toUpperCase();
  for (let i = 0; i < count; i++) {
    let token = '';
    for (let j = 0; j < length; j++) {
      token += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    tokens.push({ code: `${prefix}-${token}`, used: false });
  }
  return tokens;
}

export function validateToken(
  boothData: { tokens?: BoothToken[]; tokensSingleUse?: boolean },
  enteredCode: string
): { success: boolean; message: string } {
  const tokens = boothData.tokens || [];
  const token = tokens.find((t) => t.code === (enteredCode || '').trim());
  if (!token) return { success: false, message: 'Invalid token!' };
  if (boothData.tokensSingleUse && token.used) return { success: false, message: 'Token already used!' };
  // Mark used in-memory; caller persists via saveBooth
  token.used = true;
  return { success: true, message: 'Token accepted!' };
}


