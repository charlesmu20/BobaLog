import { getFirestore } from "firebase-admin/firestore";
import type { UserStats } from "./badges";

export async function getUserStats(uid: string): Promise<UserStats> {
  const db = getFirestore();

  const [logsSnap, favoriteBrandsSnap, favoriteDrinksSnap, ratingsSnap, commentsSnap] = await Promise.all([
    db.collection("logs").where("uid", "==", uid).get(),
    db.collection("favoriteBrands").where("uid", "==", uid).get(),
    db.collection("favoriteDrinks").where("uid", "==", uid).get(),
    db.collection("ratings").where("uid", "==", uid).get(),
    db.collection("comments").where("uid", "==", uid).get(),
  ]);

  const logCount = logsSnap.size;
  const distinctBrands = new Set(logsSnap.docs.map((doc) => doc.data().brand));
  const distinctBrandCount = distinctBrands.size;

  const favoriteBrandCount = favoriteBrandsSnap.size;
  const favoriteDrinkCount = favoriteDrinksSnap.size;
  const ratingCount = ratingsSnap.size;
  const commentCount = commentsSnap.size;

  return { logCount, distinctBrandCount, favoriteBrandCount, favoriteDrinkCount, ratingCount, commentCount };
}