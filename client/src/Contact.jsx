import Avatar from "./Avatar";

export default function Contact({id, clickEvent, selectedId, username, status}) {
    return (
        <div key={id} onClick={() => clickEvent(id)} className={"border-b border-gray-100 flex items-center gap-2 cursor-pointer "+(selectedId ? 'bg-blue-50' : '')}>
            {selectedId && (
                <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>
            )}
            <div className="flex gap-2 py-2 pl-4 items-center">
                <Avatar online={status} userId={id} username={username}/>
                <span className="">{username}</span>
            </div>
            
        </div>
    );
    
}