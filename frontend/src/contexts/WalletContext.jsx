import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { walletService } from '../services/wallet';
import { useAuth } from './AuthContext';
export const WalletContext = createContext();
const initialState = {
  balance: 0,
  transactions: [],
  isLoading: false,
  error: null,
};
const walletReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case 'SET_WALLET_INFO':
      return {
        ...state,
        isLoading: false,
        balance: action.payload.balance,
        transactions: action.payload.recent_transactions,
        error: null,
      };
    case 'UPDATE_BALANCE':
      return {
        ...state,
        balance: action.payload,
      };
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
      };
    case 'SET_TRANSACTIONS':
      return {
        ...state,
        transactions: action.payload,
        isLoading: false,
      };
    default:
      return state;
  }
};
export const WalletProvider = ({ children }) => {
  const [state, dispatch] = useReducer(walletReducer, initialState);
  const { updateUser, isAuthenticated } = useAuth();
  const lastFetchTimeRef = React.useRef(0);
  const isFetchingRef = React.useRef(false);
  const fetchWalletInfo = useCallback(async () => {
    if (!isAuthenticated) return;
    // Prevent rapid successive calls AND concurrent calls
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 3000 || isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await walletService.getWalletInfo();
      dispatch({ type: 'SET_WALLET_INFO', payload: response.data });
      // Update user balance in auth context
      updateUser({ wallet_balance: response.data.balance });
    } catch (error) {
      console.error('Wallet fetch error:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.response?.data?.detail || 'Failed to fetch wallet info' 
      });
    } finally {
      isFetchingRef.current = false;
    }
  }, [isAuthenticated, updateUser]);
  const requestDeposit = async (depositData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await walletService.requestDeposit(depositData);
      dispatch({ type: 'ADD_TRANSACTION', payload: response.data });
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: true, data: response.data };
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.response?.data?.detail || 'Failed to request deposit' 
      });
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to request deposit' 
      };
    }
  };
  const requestWithdrawal = async (withdrawalData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await walletService.requestWithdrawal(withdrawalData);
      dispatch({ type: 'ADD_TRANSACTION', payload: response.data });
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: true, data: response.data };
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.response?.data?.detail || 'Failed to request withdrawal' 
      });
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to request withdrawal' 
      };
    }
  };
  const fetchTransactions = async (transactionType = null, limit = 50) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await walletService.getTransactions(transactionType, limit);
      dispatch({ type: 'SET_TRANSACTIONS', payload: response.data });
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.response?.data?.detail || 'Failed to fetch transactions' 
      });
    }
  };
  const getBalance = async () => {
    try {
      const response = await walletService.getBalance();
      dispatch({ type: 'UPDATE_BALANCE', payload: response.data.balance });
      updateUser({ wallet_balance: response.data.balance });
      return response.data.balance;
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return state.balance;
    }
  };
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };
  const value = {
    ...state,
    fetchWalletInfo,
    requestDeposit,
    requestWithdrawal,
    fetchTransactions,
    getBalance,
    clearError,
  };
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};