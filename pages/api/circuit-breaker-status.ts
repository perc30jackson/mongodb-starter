import { NextApiRequest, NextApiResponse } from 'next';
import CircuitBreaker from '@/lib/circuit-breaker';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const circuitBreaker = CircuitBreaker.getInstance();
    const states = circuitBreaker.getStates();
    
    const stateArray = Array.from(states.entries()).map(([key, state]) => ({
      key,
      ...state,
      timeSinceLastFailure: state.lastFailureTime > 0 ? Date.now() - state.lastFailureTime : null
    }));

    res.status(200).json({
      states: stateArray,
      summary: {
        total: stateArray.length,
        open: stateArray.filter(s => s.state === 'OPEN').length,
        halfOpen: stateArray.filter(s => s.state === 'HALF_OPEN').length,
        closed: stateArray.filter(s => s.state === 'CLOSED').length
      }
    });
  } catch (error) {
    console.error('Error getting circuit breaker status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
