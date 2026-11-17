# 英語單字守城遊戲網站 — PRD

版本：v1.0（魔王蓄力動畫／必殺一擊演出已完成並push上線；PWA安裝修復已完成上線；UI三項調整(等級選單長條化/Unit列表比照原站一列一個/難度選擇後直接開始)已完成並上線；PET步驟8人工審核仍待辦）
日期：2026-11-16（第十一次更新：魔王蓄力/必殺演出 commit `4ce706a`，已push上線）
參考範本：https://lexilereadingrex.github.io （下稱「原站」）

---

## 0. 目前實作進度摘要（最新，供下個session快速掌握狀態）

- **網站已正式部署上線**：https://nabeko.github.io/english-vocabulary/ （repo：https://github.com/Nabeko/english-vocabulary ，public）。push用token存於 `/home/sw/.hermes/credentials/github_english_vocabulary.yaml`，之後程式碼更新只需說「幫我push」即可同步（細節見 `memo.md`「已部署上線」章節）。
- 五級單字資料檔已建立結構（`w`/`unit`/`unitName`已全部填完）：pre-A1(495)、A1(398)、A2(508)、KET(1694)、PET(2488)，合計5,583字。（數字變動原因：資料品質清理，詳見下方「使用者試玩回報與修正」）
- **todo 3（AI生成 ipa/pos/zh/ex/exZh）進度**：
  - pre-A1（495字）：✅ 全部完成
  - A1（398字）：✅ 全部完成
  - A2（508字）：✅ 全部完成
  - KET（1694字）：✅ 全部完成（已清除1筆雜訊詞條）
  - PET（2488字）：✅ 全部完成（2026-11-16，commit `7d81f40`），已串接進遊戲前端（commit `ad44c07`），待人工審核（詳見 `memo.md`「PET擴充」checklist步驟8）
- **todo 4（守城戰鬥引擎）**：✅ 玩法邏輯完成並測試通過（城牆耐久/連擊/三種怪物+魔王/三種題型/星級結算）。
- **守城戰鬥美術**：已完成移植原站canvas手繪美術（城堡/弓箭手/4種怪物/背景漸層），`js/battle-art.js`，已通過瀏覽器實測驗證。**場景已擴充為forest/ocean/space/autumn四款，每次進入戰鬥隨機配置（§8.4已結案）**。
- **魔王蓄力動畫＋必殺一擊演出**（2026-11-16新增）：✅ 已完成並上線（commit `4ce706a`）。移植自原站概念（非照搬），純canvas粒子特效：連續答對3次後觸發0.75秒集氣演出（金色光點飛向弓箭手、畫面漸暗、光環收縮聚氣），接著發射放大版必殺巨箭，命中魔王觸發爆炸震屏+五彩碎紙慶祝。詳見 `memo.md` 對應章節。
- **難度分級系統**：✅ 已完成並驗證，並依使用者試玩回饋已調降一級手感（詳見下方）。獨立三檔（簡單/適中/困難），不與CEFR等級綁定，守城前跳難度選單並顯示各難度歷史最高星級。
- **星級紀錄機制**：✅ 已完成並驗證。按「等級:Unit:難度」三維度獨立記錄，只升不降，優先序困難>適中>簡單。
- **Unit列表橫列式排版**：✅ 已完成並驗證，星級顯示於最右側。
- **攻城音效+城門震動+裂痕視覺回饋**：✅ 已完成並驗證。Web Audio API合成音效（無外部素材）、canvas transform隨機偏移做震動、`drawCrack`依損傷比例動態繪製裂痕。
- 以上所有功能的程式碼與五級單字資料（pre-A1/A1/A2/KET/PET，合計5,583字）均已包含在目前GitHub上的線上版本中（git working tree為clean狀態，無待push變更）。
- **PWA安裝支援**（2026-11-16新增）：✅ 已完成並上線（commit `22b2936`）。新增 `manifest.json`、最小化pass-through `sw.js`（不做離線快取，避免更新後卡舊版本）、5個CJK字型生成的icon，解決手機Chrome無法安裝為桌面捷徑的問題。待使用者實機確認安裝流程。
- **UI三項調整**（2026-11-16新增，比照對照站 lexilereadingrex.github.io 視覺風格）：✅ 已完成並上線（commit `32e5f5b`/`30fdb66`）。
  1. 選擇等級畫面改為長條按鈕列（`.level-row`）。
  2. Unit列表改為一列一個、含守城+預習單字雙按鈕的卡片格式（`.ucard`），修正過程中曾誤用CSS grid造成「兩個Unit並排」bug，已修正為 `grid-template-columns:1fr`。
  3. 難度選擇畫面移除「開始守城」確認按鈕，點選難度後直接進入戰鬥。

