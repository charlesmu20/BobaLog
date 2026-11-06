import { doc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";

// 把Auth目前的displayName/photoURL同步一份到公開可讀的users/{uid}文件。
// comments這類地方原本只存uid+發文當下的displayName快照(沒有頭貼),現在要改成能查到
// 使用者「目前」的名字跟頭貼,就是靠這份文件——別人的Auth資料本來就讀不到,
// 所以需要自己這邊主動同步一份出來給大家讀。
// 在登入狀態變化時(useCurrentUser.tsx)跟改名字/換頭貼成功後(profile-header.tsx的onRefresh)呼叫,
// 失敗就靜靜吞掉,不要讓這個同步動作擋到登入或改名字/頭貼本身的流程
export async function syncUserProfile(user: User) {
  try {
    await setDoc(
      doc(db, "users", user.uid),
      { displayName: user.displayName ?? "使用者", photoURL: user.photoURL ?? null },
      { merge: true }
    );
  } catch {
    // 忽略:這只是輔助用的名字/頭貼快照,同步失敗不影響主要功能
  }
}
