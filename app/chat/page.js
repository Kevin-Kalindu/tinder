"use client"

import Loader from "@/components/loader"
import { useRequireAuth } from "@/lib/authGuard"
function Chat(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <Loader/>
    }
    return(
        <div>chat</div>
    )
}

export default Chat