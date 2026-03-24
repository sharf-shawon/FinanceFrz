"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const pending = searchParams.get("pending");
  const [status, setStatus] = useState<"pending" | "loading" | "success" | "error">(
    pending ? "pending" : token ? "loading" : "error"
  );
  const [message, setMessage] = useState(
    pending
      ? "Please check your email for a verification link."
      : !token
      ? "No verification token provided."
      : ""
  );

  useEffect(() => {
    if (pending || !token) return;
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.message) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.error ?? "Verification failed");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token, pending]);

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-3">
          {status === "loading" && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
          {status === "pending" && <Loader2 className="h-12 w-12 text-primary" />}
          {status === "success" && <CheckCircle className="h-12 w-12 text-green-500" />}
          {status === "error" && <XCircle className="h-12 w-12 text-destructive" />}
        </div>
        <CardTitle>
          {status === "loading" && "Verifying your email..."}
          {status === "pending" && "Check your email"}
          {status === "success" && "Email verified!"}
          {status === "error" && "Verification failed"}
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {status === "success" && (
          <Button onClick={() => router.push("/login")} className="w-full">
            Continue to login
          </Button>
        )}
        {status === "error" && (
          <Link href="/register">
            <Button variant="outline" className="w-full">Back to register</Button>
          </Link>
        )}
        {status === "pending" && (
          <Link href="/login">
            <Button variant="outline" className="w-full">Go to login</Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
