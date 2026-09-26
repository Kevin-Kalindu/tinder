"use client"

import { useRequireAuth } from "@/lib/authGuard"
import Loader from "@/components/loader"

function Roommates(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <Loader/>
    }
    return(
        <div>Roommates</div>
    )
}

export default Roommates