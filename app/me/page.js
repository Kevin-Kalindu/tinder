"use client"

import Loader from "@/components/loader"
import { useRequireAuth } from "@/lib/authGuard"
function Me(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <Loader/>
    }
    return(
        <div>Me</div>
    )
}

export default Me