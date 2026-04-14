import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const Chat = () => {
    const { userId } = useParams(); // ID of the person we are chatting with
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [targetUser, setTargetUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchContext = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return navigate('/login');

                // Get Current User Profile
                const meRes = await axios.get('http://localhost:5000/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setCurrentUser(meRes.data);

                // Ideally we'd have a targeted GET /users/:id to show their name,
                // but for now we'll just handle the messages
                
                // Get Historical Messages
                const msgRes = await axios.get(`http://localhost:5000/api/messages/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setMessages(msgRes.data);

                // Compute deterministic Room ID
                const roomId = [meRes.data._id, userId].sort().join('_');
                socket.emit('join_room', { roomId });

                setLoading(false);
            } catch (err) {
                console.error("Failed to load chat context", err);
                setLoading(false);
            }
        };

        fetchContext();

        // Listen for incoming websocket socket payloads
        const payloadListener = (data) => {
            // Guarantee we don't duplicate existing messages already hydrated
            setMessages((prev) => [...prev, data]);
        };

        socket.on('receive_message', payloadListener);

        return () => {
            socket.off('receive_message', payloadListener);
        };
    }, [userId, navigate]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (currentMessage.trim() === '') return;

        const roomId = [currentUser._id, userId].sort().join('_');
        
        const messageData = {
            roomId: roomId,
            sender: currentUser._id,
            receiver: userId,
            content: currentMessage,
            createdAt: new Date().toISOString() // Temporary localized timestamp for smooth UI
        };

        socket.emit('send_message', messageData);
        // Do NOT manually add to state array here; the socket.io listener will catch our broadcast instantly 
        // to render exactly what the DB holds
        setCurrentMessage('');
    };

    if (loading) return <div className="text-center mt-20 p-8 text-xl font-medium text-gray-500">Connecting to Chat Server...</div>;

    return (
        <div className="bg-gray-50 min-h-[calc(100vh-64px)] p-4 sm:p-8 flex flex-col">
            <div className="max-w-4xl mx-auto w-full flex-grow flex flex-col bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                {/* Chat Header */}
                <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center shadow-sm z-10">
                    <button onClick={() => navigate(-1)} className="mr-4 text-gray-400 hover:text-blue-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    </button>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            Secure Encrypted Chat
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        </h2>
                        <p className="text-xs text-gray-500 font-medium">End-to-end WebSocket Layer</p>
                    </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-6 overflow-y-auto bg-gray-50 space-y-4" style={{ minHeight: '400px', maxHeight: '600px' }}>
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                            <p className="text-blue-600 font-bold mb-1">Start the conversation!</p>
                            <p className="text-sm text-gray-500">Send a message to introduce yourself.</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => {
                            const isMe = msg.sender === currentUser._id;
                            return (
                                <div key={msg._id || idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] px-5 py-3 rounded-2xl shadow-sm relative ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
                                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                                        <span className={`text-[10px] block mt-1.5 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={sendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
                        <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all overflow-hidden flex">
                            <input
                                type="text"
                                value={currentMessage}
                                onChange={(e) => setCurrentMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none text-gray-700"
                                autoComplete="off"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!currentMessage.trim()}
                            className="flex-shrink-0 bg-blue-600 text-white p-3 rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chat;