### 使用者試玩回報與修正（2026-11-15）
使用者開始實際試玩後陸續回報問題，均已修正並push：
1. KET Unit13「內容待補」→ 根因是雜訊詞條 `(adv)` 混入資料，已刪除（1695→1694字）。
2. pre-A1 `Mr/Mrs/mum` 等斜線合併詞條意義混雜、單複數特殊字（child/children等）未拆分 → 已拆成獨立詞條並標註單複數（pre-A1 487→495，A1 397→399）。**拼寫變體/縮寫類使用者確認不需拆**。
3. A1 `city/town centre` 與 `town/city centre` 重複 → 刪除後者（399→398）。
4. 整體難度偏難 → 三檔難度參數（速度/補怪間隔/特殊怪機率）均已調降一級。
5. Unit場景主題分配（原§8.4待討論）→ 使用者拍板採「隨機配」，已新增ocean/space/autumn三款場景並實作隨機配置邏輯，**§8.4已結案**。
6. htu.json 160個衝突headword抽查 → 155筆分類合理，5筆（bill/miss/well/dr/holiday）分類邏輯合理或更優，**結論無需修改，此項已結案**。

- **下一步最優先待辦**：持續等待使用者回報新難度/新場景調整後的試玩心得（含KET大量資料下效能/UX是否正常）。
- 詳細操作方式、暫存檔案、撇號處理注意事項見 `memo.md`（該檔不納入commit，僅供session間交接）。

---

## 1. 背景與目標

打造一個跟「藍思閱讀單字王」玩法相同的英語單字學習網站：玩家答對單字題，弓箭手就會擊退來襲的怪物，守住城堡。

與原站最大差異：**單字庫改用劍橋 YLE / KET / PET 官方分級**，並以 **CEFR 等級為最上層分類**（而非原站的「週次／Lexile 高頻」）。

等級對應：

| CEFR 等級 | 對應劍橋考試 | 官方 Word List 來源 |
|---|---|---|
| pre-A1 | Starters | yle.tw/download/wordlist/Starters.pdf |
| A1 | Movers | yle.tw/download/wordlist/Movers.pdf |
| A2 | Flyers | yle.tw/download/wordlist/Flyers.pdf |
| A2–B1 | KET for Schools | yle.tw/download/wordlist/506886-a2-key-2020-vocabulary-list.pdf |
| B1–B2 | PET for Schools | yle.tw/download/wordlist/506887-b1-preliminary-vocabulary-list.pdf |

官方 Word List 僅提供「英文單字＋詞性（偶有簡短英文釋義）」，**不含中文翻譯與例句**。這部分由 AI 批次生成（中文翻譯＋例句＋例句中譯），之後由使用者（老師／管理者）人工審核修正。

---

## 2. 與原站的對應關係（沿用 / 修改）

| 項目 | 原站做法 | 本專案做法 |
|---|---|---|
| 最上層分類 | 每週講義(第1-4週) / 高頻單字(250L-600L) 兩個分頁 | **以 CEFR 等級為分頁**：pre-A1 / A1 / A2 / B1 / B2（共 5 個分頁） |
| 第二層分類 | 週次 → Unit 主題 | 等級 → Unit（依官方 wordlist 原順序切分，每 Unit 約 20 字，比照原站） |
| 關卡切分 | 每 Unit 20 字，分「第1–10進階」「第11–20挑戰」兩關 | 沿用：每 Unit 20 字，分兩關 |
| 小考模擬 | 本週 60 字隨機抽 20 字 | 沿用概念：本等級所有已學單字隨機抽 20 字 |
| 玩法 | 守城塔防：城堡+弓箭手+怪物沿路走來，答對=攻擊，答錯=怪物逼近 | **原封不動複製**（含美術分場景 forest/ocean/space/autumn 等、音效、charge機制、BOSS機制） |
| 題型 | 英譯中選擇、中譯英選擇、例句填空 | 沿用全部題型 |
| 錯題本 | 答錯自動收錄，可重練，顯示次數 | 沿用 |
| 進度保存 | localStorage（單機、無登入） | **MVP 沿用 localStorage**；保留未來升級帳號登入+雲端同步的擴充空間（見第 7 節） |
| 技術形態 | 純靜態單一 HTML，資料寫死在 `<script>` 裡的 JS 陣列 | **資料改放獨立 JSON/JS 檔**（`data/words/*.js`），頁面邏輯另建 JS 檔，模組化以利維護（見第 5 節） |
| 部署 | GitHub Pages | 沿用 GitHub Pages |
| 預習功能 | 「預習這 20 個字」可先看單字表 | 沿用 |
| 發音 | 文字轉語音朗讀按鈕 | 沿用（Web Speech API 或原站同款方案） |

