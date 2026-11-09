"use client";
import { useEffect, useState } from "react";

// 讓畫面上「同一批」頭貼圖片一起淡入,不要因為每張圖片下載速度不同,
// 一個一個各自跳出來。做法:先在背景把這批網址都預先載入過一次(跟實際
// <img>完全無關的獨立Image物件),全部都到位(載完/失敗/本來就沒網址)
// 才回傳true。畫面那邊要等這個true了才把src塞進真正的AvatarImage——
// 這時候瀏覽器網路快取已經有這些圖了,真正渲染出來幾乎是瞬間完成,
// 所以看起來才會像「同時」出現。
// maxWaitMs是安全閥:萬一某張圖片卡住或404,也不會讓整批頭貼永遠卡在
// fallback圖示不出來
export function useImagesReady(urls: (string | null | undefined)[], maxWaitMs = 2500) {
  // 去重+排序串成字串當依賴,跟useUserProfiles同一招,避免每次外部傳進來的
  // 陣列參照不同就整批重新觸發
  const key = [...new Set(urls.filter((u): u is string => !!u))].sort().join("\n");
  // readyKey記錄「已經載完的那一批key長什麼樣子」,不是單純的布林值——
  // 這樣key變成空字串(這批留言全部都沒有頭貼網址)時,不用在effect裡額外
  // setState,直接靠下面的回傳運算式判斷就好,避免effect裡同步呼叫setState
  // 觸發連鎖重新渲染的lint錯誤。
  // 初始值一定要是""(不能用key),不然第一次render如果key本來就不是空的,
  // readyKey一開始就會跟key相等,變成「根本還沒載入任何東西就直接算ready」,
  // 整個同步機制形同虛設
  const [readyKey, setReadyKey] = useState("");

  useEffect(() => {
    if (key === "") return;

    const list = key.split("\n");
    let cancelled = false;
    let settledCount = 0;

    const markOneSettled = () => {
      settledCount += 1;
      if (!cancelled && settledCount >= list.length) setReadyKey(key);
    };

    list.forEach((url) => {
      const img = new window.Image();
      img.onload = markOneSettled;
      img.onerror = markOneSettled;
      img.src = url;
    });

    const timer = setTimeout(() => {
      if (!cancelled) setReadyKey(key);
    }, maxWaitMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, maxWaitMs]);

  return key === "" || readyKey === key;
}
