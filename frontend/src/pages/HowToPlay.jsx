import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Wallet, 
  Home, 
  Gamepad2, 
  Trophy, 
  Clock, 
  Award, 
  Banknote,
  UserPlus,
  ArrowLeft,
  Shield,
  Lock,
  CheckCircle,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

const HowToPlay = () => {
  const navigate = useNavigate();

  const steps = [
    {
      id: 1,
      title: "Register & Login",
      description: "Create your account with a secure password and verify your mobile number",
      details: [
        "Click 'Start Playing Now' on the homepage",
        "Enter your mobile number and create a password",
        "Verify your account with OTP",
        "Your account is ready to play!"
      ],
      icon: UserPlus,
      color: "from-blue-500 to-purple-600"
    },
    {
      id: 2,
      title: "Add Money to Wallet",
      description: "Load funds into your gaming wallet to start betting",
      details: [
        "Go to 'Wallet' from the navigation menu",
        "Click 'Add Money' or 'Deposit'",
        "Choose your payment method (UPI, Bank Transfer)",
        "Enter amount and complete payment"
      ],
      icon: Wallet,
      color: "from-green-500 to-emerald-600"
    },
    {
      id: 3,
      title: "Choose a Teer House",
      description: "Select from active Teer houses with live rounds",
      details: [
        "Visit 'Play' section to see all active houses",
        "Each house has different timings and rules",
        "Check the countdown timer for betting deadline",
        "Choose a house that fits your schedule"
      ],
      icon: Home,
      color: "from-orange-500 to-red-600"
    },
    {
      id: 4,
      title: "Select Your Play Type",
      description: "Choose between Direct, House, Ending, or Forecast play options",
      details: [
        "Direct: Predict the exact 2-digit number (80x payout)",
        "House: Predict the house number (2x payout)",
        "Ending: Predict the last digit (8x payout)",
        "Forecast: Advanced combination bets with higher payouts"
      ],
      icon: Gamepad2,
      color: "from-purple-500 to-pink-600"
    },
    {
      id: 5,
      title: "Place Your Bet",
      description: "Enter your prediction and bet amount",
      details: [
        "Select your lucky numbers based on play type",
        "Enter your bet amount (minimum ₹10)",
        "Review your bet details carefully",
        "Confirm your bet before the deadline"
      ],
      icon: Target,
      color: "from-indigo-500 to-blue-600"
    },
    {
      id: 6,
      title: "Wait for Results",
      description: "Results are announced at scheduled times",
      details: [
        "First Round (FR): Usually announced first",
        "Second Round (SR): Announced after FR",
        "Results are updated live on the platform",
        "Check 'My Plays' to see your bet status"
      ],
      icon: Clock,
      color: "from-teal-500 to-cyan-600"
    },
    {
      id: 7,
      title: "Collect Winnings",
      description: "Winning amounts are automatically credited to your wallet",
      details: [
        "Winnings are credited instantly after results",
        "Check your wallet balance for updated amount",
        "Use winnings to place more bets or withdraw",
        "View transaction history in wallet section"
      ],
      icon: Award,
      color: "from-yellow-500 to-orange-600"
    },
    {
      id: 8,
      title: "Withdraw Money",
      description: "Transfer your winnings to your bank account",
      details: [
        "Go to 'Wallet' and click 'Withdraw'",
        "Enter withdrawal amount (minimum ₹100)",
        "Provide bank details for transfer",
        "Withdrawals processed within 24 hours"
      ],
      icon: Banknote,
      color: "from-emerald-500 to-green-600"
    }
  ];

  const payoutRates = [
    { type: "Direct", description: "Exact 2-digit number", payout: "80x", example: "Bet ₹10 → Win ₹800", color: "from-red-500 to-pink-600" },
    { type: "House", description: "House number prediction", payout: "2x", example: "Bet ₹100 → Win ₹200", color: "from-blue-500 to-indigo-600" },
    { type: "Ending", description: "Last digit only", payout: "8x", example: "Bet ₹50 → Win ₹400", color: "from-green-500 to-emerald-600" },
    { type: "Forecast", description: "Advanced combinations", payout: "Up to 100x", example: "Bet ₹20 → Win up to ₹2000", color: "from-purple-500 to-violet-600" }
  ];

  const tips = [
    {
      icon: Lightbulb,
      title: "Smart Betting",
      tip: "Start with small amounts to understand the game patterns",
      color: "text-yellow-500"
    },
    {
      icon: Clock,
      title: "Timing is Key",
      tip: "Place bets early to avoid missing the deadline due to network issues",
      color: "text-blue-500"
    },
    {
      icon: Trophy,
      title: "Study Results",
      tip: "Check previous results to identify patterns and trends",
      color: "text-green-500"
    },
    {
      icon: Target,
      title: "Diversify Bets",
      tip: "Spread your bets across different play types to balance risk",
      color: "text-purple-500"
    },
    {
      icon: Shield,
      title: "Set Limits",
      tip: "Decide your daily/weekly budget and stick to it",
      color: "text-red-500"
    },
    {
      icon: UserPlus,
      title: "Refer Friends",
      tip: "Earn lifetime commissions by referring friends to play",
      color: "text-indigo-500"
    }
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 flex items-center justify-center">
              <Trophy className="w-12 h-12 md:w-16 md:h-16 mr-4" />
              How to Play Teer
            </h1>
            <p className="text-xl md:text-2xl text-purple-100 max-w-4xl mx-auto leading-relaxed">
              Complete guide to start playing, betting, and winning on our Teer platform
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </button>
        </div>

        {/* Step-by-Step Guide */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              📋 Step-by-Step Guide
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Follow these simple steps to start your Teer journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {steps.map((step) => {
              const IconComponent = step.icon;
              return (
                <div 
                  key={step.id}
                  className="modern-card p-6 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center mb-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center text-white font-bold text-xl mr-4 shadow-lg`}>
                      <IconComponent className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-purple-600 mb-1">Step {step.id}</div>
                      <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6 text-lg">{step.description}</p>
                  <ul className="space-y-3">
                    {step.details.map((detail, index) => (
                      <li key={index} className="flex items-start text-gray-700">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Payout Information */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              💰 Payout Rates
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Different play types offer different payout multipliers
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {payoutRates.map((rate, index) => (
              <div 
                key={index}
                className={`bg-gradient-to-br ${rate.color} rounded-2xl p-6 text-white text-center hover:scale-105 transform transition-all duration-300 shadow-lg`}
              >
                <h3 className="text-2xl font-bold mb-3">{rate.type}</h3>
                <p className="text-white text-opacity-90 text-sm mb-4">{rate.description}</p>
                <div className="text-4xl font-bold mb-3">{rate.payout}</div>
                <p className="text-white text-opacity-80 text-sm bg-black bg-opacity-20 rounded-lg p-2">
                  {rate.example}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pro Tips */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              💡 Pro Tips
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Expert advice to maximize your winning potential
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tips.map((tip, index) => {
              const IconComponent = tip.icon;
              return (
                <div 
                  key={index}
                  className="modern-card p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4`}>
                    <IconComponent className={`w-6 h-6 ${tip.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{tip.title}</h3>
                  <p className="text-gray-600">{tip.tip}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Safety & Responsible Gaming */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              🛡️ Safety & Responsible Gaming
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your safety and security are our top priorities
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="modern-card p-8 border-l-4 border-red-500">
              <h3 className="text-2xl font-bold text-red-600 mb-6 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-3" />
                Important Guidelines
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Only bet money you can afford to lose</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Set daily/weekly spending limits</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Take regular breaks from gaming</span>
                </li>
                <li className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Never chase losses with bigger bets</span>
                </li>
              </ul>
            </div>
            
            <div className="modern-card p-8 border-l-4 border-green-500">
              <h3 className="text-2xl font-bold text-green-600 mb-6 flex items-center">
                <Shield className="w-6 h-6 mr-3" />
                Security Features
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Secure payment processing</span>
                </li>
                <li className="flex items-start">
                  <Lock className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Encrypted data protection</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Fair play guaranteed</span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">24/7 customer support</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <div className="cta-section">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              🚀 Ready to Start Playing?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of players and start your Teer journey today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/register')}
                className="btn-primary-lg"
              >
                <Target className="w-5 h-5 mr-2" />
                Register Now
              </button>
              <button 
                onClick={() => navigate('/')}
                className="btn-secondary-lg"
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HowToPlay;
