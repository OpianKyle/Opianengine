import { Router } from 'express';
import { verifyReferralCode } from '../utils/referral';

const router = Router();

router.get('/api/verify-referral/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const isValid = await verifyReferralCode(code);
    res.json({ isValid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify referral code' });
  }
});

export default router;
