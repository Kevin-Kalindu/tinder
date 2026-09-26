"use client"

import { useRequireAuth } from "@/lib/authGuard"
import Loader from "@/components/loader"
function Listings(){
    const {user, loading} = useRequireAuth()
    if (loading){
        return <Loader/>
    }
    return(
        <div>Listings</div>
    )
}

export default Listings