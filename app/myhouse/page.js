"use client"

import { useRequireAuth } from "@/lib/authGuard"
function MyHouse(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <div>Loading...</div>
    }
    return(
        <div>My House</div>
    )
}

export default MyHouse