"use client"

import { useRequireAuth } from "@/lib/authGuard"

function Listings(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <div>Loading....</div>
    }
    return(
        <div>Listings</div>
    )
}

export default Listings