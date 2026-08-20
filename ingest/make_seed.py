"""Generate data/seed-problems.json.

The seed bank is written from scratch rather than copied out of the book: these
are classic problems whose mathematics is public, phrased in our own words. The
scanned book feeds `ingest/extract.py` instead, and that output stays local.
"""
import json, pathlib

CHAPTERS = [
    (1, "腦筋急轉彎", "Brain Teasers"),
    (2, "微積分與線性代數", "Calculus and Linear Algebra"),
    (3, "機率", "Probability Theory"),
    (4, "隨機過程與 Itô", "Stochastic Process and Stochastic Calculus"),
    (5, "衍生品定價", "Finance"),
    (6, "演算法與數值方法", "Algorithms and Numerical Methods"),
    (7, "通則與心法", "General Principles"),
]

P = []
def add(ch, title, topic, diff, zh, en, ans, hints, sol):
    P.append(dict(chapter=ch, title=title, topic=topic, difficulty=diff,
                  statement_zh=zh, statement_en=en, answer=ans,
                  hints=hints, solution_md=sol))

add(1, "三隻螞蟻 · 三角形", "combinatorics", "easy",
    r"三隻螞蟻分別停在正三角形的三個頂點上。每隻同時開始沿著三角形的邊爬行，各自獨立、等機率地選擇左右兩個方向之一。求沒有任何兩隻螞蟻相撞的機率。",
    r"Three ants sit on the vertices of a triangle. Each independently picks one of the two edge directions at random. What is the probability that none of them collide?",
    r"1/4",
    [r"先數總共有幾種走法。", r"什麼情況下三隻完全不會碰到彼此？"],
    r"""每隻螞蟻有 2 種選擇，總共 $2^3 = 8$ 種走法。

只有在三隻**同時順時針**或**同時逆時針**時才不會相撞 —— 只要有一隻走反了，牠一定會在某條邊上迎面撞到別人。

$$P = \frac{2}{8} = \frac{1}{4}$$""")

add(1, "兩顆蛋 · 一百層樓", "optimization", "medium",
    r"你有兩顆一模一樣的蛋和一棟 100 層的樓。存在某個樓層 $k$，從 $k$ 樓以上丟下蛋會破，$k$ 樓（含）以下不會。蛋破了就不能再用。設計策略，使得**最壞情況**下的丟蛋次數最少。這個最少次數是多少？",
    r"Two identical eggs, a 100-storey building. Minimise the worst-case number of drops needed to find the critical floor.",
    r"14",
    [r"第一顆蛋用來粗掃，第二顆只能一層一層往上試。", r"讓每一次粗掃之後，剩下要線性搜尋的範圍縮小 1 層。"],
    r"""設第一顆蛋第一次從 $n$ 樓丟。若破了，第二顆必須從 1 樓試到 $n-1$ 樓，總共最多 $n$ 次。

若沒破，下一次往上跳 $n-1$ 層 —— 因為已經用掉一次，剩下的預算少了 1。依此類推，可覆蓋的樓層數是

$$n + (n-1) + \cdots + 1 = \frac{n(n+1)}{2} \ge 100$$

$n = 13$ 得 91，不夠；$n = 14$ 得 105，足夠。所以**最壞情況 14 次**，第一次從 14 樓開始丟。""")

add(1, "燒繩子 · 四十五分鐘", "construction", "easy",
    r"你有兩條繩子，每條從一端點燃後恰好燒 60 分鐘燒完，但燃燒速率不均勻（所以燒到一半不代表過了 30 分鐘）。只用這兩條繩子和打火機，如何量出 45 分鐘？",
    r"Two ropes, each burns for exactly 60 minutes but at a non-uniform rate. Measure 45 minutes.",
    r"A 兩端點燃、B 單端點燃；A 燒完（30 分）時點燃 B 的另一端，B 燒完即 45 分",
    [r"兩端同時點燃會發生什麼事？"],
    r"""**兩端同時點燃**一條繩子，不論燃速多不均勻，一定在 30 分鐘後燒完（兩個火頭走完的總長度等於全長）。

1. $t=0$：繩 A 兩端都點燃，繩 B 只點一端。
2. $t=30$：繩 A 燒完。此時繩 B 還剩下「單端再燒 30 分鐘」的量。
3. 立刻點燃繩 B 的另一端 → 剩下的量在 15 分鐘內燒完。

$30 + 15 = 45$ 分鐘。""")

