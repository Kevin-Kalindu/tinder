"use client"

import { useRequireAuth } from "@/lib/authGuard"
import Loader from "@/components/loader"
import Sidebar from "@/components/Sidebar"

function Roommates(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <Loader/>
    }
    return(
        <div style={{ display: "flex" }}>
        <Sidebar />
        <main style={{ flex: 1 }}>
            <h1>Roommates</h1>
        </main>
    </div>
    )
}

export default Roommates