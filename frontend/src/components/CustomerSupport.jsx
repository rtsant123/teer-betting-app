import React from 'react';
import { ArrowLeft, MessageCircle, Send, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomerSupport = () => {
  const navigate = useNavigate();

  // Replace these with your actual WhatsApp and Telegram contact details
  const supportContacts = {
    whatsapp: {
      number: '+1234567890', // Replace with your WhatsApp business number
      message: 'Hello! I need help with my betting account.'
    },
    telegram: {
      username: 'your_support_bot', // Replace with your Telegram bot or channel username
      url: 'https://t.me/your_support_bot' // Replace with your Telegram bot or channel URL
    },
    email: 'support@teerbetting.com', // Replace with your support email
    phone: '+1234567890' // Replace with your support phone number
  };

  const handleWhatsAppChat = () => {
    const encodedMessage = encodeURIComponent(supportContacts.whatsapp.message);
    const whatsappUrl = `https://wa.me/${supportContacts.whatsapp.number.replace('+', '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleTelegramChat = () => {
    window.open(supportContacts.telegram.url, '_blank');
  };

  const handleEmailSupport = () => {
    const subject = encodeURIComponent('Teer Betting App Support');
    const body = encodeURIComponent('Hello,\n\nI need assistance with my account.\n\nPlease describe your issue here...\n\nThank you!');
    window.open(`mailto:${supportContacts.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handlePhoneCall = () => {
    window.open(`tel:${supportContacts.phone}`, '_blank');
  };

  const supportOptions = [
    {
      title: 'WhatsApp Support',
      description: 'Chat with us instantly on WhatsApp',
      icon: <MessageCircle className="w-8 h-8" />,
      action: handleWhatsAppChat,
      color: 'from-green-500 to-green-600',
      available: '24/7 Available'
    },
    {
      title: 'Telegram Support',
      description: 'Get quick help through Telegram',
      icon: <Send className="w-8 h-8" />,
      action: handleTelegramChat,
      color: 'from-blue-500 to-blue-600',
      available: '24/7 Available'
    },
    {
      title: 'Email Support',
      description: 'Send us a detailed message via email',
      icon: <Mail className="w-8 h-8" />,
      action: handleEmailSupport,
      color: 'from-purple-500 to-purple-600',
      available: 'Response within 24h'
    },
    {
      title: 'Phone Support',
      description: 'Call us directly for urgent issues',
      icon: <Phone className="w-8 h-8" />,
      action: handlePhoneCall,
      color: 'from-orange-500 to-orange-600',
      available: '9 AM - 9 PM'
    }
  ];

  const faqItems = [
    {
      question: 'How do I deposit money?',
      answer: 'Go to Wallet section and click on Add Money. Choose your preferred payment method and follow the instructions.'
    },
    {
      question: 'How do I withdraw my winnings?',
      answer: 'Visit the Wallet section, click Withdraw, enter the amount and provide your bank details for transfer.'
    },
    {
      question: 'What are the game timings?',
      answer: 'Games run throughout the day. Check the specific house timings in each game section for exact schedules.'
    },
    {
      question: 'How do I reset my password?',
      answer: 'On the login page, click "Forgot Password" and follow the instructions to reset your password via SMS.'
    },
    {
      question: 'Are my transactions secure?',
      answer: 'Yes, all transactions are encrypted and processed through secure payment gateways. Your data is safe with us.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8 pt-8">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-white/10 backdrop-blur-md rounded-xl mr-4 text-white hover:bg-white/20 transition-all duration-200"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Customer Support</h1>
        </div>

        {/* Quick Contact Options */}
        <div className="space-y-4 mb-8">
          {supportOptions.map((option, index) => (
            <button
              key={index}
              onClick={option.action}
              className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-200 text-left"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${option.color} text-white`}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg">{option.title}</h3>
                  <p className="text-gray-300 text-sm">{option.description}</p>
                  <p className="text-green-400 text-xs mt-1">{option.available}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-white font-bold text-xl mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details key={index} className="group">
                <summary className="cursor-pointer text-white font-medium py-2 list-none flex justify-between items-center">
                  {item.question}
                  <span className="transform group-open:rotate-180 transition-transform duration-200">
                    ▼
                  </span>
                </summary>
                <div className="mt-2 text-gray-300 text-sm leading-relaxed">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-red-500/20 backdrop-blur-md rounded-xl p-4 border border-red-500/50">
          <h3 className="text-red-200 font-semibold mb-2">Emergency Support</h3>
          <p className="text-red-300 text-sm mb-3">
            For urgent account issues or security concerns, contact us immediately:
          </p>
          <button
            onClick={handleWhatsAppChat}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-xl font-medium hover:bg-red-700 transition-colors duration-200"
          >
            Emergency WhatsApp Support
          </button>
        </div>

        {/* Contact Info */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Our support team is here to help you 24/7
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Response times may vary based on contact method
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;
