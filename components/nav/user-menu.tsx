"use client";
import Link from "next/link";
import { signOut, User } from "firebase/auth";
import { User as UserIcon, LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NAV_ICON_BUTTON_BASE } from "@/lib/nav-icon-button";
import { STICKER_CARD_BASE } from "@/lib/sticker-card";
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
      <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none group">
        <Avatar className={`${NAV_ICON_BUTTON_BASE} group-hover:scale-110 group-hover:shadow-[2px_2px_0_0_#3C332B]`}>
          <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "使用者"} />
          <AvatarFallback className="bg-[#F6F2EA] text-[#3C332B]">
            <UserIcon className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={`${STICKER_CARD_BASE} w-52 shadow-[6px_6px_0_0_#3C332B] p-1.5`}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal px-2.5 py-2">
            <p className="text-sm font-black text-[#3C332B]">{user.displayName || "使用者"}</p>
            {user.email && <p className="text-xs text-[#6B5D4F] truncate">{user.email}</p>}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-[#D9CFC0]" />
        <DropdownMenuItem className="rounded-lg px-2.5 py-2 data-[highlighted]:bg-[#A6C285]">
          <Link href="/profile" className="flex items-center gap-2.5 w-full text-[#3C332B] font-medium">
            <UserIcon className="w-4 h-4 text-[#6B5D4F]" />
            個人資料
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleLogout}
          className="rounded-lg px-2.5 py-2 text-red-600 cursor-pointer font-medium data-[highlighted]:bg-red-300 data-[highlighted]:text-red-950"
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
