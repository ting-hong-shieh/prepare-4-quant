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

```bash
python3 -m venv .venv && .venv/bin/pip install pymupdf google-genai pydantic
GEMINI_API_KEY=... ingest/run_all.sh
```

一路跑完：算圖 → 掃結構 → 抽題目。**兩趟都會續跑**，中斷了再執行一次會從斷點接下去，不會重複做也不會重來。

先試品質再跑整本的話：

```bash
export GEMINI_API_KEY=...
.venv/bin/python ingest/scan_index.py --pages 20-40
.venv/bin/python ingest/extract.py --limit 3
```

跟助教一樣可以換供應商：`INGEST_PROVIDER=claude` 搭配 `ANTHROPIC_API_KEY`。

### 大概多少錢

Gemini 3.7 Flash 是 $0.75 / M input、$3.75 / M output（含 thinking token，2026 年底前）。以 213 頁、每頁圖片約 1.5k token 估：pass A 約 $0.6，pass B 看抽出幾題（要等 pass A 跑完才知道），200 題上下的話約 $2.5 —— **整本大約 3 美金**。

這是估的，不是實測 —— 沒有金鑰所以我沒跑過。實際跑完看 log 就知道真正的數字。

### 為什麼分兩趟

掃描檔沒有文字層（字型數 0，全部是影像），所以只能靠視覺模型讀。與其猜「幾頁一個視窗」，不如：

- **pass A**（`scan_index.py`）每頁一次便宜的呼叫，只回報**結構** —— 章節從哪裡開始、哪些頁上有粗體的題目標題。
- **pass B**（`extract.py`）依索引算出每題橫跨哪幾頁，只送那幾頁，整題一次抽完。

代價是多一趟呼叫，換到的是「解答不會被切一半」。

### 圖怎麼辦

有些題目沒有圖就看不懂（例如兩圓柱交集那題的 Figure 3.1）。LaTeX 帶不了圖，所以不重畫，直接把書上的圖從掃描頁裁下來掛在題目上：

```bash
ingest/crop_figure.py --page 55 --box 0.02,0.05,0.50,0.375 \
  --caption "Figure 3.1 Interaction of two cylinders" --problem 16
```

`--box` 是 `左,上,右,下`，用頁面比例（0–1）表示，所以不用知道像素尺寸。圖存在 `data/figures/`（一樣不進版控），透過 `/api/figure/[name]` 送出，作答畫面就在題目底下顯示。

書裡有圖的頁面不多 —— 用「整頁有沒有長直線」掃過 213 頁只找到 3 頁候選，線條稀疏的圖可能漏掉，實際上是靠圖說明（`Figure N.M`）判斷。

### 手動轉錄

不透過 API、直接看著掃描頁轉錄的題目，用同一個入口寫進題庫：

```bash
ingest/add_problem.py problems.json
```

跟 `extract.py` 一樣是 `source='ingest'`、`verified=0` —— 誰轉錄的都一樣要校對。

### 抽完一定要校對

數學式辨識大約 90–95% 準，也就是每十頁就有一個下標是錯的 —— 而錯的下標會讓你把錯的東西練熟。所以抽出來的題目一律 `verified = 0`。

校對有兩條路：

- **邊刷邊校**（預設）—— 未校對的題目照樣會排進題組，但作答畫面會標「未校對」，答完之後可以一鍵展開原書頁對照，確認沒問題就按一下標記完成。校對變成刷題的副產品，而不是另一件要另外找時間做的雜事。
- **集中校對** —— `/review` 校對台，左邊掃描頁、右邊可編輯欄位加即時渲染，適合要**修**內容而不只是確認的時候。

未校對的題目不會被擋在題庫外：擋掉的話這個工具在整本校對完之前都不能用，而那不會發生。

## 語言

**一個畫面只有一種語言**，預設英文。首頁右上角 `EN / 中` 切換，設定存在資料庫裡 —— 所以伺服器上的助教會用你螢幕上正在看的那個語言回你。

書本身是英文的，所以**英文是來源、中文是翻譯**，不是反過來。`problems` 表兩邊都存：`statement_en` / `solution_en` / `hints_en` 是書的原文，`statement_zh` / `solution_md` / `hints` 是譯文。哪一邊缺就退回另一邊，但畫面上永遠只出現一種。

語言在**伺服器端**就切好才送到瀏覽器 —— 不是送兩份讓前端挑。12 題的另一種語言（含解答）沒有理由出現在 client payload 裡。

校對台是例外，那裡兩邊並排，因為那正是要比對原文與譯文的地方。

## 助教（LLM 討論）

作答畫面右上角的「助教」開啟討論面板，答案欄下方的「寫推導」把完整過程交給它批改。

預設走 **Gemini 3.7 Flash**：

```bash
export GEMINI_API_KEY=...         # 或 .env.local
npm run build && npm start
```

討論用 `thinking_level: low`（助教想十秒才問一句話就不是對話了），批改用 `high`（批改錯得有自信的代價最高）。

換供應商只要一個環境變數 —— `lib/providers/` 底下兩個實作共用同一個介面：

```bash
LLM_PROVIDER=claude ANTHROPIC_API_KEY=... npm start
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

## 備份

題庫刻意不進版控 —— 那是書的內容，而 repo 是公開的。代價是它**沒有任何備份**，而轉錄是這個專案裡最貴、最難重做的東西。

```bash
npm run backup                 # → ./backups/
npm run backup -- /mnt/e/bak   # 或放到別的地方
```

用 `VACUUM INTO` 而不是直接複製檔案，所以 server 開著跑也拿得到一致的快照。備份內容包含書的內容，**不要放進公開 repo 或公開雲端**。

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