---

## 3. 使用者與使用情境

- 主要使用者：國高中生／國小高年級學生，自學或配合老師指派進度練習單字。
- 次要使用者：老師／家長（管理單字內容、指派進度、不一定需要帳號系統）。
- 使用情境：手機、平板、電腦瀏覽器皆可直接開啟網址遊玩，不需註冊、不需安裝。

---

## 4. 功能需求

### 4.1 首頁 / 分級選單
- 頂部五個分級按鈕：pre-A1、A1、A2、A2–B1(KET)、B1–B2(PET)（顯示中英對照，比照原站「高頻單字 250L–600L」的呈現方式，掛上考試名稱副標）。
- 選定等級後，顯示該等級所有 Unit 卡片列表（結構同原站 article/stage 卡片：場景插畫、Unit 標題中英、單字數、兩關卡進度星星、守城按鈕 x2、預習按鈕）。
- 等級清單最後顯示「小考模擬」卡片（本等級全部字庫隨機抽 20 字）。

### 4.2 守城遊戲（戰鬥畫面）
- 完全沿用原站機制：
  - Canvas 戰場動畫：城堡、弓箭手、怪物沿路徑行走。
  - 題目板：單字朗讀／中文提示／例句填空，四選一。
  - 答對：弓箭手攻擊，怪物後退/死亡；答錯：怪物前進，累積到城堡則扣血。
  - BOSS 機制（蓄力制）、音效、combo。
  - 結算畫面：星級評分（☆☆☆）、統計（答對數/平均時間等，比照原站 `.stats` 區塊）。

### 4.3 預習模式
- 純列表瀏覽單字卡：英文、IPA、詞性、中文、例句、例句中譯、發音按鈕，不計分。

### 4.4 小考模擬
- 從該等級所有已開放 Unit 的單字庫隨機抽 20 字，速度加快版關卡（比照原站敘述「走得比較快」）。

### 4.5 錯題本
- 任何關卡答錯的字自動加入，顯示在獨立清單，可針對錯題重新挑戰。
- 清空／移除個別錯題功能。

### 4.6 玩法說明 / 相關資訊頁
- 沿用原站兩個靜態說明彈窗（Modal）。

### 4.7 內容管理（資料維護）— MVP 做法
- 單字資料以 JSON/JS 檔管理，放在 repo `data/words/{level}.js`，每個等級一個檔案，內容結構沿用原站欄位：
  ```js
  { w, ipa, pos, zh, ex, exZh }
  ```
- 新增/修改單字：直接編輯對應等級檔案、`git commit && push`，GitHub Pages 自動重新部署（約1分鐘內生效）。
- **不做即時後台（因 GitHub Pages 僅支援純靜態檔案，無法接收寫入請求）**。

---

## 5. 技術架構

- **部署方式**：GitHub Pages（純靜態）。**已正式部署上線**：repo `https://github.com/Nabeko/english-vocabulary`（public），網址 `https://nabeko.github.io/english-vocabulary/`。已確認加入前端簡易密碼鎖（見第8.6節），部署後仍是公開可存取網址，但一般訪客需輸入密碼才能看到內容。程式碼更新流程：本機修改 → commit → 用 `/home/sw/.hermes/credentials/github_english_vocabulary.yaml` 內的 fine-grained token push → GitHub Pages 約1分鐘內自動重新建置生效，無需手動觸發。
- **技術架構：已確認採用模組化方案**，檔案結構如下（相較原站的單一HTML檔的調整）：
  ```
  /index.html              -- 版面骨架、掛載點
  /styles.css              -- 樣式（可先沿用原站 CSS 變數與排版）
  /js/app.js                -- 主程式邏輯（渲染、狀態機、遊戲引擎）
  /js/game-engine.js         -- 守城戰鬥引擎（canvas 繪製、碰撞、題目出題邏輯）
  /data/levels.js            -- 等級清單定義（pre-A1~B2 的 meta：id、名稱、對應考試、Unit 列表指標）
  /data/words/preA1.js       -- pre-A1 (Starters) 單字資料
  /data/words/a1.js          -- A1 (Movers)
  /data/words/a2.js          -- A2 (Flyers)
  /data/words/ket.js         -- A2-B1 (KET)
  /data/words/pet.js         -- B1-B2 (PET)
  /assets/...                -- 插畫、音效（比照原站風格）
  /docs/PRD.md
  /docs/data_pipeline.md     -- 單字資料產製流程紀錄
  ```
