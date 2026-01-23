import { KeyboardEvent, useState } from 'react';
import './output.css';
import TextareaAutosize from 'react-textarea-autosize';

type Message = {
  content: string,
  role: string
}

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

function App() {

  const [ messages, setMessages ] = useState<Message[]>([{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"},{role: "user", content: "lorem"}])
  const [ message, setMessage ] = useState<string>("");
  const [ isLoading, setIsLoading ] = useState<boolean>(false);

  const handleSend = async (messageToSend: string) => {
    // Add user message to chat
    const newMessages = [...messages, {content: messageToSend, role: "user"}];
    setMessages(newMessages);
    setMessage("");
    setIsLoading(true);

    try {
      // Call backend API
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages
        })
      });

      const data = await response.json();
      console.log(data);

      if (data.success && data.message.length > 0) {
        // Add assistant message to chat
        setMessages(prev => [
          {
            content: data.message,
            role: "assistant"
          },
          ...prev
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        { content: "Sorry, there was an error processing your message.", role: "assistant" }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const onMessageSend = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (message.trim() && !isLoading) {
          handleSend(message);
        }
      }
  }

  return (
      <div className='flex flex-col lg:min-w-200 md:min-w-190 sm:min-w-full min-w-full bg-gray-50 drop-shadow-xl p-10 rounded-2xl h-full'>
        <div id="papi" className='flex flex-col h-200 overflow-y-auto  '>
        {
          messages.map(msg => (
            <div className={(msg.role === "user" ? "bg-linear-to-br from-green-200 to-green-300 self-end max-w-100 " : "bg-linear-to-br from-blue-200 to-purple-300 max-w-100 ") + " mb-5 rounded-lg p-4 drop-shadow max-w-5"}>{msg.content}</div>
          ))
        }
        </div>
        <div className='flex justify-between items-center bg-white w-full min-h-10 drop-shadow-sm rounded-lg px-5 py-1 outline-none mt-10'>
          <TextareaAutosize
            minRows={1}
            maxRows={5}
            placeholder='Type a message...'
            className="flex-1 w-full overflow-y-hidden resize-none outline-0"
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={onMessageSend}
            value={message}
            disabled={isLoading}
          />
        </div>
      </div>
  );
}
 
export default App;
