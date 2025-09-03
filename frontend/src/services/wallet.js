import api from './api';
export const walletService = {
  // Get wallet balance
  getBalance: () => {
    return api.get('/wallet');
  },
  // Create deposit request with payment method
  deposit: (depositData) => {
    return api.post('/wallet/deposit', depositData);
  },
  // Legacy add money method (deprecated)
  addMoney: (amount, paymentMethodId = null, transactionDetails = {}) => {
    return walletService.deposit({
      amount,
      payment_method_id: paymentMethodId,
      transaction_details: transactionDetails
    });
  },
  // Create withdrawal request with payment method
  withdraw: (withdrawalData) => {
    return api.post('/wallet/withdraw', withdrawalData);
  },
  // Get transaction history
  getTransactions: (limit = 50) => {
    return api.get(`/wallet/transactions?limit=${limit}`);
  },
  // Get wallet summary
  getSummary: () => {
    return api.get('/wallet/summary');
  },
  // Get wallet info
  getWalletInfo: () => {
    return api.get('/wallet/');
  }
};
export default walletService;
