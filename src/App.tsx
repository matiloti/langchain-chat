import { KeyboardEvent, useState } from 'react';
import './output.css';
import TextareaAutosize from 'react-textarea-autosize';

type Message = {
  content: string,
  role: string
}

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

function App() {

  const [ messages, setMessages ] = useState<Message[]>([])
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
          ...prev,
          {
            content: data.message,
            role: "assistant"
          }
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        { content: "Sorry, there was an error processing your message.", role: "system" }
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
    <div className='flex flex-col items-center bg-linear-to-br from-blue-300 to-red-300 p-5 h-svh '>
      <div className='flex mb-3 lg:min-w-200 md:min-w-190 sm:min-w-full min-w-full'>
        <div className='flex-5 bg-gray-50 drop-shadow-xl rounded-md mr-3'>
          <div className='p-5'>
            <span className='block font-bold text-yellow-600 italic text-2xl'>Hello! ✨</span>
            <span className='block'>I'm  <span className='font-bold'>Matias</span>, and I've done this little chat app to practice creating a fullstack app with agents.</span>
            <span className='block'>It's simple but the agent has internet access, so you can chat with it and ask for online info.</span>
            <span className='block'>Emojis make it seems like I vibecoded it but I did not if you see the code repo is all spaguetti AI would do much better.</span>
          </div>
        </div>
        <div className='flex-2 drop-shadow-xl rounded-md bg-blue-50'>
          <div className='p-5'>
            <div className='font-bold text-center'>Tech Stack 💪</div>
            </div>
        </div>
      </div>
      <div className='flex flex-col flex-1 justify-end lg:min-w-200 md:min-w-190 sm:min-w-full min-w-full bg-gray-50 drop-shadow-xl rounded-md min-h-0'>
        <div className='overflow-y-auto flex flex-col'>
        {
          messages.map(msg => (
            <div className={
              (
                (msg.role === "user") ? "bg-linear-to-br from-green-200 to-green-300 self-end " 
                : (msg.role === "assistant") ? "bg-linear-to-br from-teal-200 to-purple-300 ml-7 self-start " 
                : "bg-red-300 ml-7 text-red-900 font-bold"
              ) + " max-w-100 min-w-50 mx-5 mb-5 rounded-md px-4 py-2 drop-shadow-md brightness-100 transition-all duration-150 ease-in-out hover:brightness-95"}>{msg.content}</div>
          ))
        }
        </div>
        <div className='flex justify-between items-center mb-5 mx-7'>
          <div className={'flex flex-1 justify-between items-center  min-h-10 drop-shadow-sm rounded-md px-5 py-1 mr-2 outline-none transition-all ease-in-out duration-500  '+ (isLoading ? " bg-gray-100 cursor-wait" : " bg-white")}>
            <TextareaAutosize
              minRows={1}
              maxRows={5}
              placeholder='Type a message...'
              className={"flex-1 w-full overflow-y-hidden resize-none outline-0 transition-all ease-in-out duration-500 " + (isLoading ? " bg-gray-100 cursor-wait" : " ")}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onMessageSend}
              value={message}
              disabled={isLoading}
            />
          </div>
          <div 
            className='bg-gray-300 rounded-md opacity-70 p-2 w-20 text-center drop-shadow-md hover:opacity-90 hover:cursor-pointer'
            onClick={() => {setMessages([]); setIsLoading(false);}}
          >
            Clear
          </div>
        </div>
      </div>
    </div>
  );
}
 
export default App;
