"use client"

import { onAuthStateChanged } from "firebase/auth"
import { useEffect,useState } from "react"
import { useRouter } from "next/navigation"
import {auth} from "./firebase"

export function useRequireAuth(){
    const router = useRouter()
    const [userAgent, setUser] = useState(null)
    const [loading , setLoading ] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser){
                setUser(currentUser)
                setLoading(false)
            }else{
                router.replace("./")
            }
        })
        return () => unsubscribe()
    }, [router])
    return {userAgent, loading}
    
}