"use client";
import { useState, useEffect } from "react";
import { liteClient } from "algoliasearch/lite";

// App ID 跟 Search-Only API Key 都是Algolia官方說明「可以安全放在前端」的公開值,
// 不是機密資訊,不用走環境變數或藏起來——真正要保護的是Write API Key,
// 那把只會出現在Cloud Function的secret裡(見functions/src/search/syncDrinksToAlgolia.ts)
const ALGOLIA_APP_ID = "5873XNQFPF";
const ALGOLIA_SEARCH_API_KEY = "f6a51d0084787693804529dad33fb6ea";

const client = liteClient(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY);

export type AlgoliaBrandHit = { slug: string; name: string; icon: string };
export type AlgoliaDrinkHit = {
  id: string;
  name: string;
  brandSlug: string;
  brandName: string;
  brandIcon: string;
};

type RawBrandRecord = { slug: string; name: string; icon: string };
type RawDrinkRecord = {
  objectID: string;
  name: string;
  brandSlug: string;
  brandName: string;
  brandIcon: string;
};

// 首頁Hero搜尋專用:查詢去Algolia(brands/drinks兩個索引各查一次
// 用search()的multi-query功能包成同一次網路請求)
export function useAlgoliaSearch(term: string) {
  const [matchedBrands, setMatchedBrands] = useState<AlgoliaBrandHit[]>([]);
  const [matchedDrinks, setMatchedDrinks] = useState<AlgoliaDrinkHit[]>([]);
  // debounce等待中、或是API還沒回來,這段期間都算searching——畫面要讓使用者知道
  const [searching, setSearching] = useState(false);
  // Algolia查詢失敗(網路斷線、服務掛了等)時設成true,讓畫面能分清楚
  // 「真的查無結果」跟「查詢失敗」這兩種不一樣的狀況
  const [searchError, setSearchError] = useState(false);

  useEffect(() => {
    // term清空時不用特地把matchedBrands/matchedDrinks也清掉——
    // SearchDropdown自己在term是空字串時就會顯示「輸入品牌或飲料名稱開始搜尋」 的提示,不會去看這兩個陣列內容,留著舊資料也不影響畫面顯示
    if (!term) return;

    let cancelled = false;
    // 這裡故意在effect一開始就同步設成true/false(不是等debounce計時器觸發才設),
    // 這樣使用者一打字,「搜尋中」的提示就會立刻出現、上一次的錯誤也會先清掉,不會有空窗期
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 讓使用者立刻看到「搜尋中」提示,不是訂閱外部系統的場景
    setSearching(true);
    // 同上,新的一次查詢開始就先清掉上次的錯誤狀態(這行ESLint沒有額外警告,
    // 同一個effect裡規則只在第一次setState時檢查)
    setSearchError(false);

    // debounce:使用者還在打字時不用每個字都真的發一次請求,等200ms沒有新輸入
    // 才真的查詢——cleanup會清掉還沒觸發的timer、並且標記cancelled,避免「慢的那次
    // 查詢結果」在使用者已經改打別的字之後才回來,把畫面蓋回舊的結果
    const timer = setTimeout(() => {
      client
        .search<RawBrandRecord | RawDrinkRecord>({
          requests: [
            { indexName: "brands", query: term, hitsPerPage: 5 },
            { indexName: "drinks", query: term, hitsPerPage: 8 },
          ],
        })
        .then(({ results }) => {
          if (cancelled) return;
          const brandsHits = (results[0] as { hits: RawBrandRecord[] }).hits;
          const drinksHits = (results[1] as { hits: RawDrinkRecord[] }).hits;
          setMatchedBrands(brandsHits.map((h) => ({ slug: h.slug, name: h.name, icon: h.icon })));
          setMatchedDrinks(
            drinksHits.map((h) => ({
              id: h.objectID,
              name: h.name,
              brandSlug: h.brandSlug,
              brandName: h.brandName,
              brandIcon: h.brandIcon,
            }))
          );
        })
        .catch((err) => {
          // 網路斷線、Algolia服務掛了等狀況:不要讓錯誤默默消失,
          // 記錄下來讓之後排查問題時看得到,並標記searchError讓畫面能顯示提示
          if (cancelled) return;
          console.error("Algolia搜尋失敗:", err);
          setSearchError(true);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  return { matchedBrands, matchedDrinks, searching, searchError };
}
