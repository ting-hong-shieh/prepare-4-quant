# English side for the 14 seeded problems, keyed by the Chinese title.
EN = {}

EN["三隻螞蟻 · 三角形"] = dict(
    title_en="Three ants on a triangle",
    hints_en=["Count the total number of ways they can move.",
              "What has to be true for no two of them to meet?"],
    solution_en=r"""Each ant picks one of 2 directions, so there are $2^3 = 8$ equally likely outcomes.

No collision happens only when all three go **clockwise** or all three go **counter-clockwise** — if even one ant turns the other way, it meets someone head-on along an edge.

$$P = \frac{2}{8} = \frac{1}{4}$$""")

EN["兩顆蛋 · 一百層樓"] = dict(
    title_en="Two eggs, 100 floors",
    hints_en=["The first egg does the coarse search; the second can only go up one floor at a time.",
              "Make each coarse jump leave one fewer floor to search linearly."],
    solution_en=r"""Say the first egg is dropped from floor $n$. If it breaks, the second egg has to try floors $1$ through $n-1$ one at a time — $n$ drops in total.

If it survives, the next jump is $n-1$ floors, since one drop of the budget is already spent. Continuing this way, the floors covered are

$$n + (n-1) + \cdots + 1 = \frac{n(n+1)}{2} \ge 100$$

$n = 13$ gives 91, not enough; $n = 14$ gives 105. So **14 drops worst case**, starting from floor 14.""")

EN["燒繩子 · 四十五分鐘"] = dict(
    title_en="Two ropes, 45 minutes",
    hints_en=["What happens if you light a rope from both ends at once?"],
    solution_en=r"""Lighting a rope at **both ends** burns it in 30 minutes no matter how uneven the rate is — the two flame fronts together cover the whole length.

1. $t=0$: light rope A at both ends, rope B at one end.
2. $t=30$: rope A is gone. Rope B has 30 minutes of one-ended burning left in it.
3. Light rope B's other end immediately → what remains burns in 15 minutes.

$30 + 15 = 45$ minutes.""")

EN["高斯積分 · 極座標"] = dict(
    title_en="The Gaussian integral",
    hints_en=["There is no elementary antiderivative — don't try to integrate directly.",
              "Consider $I^2$ and write it as a double integral."],
    solution_en=r"""Let $I = \int_{-\infty}^{\infty} e^{-x^2}dx$. Then

$$I^2 = \int_{-\infty}^{\infty}\!\!\int_{-\infty}^{\infty} e^{-(x^2+y^2)}\,dx\,dy$$

In polar coordinates, $x^2+y^2 = r^2$ and $dx\,dy = r\,dr\,d\theta$:

$$I^2 = \int_0^{2\pi}\!\!\int_0^{\infty} e^{-r^2} r\,dr\,d\theta = 2\pi \cdot \frac{1}{2} = \pi$$

So $I = \sqrt{\pi}$.

**What the interviewer is after**: not the computation, but the move — when one variable won't work, go up a dimension.""")

EN["無窮次方塔"] = dict(
    title_en="Infinite power tower",
    hints_en=["The whole tower equals 2. What does the tower sitting in the exponent equal?"],
    solution_en=r"""The tower in the exponent is the same expression as the whole, so

$$x^{\left(x^{x^{\cdots}}\right)} = x^2 = 2 \implies x = \sqrt{2}$$

**The trap**: the same move applied to $= 4$ also gives $x = \sqrt{2}$, but at $x = \sqrt{2}$ the tower actually converges to 2, not 4 — it only converges for $x \le e^{1/e}$. Interviewers ask this waiting for you to raise convergence.""")

EN["條件機率 · 硬幣三次"] = dict(
    title_en="Three coin tosses, given at least one head",
    hints_en=["Write out the 8 outcomes before trusting your intuition.",
              "The denominator is the outcomes with at least one head, not all of them."],
    solution_en=r"""There are 8 equally likely outcomes. "At least one head" rules out TTT, leaving 7. Exactly one of those is HHH.

$$P(\text{HHH} \mid \text{at least one H}) = \frac{1/8}{7/8} = \frac{1}{7}$$

**Common mistakes**: answering $1/8$ (forgetting the condition), or $1/4$ (reading it as "a specific toss is a head", which is a different problem). Be ready to explain the difference.""")

EN["折棍子 · 幾何機率"] = dict(
    title_en="Breaking a stick into a triangle",
    hints_en=["The triangle inequality here is just: every piece must be shorter than 1/2.",
              "Plot the two break points $(x,y)$ on the unit square."],
    solution_en=r"""Let the break points be $x, y \sim U(0,1)$, independent. The pieces form a triangle $\iff$ every piece is $< 1/2$.

Take the half of the unit square where $x < y$. The pieces are $x,\; y-x,\; 1-y$, so the condition is

$$x < \tfrac12,\quad y - x < \tfrac12,\quad y > \tfrac12$$

That carves a triangle of area $1/8$ out of the $x<y$ region (area $1/2$). By symmetry the $x>y$ half contributes another $1/8$.

$$P = \tfrac18 + \tfrac18 = \tfrac14$$""")

