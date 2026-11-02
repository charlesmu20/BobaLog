"use client";
import { useEffect, useState } from "react";

// 純文字訊息用的打字機效果——一個字一個字慢慢浮現,模擬AI正在即時生成的感覺。
// 【重要】後端(chatAssistant)不是真的串流回應,是一次拿到完整文字才顯示,所以這個效果
// 是前端自己模擬的,不是真的逐字從後端收到——但視覺上看起來就是AI在「打字」。
// 每則訊息的text在它的生命週期裡不會變(訊息物件建立之後就是固定的,外層chat-panel.tsx
// 是用message.id當key渲染,所以每則新訊息都會是一個全新的TypewriterText實例,不會有
// 「同一個實例text突然換掉」的情況),所以不需要在effect裡額外處理text變動時重置
// visibleCount——只要掛載時啟動一個interval慢慢往上加,卸載時清掉,避免記憶體洩漏。
// (effect本體不直接呼叫setState,只在setInterval的callback裡呼叫,符合
// react-hooks/set-state-in-effect規則建議的「在callback裡setState,不要在effect
// 本體同步setState」寫法)
const TYPE_SPEED_MS = 18;

export default function TypewriterText({ text }: { text: string }) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!text) return;
    const id = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= text.length) {
          clearInterval(id);
          return prev;
        }
        return prev + 1;
      });
    }, TYPE_SPEED_MS);
    return () => clearInterval(id);
  }, [text]);

  return <>{text.slice(0, visibleCount)}</>;
}
