import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { IoInformationCircleOutline, IoSend } from 'react-icons/io5';
import placeholders from './placeholders';

type Message = {
  content: string,
  role: string
}

const API_URL = process.env.REACT_APP_API_URL ?? '';

function AppStreaming() {

  const [ messages, setMessages ] = useState<Message[]>([])
  const [ userMessage, setUserMessage ] = useState<string>("");
  const [ isLoading, setIsLoading ] = useState<boolean>(false);
  const [ count, setCount ] = useState<number>(0);
  const [ showInfo, setShowInfo ] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ placeholder, setPlaceholder ] = useState<string>(placeholders[Math.floor(Math.random() * placeholders.length)]);
  const [ placeholderKey, setPlaceholderKey ] = useState<number>(0);
  const [ conversationId, setConversationId ] = useState<string>(crypto.randomUUID());

  const handleReset = async () => {
    setMessages([]);
    setIsLoading(false);
    setPlaceholder(placeholders[Math.floor(Math.random() * placeholders.length)]);
    setPlaceholderKey(prev => prev + 1);
    await fetch(`${API_URL}/api/chat/stream/reset?conversation_id=${conversationId}`)
    setConversationId(crypto.randomUUID());
  }

  const handleSend = async (messageToSend: string) => {
    // Add user message to chat
    setMessages(prev => (
      [
        ...prev, 
        {content: messageToSend, role: "user"},
        {content: "", role: "assistant"}
      ]
    ));
    setUserMessage("");
    setIsLoading(true);

    try {
      // Call backend API
      const response = await fetch(`${API_URL}/api/chat/stream?prompt=${encodeURIComponent(messageToSend)}&conversation_id=${conversationId}`);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      while(true) {
        const { done, value } = await reader.read();
        if(done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop()!;

        for(const part of parts) {
          if(part.startsWith("data: ")) {
            const data = part.slice(6);
            if(data === '[DONE]') break;
            setMessages((prev) => {
              const streamingMessage = prev[prev.length - 1];
              return ([...prev.slice(0, -1), {role: streamingMessage.role, content: streamingMessage.content+data}])
            });
          } else if(part.startsWith('tool: ')) {
              const data = part.slice(6);
              if(data.startsWith('sound:')) {
                const soundName = data.slice(6);
                new Audio(`/sounds/${soundName}.mp3`).play().catch(() => {});
              } else {
                setMessages((prev) => {
                  return ([
                    ...prev[prev.length-1].content.length > 0 ? prev : prev.slice(0, -1),
                    {role: "assistant", content: data},
                    {content: "", role: "assistant"}
                  ])
                });
              }
          }
        }
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

  const onMessageSend = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (userMessage.trim() && !isLoading) {
          handleSend(userMessage);
        }
      }
  }, [userMessage])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // setInterval returns a NodeJS.Timeout in TS
    const interval = setInterval(() => {
      setCount(prev => (prev + 1) > 360 ? 0 : (prev + 1));
    }, 50); // 1 millisecond

    // cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='flex flex-col items-center bg-linear-to-br from-blue-300 to-red-300 p-3 md:p-5 h-svh'>
      <div className='hidden md:flex mb-3 flex-col md:flex-row lg:max-w-200 md:max-w-190 sm:max-w-full max-w-full'>
        <div className='relative md:flex-5 w-full mb-3 md:mb-0 md:w-auto drop-shadow-xl mr-3'>
          <div className='h-full w-full absolute bg-black opacity-20 rounded-md'/>
          <div className='p-5'>
            <span className='relative block font-bold text-yellow-300 italic text-2xl'>Hello! ✨</span>
            <span className='block h-5'/>
            <span className='text-white relative block'>I'm <span className='font-bold'>Matias</span>, and I've done this little chat app to practice creating a fullstack app with AI agents (LangChain).</span>
            <span className='block h-5'/>
            <span className='text-white relative block'>It's simple but the agent has internet access, so you can chat with it and ask for online info.</span>
            <span className='block h-5'/>
            <span className='text-white relative block'>The whole thing runs on AWS — Fargate, NLB, CloudFront, S3, the works. Took me longer to fix SSE streaming through TLS than to write the actual app.</span>
            <span className='block h-5'/>
            <span className='text-white relative block'>Emojis make it seems like I vibecoded it but <b>I did not</b>. If you see <a href="https://github.com/matiloti/langchain-chat" target='blank' className='underline text-blue-300'>the code repo</a> is all spaghetti. AI would do much better. Sadly.</span>
            <span className='block h-5'/>
            <span className='text-gray-400 relative block text-xs italic'>psst... try asking the agent to play you a sound</span>
          </div>
        </div>
        <div className='md:flex-2 md:h-auto h-50 w-full md:w-auto drop-shadow-xl rounded-md'>
          <div className='w-full absolute h-full bg-linear-to-br from-yellow-300 to-yellow-600 opacity-15 z-0 rounded-md'></div>
          <div className='p-5 h-full'>
            <div className='font-bold text-center font-mono border-b '>Tech Stack 💪</div>
            <div className='flex flex-1 h-full flex-col items-center '>
              <div className='flex flex-1 h-full items-center gap-5'>
                <img src="langchain.png" className='relative size-10'/>
                <img src="logo512.png" className={('relative size-10 ') + (" rotate-[" + count + "deg]")}/>
              </div>
              <div className='flex flex-1 items-center gap-5'>
                <img src="python-logo.png" className='relative size-10'/>
                <img src="typescript_logo.png" className='relative size-10'/>
                <img src="tailwind_logo.png" className='relative size-10'/>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showInfo && (
        <div className='md:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50' onClick={() => setShowInfo(false)}>
          <div className='mx-4 max-h-[80vh] overflow-y-auto rounded-md drop-shadow-xl' onClick={(e) => e.stopPropagation()}>
            <div className='bg-gray-900 rounded-t-md p-5'>
              <span className='block font-bold text-amber-500 italic text-2xl'>Hello! ✨</span>
              <span className='block h-5'/>
              <span className='text-white block'>I'm <span className='font-bold'>Matias</span>, and I've done this little chat app to practice creating a fullstack app with AI agents (LangChain).</span>
              <span className='block h-5'/>
              <span className='text-white block'>It's simple but the agent has internet access, so you can chat with it and ask for online info.</span>
              <span className='block h-5'/>
              <span className='text-white block'>The whole thing runs on AWS — Fargate, NLB, CloudFront, S3, the works. Took me longer to fix SSE streaming through TLS than to write the actual app.</span>
              <span className='block h-5'/>
              <span className='text-white block'>Emojis make it seems like I vibecoded it but <b>I did not</b>. If you see <a href="https://github.com/matiloti/langchain-chat" target='blank' className='underline text-blue-300'>the code repo</a> is all spaghetti. AI would do much better. Sadly.</span>
              <span className='block h-5'/>
              <span className='text-gray-400 block text-xs italic'>psst... try asking the agent to play you a sound</span>
            </div>
            <div className='bg-amber-600 rounded-b-md p-5'>
              <div className='font-bold text-center font-mono text-white'>Tech Stack 💪</div>
              <div className='flex items-center justify-center gap-5 py-3'>
                <img src="langchain.png" className='size-10'/>
                <img src="logo512.png" className='size-10'/>
                <img src="python-logo.png" className='size-10'/>
                <img src="typescript_logo.png" className='size-10'/>
                <img src="tailwind_logo.png" className='size-10'/>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className='flex flex-col flex-1 justify-end w-full lg:max-w-200 md:max-w-190 bg-gray-50 drop-shadow-xl rounded-md min-h-0'>
        <div className='overflow-y-auto flex flex-col pt-5 h-full'>
        {
          !messages || messages.length == 0 ? <div key={placeholderKey} className='self-center flex-1 flex items-center justify-center text-gray-400 italic animate-fade-in'>{placeholder}</div> : messages.filter(m => m.content.length > 0).map(msg => (
            <div className={
              (
                (msg.role === "user") ? "bg-linear-to-br from-green-200 to-green-300 self-end " 
                : (msg.role === "assistant") ? "bg-linear-to-br from-teal-200 to-purple-300 ml-7 self-start " 
                : "bg-red-300 ml-7 text-red-900 font-bold"
              ) + " max-w-[80%] md:max-w-100 mx-3 md:mx-5 mb-3 md:mb-5 rounded-md px-3 md:px-4 py-2 drop-shadow-md brightness-100 transition-all duration-150 ease-in-out hover:brightness-95"}>{msg.content}</div>
          ))
        }
        <div ref={messagesEndRef} />
        </div>
        <div className='flex justify-between items-center mb-3 md:mb-5 mx-3 md:mx-7'>
          <div
            className='md:hidden p-2 text-gray-900 hover:text-amber-800 hover:cursor-pointer mr-2 flex items-center justify-center'
            onClick={() => setShowInfo(true)}
          >
            {IoInformationCircleOutline({ size: 24 })}
          </div>
          <div className={'flex flex-1 justify-between items-center  min-h-10 drop-shadow-sm rounded-md px-5 py-1 mr-2 outline-none transition-all ease-in-out duration-500  '+ (isLoading ? " bg-gray-100 cursor-wait" : " bg-white")}>
            <TextareaAutosize
              minRows={1}
              maxRows={5}
              placeholder='Type a message...'
              className={"flex-1 w-full overflow-y-hidden resize-none outline-0 transition-all ease-in-out duration-500 " + (isLoading ? " bg-gray-100 cursor-wait" : " ")}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={onMessageSend}
              value={userMessage}
              disabled={isLoading}
            />
            <div
              className={'ml-2 p-1 rounded-md hover:cursor-pointer transition-all duration-300 ' + (userMessage.trim() && !isLoading ? 'opacity-70 hover:opacity-100' : 'opacity-20')}
              onClick={() => { if (userMessage.trim() && !isLoading) handleSend(userMessage); }}
            >
              {IoSend({ size: 18 })}
            </div>
          </div>
          <div
            className='bg-gray-300 rounded-md opacity-70 p-2 w-20 text-center drop-shadow-md hover:opacity-90 hover:cursor-pointer'
            onClick={handleReset}
          >
            Reset
          </div>
        </div>
      </div>
    </div>
  );
}
 
export default AppStreaming;
