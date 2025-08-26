import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import Modal from '../components/common/Modal';
import HeaderBar from '../components/common/HeaderBar';
import BottomNav from '../components/common/BottomNav';
import toast from 'react-hot-toast';
import { 
  Clock, 
  RefreshCw,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trophy,
  Eye,
  Search,
  BarChart3,
  Wallet
} from 'lucide-react';

const MyPlays = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [filterHouse] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playSummary, setPlaySummary] = useState({
    totalBets: 0,
    totalWagered: 0,
    totalWinnings: 0,
    winRate: 0,
    netProfit: 0
  });

  const openTicketDetails = (ticket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const closeTicketDetails = () => {
    setSelectedTicket(null);
    setIsModalOpen(false);
  };

  const getGameInfo = (ticket) => {
    const gameTypes = [];
    
    if (ticket.bets_summary?.fr_bets) {
      const frBets = ticket.bets_summary.fr_bets;
      if (frBets.direct && Object.keys(frBets.direct).length > 0) gameTypes.push('FR Direct');
      if (frBets.house && Object.keys(frBets.house).length > 0) gameTypes.push('FR House');
      if (frBets.ending && Object.keys(frBets.ending).length > 0) gameTypes.push('FR Ending');
    }
    
    if (ticket.bets_summary?.sr_bets) {
      const srBets = ticket.bets_summary.sr_bets;
      if (srBets.direct && Object.keys(srBets.direct).length > 0) gameTypes.push('SR Direct');
      if (srBets.house && Object.keys(srBets.house).length > 0) gameTypes.push('SR House');
      if (srBets.ending && Object.keys(srBets.ending).length > 0) gameTypes.push('SR Ending');
    }
    
    if (ticket.bets_summary?.forecast_bets && ticket.bets_summary.forecast_bets.length > 0) {
      gameTypes.push('Forecast');
    }
    
    return gameTypes.length > 0 ? gameTypes.join(' • ') : 'Mixed Bets';
  };

  const calculatePlaySummary = useCallback((ticketsList) => {
    const summary = ticketsList.reduce((acc, ticket) => {
      acc.totalBets += 1;
      const ticketAmount = ticket.total_amount || 0;
      acc.totalWagered += ticketAmount;
      
      if (ticket.status?.toLowerCase() === 'won') {
        const winnings = ticket.total_potential_payout || ticketAmount * 2;
        acc.totalWinnings += winnings;
      }
      
      return acc;
    }, { totalBets: 0, totalWagered: 0, totalWinnings: 0 });
    
    summary.winRate = summary.totalBets > 0 ? 
      (ticketsList.filter(t => t.status?.toLowerCase() === 'won').length / summary.totalBets * 100) : 0;
    summary.netProfit = summary.totalWinnings - summary.totalWagered;
    
    setPlaySummary(summary);
  }, []);

  const loadMyTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const ticketsData = await apiClient.getMyTickets(token, 100); // Request up to 100 tickets
      
      const ticketsList = Array.isArray(ticketsData) ? ticketsData : [];
      setTickets(ticketsList);
      calculatePlaySummary(ticketsList);
    } catch (error) {
      console.error('Error loading tickets:', error);
      if (!error.message?.includes('401') && !error.message?.includes('403')) {
        toast.error('Failed to load your betting history');
      }
      setTickets([]);
      setPlaySummary({ totalBets: 0, totalWagered: 0, totalWinnings: 0, winRate: 0, netProfit: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [calculatePlaySummary]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMyTickets();
    } else {
      setIsLoading(false);
      setTickets([]);
    }
  }, [isAuthenticated, user, loadMyTickets]);

  const formatDateTime = (dateString) => {
    if (!dateString) return { date: 'N/A', time: 'N/A', full: 'N/A' };
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      full: date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'won': return 'text-green-600 bg-green-50';
      case 'lost': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'won': return <CheckCircle className="h-4 w-4" />;
      case 'lost': return <XCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesTab = activeTab === 'all' || ticket.status?.toLowerCase() === activeTab;
    const matchesHouse = filterHouse === 'all' || ticket.house_name?.toLowerCase().includes(filterHouse.toLowerCase());
    const matchesSearch = searchTerm === '' || 
      ticket.house_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_id?.toString().includes(searchTerm);
    return matchesTab && matchesHouse && matchesSearch;
  });

  const sortedTickets = filteredTickets.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at || b.placed_at) - new Date(a.created_at || a.placed_at);
      case 'oldest':
        return new Date(a.created_at || a.placed_at) - new Date(b.created_at || b.placed_at);
      case 'amount-high':
        return (b.total_amount || 0) - (a.total_amount || 0);
      case 'amount-low':
        return (a.total_amount || 0) - (b.total_amount || 0);
      default:
        return 0;
    }
  });

  if (!isAuthenticated) {
    return (
      <>
        <HeaderBar />
        <div className="min-h-screen bg-gray-50 pt-16 pb-20">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Sign In Required
                </h2>
                <p className="text-gray-600 mb-6">
                  Please sign in to view your betting history and track your plays.
                </p>
                <Button 
                  onClick={() => navigate('/login')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Sign In
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <HeaderBar />
      <div className="min-h-screen bg-gray-50 pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Plays</h1>
            <p className="text-gray-600">Track your betting history and performance</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Bets</p>
                    <p className="text-2xl font-bold text-gray-900">{playSummary.totalBets}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Wagered</p>
                    <p className="text-2xl font-bold text-gray-900">₹{playSummary.totalWagered}</p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Wallet className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Winnings</p>
                    <p className="text-2xl font-bold text-green-600">₹{playSummary.totalWinnings}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Trophy className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Win Rate</p>
                    <p className="text-2xl font-bold text-purple-600">{playSummary.winRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6 bg-white border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Tab Filters */}
                <div className="flex flex-wrap gap-2">
                  {['all', 'pending', 'won', 'lost'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Search and Sort */}
                <div className="flex flex-1 gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by house or ticket ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-40"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="amount-high">Amount: High to Low</option>
                    <option value="amount-low">Amount: Low to High</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets List */}
          {isLoading ? (
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Loading your betting history...</p>
              </CardContent>
            </Card>
          ) : sortedTickets.length === 0 ? (
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {tickets.length === 0 ? 'No Bets Yet' : 'No Results Found'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {tickets.length === 0 
                    ? 'Start playing to see your betting history here.'
                    : 'Try adjusting your filters or search terms.'
                  }
                </p>
                {tickets.length === 0 && (
                  <Button 
                    onClick={() => navigate('/play')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Start Playing
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedTickets.map((ticket) => {
                const dateTime = formatDateTime(ticket.created_at || ticket.placed_at);
                return (
                  <Card key={ticket.ticket_id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                            {getStatusIcon(ticket.status)}
                            {ticket.status?.toUpperCase() || 'UNKNOWN'}
                          </div>
                          <span className="text-sm text-gray-500">#{ticket.ticket_id}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">₹{ticket.total_amount || 0}</p>
                          <p className="text-xs text-gray-500">{dateTime.full}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {ticket.house_name || 'Unknown House'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {getGameInfo(ticket)}
                          </p>
                        </div>
                        <Button
                          onClick={() => openTicketDetails(ticket)}
                          variant="outline"
                          size="sm"
                          className="ml-4"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <Modal isOpen={isModalOpen} onClose={closeTicketDetails} title="Ticket Details">
          <div className="space-y-4">
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Ticket ID:</span>
                  <p className="text-gray-900">#{selectedTicket.ticket_id || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <div className={`inline-flex items-center gap-1 mt-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                    {getStatusIcon(selectedTicket.status)}
                    {selectedTicket.status?.toUpperCase() || 'UNKNOWN'}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">House:</span>
                  <p className="text-gray-900">{selectedTicket.house_name || 'Unknown'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total Amount:</span>
                  <p className="text-gray-900 font-semibold">
                    ₹{selectedTicket.total_amount != null ? Number(selectedTicket.total_amount).toFixed(2) : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Max Potential Win:</span>
                  <p className="text-green-600 font-semibold">
                    ₹{selectedTicket.total_potential_payout != null ? Number(selectedTicket.total_potential_payout).toFixed(2) : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Date:</span>
                  <p className="text-gray-900">{formatDateTime(selectedTicket.created_at)?.full || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Show bet details if available, otherwise show fallback message */}
            {(!selectedTicket.bets_summary || 
              Object.keys(selectedTicket.bets_summary).length === 0 || 
              ((!selectedTicket.bets_summary.fr_bets || Object.keys(selectedTicket.bets_summary.fr_bets).length === 0) &&
               (!selectedTicket.bets_summary.sr_bets || Object.keys(selectedTicket.bets_summary.sr_bets).length === 0) &&
               (!selectedTicket.bets_summary.forecast_bets || selectedTicket.bets_summary.forecast_bets.length === 0))) && (
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <p className="text-yellow-800">No detailed bet information available for this ticket.</p>
                <p className="text-sm text-yellow-600 mt-1">
                  This may be an older ticket or the betting details were not stored in the new format.
                </p>
              </div>
            )}

            {/* FR Bets */}
            {selectedTicket.bets_summary?.fr_bets && Object.keys(selectedTicket.bets_summary.fr_bets).length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">🎯 First Round (FR) Bets</h4>
                <div className="space-y-2">
                  {selectedTicket.bets_summary.fr_bets.direct && Object.keys(selectedTicket.bets_summary.fr_bets.direct).length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="font-medium text-blue-900 mb-2">Direct Numbers</div>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(selectedTicket.bets_summary.fr_bets.direct).map(([number, amount]) => (
                          <div key={number} className="flex justify-between text-sm">
                            <span className="font-medium">{number}:</span>
                            <span className="text-blue-700">₹{amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedTicket.bets_summary.fr_bets.house && Object.keys(selectedTicket.bets_summary.fr_bets.house).length > 0 && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="font-medium text-purple-900 mb-2">House Numbers</div>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(selectedTicket.bets_summary.fr_bets.house).map(([number, amount]) => (
                          <div key={number} className="flex justify-between text-sm">
                            <span className="font-medium">{number}:</span>
                            <span className="text-purple-700">₹{amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedTicket.bets_summary.fr_bets.ending && Object.keys(selectedTicket.bets_summary.fr_bets.ending).length > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="font-medium text-green-900 mb-2">Ending Digits</div>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(selectedTicket.bets_summary.fr_bets.ending).map(([number, amount]) => (
                          <div key={number} className="flex justify-between text-sm">
                            <span className="font-medium">{number}:</span>
                            <span className="text-green-700">₹{amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SR Bets */}
            {selectedTicket.bets_summary?.sr_bets && Object.keys(selectedTicket.bets_summary.sr_bets).length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">🎯 Second Round (SR) Bets</h4>
                <div className="space-y-2">
                  {selectedTicket.bets_summary.sr_bets.direct && Object.keys(selectedTicket.bets_summary.sr_bets.direct).length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="font-medium text-blue-900 mb-2">Direct Numbers</div>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(selectedTicket.bets_summary.sr_bets.direct).map(([number, amount]) => (
                          <div key={number} className="flex justify-between text-sm">
                            <span className="font-medium">{number}:</span>
                            <span className="text-blue-700">₹{amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedTicket.bets_summary.sr_bets.house && Object.keys(selectedTicket.bets_summary.sr_bets.house).length > 0 && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="font-medium text-purple-900 mb-2">House Numbers</div>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(selectedTicket.bets_summary.sr_bets.house).map(([number, amount]) => (
                          <div key={number} className="flex justify-between text-sm">
                            <span className="font-medium">{number}:</span>
                            <span className="text-purple-700">₹{amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedTicket.bets_summary.sr_bets.ending && Object.keys(selectedTicket.bets_summary.sr_bets.ending).length > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="font-medium text-green-900 mb-2">Ending Digits</div>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(selectedTicket.bets_summary.sr_bets.ending).map(([number, amount]) => (
                          <div key={number} className="flex justify-between text-sm">
                            <span className="font-medium">{number}:</span>
                            <span className="text-green-700">₹{amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Forecast Bets */}
            {selectedTicket.bets_summary?.forecast_bets && selectedTicket.bets_summary.forecast_bets.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">🔮 Forecast Bets</h4>
                <div className="space-y-2">
                  {selectedTicket.bets_summary.forecast_bets.map((forecast, index) => (
                    <div key={index} className="bg-yellow-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium text-yellow-900">
                            FR: {forecast.fr} → SR: {forecast.sr}
                          </span>
                        </div>
                        <span className="text-yellow-700 font-semibold">₹{forecast.amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Bet Records (if available) */}
            {selectedTicket.bets && selectedTicket.bets.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">📝 Bet Records</h4>
                <div className="space-y-2">
                  {selectedTicket.bets.map((bet, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">
                          {bet.bet_type?.toUpperCase() || 'UNKNOWN'} BET
                        </span>
                        <p className="text-sm text-gray-600">Amount: ₹{bet.total_bet_amount || bet.bet_amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          Potential: ₹{bet.potential_payout || 0}
                        </p>
                        <p className="text-xs text-gray-500">{bet.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={closeTicketDetails} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <BottomNav />
    </>
  );
};

export default MyPlays;
