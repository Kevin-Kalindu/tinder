"use client"

import Sidebar from "@/components/Sidebar"
import { useRequireAuth } from "@/lib/authGuard"
import Loader from "@/components/loader"
function Listings(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <Loader/>
    }
    return(
        <div style={{ display: "flex" }}>
        <Sidebar />
        <main style={{ flex: 1 }}>
            <h1>listings</h1>
        </main>
    </div>
    )
}

export default Listings