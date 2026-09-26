"use client"

import Sidebar from "@/components/Sidebar"
import Loader from "@/components/loader"
import { useRequireAuth } from "@/lib/authGuard"
function Chat(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <Loader/>
    }
    return(
        <div style={{ display: "flex" }}>
        <Sidebar />
        <main style={{ flex: 1 }}>
            <h1>Chat</h1>
        </main>
    </div>
    )
}

export default Chat