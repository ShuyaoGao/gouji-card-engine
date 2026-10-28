# -*- coding: utf-8 -*-
"""够级：6 人 4 副牌（216 张），隔位三人一伙，核心机制"够级牌只有对头能管"。

实现的标准核心规则（民间变体极多，取舍见 README）：
  - 每人 36 张；0/2/4 vs 1/3/5 两队；对头 = 对面玩家 (seat+3)%6
  - 牌型：N 张同点；同张数比点数；大王>小王>2>A>K>…>3
  - 够级牌（GOUJI_RULE 可调，默认）：
      点数全部 ≥10 且张数 ≥4，或 ≥3 张 2，或 ≥2 张王
  - 出"够级牌"后只有出牌者的对头有权管牌（其余人强制过）；
    对头已出完则解除限制（放行，简化"闷/烧"体系）
  - 打到只剩一人结束，名次 0~5（头科…大落）；队伍名次和小者胜，胜方各 +1
"""

from collections import Counter

from core.cards import deck, rank_counter, MultiHot, onehot, SMALL_JOKER
from core.shed import ShedGame, Move


def is_gouji_combo(move):
    """默认够级牌判定（可按地方规则调整）。"""
    if move.is_pass:
        return False
    n, lo = len(move.ranks), min(move.ranks)
    if lo >= 16 and n >= 2:        # 双王及以上
        return True
    if lo >= 15 and n >= 3:        # 三个 2 及以上
        return True
    return lo >= 10 and n >= 4     # 4 张 10 以上


class GouJi(ShedGame):
    N = 6
    NAME = "gouji"
    TITLE = "够级"
    TEAM_DESC = "隔位三人一伙（0/2/4 vs 1/3/5）"
    ENC = MultiHot(range(3, 16), 16, 4)

    def deal(self):
        cards = deck(4)
        self.rng.shuffle(cards)
        self.hands = [sorted(cards[i * 36:(i + 1) * 36]) for i in range(6)]

    def first_seat(self):
        return self.rng.randrange(6)

    def opposite(self, seat):
        return (seat + 3) % 6

    def position(self, seat):
        return "even" if seat % 2 == 0 else "odd"

    def teams(self):
        return [s % 2 for s in range(6)]

    def gen_moves(self, seat, to_beat):
        cnt = rank_counter(self.hands[seat])
        moves = []
        for r in sorted(cnt):
            for n in range(1, cnt[r] + 1):
                moves.append(Move("set", r, n, (r,) * n))
        return moves

    def beats(self, m, last):
        return m.length == last.length and m.main > last.main

    def can_respond(self, seat, last):
        if not is_gouji_combo(last):
            return True
        opp = self.opposite(self.last_mover)
        if opp in self.finished:               # 对头已走科 → 放行
            return True
        return seat == opp

    def is_over(self):
        return len(self.finished) >= 5

    def settle(self):
        pos = {s: i for i, s in enumerate(self.finished)}
        even = sum(pos[s] for s in range(0, 6, 2))
        odd = sum(pos[s] for s in range(1, 6, 2))
        even_win = even < odd
        for s in range(6):
            win = (s % 2 == 0) == even_win
            self.returns_[s] = 1 if win else -1
        self.winner_team = "even" if even_win else "odd"

    # ---------------- RL 编码 ----------------
    def encode_state(self, seat):
        E = self.ENC
        feats = []
        feats += E.encode(self.hands[seat])
        unseen = Counter(r for r, _ in deck(4))
        unseen.subtract(rank_counter(self.hands[seat]))
        for p in self.played:
            unseen.subtract(rank_counter(p))
        feats += E.encode(list((+unseen).elements()))
        feats += E.encode(list(self.to_beat.ranks) if self.to_beat else [])
        for d in range(1, 6):
            a = self.last_action[(seat + d) % 6]
            feats += E.encode(list(a.ranks) if not a.is_pass else [])
        for d in range(1, 6):
            feats += onehot(min(len(self.hands[(seat + d) % 6]), 39), 40)
        gj = self.to_beat is not None and is_gouji_combo(self.to_beat)
        feats += [1.0 if gj else 0.0,
                  1.0 if gj and self.opposite(self.last_mover) == seat else 0.0]
        return feats

    @classmethod
    def encode_action(cls, move):
        return cls.ENC.encode([] if move.is_pass else list(move.ranks))

    def positions_list(self):
        return ["even", "odd"]
