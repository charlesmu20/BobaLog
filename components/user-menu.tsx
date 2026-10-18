"use client";
import Link from "next/link";
import { signOut, User } from "firebase/auth";
import { User as UserIcon, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function UserMenu({ user }: { user: User }) {
  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none">
        <Avatar className="w-9 h-9 border border-[#E3D8C6]">
          <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "使用者"} />
          <AvatarFallback className="bg-[#F6EFE4] text-[#C9732F]">
            <UserIcon className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 rounded-2xl border-[#E3D8C6] shadow-lg p-1.5"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal px-2.5 py-2">
            <p className="text-sm font-semibold text-[#4A3424]">{user.displayName || "使用者"}</p>
            {user.email && <p className="text-xs text-[#8A7A63] truncate">{user.email}</p>}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-[#F0E6D6]" />
        <DropdownMenuItem className="rounded-lg px-2.5 py-2 data-[highlighted]:bg-[#F6EFE4] data-[highlighted]:text-[#4A3424]">
          <Link href="/profile" className="flex items-center gap-2.5 w-full text-[#4A3424]">
            <UserIcon className="w-4 h-4 text-[#8A7A63]" />
            個人資料
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleLogout}
          className="rounded-lg px-2.5 py-2 text-red-500 cursor-pointer data-[highlighted]:bg-red-50 data-[highlighted]:text-red-500"
        >
          <span className="flex items-center gap-2.5">
            <LogOut className="w-4 h-4" />
            登出
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}