- **為何拆成多檔而非原站單一 HTML**：原站 160KB 全部塞一個檔案，維護單字時容易誤改到程式邏輯；拆開後，之後要人工審核/修改單字只需碰 `data/words/*.js`，不動程式碼，降低出錯風險。
- **狀態保存**：`localStorage`，key 設計沿用原站模式（例如 `vocab_keep_w_v1`），但 key 前綴改為本專案命名避免衝突。
- **未使用框架**：沿用原站做法，Vanilla JS + Canvas，不引入 React/Vue 等框架，維持零建置（no build step）或最小建置（可選 Vite 僅用於本地開發預覽，正式部署仍是純靜態檔）。

---

## 6. 單字資料產製流程（pre-A1 ~ B2）

1. 下載五份官方 PDF（Starters / Movers / Flyers / KET / PET word list）。
2. 解析 PDF 文字，取出單字＋詞性（官方格式差異需個別處理：YLE 三份為兒童分級圖解詞彙，KET/PET 為正式考試詞彙表，格式不同）。
3. 依官方原始分類（如字母序或主題分類）切分為每 Unit 20 字。
4. 由 AI 為每個單字生成：IPA 音標、中文翻譯、一句例句（符合該等級難度的簡單句）、例句中譯。
5. 輸出成 `data/words/{level}.js`，結構同第 4.7 節。
6. **人工審核**：使用者逐級審核 AI 產出內容（翻譯準確度、例句難度是否符合等級、例句是否包含目標單字原形），修正後才正式上線。
7. 審核紀錄與版本控管：直接透過 git commit history 追蹤每次修改。

---

## 7. 未來擴充（本版不開發，先列需求備查）

- 帳號登入 + 雲端同步進度（取代/輔助 localStorage），需額外後端或第三方服務（如 Firebase / Supabase）。
- 內容管理後台（網頁表單編輯單字，送出後自動 commit 回 repo，可用 GitHub API 搭配一個小後端或 GitHub App 實現，不再是純 GitHub Pages）。
- 老師指派進度／班級管理功能。
- 更多等級／更多單字來源（如 TOEIC、全民英檢）。

---

## 8. 待確認事項（已討論並決議的部分見下，其餘持續追蹤）

### 8.1 Unit 主題分類方式 — 已決議（含 KET 分類依據更新）
**不沿用官方 wordlist 原始分類（字母序 / YLE 圖解主題），改為跨五個等級統一的主題式 Unit 結構**，比照原站風格（如 Animals & Pets / Friends, Family & Growing Up / High-Frequency Words）。

**重大發現：KET (A2 Key) 官方 PDF 內附 Appendix 2「Topic Lists」**，是劍橋官方自己整理的主題分類，比自行用關鍵字或語意猜測準確可靠得多。經檢視，官方 Topic List 包含以下 22 個主題：
Appliances（家電）、Clothes and Accessories（服裝配件）、Colours（顏色）、
Communication and Technology（通訊科技）、Documents and Texts（文件文本）、
Education（教育）、Entertainment and Media（娛樂媒體）、Family and Friends（家庭朋友）、
Food and Drink（飲食）、Health, Medicine and Exercise（健康醫療運動）、
Hobbies and Leisure（嗜好休閒）、House and Home（居家）、Measurements（度量衡）、
Personal Feelings, Opinions and Experiences（個人感受意見）、
Places: Buildings / Countryside / Town and City（地點：建築／鄉村／城鎮）、
Services（服務）、Shopping（購物）、Sport（運動）、The Natural World（自然世界）、
Time（時間）、Travel and Transport（交通旅行）、Weather（天氣）、Work and Jobs（工作職業）。

