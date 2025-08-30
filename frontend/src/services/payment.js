import api from './api';
export const paymentService = {
  // Get deposit methods only
  getDepositMethods: (queryParams = '') => {
    return api.get(`/wallet/payment-methods/deposit${queryParams}`);
  },
  // Get withdrawal methods only  
  getWithdrawalMethods: (queryParams = '') => {
    return api.get(`/wallet/payment-methods/withdrawal${queryParams}`);
  },
  // Legacy method for backward compatibility
  getPublicPaymentMethods: (type = null) => {
    if (type === 'deposit') {
      return paymentService.getDepositMethods();
    } else if (type === 'withdrawal') {
      return paymentService.getWithdrawalMethods();
    }
    // Default to deposit methods if no type specified
    return paymentService.getDepositMethods();
  }
};
export default paymentService;