add(2, "高斯積分 · 極座標", "calculus", "medium",
    r"計算 $\displaystyle\int_{-\infty}^{\infty} e^{-x^2}\,dx$。",
    r"Evaluate the Gaussian integral.",
    r"sqrt(pi)",
    [r"這個積分沒有初等原函數，別想直接積。", r"考慮 $I^2$，把它寫成二重積分。"],
    r"""令 $I = \int_{-\infty}^{\infty} e^{-x^2}dx$。則

$$I^2 = \int_{-\infty}^{\infty}\!\!\int_{-\infty}^{\infty} e^{-(x^2+y^2)}\,dx\,dy$$

換成極座標，$x^2+y^2 = r^2$、$dx\,dy = r\,dr\,d\theta$：

$$I^2 = \int_0^{2\pi}\!\!\int_0^{\infty} e^{-r^2} r\,dr\,d\theta = 2\pi \cdot \frac{1}{2} = \pi$$

所以 $I = \sqrt{\pi}$。

**面試重點**：關鍵不是計算，是「單變數不行就升到二維」這個念頭。""")

add(2, "無窮次方塔", "calculus", "easy",
    r"若 $x^{x^{x^{\cdots}}} = 2$（無窮次方塔收斂到 2），求 $x$。",
    r"Solve for x if the infinite power tower equals 2.",
    r"sqrt(2)",
    [r"整個塔等於 2，那指數上的塔等於多少？"],
    r"""指數位置上的次方塔和整體是同一個式子，所以

$$x^{\left(x^{x^{\cdots}}\right)} = x^2 = 2 \implies x = \sqrt{2}$$

**陷阱**：同樣做法對 $=4$ 也會給出 $x = \sqrt{2}$，但次方塔在 $x = \sqrt{2}$ 實際收斂到 2 而不是 4 —— 次方塔只在 $x \le e^{1/e}$ 時收斂。面試官問這題常常是在等你講出收斂條件。""")

add(3, "條件機率 · 硬幣三次", "probability", "medium",
    r"一枚公平硬幣連丟三次。已知「至少出現一次正面」，求三次都是正面的機率。",
    r"Given that at least one head appeared in three fair coin tosses, what is the probability that all three are heads?",
    r"1/7",
    [r"先把 8 種結果列出來，別急著用直覺。", r"條件機率的分母是「至少一正」的那些結果。"],
    r"""樣本空間有 8 種等機率結果。「至少一次正面」排除了 TTT，剩 7 種。其中三次全正只有 HHH 一種。

$$P(\text{HHH} \mid \text{至少一正}) = \frac{1/8}{7/8} = \frac{1}{7}$$

**常見錯誤**：答 $1/8$（忘了條件），或答 $1/4$（誤把題目讀成「指定某一次是正面」，那是另一題）。這兩題的差別要講得出來。""")

add(3, "折棍子 · 幾何機率", "probability", "medium",
    r"在一根長度為 1 的棍子上獨立、均勻地隨機取兩點折斷，得到三段。求這三段能構成三角形的機率。",
    r"Break a unit stick at two uniformly random points. Probability the three pieces form a triangle?",
    r"1/4",
    [r"三角形不等式在這裡等價於：每一段都必須小於 1/2。", r"把兩個切點 $(x,y)$ 畫在單位正方形上。"],
    r"""設兩個切點為 $x, y \sim U(0,1)$ 且獨立。三段能構成三角形 $\iff$ 每段都 $< 1/2$。

在單位正方形上，先看 $x < y$ 的那一半。三段長為 $x,\; y-x,\; 1-y$，條件為

$$x < \tfrac12,\quad y - x < \tfrac12,\quad y > \tfrac12$$

這在 $x<y$ 的三角形（面積 $1/2$）中切出一個面積 $1/8$ 的小三角形。由對稱性，$x>y$ 的那半也是 $1/8$。

$$P = \tfrac18 + \tfrac18 = \tfrac14$$""")

