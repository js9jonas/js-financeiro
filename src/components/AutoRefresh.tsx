"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Props = {
    intervalMs?: number;
};

export default function AutoRefresh({ intervalMs }: Props) {
    const router = useRouter();

    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === "visible") router.refresh(); };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, []);

    useEffect(() => {
        if (!intervalMs) return;
        const id = setInterval(() => router.refresh(), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);

    return null;
}