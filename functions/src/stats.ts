import { getFirestore } from "firebase-admin/firestore";
import type { UserStats } from "./badges";

export async function getUserStats(uid: string): Promise<UserStats> {
  const db = getFirestore();

  const logsSnap = await db.collection("logs").where("uid", "==", uid).get();
  const logCount = logsSnap.size;
  const distinctBrands = new Set(logsSnap.docs.map((doc) => doc.data().brand));
  const distinctBrandCount = distinctBrands.size;

  const favoriteBrandsSnap = await db.collection("favoriteBrands").where("uid", "==", uid).get();
  const favoriteDrinksSnap = await db.collection("favoriteDrinks").where("uid", "==", uid).get();
  const favoriteBrandCount = favoriteBrandsSnap.size;
  const favoriteDrinkCount = favoriteDrinksSnap.size;

  const ratingsSnap = await db.collection("ratings").where("uid", "==", uid).get();
  const ratingCount = ratingsSnap.size;

  const commentsSnap = await db.collection("comments").where("uid", "==", uid).get();
  const commentCount = commentsSnap.size;

  return { logCount, distinctBrandCount, favoriteBrandCount, favoriteDrinkCount, ratingCount, commentCount };
}