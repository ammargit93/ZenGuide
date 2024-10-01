import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, User, X, Volume2, VolumeX, Moon, Sun } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../services/firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { format_to_points } from './utils'; 
import Signup from './Signup';

const ChatbotUI = () => {
  const [messages, setMessages] = useState([]);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [signupMessage, setSignupMessage] = useState('');
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef(null);
  const speechSynthesisRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [sessionMessages]);

  const fetchMessages = async () => {
    const messagesCollection = collection(db, 'messages');
    const q = query(messagesCollection, orderBy('timestamp', 'asc'));
    const querySnapshot = await getDocs(q);
    const fetchedMessages = [];
    querySnapshot.forEach((doc) => {
      fetchedMessages.push(doc.data());
    });
    setMessages(fetchedMessages);
  };

  const speak = (text) => {
    if ('speechSynthesis' in window && isSpeechEnabled) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (!isSpeechEnabled && speechSynthesisRef.current) {
      window.speechSynthesis.cancel();
    }
  }, [isSpeechEnabled]);

  const handleSend = async () => {
    if (!isAuthenticated) {
      alert('Please sign up or log in to start chatting.');
      return;
    }

    if (input.trim()) {
      const userMessage = { text: input, user: user.email, timestamp: new Date() };
      setSessionMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      try {
        const response = await fetch('http://localhost:8000/chatbot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: input }),
        });
        const data = await response.json();

        const botResponse = data['response'];
        const formattedResponse = format_to_points(botResponse);
        const botMessage = {
          text: formattedResponse,
          user: user.displayName,
          timestamp: new Date(),
          userEmail: user.email,
          userQuery: userMessage.text,
        };

        await addDoc(collection(db, 'messages'), botMessage);

        setTimeout(() => {
          setIsTyping(false);
          setSessionMessages((prev) => [...prev, botMessage]);
          speak(botResponse);
        }, 1000);
      } catch (error) {
        setIsTyping(false);
        setSessionMessages((prev) => [...prev, { text: 'Oops! Something went wrong. Please try again.', user: user.displayName }]);
      }

      setInput('');
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      setUser({
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });
      setIsAuthenticated(true);

      const userDocRef = doc(db, 'users', user.email);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await addDoc(collection(db, 'users'), {
          email: user.email,
          displayName: user.displayName,
        });
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    setIsAuthenticated(false);
    setSessionMessages([]);
  };

  const handleSignup = async (username, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, username + '@example.com', password);
      const user = userCredential.user;
  
      await addDoc(collection(db, 'users'), {
        email: user.email,
        displayName: username,
      });
  
      await user.sendEmailVerification();
  
      setSignupMessage('You have successfully signed up! Please check your email to verify your account.');
    } catch (error) {
      console.error("Error signing up:", error);
      setSignupMessage('Error signing up. Please try again.');
    }
  };
  
  const handleLogin = async (username, password) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', username + '@example.com'));
      if (!userDoc.exists()) {
        setShowSignup(true);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, username + '@example.com', password);
      const user = userCredential.user;

      setUser({
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error logging in:", error);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser({
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setSessionMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`fixed inset-0 flex ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-black'}`}>
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'} transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 ease-in-out z-20`}>
        <div className="flex justify-between items-center p-4">
          <h2 className="text-lg font-semibold">Conversation History</h2>
          <button onClick={() => setIsSidebarOpen(false)} className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-300'}`}>
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="overflow-y-auto h-full pb-20">
          {messages.filter(msg => msg.userEmail === user?.email).map((msg, index) => (
            <div key={index} className="my-2 px-4 text-left">
              <span className={`inline-block p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                {msg.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-full">
        <header className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md z-10`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(true)} className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
                <Menu className={`h-6 w-6 ${isDarkMode ? 'text-white' : 'text-gray-500'}`} />
              </button>
              <h1 className={`ml-3 text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>ZenGuide</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-600" />
                )}
              </button>
              <button
                onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
                className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {isSpeechEnabled ? (
                  <Volume2 className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-600'}`} />
                ) : (
                  <VolumeX className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-600'}`} />
                )}
              </button>
              <button onClick={isAuthenticated ? handleSignOut : handleGoogleSignIn} className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
                <User className={`h-5 w-5 ${isDarkMode ? 'text-white' : 'text-gray-600'}`} />
              </button>
              {isAuthenticated && user && (
                <div className="flex items-center space-x-2">
                  <img src={user.photoURL} alt="User" className="h-8 w-8 rounded-full" />
                  <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>{user.displayName}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-grow flex flex-col p-4 overflow-y-auto">
          <div className="flex-grow">
            {sessionMessages.map((msg, index) => (
              <div key={index} className={`my-2 ${msg.user === user.displayName ? 'text-left' : 'text-right'}`}>
                <span className={`inline-block p-2 rounded-lg ${
                  msg.user === user.displayName
                    ? isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-black'
                    : isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                }`}>
                  {msg.text}
                </span>
              </div>
            ))}
            {isTyping && (
              <div className="my-2 text-left">
                <span className={`inline-block p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-300 text-black'}`}>Typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center mt-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                  setInput('');
                }
              }}
              placeholder="Type your message..."
              className={`flex-grow p-2 border rounded-l-md ${isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'}`}
            />
            <button onClick={handleSend} className="p-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600">
              <Send />
            </button>
          </div>
        </div>
      </div>

      {showSignup && (
        <Signup
          onClose={() => setShowSignup(false)}
          onSignup={handleSignup}
          onLogin={handleLogin}
          signupMessage={signupMessage}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default ChatbotUI;