import { apiClient } from '../lib/apiClient';
export const betService = {
  // Place a new bet (supports all bet types including forecast)
  placeBet: (betData) => {
    const token = localStorage.getItem('token');
    return apiClient.placeBetTicket(betData, token);
  },
  // Place a forecast bet with FR and SR numbers
  placeForecastBet: (forecastData) => {
    const token = localStorage.getItem('token');
    return apiClient.placeBetTicket(forecastData, token);
  },
  // Place a complete bet ticket with multiple bet types
  placeBetTicket: (ticketData) => {
    const token = localStorage.getItem('token');
    return apiClient.placeBetTicket(ticketData, token);
  },
  // Get houses with active rounds for betting
  getHousesWithActiveRounds: async () => {
    const response = await apiClient.getHousesWithRounds();
    // Backend returns direct array
    return { data: Array.isArray(response) ? response : [response] };
  },
  // Get user's recent bets/tickets
  getMyBets: (limit = 50) => {
    const token = localStorage.getItem('token');
    return apiClient.getMyTickets(token);
  },
  // Get betting summary
  getBetSummary: () => {
    const token = localStorage.getItem('token');
    return apiClient.getWalletBalance(token);
  },
  // Get active rounds for betting
  getActiveRounds: () => {
    return apiClient.getActiveRounds();
  },
  // Get all houses
  getHouses: () => {
    return apiClient.getHouses();
  },
  // Get specific ticket details
  getTicket: (ticketId) => {
    const token = localStorage.getItem('token');
    return apiClient.getTicket(ticketId, token);
  },
  // Get payout rates for all bet types
  getPayoutRates: () => {
    return apiClient.getHouses(); // Houses contain payout rate info
  },
  // Get forecast betting options (houses with both FR and SR available)
  getForecastOptions: () => {
    return apiClient.getHousesWithRounds();
  },
  // Place multiple bets in a single transaction
  placeMultipleBets: (bets) => {
    const token = localStorage.getItem('token');
    // For now, place them as individual tickets
    return Promise.all(bets.map(bet => apiClient.placeBetTicket(bet, token)));
  },
  // Specialized forecast betting helpers
  forecast: {
    // Get available forecast combinations for a house
    getAvailableForHouse: async (houseName) => {
      try {
        const response = await betService.getForecastOptions();
        return response.data.find(option => option.house.name === houseName);
      } catch (error) {
        console.error('Error getting forecast options:', error);
        return null;
      }
    },
    // Validate forecast combination format
    validateCombination: (combination) => {
      const parts = combination.split('-');
      if (parts.length !== 2) return false;
      const [fr, sr] = parts;
      return (
        fr.length === 2 && 
        sr.length === 2 && 
        !isNaN(fr) && 
        !isNaN(sr) && 
        parseInt(fr) >= 0 && 
        parseInt(fr) <= 99 &&
        parseInt(sr) >= 0 && 
        parseInt(sr) <= 99
      );
    },
    // Calculate potential forecast payout
    calculatePayout: (betAmount, payoutRate = 400) => {
      return betAmount * payoutRate;
    },
    // Format combinations for display
    formatCombinations: (combinations) => {
      return combinations.map(combo => {
        if (typeof combo === 'string') {
          return combo;
        }
        return `${combo.fr}-${combo.sr}`;
      });
    }
  },
  // Bet validation helper
  validation: {
    // Validate direct bet (00-99)
    validateDirect: (value) => {
      return value.length === 2 && !isNaN(value) && parseInt(value) >= 0 && parseInt(value) <= 99;
    },
    // Validate house/ending bet (0-9)
    validateSingleDigit: (value) => {
      return value.length === 1 && !isNaN(value) && parseInt(value) >= 0 && parseInt(value) <= 9;
    },
    // Validate bet amount
    validateAmount: (amount, balance) => {
      const numAmount = parseFloat(amount);
      return !isNaN(numAmount) && numAmount > 0 && numAmount <= balance;
    },
    // Get validation message for bet type
    getValidationMessage: (betType) => {
      switch (betType) {
        case 'DIRECT':
          return 'Enter 2-digit number (00-99)';
        case 'HOUSE':
        case 'ENDING':
          return 'Enter single digit (0-9)';
        case 'FORECAST':
          return 'Format: XX-YY (e.g., 23-45)';
        default:
          return 'Enter valid number';
      }
    }
  },
  // Bet calculation helpers
  calculate: {
    // Calculate potential payout for regular bets
    regularPayout: (betType, betAmount) => {
      const rates = {
        'DIRECT': 80,
        'HOUSE': 8,
        'ENDING': 8
      };
      return betAmount * (rates[betType] || 1);
    },
    // Calculate forecast payout
    forecastPayout: (betAmount) => {
      return betAmount * 400;
    },
    // Get payout rate for bet type
    getPayoutRate: (betType) => {
      const rates = {
        'DIRECT': 80,
        'HOUSE': 8,
        'ENDING': 8,
        'FORECAST': 400
      };
      return rates[betType] || 1;
    }
  },
  // Round helpers
  rounds: {
    // Check if round is still open for betting
    isOpen: (round) => {
      return new Date(round.betting_closes_at) > new Date();
    },
    // Get time remaining for betting
    getTimeRemaining: (round) => {
      const now = new Date();
      const closeTime = new Date(round.betting_closes_at);
      const diffMinutes = Math.floor((closeTime - now) / 60000);
      if (diffMinutes <= 0) return 'CLOSED';
      if (diffMinutes < 60) return `${diffMinutes}m left`;
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}m left`;
    },
    // Format round time for display
    formatTime: (dateString) => {
      return new Date(dateString).toLocaleString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short'
      });
    },
    // Group rounds by house
    groupByHouse: (rounds) => {
      const grouped = {};
      rounds.forEach(round => {
        if (!grouped[round.house_name]) {
          grouped[round.house_name] = { FR: null, SR: null };
        }
        grouped[round.house_name][round.round_type] = round;
      });
      return grouped;
    },
    // Get forecast-ready houses (both FR and SR available)
    getForecastReady: (rounds) => {
      const grouped = betService.rounds.groupByHouse(rounds);
      const forecastReady = {};
      Object.keys(grouped).forEach(houseName => {
        const { FR, SR } = grouped[houseName];
        if (FR && SR && betService.rounds.isOpen(FR) && betService.rounds.isOpen(SR)) {
          forecastReady[houseName] = { FR, SR };
        }
      });
      return forecastReady;
    }
  },
  // Bet status helpers
  status: {
    // Get color class for bet status
    getStatusColor: (status) => {
      switch (status) {
        case 'PENDING':
          return 'text-yellow-700 bg-yellow-100 border-yellow-200';
        case 'WON':
          return 'text-green-700 bg-green-100 border-green-200';
        case 'LOST':
          return 'text-red-700 bg-red-100 border-red-200';
        case 'CANCELLED':
          return 'text-gray-700 bg-gray-100 border-gray-200';
        default:
          return 'text-gray-700 bg-gray-100 border-gray-200';
      }
    },
    // Get icon for bet status
    getStatusIcon: (status) => {
      switch (status) {
        case 'PENDING':
          return '⏳';
        case 'WON':
          return '🎉';
        case 'LOST':
          return '❌';
        case 'CANCELLED':
          return '🚫';
        default:
          return '❓';
      }
    }
  },
  // Quick betting presets
  presets: {
    // Popular direct numbers
    popularDirects: ['00', '11', '22', '33', '44', '55', '66', '77', '88', '99'],
    // Quick bet amounts
    quickAmounts: [10, 25, 50, 100, 250, 500, 1000],
    // Popular house/ending numbers
    popularDigits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    // Generate random forecast combinations
    generateRandomForecast: (count = 3) => {
      const combinations = [];
      for (let i = 0; i < count; i++) {
        const fr = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        const sr = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        combinations.push(`${fr}-${sr}`);
      }
      return combinations;
    }
  }
};
