"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";
import { getErrorMessage } from "@/lib/firebaseErrors";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2 } from "lucide-react";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/");
      } else {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async () => {
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: username });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/");
    } catch (err) {
      setError(getErrorMessage(err instanceof FirebaseError ? err.code : "unknown"));
    }
  };
  const handleGoogleLogin = async () => {
    try {
        await signInWithPopup(auth, new GoogleAuthProvider());
        router.push("/");
    } catch (err) {
        setError(getErrorMessage(err instanceof FirebaseError ? err.code : "unknown"));
    }
  };
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center">
      {/* 原本指到 /bobalog-logo.png,但 public/ 裡根本沒有這個檔案(只有 bobalog.png),
          等於登入頁的logo其實是壞圖——順便修掉,連同下面同一輪在修的 aspect ratio / priority 問題 */}
      <Image src="/bobalog.png" alt="BobaLog" width={110} height={49} loading="eager" className="mb-7 h-[49px] w-[110px]" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isSignUp ? "註冊帳號" : "登入帳號"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSignUp && (
            <Input
              type="text"
              placeholder="使用者名稱"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
            />
          )}
          <Input
            type="email"
            placeholder="電子郵件"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
          <Input
            type="password"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={handleSubmit} className="w-full cursor-pointer">
            {isSignUp ? "註冊" : "登入"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full flex items-center gap-2 cursor-pointer"
            >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            使用 Google 帳號登入
          </Button>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-muted-foreground underline w-full text-center hover:text-foreground transition-colors cursor-pointer"
          >
            {isSignUp ? "已經有帳號了？登入" : "還沒有帳號？註冊"}
          </button>
        </CardContent>
      </Card>
      <Link
        href="/"
        className="mt-10 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回首頁
      </Link>
    </div>
  );
}