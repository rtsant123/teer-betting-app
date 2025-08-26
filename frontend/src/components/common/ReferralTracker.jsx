import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { referralService } from '../../services/referral';
const ReferralTracker = ({ children }) => {
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const handleReferralTracking = async () => {
      const refCode = searchParams.get('ref');
      if (refCode) {
        try {
          // Store the referral code in localStorage for later use during registration
          localStorage.setItem('referralCode', refCode);
          // Track the referral link click
          await referralService.trackReferralClick(refCode);
        } catch (error) {
          console.error('Failed to track referral:', error);
        }
      }
    };
    handleReferralTracking();
  }, [searchParams]);
  return children;
};
export default ReferralTracker;