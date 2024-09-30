// src/app.jsx
import React from 'react';
import Chatbot from './components/Chatbot'; // Correctly import from the components folder
import './app.css'; // Optional: Link to your CSS for styling

function App() {
  return (
    <div className="app">
      <header>
        <h1>AI Mental Health Chatbot</h1>
      </header>
      <main>
        <Chatbot /> {/* Render the Chatbot component here */}
      </main>
    </div>
  );
}

export default App;