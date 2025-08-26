import api from './api';
export const paymentService = {
  // Get deposit methods only
  getDepositMethods: () => {
    return api.get('/wallet/payment-methods/deposit');
  },
  // Get withdrawal methods only  
  getWithdrawalMethods: () => {
    return api.get('/wallet/payment-methods/withdrawal');
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