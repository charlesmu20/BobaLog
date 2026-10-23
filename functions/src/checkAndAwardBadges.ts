import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { BADGE_RULES } from "./badges";
import { getUserStats } from "./stats";

// 不只會新增剛達標的勳章,也會把「原本已解鎖、但數字後來掉到門檻以下」的勳章收回
// (例如:解鎖了「累積15杯」之後,又回去刪除了幾筆log,數字掉回14杯)。
// logs/favoriteBrands/favoriteDrinks/ratings/comments這5個collection,
// 不管是新增還是刪除文件,都會呼叫這個函式重新整理一次。
export async function checkAndAwardBadges(uid: string): Promise<void> {
  const db = getFirestore();
  const stats = await getUserStats(uid);

  const existingSnap = await db.collection("userBadges").where("uid", "==", uid).get();
  const existingDocs = new Map(existingSnap.docs.map((doc) => [doc.data().badgeId as string, doc]));

  for (const rule of BADGE_RULES) {
    const unlocked = existingDocs.has(rule.id);
    const qualifies = rule.check(stats);

    if (!unlocked && qualifies) {
      // 剛達標:新增
      const docId = `${uid}_${rule.id}`;
      await db.collection("userBadges").doc(docId).set({
        uid,
        badgeId: rule.id,
        unlockedAt: FieldValue.serverTimestamp(),
      });
    } else if (unlocked && !qualifies) {
      // 原本已解鎖,但現在數字不夠了:收回
      await existingDocs.get(rule.id)!.ref.delete();
    }
  }
}