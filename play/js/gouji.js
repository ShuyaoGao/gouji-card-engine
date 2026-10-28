/* 够级引擎，移植自 games/gouji.py：6 人 4 副牌 216 张，隔位三人一伙（0/2/4 vs 1/3/5），对头 = (seat+3)%6。
 *   每人 36 张；牌型：N 张同点，同张数比点数；大王 > 小王 > 2 > A > … > 3。
 *   够级牌（默认判定）：点数全部 ≥10 且 ≥4 张，或 ≥3 张 2，或 ≥2 张王。出够级牌后只有出牌者的对头能管
 *   （对头已出完则放行）。打到只剩一人结束，名次 0~5；队伍名次之和小者胜，胜方各 +1。
 * 依赖：CG（core.js）、PyRandom。
 */
(function (root) {
  'use strict';
  var CG = root.CG, Move = CG.Move;

  /** 默认够级牌判定（is_gouji_combo）。 */
  function isGoujiCombo(move) {
    if (move.isPass) return false;
    var n = move.ranks.length, lo = Math.min.apply(null, move.ranks);
    if (lo >= 16 && n >= 2) return true;
    if (lo >= 15 && n >= 3) return true;
    return lo >= 10 && n >= 4;
  }

  function GouJi(rng) { this.rng = rng || new root.PyRandom(); }
  CG.inherit(GouJi);
  GouJi.prototype.N = 6;
  GouJi.prototype.NAME = 'gouji';
  GouJi.prototype.TITLE = '够级';
  GouJi.prototype.deal = function () {
    var cards = CG.deck(4);
    this.rng.shuffle(cards);
    this.hands = [0, 1, 2, 3, 4, 5].map(function (i) { return CG.sortCards(cards.slice(i * 36, (i + 1) * 36)); });
  };
  GouJi.prototype.firstSeat = function () { return this.rng.randrange(6); };
  GouJi.prototype.opposite = function (seat) { return (seat + 3) % 6; };
  GouJi.prototype.position = function (seat) { return seat % 2 === 0 ? 'even' : 'odd'; };
  GouJi.prototype.positionsList = function () { return ['even', 'odd']; };
  GouJi.prototype.teams = function () { return [0, 1, 0, 1, 0, 1]; };
  GouJi.prototype.genMoves = function (seat) {
    var cnt = CG.rankCounter(this.hands[seat]), moves = [];
    CG.sortedNums(cnt.keys()).forEach(function (r) {
      for (var n = 1; n <= cnt.get(r); n++) moves.push(Move('set', r, n, new Array(n).fill(r)));
    });
    return moves;
  };
  GouJi.prototype.beats = function (m, last) { return m.length === last.length && m.main > last.main; };
  GouJi.prototype.canRespond = function (seat, last) {
    if (!isGoujiCombo(last)) return true;
    var opp = this.opposite(this.lastMover);
    if (this.finished.indexOf(opp) >= 0) return true;
    return seat === opp;
  };
  GouJi.prototype.isOver = function () { return this.finished.length >= 5; };
  GouJi.prototype.settle = function () {
    var pos = {};
    this.finished.forEach(function (s, i) { pos[s] = i; });
    var even = pos[0] + pos[2] + pos[4], odd = pos[1] + pos[3] + pos[5], evenWin = even < odd;
    for (var s = 0; s < 6; s++) this.returns_[s] = ((s % 2 === 0) === evenWin) ? 1 : -1;
    this.winnerTeam = evenWin ? 'even' : 'odd';
  };
  GouJi.isGoujiCombo = isGoujiCombo;
  CG.GAMES.gouji = GouJi;
  root.GouJi = GouJi;
})(typeof window !== 'undefined' ? window : globalThis);
