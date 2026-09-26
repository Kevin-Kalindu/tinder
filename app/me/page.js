"use client"

import { useRequireAuth } from "@/lib/authGuard"
function Me(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <div>Loading...</div>
    }
    return(
        <div>Me</div>
    )
}

export default Me