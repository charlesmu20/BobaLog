// 一次性工具:把指定的Firebase帳號標記成管理員(custom claims)。
// 用法: npx tsx scripts/set-admin.ts <你的uid>
// 設定完之後,要重新登入一次(或等id token自然刷新)這個標記才會生效到前端
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const serviceAccount = JSON.parse(
  readFileSync(new URL("./serviceAccountKey.json", import.meta.url), "utf-8")
);

initializeApp({
  credential: cert(serviceAccount),
});

const uid = process.argv[2];
if (!uid) {
  console.error("用法: npx tsx scripts/set-admin.ts <uid>");
  process.exit(1);
}

async function setAdmin() {
  const user = await getAuth().getUser(uid);
  await getAuth().setCustomUserClaims(uid, { admin: true });
  console.log(`已將 ${user.email ?? uid} 標記為管理員(admin: true)`);
  console.log("請重新登入網站一次,這個標記才會生效到你當下的登入狀態。");
}

setAdmin().catch((err) => {
  console.error("設定失敗:", err.message ?? err);
  process.exit(1);
});
