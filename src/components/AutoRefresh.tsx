"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AutoRefresh() {
    const router = useRouter();
    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === "visible") router.refresh(); };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, []);
    return null;
}