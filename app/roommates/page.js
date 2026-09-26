"use client"

import { useRequireAuth } from "@/lib/authGuard"

function Roommates(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <div>Loading....</div>
    }
    return(
        <div>Roommates</div>
    )
}

export default Roommates