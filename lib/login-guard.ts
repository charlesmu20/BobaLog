// 好幾個handler(收藏品牌/收藏飲料/回報/評分...)開頭都要做同一件事:
// 沒登入的話先彈登入提示視窗、擋下來不繼續往下執行;已登入才回true讓呼叫端繼續走
export function requireLogin(user: unknown, onRequireLogin: () => void): boolean {
  if (user) return true;
  onRequireLogin();
  return false;
}
