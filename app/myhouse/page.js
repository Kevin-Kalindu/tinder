"use client"

import Loader from "@/components/loader"
import { useRequireAuth } from "@/lib/authGuard"
function MyHouse(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <Loader/>
    }
    return(
        <div>My House</div>
    )
}

export default MyHouse