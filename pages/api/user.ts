import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // User API is not available in the network manager
  return res.status(404).json({
    error: 'User API is not available'
  });
}
