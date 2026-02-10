import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

export const generateTestToken = (payload: { userId: string; email?: string; role?: string }, expiresIn = '1h') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyTestToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const createAuthHeader = (userId: string, role = 'talent') => {
  const token = generateTestToken({ userId, role });
  return `Bearer ${token}`;
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) return;
    await sleep(interval);
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
};
