export default function Avatar({userId, username, online}){
    const colors = ['bg-red-200', 'bg-green-200', 'bg-purple-200', 'bg-yellow-200', 'bg-lime-200', 'bg-orange-200'];
    const userIdInt = parseInt(userId, 16);
    const colorIndex = userIdInt % colors.length;
    return (
        <div className={"w-8 h-8 relative rounded-full flex items-center "+colors[colorIndex]} >
            <div className="text-center w-full">{username[0]}</div>
            {online ? (
                <div className="absolute h-2 w-2 bg-green-500 rounded-full boder border-white bottom-0 right-0"></div>
            ) : (
                <div className="absolute h-2 w-2 bg-gray-500 rounded-full boder border-white bottom-0 right-0"></div>
            )}
            
        </div>
    );
}