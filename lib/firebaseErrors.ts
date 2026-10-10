export function getErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "這個信箱已經被註冊過了";
    case "auth/weak-password":
      return "密碼至少需要6個字元";
    case "auth/invalid-email":
      return "信箱格式不正確";
    case "auth/invalid-credential":
      return "信箱或密碼錯誤";
    case "auth/too-many-requests":
      return "嘗試次數過多，請稍後再試";
    default:
      return "發生錯誤，請稍後再試";
  }
}