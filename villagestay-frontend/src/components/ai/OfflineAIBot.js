// src/components/ai/OfflineAIBot.js - Updated with Phi-3.5-mini
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  HeartIcon,
  StarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const OfflineAIBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [engine, setEngine] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [modelStatus, setModelStatus] = useState('initializing');
  const [isOnline, setIsOnline] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize WebLLM with better model
  useEffect(() => {
    const initializeAI = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        setModelStatus('downloading');
        
        const webllm = await import('@mlc-ai/web-llm');
        const engineInstance = new webllm.MLCEngine();
        
        engineInstance.setInitProgressCallback((report) => {
          const progress = Math.round((report.progress || 0) * 100);
          setDownloadProgress(progress);
          console.log(`🤖 AI Model (Phi-3.5-mini) loading: ${progress}%`);
        });

        // Use Phi-3.5-mini for better quality (you can change this to any model above)
        await engineInstance.reload('Phi-3.5-mini-instruct-q4f16_1-MLC');
        
        setEngine(engineInstance);
        setIsInitialized(true);
        setModelStatus('ready');
        setDownloadProgress(100);
        
        console.log('✅ Phi-3.5-mini Offline AI Assistant Ready');
        // toast.success('🤖 AI Assistant Ready!', { duration: 3000 });
        
      } catch (error) {
        console.error('AI initialization failed:', error);
        setModelStatus('error');
        
        // Fallback to smaller model if Phi-3.5 fails
        try {
          console.log('🔄 Trying fallback model...');
          await engineInstance.reload('Qwen2.5-3B-Instruct-q4f16_1-MLC');
          setEngine(engineInstance);
          setIsInitialized(true);
          setModelStatus('ready');
          console.log('✅ Fallback model loaded successfully');
        } catch (fallbackError) {
          console.error('Fallback model also failed:', fallbackError);
          setModelStatus('error');
        }
      }
    };

    initializeAI();
  }, []);

  // Initialize welcome message when bot is first opened
  useEffect(() => {
    if (isOpen && messages.length === 0 && isInitialized) {
      const welcomeMessage = {
        id: Date.now(),
        type: 'bot',
        content: `Hello! I'm Maya, your expert VillageStay AI assistant running completely offline. I can help you with:

- Emergency assistance and safety guidance
- Travel routes and transportation options  
- Traditional food recommendations by region
- Custom itinerary planning for rural destinations
- Village attractions and cultural experiences
- Weather and seasonal travel advice

What would you like help with today?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, isInitialized]);

  // Online/offline detection
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Only allow messages if AI is ready
    if (!isInitialized || modelStatus !== 'ready') {
      toast.error('AI assistant is still loading. Please wait...');
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await generateAIResponse(inputMessage.trim());

      // Clean and format response
      const cleanResponse = response
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markdown
        .replace(/#{1,6}\s*(.*)/g, '$1') // Remove headers
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`([^`]*)`/g, '$1') // Remove inline code
        .replace(/\n{3,}/g, '\n\n') // Limit line breaks
        .trim();

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: cleanResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'I encountered an error processing your request. Please try asking again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateAIResponse = async (message) => {
    const systemPrompt = `You are Maya, an expert offline AI assistant for VillageStay - India's premier rural tourism platform. You specialize in authentic village experiences across India.

RESPONSE GUIDELINES:
- Keep responses concise but informative (3-5 sentences)
- Provide specific, actionable advice
- Focus on rural tourism in India
- Include practical details (phone numbers, routes, safety tips)
- Be helpful and knowledgeable about Indian villages, culture, and travel

EXPERTISE AREAS:
- Emergency assistance (police: 100, ambulance: 108, tourist helpline: 1363)
- Travel routes between cities and villages
- Regional cuisine and local food safety
- Village destinations by state
- Cultural experiences and customs
- Seasonal travel recommendations
- Accommodation in rural areas

Always prioritize user safety and provide authentic rural tourism guidance.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ];

    const completion = await engine.chat.completions.create({
      messages: messages,
      temperature: 0.7,
      max_tokens: 200, // Slightly longer for better answers
    });

    return completion.choices[0].message.content;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusIcon = () => {
    if (modelStatus === 'downloading') return <ClockIcon className="w-4 h-4 text-yellow-500 animate-pulse" />;
    if (modelStatus === 'error') return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
    if (modelStatus === 'ready') return <SparklesIcon className="w-4 h-4 text-white-800" />;
    return <ClockIcon className="w-4 h-4 text-blue-500 animate-spin" />;
  };

  const getStatusText = () => {
    if (modelStatus === 'initializing') return 'Starting up...';
    if (modelStatus === 'downloading') return `Loading Phi-3.5 model... ${downloadProgress}%`;
    if (modelStatus === 'error') return 'Model failed to load';
    if (modelStatus === 'ready') return isOnline ? 'Phi-3.5 Ready' : 'Phi-3.5 Ready (Offline)';
    return 'Initializing...';
  };

  const quickActions = [
    { 
      icon: ExclamationTriangleIcon, 
      text: 'Emergency', 
      query: 'I need emergency help while traveling in rural India',
      color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
    },
    { 
      icon: MapPinIcon, 
      text: 'Routes', 
      query: 'Best routes from major cities to village destinations',
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
    },
    { 
      icon: HeartIcon, 
      text: 'Food', 
      query: 'Traditional village food recommendations and safety tips',
      color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
    },
    { 
      icon: StarIcon, 
      text: 'Villages', 
      query: 'Top authentic village destinations to visit in India',
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
    }
  ];

  // Don't show anything if AI failed to load
  if (modelStatus === 'error') {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-2xl flex items-center justify-center ${isOpen ? 'hidden' : 'block'} hover:from-green-600 hover:to-green-700 transition-all duration-300`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(34, 197, 94, 0.4)',
            '0 0 0 15px rgba(34, 197, 94, 0)',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      >
        <ChatBubbleLeftRightIcon className="w-7 h-7" />
        
        {/* Status indicator */}
        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
          modelStatus === 'ready' ? 'bg-green-400' : 
          modelStatus === 'downloading' ? 'bg-yellow-400' : 'bg-red-400'
        } animate-pulse`}>
          {modelStatus === 'ready' && <span className="text-xs">✓</span>}
          {modelStatus === 'downloading' && <span className="text-xs">{Math.floor(downloadProgress / 10)}</span>}
        </div>
      </motion.button>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.3 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[650px] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  {getStatusIcon()}
                </div>
                <div>
                  <h3 className="font-bold text-lg">Maya AI Assistant</h3>
                  <p className="text-xs text-green-100">{getStatusText()}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Loading State */}
            {modelStatus !== 'ready' && (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center p-6">
                  <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Phi-3.5 AI Model</h3>
                  <p className="text-gray-600 mb-4">Downloading advanced AI for better assistance...</p>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500">{downloadProgress}% complete</p>
                </div>
              </div>
            )}

            {/* Messages */}
            {modelStatus === 'ready' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-4 rounded-2xl ${
                        message.type === 'user'
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-800 shadow-md border'
                      }`}>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </div>
                        <div className={`text-xs mt-2 ${
                          message.type === 'user' ? 'text-green-100' : 'text-gray-500'
                        }`}>
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white p-4 rounded-2xl shadow-md border">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t bg-white">
                  <div className="flex space-x-3 mb-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about routes, food, villages, emergencies..."
                      className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      disabled={!isInitialized}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || !isInitialized}
                      className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setInputMessage(action.query);
                          setTimeout(sendMessage, 100);
                        }}
                        disabled={!isInitialized}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 border ${action.color} disabled:opacity-50`}
                      >
                        <action.icon className="w-4 h-4" />
                        <span className="font-medium">{action.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OfflineAIBot;