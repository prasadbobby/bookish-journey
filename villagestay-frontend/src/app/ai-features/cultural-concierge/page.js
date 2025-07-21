'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  MapPinIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  UserGroupIcon,
  MicrophoneIcon,
  StopIcon,
  HeartIcon,
  StarIcon,
  ClockIcon,
  GlobeAltIcon,
  LightBulbIcon,
  CameraIcon,
  InformationCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

const CulturalConciergePage = () => {
  const { user, isAuthenticated, isTourist } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [userPreferences, setUserPreferences] = useState({
    budget_range: 'medium',
    interests: [],
    travel_style: 'cultural',
    group_size: 2,
    duration: '3-5 days'
  });
  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Redirect non-tourists
  useEffect(() => {
    if (isAuthenticated && !isTourist) {
      toast.error('AI Cultural Concierge is available only for travelers');
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, isTourist, router]);

  useEffect(() => {
    if (isAuthenticated && isTourist) {
      initializeChat();
    }
  }, [isAuthenticated, isTourist]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

  const initializeChat = () => {
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    
    const welcomeMessage = {
      id: 1,
      type: 'bot',
      content: `Namaste ${user?.full_name}! 🙏\n\nI'm your AI Cultural Concierge, here to help you discover authentic rural India. I can assist you with:\n\n• **Personalized destination recommendations**\n• **Cultural insights and local customs**\n• **Budget planning and travel tips**\n• **Local festivals and events**\n• **Authentic experiences and activities**\n\nWhat kind of cultural journey are you dreaming of?`,
      timestamp: new Date(),
      isWelcome: true
    };
    
    setMessages([welcomeMessage]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (message = inputMessage) => {
    if (!message.trim() || isStreaming) return;

    if (!isAuthenticated || !isTourist) {
      toast.error('Please login as a traveler to use AI Cultural Concierge');
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);
    setCurrentStreamingMessage('');

    // Create initial bot message for streaming
    const botMessageId = Date.now() + 1;
    const initialBotMessage = {
      id: botMessageId,
      type: 'bot',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      components: {}
    };

    setMessages(prev => [...prev, initialBotMessage]);

    try {
      // Start streaming
      await startStreamingResponse(message, botMessageId);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to get AI response. Please try again.');
      
      // Remove the streaming message and add error message
      setMessages(prev => prev.filter(msg => msg.id !== botMessageId));
      
      const errorMessage = {
        id: Date.now() + 2,
        type: 'bot',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setCurrentStreamingMessage('');
    }
  };

  const startStreamingResponse = async (message, botMessageId) => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/ai-features/cultural-concierge/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          message: message,
          session_id: sessionId,
          ...userPreferences
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let buffer = '';
      let streamingContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              await handleStreamEvent(data, botMessageId, streamingContent);
              
              // Update streaming content
              if (data.type === 'response_chunk') {
                streamingContent += data.content;
                setCurrentStreamingMessage(streamingContent);
              }
            } catch (e) {
              console.error('Failed to parse streaming data:', e);
            }
          }
        }
      }

      // Finalize the message
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, content: streamingContent, isStreaming: false }
          : msg
      ));

    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }
  };

  const handleStreamEvent = async (data, botMessageId, currentContent) => {
    switch (data.type) {
      case 'start':
        // Initial acknowledgment
        break;
        
      case 'thinking':
        setCurrentStreamingMessage(`*${data.message}*`);
        break;
        
      case 'response_start':
        setCurrentStreamingMessage('');
        break;
        
      case 'response_chunk':
        // Content is handled in the main streaming loop
        break;
        
      case 'response_end':
        // Response content is complete
        break;
        
      case 'component':
        // Add component to the message
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId 
            ? { 
                ...msg, 
                components: { 
                  ...msg.components, 
                  [data.component_type]: data.data 
                } 
              }
            : msg
        ));
        break;
        
      case 'complete':
        // Stream is complete
        setIsStreaming(false);
        break;
        
      case 'error':
        console.error('Stream error:', data.message);
        break;
    }
  };

  const handleQuickStart = (suggestion) => {
    sendMessage(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickStartOptions = [
    {
      icon: MapPinIcon,
      title: "Spiritual Journey",
      description: "Find peaceful ashrams and meditation retreats",
      query: "I'm looking for a spiritual journey in rural India with meditation and yoga experiences under ₹2500 per day for 5 days"
    },
    {
      icon: CameraIcon,
      title: "Heritage Villages",
      description: "Explore traditional architecture and crafts",
      query: "I want to explore heritage villages in Rajasthan with traditional architecture and local handicrafts for photography"
    },
    {
      icon: HeartIcon,
      title: "Family Experience",
      description: "Safe, family-friendly cultural immersion",
      query: "Plan a safe family trip to rural India with authentic cultural experiences for 2 adults and 2 children for a week"
    },
    {
      icon: GlobeAltIcon,
      title: "Festival Experience",
      description: "Join local festivals and celebrations",
      query: "I want to experience authentic local festivals and celebrations in North India. What festivals are happening in the next 3 months?"
    }
  ];

  // Redirect checks (same as before)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h2>
          <p className="text-gray-600 mb-6">
            Please login to access your personal AI Cultural Concierge
          </p>
          <Link href="/auth/login" className="btn-primary">
            Login to Continue
          </Link>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !isTourist) {
    return (
      <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <InformationCircleIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">For Travelers Only</h2>
          <p className="text-gray-600 mb-6">
            AI Cultural Concierge is designed specifically for travelers exploring rural India
          </p>
          <Link href="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen village-bg pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            AI Cultural Concierge
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your personal guide to authentic rural India experiences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Preferences Sidebar */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Preferences</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
                  <select
                    value={userPreferences.budget_range}
                    onChange={(e) => setUserPreferences(prev => ({ ...prev, budget_range: e.target.value }))}
                    className="input-field text-sm"
                  >
                    <option value="low">Budget (₹500-1500/day)</option>
                    <option value="medium">Medium (₹1500-3000/day)</option>
                    <option value="high">Premium (₹3000+/day)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Travel Style</label>
                  <select
                    value={userPreferences.travel_style}
                    onChange={(e) => setUserPreferences(prev => ({ ...prev, travel_style: e.target.value }))}
                    className="input-field text-sm"
                  >
                    <option value="cultural">Cultural Immersion</option>
                    <option value="spiritual">Spiritual Journey</option>
                    <option value="adventure">Adventure & Nature</option>
                    <option value="culinary">Food & Cooking</option>
                    <option value="wellness">Wellness & Yoga</option>
                    <option value="photography">Photography Tour</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Group Size</label>
                  <select
                    value={userPreferences.group_size}
                    onChange={(e) => setUserPreferences(prev => ({ ...prev, group_size: parseInt(e.target.value) }))}
                    className="input-field text-sm"
                  >
                    <option value={1}>Solo Traveler</option>
                    <option value={2}>Couple</option>
                    <option value={4}>Small Group (3-4)</option>
                    <option value={6}>Large Group (5-6)</option>
                    <option value={8}>Family Group (7-8)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                  <select
                    value={userPreferences.duration}
                    onChange={(e) => setUserPreferences(prev => ({ ...prev, duration: e.target.value }))}
                    className="input-field text-sm"
                  >
                    <option value="1-2 days">Weekend (1-2 days)</option>
                    <option value="3-5 days">Short Trip (3-5 days)</option>
                    <option value="1 week">One Week</option>
                    <option value="2 weeks">Two Weeks</option>
                    <option value="1 month">Extended Stay</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <LightBulbIcon className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-900">Real-time AI</span>
                </div>
                <p className="text-xs text-gray-600">
                  Experience live AI responses with personalized recommendations as you chat!
                </p>
              </div>
            </div>
          </div>

          {/* Chat Container */}
          <div className="lg:col-span-3">
            {/* Quick Start Options */}
            {messages.length <= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickStartOptions.map((option, index) => (
                    <motion.button
                      key={option.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleQuickStart(option.query)}
                      disabled={isStreaming}
                      className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <option.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">{option.title}</h4>
                          <p className="text-sm text-gray-600">{option.description}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Chat Messages */}
            <div className="card p-0 overflow-hidden h-[600px] flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <AnimatePresence>
                  {messages.map((message) => (
                    <StreamingChatMessage 
                      key={message.id} 
                      message={message} 
                      currentStreamingMessage={currentStreamingMessage}
                      isCurrentlyStreaming={isStreaming && message.isStreaming}
                    />
                  ))}
                </AnimatePresence>
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <div className="relative">
                      <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isStreaming ? "AI is responding..." : "Ask about destinations, culture, festivals, or any travel question..."}
                        disabled={isStreaming}
                        rows={1}
                        className="input-field resize-none"
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={() => sendMessage()}
                    disabled={!inputMessage.trim() || isStreaming}
                    className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isStreaming ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <PaperAirplaneIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                
                {isStreaming && (
                  <p className="text-center text-sm text-blue-600 mt-2 animate-pulse">
                    🤖 AI is thinking and researching for you...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Chat Message Component with Streaming Support
const StreamingChatMessage = ({ message, currentStreamingMessage, isCurrentlyStreaming }) => {
  const isBot = message.type === 'bot';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`max-w-4xl w-full ${isBot ? 'order-1' : 'order-2'}`}>
        <div className={`flex items-start space-x-3 ${isBot ? '' : 'flex-row-reverse space-x-reverse'}`}>
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isBot
              ? 'bg-gradient-to-br from-blue-500 to-purple-600'
              : 'bg-gradient-to-br from-green-500 to-green-600'
          }`}>
            {isBot ? (
              <SparklesIcon className="w-5 h-5 text-white" />
            ) : (
              <span className="text-white font-semibold text-sm">
                {message.user?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          
          {/* Message Content */}
          <div className={`flex-1 ${isBot ? '' : 'text-right'}`}>
            <div className={`inline-block p-4 rounded-2xl max-w-full ${
              isBot
                ? 'bg-gray-100 text-gray-900'
                : 'bg-green-500 text-white'
            }`}>
              {/* Show streaming content or final content */}
              <div className="leading-relaxed whitespace-pre-wrap">
                <MarkdownRenderer 
                  content={isCurrentlyStreaming ? currentStreamingMessage : message.content} 
                />
                {isCurrentlyStreaming && (
                  <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse"></span>
                )}
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-1">
              {message.timestamp.toLocaleTimeString()}
              {isCurrentlyStreaming && (
                <span className="ml-2 text-blue-600 animate-pulse">• Live response</span>
              )}
            </p>
            
            {/* Enhanced Bot Response Components */}
            {isBot && !message.isWelcome && !message.isError && message.components && (
              <div className="mt-4 space-y-4">
                {/* Locations */}
                {message.components.locations && (
                  <LocationsCard locations={message.components.locations} />
                )}
                
                {/* Listings */}
                {message.components.listings && (
                  <ListingsCard listings={message.components.listings} />
                )}
                
                {/* Experiences */}
                {message.components.experiences && (
                  <ExperiencesCard experiences={message.components.experiences} />
                )}
                
                {/* Cultural Insights */}
                {message.components.cultural_insights && (
                  <CulturalInsightsCard insights={message.components.cultural_insights} />
                )}
                
                {/* Budget */}
                {message.components.budget && (
                  <BudgetCard budget={message.components.budget} />
                )}
                
                {/* Follow-up Questions */}
                {message.components.follow_ups && (
                  <FollowUpCard followUps={message.components.follow_ups} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Markdown Renderer Component
const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  // Simple markdown rendering
  const renderMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div 
      dangerouslySetInnerHTML={{ 
        __html: renderMarkdown(content) 
      }} 
    />
  );
};

// Enhanced Component Cards with Real-time Data
const LocationsCard = ({ locations }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white border border-gray-200 rounded-xl p-4"
  >
    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
      <MapPinIcon className="w-5 h-5 text-blue-500 mr-2" />
      Mentioned Destinations
    </h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {locations.map((location, index) => (
        <div key={index} className="bg-blue-50 rounded-lg p-3">
          <h5 className="font-medium text-gray-900">{location.name}</h5>
          <p className="text-sm text-gray-600 mt-1">{location.mentioned_context}</p>
          <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {location.type}
          </span>
        </div>
      ))}
    </div>
  </motion.div>
);

const ListingsCard = ({ listings }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-green-50 border border-green-200 rounded-xl p-4"
  >
    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
      <HeartIcon className="w-5 h-5 text-green-500 mr-2" />
      Perfect Stays for You
    </h4>
    <div className="space-y-3">
      {listings.map((listing, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-lg p-3 border border-green-100"
        >
          <div className="flex justify-between items-start mb-2">
            <h5 className="font-medium text-gray-900">{listing.title}</h5>
            <div className="flex items-center space-x-1">
              <StarIcon className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">{listing.rating}</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">📍 {listing.location}</p>
          <p className="text-xs text-gray-500 mb-2">Host: {listing.host_name}</p>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-green-600">
              {formatCurrency(listing.price_per_night)}/night
            </span>
            <Link 
              href={`/listings/${listing.id}`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              View Details <ArrowRightIcon className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

const ExperiencesCard = ({ experiences }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-purple-50 border border-purple-200 rounded-xl p-4"
  >
    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
      <CameraIcon className="w-5 h-5 text-purple-500 mr-2" />
      Authentic Experiences
    </h4>
    <div className="space-y-3">
      {experiences.map((experience, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-lg p-3 border border-purple-100"
        >
          <div className="flex justify-between items-start mb-2">
            <h5 className="font-medium text-gray-900">{experience.title}</h5>
            <span className="text-sm font-semibold text-purple-600">
              {formatCurrency(experience.price)}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">{experience.description}</p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>⏱️ {experience.duration}</span>
            <button className="text-purple-600 hover:text-purple-700 font-medium">
              Book Experience
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

const CulturalInsightsCard = ({ insights }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-amber-50 border border-amber-200 rounded-xl p-4"
  >
    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
      <SparklesIcon className="w-5 h-5 text-amber-500 mr-2" />
      Cultural Insights
    </h4>
    <div className="space-y-2">
      {insights.map((insight, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-start space-x-2"
        >
          <div className={`w-2 h-2 rounded-full mt-2 ${
            insight.importance === 'high' ? 'bg-red-400' : 'bg-amber-400'
          }`}></div>
          <p className="text-sm text-gray-700">{insight.insight}</p>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

const BudgetCard = ({ budget }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-blue-50 border border-blue-200 rounded-xl p-4"
  >
    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
      <CurrencyRupeeIcon className="w-5 h-5 text-blue-500 mr-2" />
      Smart Budget Planning
    </h4>
    <div className="space-y-2 mb-3">
      {Object.entries(budget.breakdown).map(([category, amount]) => (
        <div key={category} className="flex justify-between text-sm">
          <span className="capitalize text-gray-600">{category.replace('_', ' ')}</span>
          <span className="font-medium">{formatCurrency(amount)}</span>
        </div>
      ))}
    </div>
    <div className="border-t border-blue-200 pt-2 mb-3">
      <div className="flex justify-between font-semibold">
        <span>Daily Total</span>
        <span className="text-blue-600">{formatCurrency(budget.daily_budget)}</span>
      </div>
      <div className="flex justify-between text-sm text-gray-600">
        <span>Trip Total</span>
        <span>{formatCurrency(budget.duration_total)}</span>
      </div>
    </div>
    
    {/* Savings Tips */}
    <div className="bg-white rounded-lg p-3 border border-blue-100">
      <h5 className="text-sm font-medium text-gray-900 mb-2">💡 Money-Saving Tips</h5>
      <div className="space-y-1">
        {budget.savings_tips?.slice(0, 2).map((tip, index) => (
          <p key={index} className="text-xs text-gray-600">• {tip}</p>
        ))}
      </div>
    </div>
  </motion.div>
);

const FollowUpCard = ({ followUps }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-gray-50 border border-gray-200 rounded-xl p-4"
  >
    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
      <LightBulbIcon className="w-5 h-5 text-gray-500 mr-2" />
      Continue the Conversation
    </h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {followUps.map((followUp, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="text-left p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
        >
          <div className="flex items-start space-x-2">
            <span className="text-lg">{followUp.icon}</span>
            <div>
              <p className="text-sm font-medium text-gray-900">{followUp.question}</p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  </motion.div>
);

export default CulturalConciergePage;