**決議：以此官方 22 類為基礎，合併精簡成跨四個等級（pre-A1/A1/A2/KET）統一使用的 10～12 個 Unit 主題**（例如 Appliances 併入 House and Home、Documents and Texts 併入 School and Learning、Services/Shopping 合併、Places 三類合併為 Travel & Places 等），取代原本自行推測的 10 主題草案。pre-A1/A1/A2（YLE 三級）字數少，用同一套主題去對應分類，字數不足的主題允許合併或留空。

做法：
- 以官方 KET Topic List 合併後的主題清單為準，反推 pre-A1/A1/A2 各字歸類到對應主題（YLE 三級字量小，分類相對單純）。
- 每個等級的單字依語意分類到對應主題 Unit；同一主題在不同等級都會出現（例如 Food and Drink 在 pre-A1 放水果/麵包等基礎字，在 KET 放 recipe/ingredient 等進階字），達成「同主題、難度隨等級遞增」的效果。
- 每 Unit 字數仍以約 20 字為原則，字數不足的等級／主題允許較少字數，不足以切出完整 Unit 的字詞先併入「雜項／High-Frequency」Unit。
- High-Frequency / Core Words 單獨成一個大分類（對應官方詞性為 det/prep/pron/conj/auxiliary 等功能詞，以及招呼語），因 pre-A1 這類字佔比極高（約130/300字），KET 也有大量片語動詞和功能詞落在此類，屬預期之內，不視為分類失敗。
- 此分類工作屬於內容產製 pipeline 的一環（先用官方 Topic List 做基礎框架 + AI 輔助分類 + 人工審核），非程式開發範圍，記錄於第 6 節資料產製流程。

### 8.2 各等級單字總量與 MVP 範圍 — 已更新（PET已完成擴充，2026-11-16）

| 等級 | 對應考試 | 實際字數 | 範圍 |
|---|---|---|---|
| pre-A1 | Starters | 495 字 | ✅ 全量收錄，已上線 |
| A1 | Movers | 398 字 | ✅ 全量收錄，已上線 |
| A2 | Flyers | 508 字 | ✅ 全量收錄，已上線 |
| A2–B1 | KET | 1,694 字（含片語動詞） | ✅ 全量收錄，已上線 |
| B1–B2 | PET | 2,488 字（含片語動詞） | ✅ 全量收錄，已上線（2026-11-16），待人工審核（見 `memo.md`） |

**決議（已完成）：MVP 四個等級（pre-A1~KET）上線穩定後，PET 擴充已評估並執行完成。五個等級全部全量收錄，不篩選。**

五級總字數 5,583 字（495+398+508+1,694+2,488），規模合理，Unit 數量隨各等級字數自然增減（PET 的 Unit13 High-Frequency 單一Unit就有634字，為目前最大單一Unit）。

### 8.3 美術風格 — 已決議（MVP，2026-11-14 更新：由簡化版改為直接移植原站美術）
**沿用原站的原創奇幻生物／繪本風格美術**（城堡、弓箭手、怪物、場景），不更換成第三方商業角色（例如使用者曾考慮的「魔物獵人」角色）。

原因：魔物獵人角色與怪物設計屬於 Capcom 的商業智慧財產權，若直接套用在要公開部署於 github.io 的網站上，有侵權風險（尤其若之後大量推廣給學校/老師使用，曝光度越高風險越高）。若使用者未來仍想要「魔物獵人風格」的視覺效果，可行方案留待日後評估：
  - (a) 委託/AI 生成「致敬魔物獵人美術風格」但非原角色設計的原創怪物（風格相似、非同一隻怪物同一個設計），侵權風險較低；
  - (b) 僅限私人本機使用、不公開部署的版本才使用魔物獵人圖像；
  - (c) 維持原站原創奇幻生物風格（本版本採用此方案）。

**2026-11-14 更新**：實作初期（todo 4）先用簡化幾何圖形（canvas圓形+文字標籤）代表怪物/城堡，上線測試後使用者反饋「有點醜」，詢問能否直接用原站美術。已確認原站美術本身即為純canvas程式碼繪製（無外部圖片素材），不涉及額外版權問題（與8.3節原本的決議方向一致，僅是從「簡化版」升級為「原站同等精緻度」），故已將原站約350行canvas繪製邏輯（城堡/背景漸層/紙紋理/弓箭手/4種怪物/走路動畫/受擊特效）整段移植進 `js/battle-art.js`，取代簡化圓形畫法。詳見 `memo.md`「守城戰鬥美術移植」章節。