add(3, "等到 HH 與 HT", "probability", "hard",
    r"反覆丟一枚公平硬幣。求首次出現連續 HH 所需的期望次數，以及首次出現 HT 所需的期望次數。為什麼兩者不同？",
    r"Expected number of fair coin tosses to first see HH, and to first see HT.",
    r"HH: 6, HT: 4",
    [r"設狀態：目前結尾是什麼，列一階遞迴。", r"HH 會「自我重疊」，HT 不會 —— 這就是差別的來源。"],
    r"""**HT**：先等到第一個 H（期望 2 次），之後每次丟出 T 就結束，期望再 2 次。$E[HT] = 2 + 2 = 4$。

**HH**：令 $E_0$ 為從零開始的期望、$E_1$ 為已有一個 H 的期望。

$$E_0 = 1 + \tfrac12 E_1 + \tfrac12 E_0,\qquad E_1 = 1 + \tfrac12 \cdot 0 + \tfrac12 E_0$$

解得 $E_0 = 6$。

**為什麼不同**：HH 失敗時（丟出 T）會退回原點，浪費掉已累積的進度；HT 失敗時（丟出 H）仍停在「已有 H」的狀態，沒有損失。這個「自我重疊」的差別就是 Conway leading numbers 在講的事。""")

add(3, "一百個座位 · 飛機", "probability", "medium",
    r"100 位乘客依序登機，各自有指定座位。第一位乘客弄丟登機證，隨機挑一個位子坐。之後每位乘客若自己的位子空著就坐自己的，否則隨機挑一個空位。求最後一位乘客坐到自己位子的機率。",
    r"The 100 airline seats problem.",
    r"1/2",
    [r"只有兩個座位真正重要：第 1 位的和第 100 位的。", r"想想這場遊戲是怎麼結束的。"],
    r"""整個過程只會以兩種方式結束：某個人坐到了**第 1 位乘客的位子**（之後所有人都對號入座，第 100 位拿到自己的），或某個人坐到了**第 100 位的位子**（第 100 位拿不到）。

每當有人被迫隨機選位時，這兩個特定座位在他眼中是對稱的、被選中的機率相同。因此先被佔掉的是哪一個，機率各半。

$$P = \frac{1}{2}$$

這個答案與乘客總數無關。""")

add(4, "Itô 引理 · d(W²)", "stochastic", "easy",
    r"設 $W_t$ 為標準布朗運動。求 $d(W_t^2)$，並說明為什麼結果不是 $2W_t\,dW_t$。",
    r"Apply Ito's lemma to W_t squared.",
    r"2W_t dW_t + dt",
    [r"Itô 引理比鏈鎖律多了一項二階項。", r"$(dW_t)^2 = dt$。"],
    r"""對 $f(x) = x^2$ 用 Itô 引理：

$$df = f'(W_t)\,dW_t + \tfrac12 f''(W_t)\,(dW_t)^2 = 2W_t\,dW_t + \tfrac12 \cdot 2 \cdot dt$$

$$d(W_t^2) = 2W_t\,dW_t + dt$$

**為什麼多出 $dt$**：布朗運動的二次變差不為零，$(dW_t)^2 = dt$ 而非 $O(dt^2)$。一般微積分裡二階項可以丟掉，這裡不行。

驗證：兩邊取期望，$E[W_t^2] = 0 + t = t$ ✓。""")

