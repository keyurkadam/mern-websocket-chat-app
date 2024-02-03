import { useContext, useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext";
import { uniqBy } from "lodash";
import axios from "axios";
import Contact from "./Contact";

export default function Chat(){
    const [ws, setWs] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState({});
    const [offlineUsers, setOfflineUsers] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const {username,id,setUsername,setId} = useContext(UserContext);
    const [newMessageText, setNewMessageText] = useState(null);
    const [messages, setMessages] = useState([]);
    const scrollAutoDivMessage = useRef();
    
    
    useEffect(() => {
        connectWs();
    }, []);

    function logout() {
        axios.post('/logout').then(res => {
            setWs(null);
            setId(null);
            setUsername(null);
        });
    }

    function connectWs() {
        const ws = new WebSocket('ws://localhost:4040');
        setWs(ws);
        ws.addEventListener('message', handleMessage);
        ws.addEventListener('close', () => {
            setTimeout(() => {
                console.log("Disconnected. Trying to reconnect.");
                connectWs();
            }, 1000);
        });
    }

    function showOnlineUsers(usersData)
    {
        const user = {};
        usersData.forEach(u => {
            user[u.userId] = u.username;
        });
        setOnlineUsers(user);  
    }

    function handleMessage(e){
        const parseMessage = JSON.parse(e.data);
        if ('online' in parseMessage){
            
            showOnlineUsers(parseMessage.online);
        }
        else if ('text' in parseMessage)
        {
            if (parseMessage.sender === selectedUserId) {
                setMessages(prev => ([...prev, {...parseMessage}]))
            }
            

        }
        
    }

    function sendMessage(e, file = null){
        if (e) e.preventDefault();
        console.log("file");
        console.log({file});

        ws.send(JSON.stringify({
            recipient: selectedUserId,
            text: newMessageText,
            file,
        }));
        
        
        if (file) {
            axios.get('/messages/'+selectedUserId).then(res => {
                const storedMessages = res.data;                
                setMessages(storedMessages);                
            });
        }
        else
        {
            setNewMessageText('');
            setMessages(prev => ([...prev, {
                text: newMessageText,
                sender: id,
                recipient: selectedUserId,
                _id: Date.now(),
            }]));
        }
    }

    function sendFile(e) {
        
        
        const reader = new FileReader();
        reader.readAsDataURL(e.target.files[0]);
        
        reader.onload = () => {
            sendMessage(null, {
                name: e.target.files[0].name,
                data: reader.result,
            });
        };
    }

    useEffect(() => {
        const div = scrollAutoDivMessage.current;
        if (div) {
            div.scrollIntoView({behavior: 'smooth', block: 'end'});
        }
        
    }, [messages]);

    useEffect(() => {
        axios.get('/users').then(res => {
            const offlineUsersPrivate = res.data.filter(u => u._id !== id).filter(u => !Object.keys(onlineUsers).includes(u._id));
            const offlineUsers = {};
            offlineUsersPrivate.forEach(u => {
                offlineUsers[u._id] = u;
            });
            setOfflineUsers(offlineUsers);
        });
    }, [onlineUsers]);

    useEffect(() => {
        
        if (selectedUserId) {
            axios.get('/messages/'+selectedUserId).then(res => {
                const storedMessages = res.data;                
                setMessages(storedMessages);                
            });
            
        }
    }, [selectedUserId]);

    const excludeMySelf = {...onlineUsers};
    delete excludeMySelf[id];

    const uniqueMessages = uniqBy(messages, '_id');
    
    return (
        <div className="flex h-screen">
            <div className="bg-white-100 w-1/3 flex flex-col">
                <div className="flex-grow">
                    <Logo/>
                    {Object.keys(excludeMySelf).map(userId => (                    
                        <Contact    
                            key={userId}
                            id={userId} 
                            status={true}
                            username={excludeMySelf[userId]} 
                            clickEvent={() => setSelectedUserId(userId)} 
                            selectedId={userId === selectedUserId} />
                    ))}
                    {Object.keys(offlineUsers).map(userId => (                   
                    <Contact    
                            key={userId}
                            id={userId} 
                            status={false}
                            username={offlineUsers[userId].username} 
                            clickEvent={() => setSelectedUserId(userId)} 
                            selectedId={userId === selectedUserId} />
                    ))}
                </div>                
                <div className="p-2 text-center flex items-center justify-center">
                    <span className="mr-2 text-sm text-gray-600 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                            <path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clip-rule="evenodd" />
                        </svg>
                         {username}
                    </span>
                    <button onClick={logout} className="text-sm text-gray-600 bg-blue-300 py-1 px-2 border rounded-md">Logout</button>
                </div>
            </div>
            <div className="flex flex-col bg-blue-50 w-2/3 p-2">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-gray-400">&larr; Select a person from the list</div>
                        </div>
                    )}
                    {!!selectedUserId && (
                        <div className="relative h-full">
                            <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                                {uniqueMessages.map(message => (
                                    <div key={message._id} className={(message.sender === id ? 'text-right' : 'text-left')}>
                                        <div className={"text-left inline-block p-2 my-2 rounded-sm text-sm "+ (message.sender === id ? 'bg-blue-500 text-white': 'bg-white text-gray-500')}>
                                            {message.text}
                                            {message.file && (
                                                <div className="flex gap-1 items-center underline">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                                                        <path fill-rule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clip-rule="evenodd" />
                                                    </svg>
                                                    <a className="" target="_blank" href={axios.defaults.baseURL + '/uploads/' + message.file}>
                                                        {message.file}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollAutoDivMessage}></div>
                            </div>
                            
                        </div>
                    )}
                </div>
                {!!selectedUserId &&(
                    <form className="flex gap-2" onSubmit={sendMessage}>
                        <input  type="text" 
                                value = {newMessageText}
                                onChange={e => setNewMessageText(e.target.value)}
                                placeholder="Type your message here" 
                                className="bg-white flex-grow rounded-sm border p-2" />
                        <label className=" text-gray-500 p-2 cursor-pointer">
                            <input type="file" className="hidden" onChange={sendFile} />
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                                <path fill-rule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clip-rule="evenodd" />
                            </svg>
                        </label>
                        <button type="submit" className="bg-blue-500 p-2 text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>                
                    </form>
                )}
                
            </div>
        </div>        
    );
}