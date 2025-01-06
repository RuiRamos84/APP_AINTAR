// import React, { useState, useEffect, useRef } from "react";
// import { useSocket } from "../../contexts/SocketContext";
// import { useAuth } from "../../contexts/AuthContext";
// import { useTheme } from "@mui/material/styles";
// import "./ChatComponent.css";

// const ChatComponent = () => {
//   const theme = useTheme();
//   const [messages, setMessages] = useState({});
//   const [inputMessage, setInputMessage] = useState("");
//   const [currentChat, setCurrentChat] = useState(null);
//   const [onlineUsers, setOnlineUsers] = useState([]);
//   const [isMinimized, setIsMinimized] = useState(true);
//   const socket = useSocket();
//   const { user } = useAuth();
//   const messagesEndRef = useRef(null);

//   useEffect(() => {
//     if (socket && user) {
//       socket.on("private_message", (data) => {
//         console.log("Received private message:", data);
//         if (data.from === user.user_id || data.to === user.user_id) {
//           const otherUserId = data.from === user.user_id ? data.to : data.from;
//           setMessages((prev) => ({
//             ...prev,
//             [otherUserId]: [...(prev[otherUserId] || []), data],
//           }));
//         }
//       });

//       socket.on("online_users", (users) => {
//         // Filter out the current user from the online users list
//         const filteredUsers = users.filter((u) => u.user_id !== user.user_id);
//         setOnlineUsers(filteredUsers);
//       });

//       socket.emit("get_online_users");

//       return () => {
//         socket.off("private_message");
//         socket.off("online_users");
//       };
//     }
//   }, [socket, user]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages, currentChat]);

//   const sendMessage = (e) => {
//     e.preventDefault();
//     if (inputMessage && socket && currentChat) {
//       const messageData = {
//         target_user_id: currentChat,
//         from: user.user_id,
//         to: currentChat,
//         message: inputMessage,
//         timestamp: new Date().toLocaleTimeString(),
//       };
//       socket.emit("private_message", messageData);
//       setMessages((prev) => ({
//         ...prev,
//         [currentChat]: [...(prev[currentChat] || []), messageData],
//       }));
//       setInputMessage("");
//     }
//   };

//   const startChat = (userId) => {
//     setCurrentChat(userId);
//     setIsMinimized(false);
//   };

//   const toggleMinimize = () => {
//     setIsMinimized(!isMinimized);
//   };

//   const getUserName = (userId) => {
//     if (userId === user.user_id) return user.user_name;
//     const onlineUser = onlineUsers.find((u) => u.user_id === userId);
//     return onlineUser ? onlineUser.user_name : "Unknown User";
//   };

//   return (
//     <div className={`chat-container ${isMinimized ? "minimized" : ""}`}>
//       <div className="chat-header">
//         <span>
//           {currentChat ? `Chat with ${getUserName(currentChat)}` : "Chat"}
//         </span>
//         <button onClick={toggleMinimize} className="minimize-button">
//           {isMinimized ? "▲" : "▼"}
//         </button>
//       </div>
//       {!isMinimized && (
//         <div className="chat-content">
//           <div className="chat-users">
//             <h4>Online Users</h4>
//             <div className="chat-user current-user">You ({user.user_name})</div>
//             {onlineUsers.map((onlineUser) => (
//               <div
//                 key={onlineUser.user_id}
//                 onClick={() => startChat(onlineUser.user_id)}
//                 className={`chat-user ${
//                   currentChat === onlineUser.user_id ? "active" : ""
//                 }`}
//               >
//                 {onlineUser.user_name}
//               </div>
//             ))}
//           </div>
//           <div className="chat-messages-container">
//             <div className="chat-messages">
//               {currentChat &&
//                 (messages[currentChat] || []).map((msg, index) => (
//                   <div
//                     key={index}
//                     className={`chat-message ${
//                       msg.from === user.user_id ? "sent" : "received"
//                     }`}
//                   >
//                     <div className="chat-message-header">
//                       <strong>
//                         {msg.from === user.user_id
//                           ? "You"
//                           : getUserName(msg.from)}
//                       </strong>
//                       <span>{msg.timestamp}</span>
//                     </div>
//                     <div className="chat-message-body">{msg.message}</div>
//                   </div>
//                 ))}
//               <div ref={messagesEndRef} />
//             </div>
//             <form onSubmit={sendMessage} className="chat-input-form">
//               <input
//                 type="text"
//                 value={inputMessage}
//                 onChange={(e) => setInputMessage(e.target.value)}
//                 className="chat-input"
//                 disabled={!currentChat}
//                 placeholder={
//                   currentChat ? "Type a message..." : "Select a user to chat"
//                 }
//               />
//               <button
//                 type="submit"
//                 disabled={!currentChat}
//                 className="chat-send-button"
//               >
//                 Send
//               </button>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ChatComponent;