add(4, "布朗運動四階矩", "stochastic", "medium",
    r"設 $W_t$ 為標準布朗運動，求 $E[W_t^4]$。",
    r"Compute the fourth moment of Brownian motion.",
    r"3t^2",
    [r"$W_t \sim N(0, t)$。", r"標準常態的四階矩是 3。"],
    r"""$W_t \sim N(0,t)$，可寫成 $W_t = \sqrt{t}\,Z$，其中 $Z \sim N(0,1)$。

標準常態的偶數階動差為 $E[Z^{2n}] = (2n-1)!!$，所以 $E[Z^4] = 3$。

$$E[W_t^4] = t^2 E[Z^4] = 3t^2$$

也可以用 Itô 做：$d(W^4) = 4W^3 dW + 6W^2 dt$，取期望得 $\frac{d}{dt}E[W^4] = 6E[W^2] = 6t$，積分得 $3t^2$ ✓。""")

add(4, "首次擊中 · 對稱隨機漫步", "stochastic", "medium",
    r"設 $W_t$ 為標準布朗運動，$a, b > 0$。求 $W_t$ 在擊中 $-b$ 之前先擊中 $a$ 的機率。",
    r"Probability Brownian motion hits a before -b.",
    r"b/(a+b)",
    [r"$W_t$ 是鞅，用選擇性抽樣定理。"],
    r"""令 $\tau$ 為首次擊中 $a$ 或 $-b$ 的時刻，$p = P(\text{先擊中 } a)$。

$W_t$ 是鞅且 $\tau$ 幾乎必然有限，由選擇性抽樣定理 $E[W_\tau] = W_0 = 0$：

$$p \cdot a + (1-p)\cdot(-b) = 0 \implies p = \frac{b}{a+b}$$

直覺檢查：$a$ 越遠（$a$ 越大）先擊中的機率越小 ✓。""")

add(5, "Put-Call Parity", "derivatives", "easy",
    r"設 $C$ 與 $P$ 分別為同一標的、同履約價 $K$、同到期日 $T$ 的歐式買權與賣權價格，標的現價 $S$，無風險利率 $r$，標的無股息。寫出兩者的關係，並用無套利論證說明。",
    r"State and prove put-call parity.",
    r"C - P = S - K e^{-rT}",
    [r"建兩個到期 payoff 相同的組合。"],
    r"""$$C - P = S - Ke^{-rT}$$

**證明**：考慮兩個組合

- 組合 A：買一口 call ＋ 持有 $Ke^{-rT}$ 現金
- 組合 B：買一口 put ＋ 持有一單位標的

到期時兩者的價值都是 $\max(S_T, K)$。既然到期 payoff 恆等，今天的價格就必須相等，否則存在無風險套利。

$$C + Ke^{-rT} = P + S$$

**注意**：這個關係不需要任何模型假設（不需要 Black–Scholes、不需要對波動率做假設），只需要無套利與可自由借貸。這點面試官很愛追問。""")

add(6, "找出缺少的數", "algorithms", "easy",
    r"一個陣列含有 $1$ 到 $n$ 之中的 $n-1$ 個相異整數，恰好缺了一個。要求 $O(n)$ 時間、$O(1)$ 額外空間找出缺少的數。若改成缺兩個呢？",
    r"Find the missing number(s) in 1..n.",
    r"n(n+1)/2 減去總和；缺兩個再加平方和，或用 XOR 分組",
    [r"總和是已知的。", r"缺兩個時需要第二個獨立的方程式。"],
    r"""**缺一個**：$\text{missing} = \frac{n(n+1)}{2} - \sum a_i$。

**缺兩個** $x, y$：

$$x + y = \frac{n(n+1)}{2} - \sum a_i, \qquad x^2 + y^2 = \frac{n(n+1)(2n+1)}{6} - \sum a_i^2$$

兩式解二元方程即可。

**更穩健的做法**（避免溢位）：把所有元素與 $1..n$ 全部 XOR，得到 $x \oplus y$；取其最低位的 1 當分組依據，把所有數字分成兩堆各自 XOR，即可分離出 $x$ 和 $y$。""")

out = pathlib.Path("data/seed-problems.json")
out.write_text(json.dumps(
    {"chapters": [dict(no=n, title_zh=z, title_en=e) for n, z, e in CHAPTERS], "problems": P},
    ensure_ascii=False, indent=2), encoding="utf-8")
print(f"wrote {out}: {len(CHAPTERS)} chapters, {len(P)} problems")
