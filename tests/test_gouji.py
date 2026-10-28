# -*- coding: utf-8 -*-
"""够级引擎测试（python -m pytest，或 python tests/test_gouji.py）。"""

import random
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.cards import deck, SMALL_JOKER, BIG_JOKER  # noqa: E402,F401
from core.shed import Move, PASS  # noqa: E402,F401
from games import GouJi  # noqa: E402
from games.gouji import is_gouji_combo  # noqa: E402
from agents import RandomAgent, GreedyAgent  # noqa: E402,F401

PASSED = 0

def check(cond, name):
    global PASSED
    assert cond, f"测试失败: {name}"
    PASSED += 1
    print(f"  ✓ {name}")



def play_random(game, max_steps=3000):
    rng = random.Random(123)
    steps = 0
    while not game.done:
        game.step(rng.choice(game.legal_moves()))
        steps += 1
        assert steps < max_steps, "对局未终止"
    return steps



def find(moves, kind, **kw):
    return [m for m in moves if m.kind == kind
            and all(getattr(m, k) == v for k, v in kw.items())]



def test_gouji():
    g = GouJi(random.Random(8)).reset()
    check(all(len(h) == 36 for h in g.hands), "够级发牌 36×6")

    check(is_gouji_combo(Move("set", 10, 4, (10,) * 4)), "4 张 10 是够级牌")
    check(not is_gouji_combo(Move("set", 9, 4, (9,) * 4)), "4 张 9 不是够级牌")
    check(is_gouji_combo(Move("set", 16, 2, (16,) * 2)), "双王是够级牌")
    check(is_gouji_combo(Move("set", 15, 3, (15,) * 3)), "三个 2 是够级牌")

    g.to_beat = Move("set", 13, 4, (13,) * 4)        # 4 张 K：够级牌
    g.last_mover = 0
    check(g.can_respond(3, g.to_beat), "对头(3)可以管 0 的够级牌")
    check(not g.can_respond(1, g.to_beat) and not g.can_respond(2, g.to_beat),
          "非对头不能管够级牌")
    g.to_beat = Move("set", 9, 2, (9,) * 2)
    check(g.can_respond(1, g.to_beat), "普通牌人人可管")

    for seed in range(8):
        g = GouJi(random.Random(seed)).reset()
        play_random(g, 5000)
        total = sum(len(h) for h in g.hands) + sum(len(p) for p in g.played)
        assert total == 216, "够级牌数守恒"
        assert abs(sum(g.returns())) < 1e-9, "够级得分零和"
    check(True, "8 局随机够级：终止 + 守恒 + 零和")



def test_greedy_gouji():
    greedy = GreedyAgent()
    for seed in range(5):
        g = GouJi(random.Random(99 + seed))
        g.reset()
        steps = 0
        while not g.done:
            g.step(greedy.act(g))
            steps += 1
            assert steps < 5000, "贪心对局未终止"
    check(True, "贪心智能体可完整打完 5 局")


if __name__ == "__main__":
    for fn in [test_gouji, test_greedy_gouji]:
        print(f"\n[{fn.__name__}]")
        fn()
    print(f"\n全部通过：共 {PASSED} 项断言 ✓")
