# Quant Drill

把一本 quant 面試題庫拆成每天刷得完的一組題，記錄哪些題會、哪些題不會，並把不會的排回來再考一次。

實作自設計稿 `Quant Drill.dc.html` 的 **3b**（首頁 · 單色框架，3D 是畫面上唯一的顏色）、**3c**（作答 · 深色專注模式）與 **3d**（結果頁 · 角色個性「安靜」）。

## 版權

`ingest/` 讀的是**你自己那本書的掃描檔**，輸出只寫進本機的 `data/quant.db`。掃描檔、頁面圖片與抽取出的題庫全部在 `.gitignore` 裡，不會進版本控制。這是為個人學習做的數位化，不是可以散布的產品；要商業化的話，題庫必須另外重寫。

`data/seed-problems.json` 是例外 —— 那 14 題是自己寫的經典題，可以公開。

## 跑起來

```bash
npm install
npm run db:seed     # 建 schema + 灌入 14 題種子，馬上有東西可以刷
npm run dev         # http://localhost:3000
```

## 在手機上用

版面本來就是照手機畫的（寬螢幕會置中成手機寬度的一欄），而且是 PWA —— Safari／Chrome 開起來按「加到主畫面」，就有圖示、全螢幕、沒有網址列，跟 App 沒兩樣。不需要上架，也不需要 Xcode。

要讓手機連得到，得先把 WSL 的 port 開出去（WSL2 預設是 NAT，手機看不到裡面）。**在 Windows PowerShell（系統管理員）跑一次：**

```powershell
$wslIp = (wsl hostname -I).Trim().Split(" ")[0]
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp
netsh advfirewall firewall add rule name="Quant Drill 3000" dir=in action=allow protocol=TCP localport=3000
```

然後手機（同一個 Wi-Fi）開 `http://<你電腦的區網 IP>:3000`。

WSL 重開後內部 IP 會變，portproxy 要重下 —— 先 `netsh interface portproxy reset` 再跑一次上面那段。

想在外面也能用（不只家裡同一個 Wi-Fi），裝 Tailscale 比開公網 tunnel 好：**`data/` 裡有整本書的掃描檔，不應該出現在任何公開網址上。**

## 把整本書灌進去

需要 Python 環境與 Claude API 憑證（`ANTHROPIC_API_KEY`，或跑過 `ant auth login`）。

```bash
python3 -m venv .venv && .venv/bin/pip install pymupdf anthropic pydantic
.venv/bin/python ingest/render_pages.py                 # PDF → data/pages/*.png
.venv/bin/python ingest/scan_index.py --pages 1-40      # 先小範圍試
.venv/bin/python ingest/extract.py --limit 3            # 先抽三題看品質
```

品質可以接受再跑整本（拿掉 `--pages` / `--limit`）。兩個腳本都會續跑，中斷再開不會重複做。

### 為什麼分兩趟

掃描檔沒有文字層（字型數 0，全部是影像），所以只能靠視覺模型讀。與其猜「幾頁一個視窗」，不如：

- **pass A**（`scan_index.py`）每頁一次便宜的呼叫，只回報**結構** —— 章節從哪裡開始、哪些頁上有粗體的題目標題。
- **pass B**（`extract.py`）依索引算出每題橫跨哪幾頁，只送那幾頁，整題一次抽完。

代價是多一趟呼叫，換到的是「解答不會被切一半」。

### 抽完一定要校對

數學式辨識大約 90–95% 準，也就是每十頁就有一個下標是錯的 —— 而錯的下標會讓你把錯的東西練熟。所以抽出來的題目一律 `verified = 0`，在 `/review` 校對台一題一題過：左邊是原始掃描頁，右邊是可編輯欄位與即時渲染。

## 助教（LLM 討論）

作答畫面右上角的「助教」開啟討論面板，答案欄下方的「寫推導」把完整過程交給它批改。兩個都需要 Claude API 憑證：

```bash
export ANTHROPIC_API_KEY=...      # 或 .env.local
npm run dev
```

沒有憑證時可以用假的助教把整條 UI 路徑跑起來（串流、渲染、儲存都是真的，只有回覆是罐頭）：

```bash
TUTOR_MOCK=1 npm run dev
```

### 兩個階段

助教的行為由**伺服器**依 `attempts.ended_at` 決定，不是由前端宣稱的：

- **作答中（thinking）** — 不給最終答案、不給關鍵那一步，只用問句把你推下一步。你堅持要答案，它會叫你按「先看解答」。
- **已作答（reviewing）** — 完整討論，重點放在「你當初的想法錯在哪一步」，而不是重講一次正確解法。

兩個階段都會拿到書上的標準解答當參考。這是刻意的：**沒有標準解答的助教會把你帶到錯的方向，那比洩題更糟。** 代價是如果你一直逼問，它有可能提早鬆口 —— 反正「先看解答」就在旁邊，這個風險我判斷可以接受。

### 批改推導

`/api/tutor/grade` 用 structured output（zod schema）回傳：verdict、0–100 分、**具體**指出做對的地方、第一個真正出錯的步驟、為什麼錯、要補的觀念。只認第一個錯 —— 後面被帶歪的不重複列。

批改結果是建議，不是判決。不同意就按「我覺得我對」，那筆會標記 `disputed = 1` 留著之後回頭看。模型對數學正確性的判斷本來就不完全可靠，把它當唯一裁判會學到錯的東西。

## 結構

```
app/                Next.js App Router
  page.tsx          3b 首頁
  drill/[id]/       3c 作答
  result/[id]/      3d 結果
  review/           校對台
  api/              session / attempt / problem / page
components/
  QuantToon3D.tsx   設計稿的 cel-shaded 3D 場景，改用 npm three
  QuantBuddy.tsx    設計稿的角色，SVG + 表情漸變
  DrillClient.tsx   作答流程（計時、提示、數學鍵盤、批改）
  TutorSheet.tsx    助教討論面板（串流、LaTeX 輸入）
  DerivationPad.tsx 寫推導 + 批改結果
  Rich.tsx          markdown + KaTeX
lib/
  schema.sql        SQLite schema
  tutor.ts          助教的 system prompt 與題目脈絡組裝
  queries.ts        首頁統計、排題組、記錄作答
  review.ts         間隔重複（縮短版 SM-2）
  answer.ts         答案比對
ingest/             掃描檔 → 題庫
```

## 排程

`lib/review.ts` 是縮短版 SM-2：前三個間隔是 30 分鐘 / 1 天 / 3 天，之後才乘 ease。刻意比 Anki 預設短 —— 三個月後要面試，沒有空間讓第一次複習排在四天後。

答錯或直接看解答都算 grade 0，會退回第一階並降 ease；沒用提示答對是 grade 3。

## 還沒做

- iPad 手寫作答（手寫筆跡直接當圖片送多模態模型，不做 OCR）
- 檢討本：把 disputed 的批改、答錯的推導集中在一頁回頭看
- 結果頁接上助教（現在只有作答畫面裡能討論）
- 章節模式與模擬面試（`createSession` 已經支援 `kind` 與 `chapterId`，只是還沒有入口）
- 設定頁（面試日期、每日題數目前要直接改 `settings` 表）
