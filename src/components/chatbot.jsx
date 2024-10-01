import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, User, X } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../services/firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import Signup from './Signup';

const ChatbotUI = () => {
  const [messages, setMessages] = useState([]); // All messages in the sidebar
  const [sessionMessages, setSessionMessages] = useState([]); // Current session messages
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [signupMessage, setSignupMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to the bottom of the messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [sessionMessages]); // Scroll to bottom for session messages

  // Fetch conversation history from Firestore
  const fetchMessages = async () => {
    const messagesCollection = collection(db, 'messages');
    const q = query(messagesCollection, orderBy('timestamp', 'asc')); // Fetch all messages
    const querySnapshot = await getDocs(q);
    const fetchedMessages = [];
    querySnapshot.forEach((doc) => {
      fetchedMessages.push(doc.data());
    });
    setMessages(fetchedMessages);
  };

  // Function to handle sending the message and receiving the chatbot response
  const handleSend = async () => {
    if (input.trim()) {
      const userMessage = { text: input, user: user.email, timestamp: new Date() };
      setSessionMessages((prev) => [...prev, userMessage]); // Add user message to session
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
        const botMessage = {
          text: botResponse,
          user: user.displayName,
          timestamp: new Date(),
          userEmail: user.email,
          userQuery: userMessage.text,
        };

        await addDoc(collection(db, 'messages'), botMessage); // Save bot message to Firestore

        setTimeout(() => {
          setIsTyping(false);
          setSessionMessages((prev) => [...prev, botMessage]); // Add bot response to session
        }, 1000);
      } catch (error) {
        setIsTyping(false);
        setSessionMessages((prev) => [...prev, { text: 'Oops! Something went wrong. Please try again.', user: user.displayName }]);
      }

      setInput(''); // Clear input field
    }
  };

  // Google authentication
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

      // Save user information to Firestore if it doesn't already exist
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
    setSessionMessages([]); // Clear session messages on sign out
  };

  // Function to handle user signup
  const handleSignup = async (username, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, username + '@example.com', password);
      const user = userCredential.user;

      // Save user information to Firestore
      await addDoc(collection(db, 'users'), {
        email: user.email,
        displayName: username,
      });

      setSignupMessage('You have successfully signed up!');
    } catch (error) {
      console.error("Error signing up:", error);
      setSignupMessage('Error signing up. Please try again.');
    }
  };

  // Function to handle user login
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
    fetchMessages(); // Fetch messages when component mounts
  }, []); // Only fetch messages once

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
        setSessionMessages([]); // Clear session messages on sign out
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="fixed inset-0 flex bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-gray-800 text-white transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 ease-in-out z-20`}>
        {/* Close Button */}
        <div className="flex justify-between items-center p-4">
          <h2 className="text-lg font-semibold">Conversation History</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-full hover:bg-gray-600">
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
        {/* Display Conversation History */}
        <div className="overflow-y-auto h-full pb-20">
          {messages.filter(msg => msg.userEmail === user?.email).map((msg, index) => ( // Filter messages for the logged-in user
            <div key={index} className={`my-2 px-4 text-left`}>
              <span className={`inline-block p-2 rounded-lg bg-gray-300 text-black`}>
                {msg.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-full">
        {/* Header */}
        <header className="bg-white shadow-md z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(true)} className="p-1 rounded-full hover:bg-gray-200">
                <Menu className="h-6 w-6 text-gray-500" />
              </button>
              <h1 className="ml-3 text-xl font-semibold text-gray-800">ZenGuide</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={isAuthenticated ? handleSignOut : handleGoogleSignIn} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300">
                <User className="h-5 w-5 text-gray-600" />
              </button>
              {isAuthenticated && user && (
                <div className="flex items-center space-x-2">
                  <img src={user.photoURL} alt="User" className="h-8 w-8 rounded-full" />
                  <span className="text-gray-600">{user.displayName}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-grow flex flex-col p-4 overflow-y-auto">
          <div className="flex-grow">
            {sessionMessages.map((msg, index) => (
              <div key={index} className={`my-2 ${msg.user === user?.displayName ? 'text-left' : 'text-right  '}`}>
                <span className={`inline-block p-2 rounded-lg ${msg.user === user?.displayName ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                  {msg.text}
                </span>
              </div>
            ))}
            {isTyping && (
              <div className="my-2 text-left">
                <span className="inline-block p-2 rounded-lg bg-gray-300 text-black">Typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex items-center mt-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                  setInput('');
                   // CLear the input area after an Enter keypress
                }
              }}
              placeholder="Type your message..."
              className="flex-grow p-2 border rounded-l-md"
            />
            <button onClick={handleSend} className="p-2 bg-blue-500 text-white rounded-r-md">
              <Send />
            </button>
          </div>

        </div>
      </div>

      {/* Signup Modal */}
      {showSignup && (
        <Signup
          onClose={() => setShowSignup(false)}
          onSignup={handleSignup}
          onLogin={handleLogin}
          signupMessage={signupMessage}
        />
      )}
    </div>
  );
};

export default ChatbotUI;
