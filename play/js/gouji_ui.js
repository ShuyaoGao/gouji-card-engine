/* 够级的界面配置（GAME_UI）。依赖：CG、GouJi、UIC。 */
(function (root) {
  'use strict';
  var CG = root.CG, G = root.GouJi, U = root.UIC;
  var KIND_ZH = {set: '同点牌', pass: '过'};
  var seatPos = U.seatPos(6), ord = function (r) { return r; }, sortDesc = U.sortDesc(ord);
  var TEAM = [{text: '蓝队', color: '#4aa3ff'}, {text: '红队', color: '#ff6b6b'}];
  function moveText(m) { return m.isPass ? '过' : m.length + ' 张 ' + CG.RANK_NAMES[m.main] + (G.isGoujiCombo(m) ? '（够级牌）' : ''); }

  root.GAME_UI = {
    key: 'gouji', title: '够级', sub: '四副牌 · 六人隔位一伙 · 够级牌只有对头能管',
    repo: 'gouji-card-engine', demoSeed: 20261013, hasBrain: false,
    kindZh: KIND_ZH, moveText: moveText, seatPos: seatPos, seatXY: U.seatXY, finishName: U.finishName,
    sortForDisplay: sortDesc, alarmAt: 5,
    fullDeck: function () { return CG.deck(4); }, counterRanks: [17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3],
    kindNames: {random: '随机', greedy: '贪心'},
    presets: {
      novice: {name: '新手', desc: '随机：在所有合法出牌里随便挑一个。', kinds: function (n) { return new Array(n).fill('random'); }},
      normal: {name: '普通', desc: '贪心规则：自由出牌出张数最多的一手（张数相同出最小的），跟牌出最小能压的一手。', kinds: function (n) { return new Array(n).fill('greedy'); }},
      uneven: {name: '不对称', desc: '蓝队（0、2、4 号位）随机 vs 红队（1、3、5 号位）贪心。我来玩时你的两个队友是随机、对手是贪心（很难）。', kinds: function (n) { var k = []; for (var i = 0; i < n; i++) k.push(i % 2 ? 'greedy' : 'random'); return k; }}
    },
    defaultPreset: {watch: 'normal', play: 'normal'},
    roleOf: function (g, s) { var t = TEAM[s % 2]; return {text: t.text + ' · 对头 ' + g.opposite(s) + ' 号', color: t.color}; },
    roleShort: function (g, s) { return TEAM[s % 2].text; },
    lastShown: function (g, seat, lastCards) { return U.lastShown(g, seat, lastCards, KIND_ZH, sortDesc); },
    startLog: function (g) { return [seatPos(g.turn) + ' 先出；0/2/4 号是蓝队，1/3/5 号是红队，对头 = 正对面（座位 +3）']; },
    startExplain: function (g) {
      return '四副牌，六人每人 36 张；隔位三人一伙：<b style="color:#4aa3ff">蓝队 0、2、4</b> 对 <b style="color:#ff6b6b">红队 1、3、5</b>。' +
        '只有一种牌型（N 张同点），但出了<b>够级牌</b>（≥4 张 10 以上，或 ≥3 张 2，或 ≥2 张王）后，<b>只有出牌人的对头能管</b>。';
    },
    centerInfo: function (g) {
      var t = '';
      if (g.finished.length && !g.done) t += '已出完：' + g.finished.map(function (s, i) { return U.finishName(i, 6) + ' ' + s + '号'; }).join('、') + '<br>';
      if (g.done) return t + '本局结束';
      if (!g.toBeat) return t + '<b>自由出牌</b>（' + g.turn + ' 号）';
      t += '要压：<b>' + moveText(g.toBeat) + '</b>（' + g.lastMover + ' 号出的）';
      if (G.isGoujiCombo(g.toBeat)) {
        var opp = g.opposite(g.lastMover);
        t += '<br><b style="color:#ff6b6b">够级牌！</b>' + (g.finished.indexOf(opp) >= 0 ? '对头 ' + opp + ' 号已出完，放行：人人可管' : '只有对头 <b>' + opp + ' 号</b>能管，其余人只能过');
      }
      return t;
    },
    humanHint: function (g, legal) {
      var t = '点牌选中（双击一张 = 选中同点数的全部），回车出牌，空格过，T 提示。';
      if (g.toBeat && legal.length === 1 && G.isGoujiCombo(g.toBeat)) t += '<br>上家出的是<b>够级牌</b>，你不是对头，只能过。';
      else if (g.toBeat) t += '要压 <b>' + moveText(g.toBeat) + '</b>：必须同样 ' + g.toBeat.length + ' 张、点数更大。';
      return t;
    },
    whyIllegal: function (g, cs) {
      var rs = cs.map(function (c) { return c.r; });
      if (rs.some(function (r) { return r !== rs[0]; })) return '够级只有一种牌型：选的牌必须是同一个点数';
      if (g.toBeat && !g.canRespond(g.turn, g.toBeat)) return '这是够级牌，只有对头（' + g.opposite(g.lastMover) + ' 号）能管';
      return g.toBeat ? '要压 ' + moveText(g.toBeat) + '：必须同样 ' + g.toBeat.length + ' 张、点数更大' : '这一手现在不能出';
    },
    onHumanMove: function (g, m, task) {
      if (m.isPass) return;
      if (G.isGoujiCombo(m)) task('gouji');
      if (g.toBeat && G.isGoujiCombo(g.toBeat)) task('respond');
    },
    galleryCheck: function (cards, name) {
      var g = new G(new root.PyRandom(1)).reset(), rk = cards.map(function (c) { return c.r; }).join(',');
      g.hands[0] = cards;
      var m = g.genMoves(0).filter(function (x) { return x.ranks.join(',') === rk; })[0];
      return !!m && (name.indexOf('够级牌') === 0) === G.isGoujiCombo(m);
    },
    resultText: function (g) {
      return (g.winnerTeam === 'even' ? '蓝队' : '红队') + '胜（队伍名次之和更小）；名次 ' + g.finished.map(function (s, i) { return U.finishName(i, 6) + ' ' + s + '号'; }).join('、');
    },
    rulesHTML: '四副牌 216 张，六人每人 36 张；0/2/4 对 1/3/5 两队，<b>对头</b> = 坐在正对面的人（座位 +3）。<br>' +
      '牌型只有一种：N 张同点，同张数比点数；大王 > 小王 > 2 > A > … > 3。<br>' +
      '<b>够级牌</b>：点数全部 ≥10 且 ≥4 张，或 ≥3 张 2，或 ≥2 张王。出够级牌后<b>只有出牌人的对头能管</b>，其余人强制过；对头已出完则放行。<br>' +
      '打到只剩一人结束，名次头科 … 大落；队伍名次之和小的一方胜。闷、烧、革命、开点等地方扩展没有实现。',
    rulesNote: '贪心规则（agents.GreedyAgent）：自由出牌时出张数最多的一手、张数相同出最小的；跟牌时出能压住的里面最小的一手。它不会专门去“够级”对头，也不会考虑队友。',
    tasks: [
      {id: 'types', text: '在「牌型图鉴」里点开 3 个例子'},
      {id: 'gouji', text: '打出一手够级牌'},
      {id: 'respond', text: '作为对头，管住对面的够级牌'},
      {id: 'hint', text: '用一次 💡 提示，看贪心规则会怎么出'},
      {id: 'win_practice', text: '你这一队赢一局（对手：新手）'}
    ],
    gallery: [
      ['普通牌：4 张 9', [[9, '♠'], [9, '♥'], [9, '♣'], [9, '♦']], '9 不够大，不是够级牌：谁都可以管。'],
      ['够级牌：4 张 10', [[10, '♠'], [10, '♥'], [10, '♣'], [10, '♦']], '点数全部 ≥10 且 ≥4 张：只有对头能管。'],
      ['够级牌：3 张 2', [[15, '♠'], [15, '♥'], [15, '♣']], '≥3 张 2 也是够级牌。'],
      ['够级牌：2 张小王', [[16, ''], [16, '']], '2 张以上同样的王（2 张小王、2 张大王……）也是够级牌。'],
      ['单张', [[13, '♠']], '1 张 K：普通牌。']
    ],
    helpCards: [
      ['① 这是什么', '<p>四副牌、六个人的<b>够级</b>：隔位三人一伙，“够级牌只有对头能管”。发牌、出牌、对头限制、名次与胜负都在浏览器里运行，与 Python 版引擎逐步一致。</p><p>AI 是规则（贪心 / 随机），没有训练过的神经网络。</p>'],
      ['② 怎么看右边', '<p><b>规则依据</b>：这一步贪心规则命中了哪一条、在哪些候选里挑；遇到够级牌时，不是对头的人只有“过”一个选择。</p><p>下面是<b>记牌器</b>。牌桌中间会提示“够级牌！只有对头能管”。</p>'],
      ['③ 怎么玩', '<p>顶部切换「观战 / 我来玩 / 规则练习」。我来玩：你坐 0 号位（蓝队），对头是 3 号。点牌选中，<b>双击一张牌 = 选中同点数的全部</b>，<kbd>回车</kbd> 出牌，<kbd>空格</kbd> 过，<kbd>T</kbd> 提示。</p><p><kbd>P</kbd> 暂停 / 继续，<kbd>N</kbd> 单步，<kbd>H</kbd> 打开本说明。</p>']
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
