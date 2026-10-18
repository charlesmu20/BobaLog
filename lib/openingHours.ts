// 判斷現在是不是落在Google給的「這一週營業時段」裡面。
// Google給的時段資料是一段一段的(開始時間點+結束時間點),每個時間點是「星期幾+幾點+幾分」
// 這三個獨立數字,不是現成的Date,所以要自己換算成「這週第幾分鐘」才好比較。
type OpeningHoursPoint = { day: number; hour: number; minute: number };
// Google實際給的close欄位型別是「OpeningHoursPoint | null」,不是undefined,
// 這裡兩種都接受,避免跟google.maps.places.OpeningHoursPeriod對不起來
type OpeningHoursPeriod = { open: OpeningHoursPoint; close?: OpeningHoursPoint | null };

const MINUTES_PER_WEEK = 7 * 24 * 60;

function toWeekMinutes(point: OpeningHoursPoint) {
  return point.day * 1440 + point.hour * 60 + point.minute;
}

// 回傳true/false代表算出結果了,回傳null代表Google根本沒給這家店的營業時間資料,不知道
export function isCurrentlyOpen(
  periods: OpeningHoursPeriod[] | undefined,
  now: Date = new Date()
): boolean | null {
  if (!periods || periods.length === 0) return null;

  const nowMinutes = now.getDay() * 1440 + now.getHours() * 60 + now.getMinutes();

  return periods.some((period) => {
    if (!period.close) return true; // 沒有結束時間,當作24小時營業

    const openMinutes = toWeekMinutes(period.open);
    let closeMinutes = toWeekMinutes(period.close);

    // 處理「跨過週六晚上到週日凌晨」這種特殊情況:結束時間的星期幾編號(週日=0)
    // 反而比開始時間(週六=6)小,要把結束時間往後推一整週,數字上才會變成比開始時間晚
    if (closeMinutes < openMinutes) {
      closeMinutes += MINUTES_PER_WEEK;
    }

    // 同樣道理,如果現在剛好是週日凌晨、但這段時段其實是從週六晚上跨過來的,
    // 也要把「現在」往後推一整週再比一次,才比得出來現在其實還在這段時段裡
    return (
      (nowMinutes >= openMinutes && nowMinutes <= closeMinutes) ||
      (nowMinutes + MINUTES_PER_WEEK >= openMinutes && nowMinutes + MINUTES_PER_WEEK <= closeMinutes)
    );
  });
}

const WEEKDAY_LABELS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

// weekdayDescriptions是Google已經排版好、翻譯好的七行文字(例如「星期一: 10:00–22:00」),
// 但官方文件說不同語言的排列順序不保證從星期日開始,所以不能直接用now.getDay()當陣列索引去抓,
// 改成拿「今天的中文星期幾」去比對每一行開頭的文字,找出真正是「今天」的那一行
export function getTodayHoursLabel(
  weekdayDescriptions: string[] | undefined,
  now: Date = new Date()
): string | null {
  if (!weekdayDescriptions || weekdayDescriptions.length === 0) return null;
  const todayLabel = WEEKDAY_LABELS[now.getDay()];
  return weekdayDescriptions.find((line) => line.startsWith(todayLabel)) ?? null;
}