### 8.4 Unit 場景主題分配 — ✅ 已決議並實作（2026-11-15）
原站做法：每個 Unit 卡片會依主題帶入不同場景插畫（例如 forest／ocean／space／autumn），目的是增加畫面多樣性，避免每個 Unit 看起來一樣；場景與單字主題沒有嚴格的一對一規則。

**決議：採「隨機配」方案**（非固定對應、非輪替規則）——每次進入守城戰鬥時，從可用場景清單中隨機抽一個，同一個Unit重玩也可能換到不同場景，增加畫面變化感。

已實作：`js/battle-art.js` 的 `THEMES` 新增 `ocean`（海洋藍綠）/`space`（太空深紫）/`autumn`（秋天橘棕）三款配色，連同原本的 `forest` 共四種。`js/game-engine.js` 的 `start()` 改為 `Object.keys(Art.THEMES)` 隨機抽一個場景並取代原本寫死的 `Art.makeBg('forest')`，所有 `Art.T` 寫死forest的呼叫（drawFlag/drawCrack/drawArcher/drawEnemy）改用區域變數 `T`。commit `342f213`，已push上線。**此項已結案**。

### 8.5 其餘未決事項
- [ ] 美術資源實際產製方式：原站插畫風格是否有原始素材可沿用／重繪，或需要全新委託/AI生成。
- [ ] PET 等級何時啟動擴充評估（見第 7 節）。

### 8.6 存取限制：前端簡易密碼鎖 — 已決議（2026-11-15更新：目前暫時關閉）

**目前狀態：密碼鎖已暫時關閉**（使用者要求，2026-11-15）。`js/auth.js` 新增 `const ENABLED = false;` 開關，`EVAuth.init()` 改為 `if(!ENABLED || isUnlocked())` 時直接放行不顯示密碼框。密碼常數 `PASSWORD='2004522'` 本身保留未刪除，若要恢復只需把 `ENABLED` 改回 `true` 再 commit push，不需改動其他邏輯。commit `5e70d3b`。

使用者要求部署到 GitHub Pages 但希望只有自己能看。討論後確認：GitHub Pages 本身是公開靜態網站，除非使用 GitHub Enterprise Cloud，否則無法做到「僅限特定人可見」；即使 repo 設為 private，Pages 輸出的網址內容仍對外公開（只是沒有公開入口連結）。

**決議：加入前端簡易密碼鎖**，明確告知使用者這是「純防君子、非真安全機制」的方案（看原始碼或開發者工具即可繞過），但可擋掉隨意逛到連結的訪客。

做法：
- 進站先顯示密碼輸入畫面，蓋住主內容（`html.locked` class 隱藏除密碼框外的所有元素）。
- 密碼寫死在 `js/auth.js` 的 `PASSWORD` 常數（目前為 `2004522`，使用者提供）。
- 驗證成功後寫入 `localStorage`（key: `ev_auth_v1`），下次開啟免再輸入。
- 已用瀏覽器實測：輸入密碼解鎖 → 重新整理頁面 → 不再跳密碼框，直接顯示內容。
- 若未來密碼外流或想更換，直接修改 `js/auth.js` 的 `PASSWORD` 常數即可，不影響其他程式邏輯。
- 已知限制（明確告知使用者過）：純前端驗證不是真正的存取控制，任何人打開瀏覽器開發者工具查看原始碼都能看到密碼或繞過檢查。若未來需要真正的存取控制，需改用有後端的方案（如 Cloudflare Pages / Netlify 的密碼保護功能，或自建簡易伺服器驗證）。

---

## 9. 驗收標準（MVP）

1. 開啟網站首頁可見 5 個 CEFR 等級入口，資料來源可對應到官方 word list。
2. 任一等級可進入至少 1 個 Unit，完整跑完「守城」兩關 + 小考模擬，題型含英譯中/中譯英/例句填空三種。
3. 答錯單字自動進錯題本，可重新挑戰。
4. 手機、平板、桌機瀏覽器開啟皆正常顯示與操作（RWD）。
5. 進度（星級、錯題本）重新整理頁面後仍保留（localStorage）。
6. 全站可透過 GitHub Pages 正常部署存取。
