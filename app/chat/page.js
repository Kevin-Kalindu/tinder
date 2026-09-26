"use client"

import { useRequireAuth } from "@/lib/authGuard"
function Chat(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <div>Loaing</div>
    }
    return(
        <div>chat</div>
    )
}

export default Chat