EN["等到 HH 與 HT"] = dict(
    title_en="Waiting for HH versus HT",
    hints_en=["Set up states on what the sequence currently ends with, then write a one-step recursion.",
              "HH can overlap itself, HT cannot — that is where the difference comes from."],
    solution_en=r"""**HT**: wait for the first H (expected 2 tosses), then every toss ends it with probability $1/2$, another expected 2. $E[HT] = 2 + 2 = 4$.

**HH**: let $E_0$ be the expectation from scratch and $E_1$ the expectation with one H banked.

$$E_0 = 1 + \tfrac12 E_1 + \tfrac12 E_0,\qquad E_1 = 1 + \tfrac12 \cdot 0 + \tfrac12 E_0$$

which gives $E_0 = 6$.

**Why they differ**: failing at HH (tossing T) throws away the progress you had; failing at HT (tossing H) leaves you exactly where you were, with an H banked. That self-overlap is what Conway's leading numbers measure.""")

EN["一百個座位 · 飛機"] = dict(
    title_en="The 100 seats problem",
    hints_en=["Only two seats matter: passenger 1's and passenger 100's.",
              "Think about how the game ends."],
    solution_en=r"""The process ends in exactly one of two ways: someone sits in **passenger 1's seat** (everyone after that is seated correctly, so passenger 100 gets theirs), or someone sits in **passenger 100's seat** (they don't).

Whenever someone is forced to choose at random, those two particular seats are symmetric to them and equally likely to be picked. So whichever one is taken first is a coin flip.

$$P = \frac{1}{2}$$

The answer does not depend on the number of passengers.""")

EN["Itô 引理 · d(W²)"] = dict(
    title_en="Itô's lemma applied to $W_t^2$",
    hints_en=["Itô's lemma has a second-order term the chain rule does not.",
              "$(dW_t)^2 = dt$."],
    solution_en=r"""Apply Itô's lemma to $f(x) = x^2$:

$$df = f'(W_t)\,dW_t + \tfrac12 f''(W_t)\,(dW_t)^2 = 2W_t\,dW_t + \tfrac12 \cdot 2 \cdot dt$$

$$d(W_t^2) = 2W_t\,dW_t + dt$$

**Where the $dt$ comes from**: Brownian motion has non-zero quadratic variation, $(dW_t)^2 = dt$ rather than $O(dt^2)$. In ordinary calculus the second-order term is discarded; here it cannot be.

Check: taking expectations, $E[W_t^2] = 0 + t = t$ ✓.""")

EN["布朗運動四階矩"] = dict(
    title_en="Fourth moment of Brownian motion",
    hints_en=["$W_t \\sim N(0, t)$.", "The fourth moment of a standard normal is 3."],
    solution_en=r"""$W_t \sim N(0,t)$, so write $W_t = \sqrt{t}\,Z$ with $Z \sim N(0,1)$.

The even moments of a standard normal are $E[Z^{2n}] = (2n-1)!!$, so $E[Z^4] = 3$.

$$E[W_t^4] = t^2 E[Z^4] = 3t^2$$

Or via Itô: $d(W^4) = 4W^3 dW + 6W^2 dt$; taking expectations, $\frac{d}{dt}E[W^4] = 6E[W^2] = 6t$, which integrates to $3t^2$ ✓.""")

EN["首次擊中 · 對稱隨機漫步"] = dict(
    title_en="Hitting $a$ before $-b$",
    hints_en=["$W_t$ is a martingale — use optional stopping."],
    solution_en=r"""Let $\tau$ be the first time $W_t$ hits $a$ or $-b$, and $p = P(\text{hits } a \text{ first})$.

$W_t$ is a martingale and $\tau$ is almost surely finite, so optional stopping gives $E[W_\tau] = W_0 = 0$:

$$p \cdot a + (1-p)\cdot(-b) = 0 \implies p = \frac{b}{a+b}$$

Sanity check: the further away $a$ is, the smaller the probability of reaching it first ✓.""")

EN["Put-Call Parity"] = dict(
    title_en="Put-call parity",
    hints_en=["Build two portfolios with identical payoffs at expiry."],
    solution_en=r"""$$C - P = S - Ke^{-rT}$$

**Proof**: consider two portfolios

- A: long one call plus $Ke^{-rT}$ in cash
- B: long one put plus one unit of the underlying

At expiry both are worth $\max(S_T, K)$. Identical payoffs must have identical prices today, or there is a riskless arbitrage.

$$C + Ke^{-rT} = P + S$$

**Note**: this needs no model at all — no Black–Scholes, no assumption about volatility — only no-arbitrage and the ability to borrow and lend. Interviewers like to push on exactly that point.""")

EN["找出缺少的數"] = dict(
    title_en="Find the missing number",
    hints_en=["The total sum is known.", "With two missing you need a second independent equation."],
    solution_en=r"""**One missing**: $\text{missing} = \frac{n(n+1)}{2} - \sum a_i$.

**Two missing**, $x$ and $y$:

$$x + y = \frac{n(n+1)}{2} - \sum a_i, \qquad x^2 + y^2 = \frac{n(n+1)(2n+1)}{6} - \sum a_i^2$$

Solve the pair.

**More robust** (no overflow): XOR every element together with $1..n$ to get $x \oplus y$; take its lowest set bit, split the numbers into two groups by that bit, and XOR each group separately to recover $x$ and $y$.""")
