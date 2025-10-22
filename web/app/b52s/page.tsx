"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function B52sRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/kochi");
  }, [router]);

  return null;
}
