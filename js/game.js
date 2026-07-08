/*
 * Alienix — a twin-stick arena survivor.
 *
 * Rebuilt from the original 2011 jQuery vertical shooter into a completely
 * different game: you pilot a lone ship in an open arena, alien swarms close in
 * from every edge, you move (WASD/arrows) and aim 360° (mouse or auto-aim) with
 * auto-fire, collect XP to level up and pick upgrades, and survive escalating
 * waves for a high score. All art is drawn procedurally — no image assets.
 */
(function () {
	'use strict';

	var W = 760, H = 760;
	var view, canvas, ctx;
	var board, screens, initEntry, fx, sfx;   // Retroix-provided
	var el = {};

	/* ------------------------------- state -------------------------------- */

	var state = 'title';          // title | howto | playing | levelup | paused | ending | gameover | initials | leaderboard
	// Initialised up front: render() runs every frame (even on the title screen,
	// before newGame()), so these must be safe to iterate from the very start.
	var player = null, enemies = [], bullets = [], ebullets = [], gems = [], particles = [], floats = [];
	var elapsed = 0, score = 0, kills = 0, wave = 1, spawnTimer = 0, eliteTimer = 30;
	var xp = 0, level = 1, xpToNext = 6, levelQueue = 0;
	var input = { up: false, down: false, left: false, right: false, mouseX: null, mouseY: null, hasMouse: false, touch: null };

	/* --------------------------- data tables ------------------------------ */

	var ENEMY = {
		grunt:    { r: 15, hp: 3,  speed: 1.35, dmg: 1, score: 10, xp: 1, color: '#7CFC5A', shape: 'blob' },
		swift:    { r: 10, hp: 2,  speed: 2.5,  dmg: 1, score: 14, xp: 1, color: '#ff5ea8', shape: 'dart' },
		shooter:  { r: 15, hp: 4,  speed: 1.0,  dmg: 1, score: 22, xp: 2, color: '#ffd24a', shape: 'eye',  keepDist: 240, fireEvery: 1.8 },
		tank:     { r: 25, hp: 14, speed: 0.85, dmg: 2, score: 35, xp: 3, color: '#9b8cff', shape: 'hex' },
		splitter: { r: 19, hp: 6,  speed: 1.1,  dmg: 1, score: 20, xp: 2, color: '#5ad1ff', shape: 'amoeba' },
		boss:     { r: 44, hp: 120,speed: 0.9,  dmg: 2, score: 400, xp: 12, color: '#ff3b5c', shape: 'boss', fireEvery: 1.3 }
	};

	// [unlockSeconds, type]
	var UNLOCKS = [[0, 'grunt'], [14, 'swift'], [32, 'shooter'], [58, 'tank'], [84, 'splitter']];

	var UPGRADES = [
		{ id: 'rapid',    name: 'Overclock',    desc: '+15% fire rate',          apply: function (p) { p.fireRate *= 0.85; } },
		{ id: 'damage',   name: 'Sharp Rounds', desc: '+3 damage',               apply: function (p) { p.damage += 3; } },
		{ id: 'multi',    name: 'Split Shot',   desc: '+1 projectile',           apply: function (p) { p.projCount += 1; } },
		{ id: 'pierce',   name: 'Piercing',     desc: 'Shots pierce +1 enemy',   apply: function (p) { p.pierce += 1; } },
		{ id: 'speed',    name: 'Thrusters',    desc: '+12% move speed',         apply: function (p) { p.moveSpeed *= 1.12; } },
		{ id: 'vitality', name: 'Reinforce',    desc: '+1 max health (+heal)',   apply: function (p) { p.maxHp += 1; p.hp = Math.min(p.maxHp, p.hp + 1); } },
		{ id: 'magnet',   name: 'Magnet',       desc: '+40% pickup range',       apply: function (p) { p.magnet *= 1.4; } },
		{ id: 'velocity', name: 'Railgun',      desc: '+25% shot speed',         apply: function (p) { p.projSpeed *= 1.25; } },
		{ id: 'regen',    name: 'Nanobots',     desc: 'Slowly regenerate health',apply: function (p) { p.regen += 0.25; } }
	];

	/* ------------------------------ helpers ------------------------------- */

	function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
	function rand(a, b) { return a + Math.random() * (b - a); }
	function dist2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
	function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

	/* ------------------------------- setup -------------------------------- */

	function boot() {
		view = Retroix.canvas('#game', W, H);
		canvas = view.canvas; ctx = view.ctx;
		fx = Retroix.fx(view);
		sfx = Retroix.audio();
		board = Retroix.leaderboard(window.GAME_CONFIG);
		screens = Retroix.screens(document);
		[ 'hudScore', 'hudTime', 'hudWave', 'hudHealth', 'xpFill', 'hudLevel', 'toast',
		  'goScore', 'goSub', 'initScore', 'initMount', 'lbBody', 'lbMode', 'lbTitle', 'titleTop', 'cards'
		].forEach(function (id) { el[id] = document.getElementById(id); });

		initEntry = Retroix.initials(el.initMount, { onEnter: submitInitials });
		initEntry.bindKeys();
		bindInput();
		bindButtons();
		showTitle();
		Retroix.loop(step).start();
	}

	/* ------------------------------ new game ------------------------------ */

	function newGame() {
		player = {
			x: W / 2, y: H / 2, r: 16, aim: -Math.PI / 2,
			hp: 5, maxHp: 5, moveSpeed: 3.2,
			fireRate: 0.33, fireTimer: 0, damage: 4, projSpeed: 8.5, projCount: 1, pierce: 0,
			magnet: 80, regen: 0, iframe: 0, regenAcc: 0
		};
		enemies = []; bullets = []; ebullets = []; gems = []; particles = []; floats = [];
		elapsed = 0; score = 0; kills = 0; wave = 1; spawnTimer = 0; eliteTimer = 30;
		xp = 0; level = 1; xpToNext = 6; levelQueue = 0;
		updateHud();
	}

	function startGame() { newGame(); state = 'playing'; showScreen(null); }

	/* -------------------------------- loop -------------------------------- */

	function step(dt) {
		fx.update(dt);
		if (state === 'playing') { update(dt); }
		render();
	}

	function update(dt) {
		elapsed += dt;
		var newWave = Math.floor(elapsed / 30) + 1;
		if (newWave > wave) { wave = newWave; toast('Wave ' + wave); sfx.jingle('levelup'); }

		updatePlayer(dt);
		updateSpawning(dt);
		updateEnemies(dt);
		updateBullets(dt);
		updateEnemyBullets(dt);
		updateGems(dt);
		updateParticles(dt);
		updateHud();
	}

	/* ------------------------------ player -------------------------------- */

	function updatePlayer(dt) {
		var p = player, f = dt * 60;
		var mx = 0, my = 0;
		if (input.touch) { mx = input.touch.dx; my = input.touch.dy; }
		else {
			mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
			my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
		}
		var m = Math.hypot(mx, my);
		if (m > 0) { p.x += (mx / m) * p.moveSpeed * f; p.y += (my / m) * p.moveSpeed * f; }
		p.x = clamp(p.x, p.r, W - p.r); p.y = clamp(p.y, p.r, H - p.r);

		// Aim: mouse when present, otherwise auto-aim the nearest enemy.
		if (input.hasMouse && input.mouseX != null) {
			p.aim = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);
		} else {
			var target = nearestEnemy();
			if (target) { p.aim = Math.atan2(target.y - p.y, target.x - p.x); }
		}

		// Auto-fire.
		p.fireTimer -= dt;
		if (p.fireTimer <= 0 && (input.hasMouse || nearestEnemy())) {
			p.fireTimer = p.fireRate;
			fire();
		}

		if (p.iframe > 0) { p.iframe -= dt; }
		if (p.regen > 0 && p.hp < p.maxHp) {
			p.regenAcc += p.regen * dt;
			if (p.regenAcc >= 1) { p.regenAcc -= 1; p.hp = Math.min(p.maxHp, p.hp + 1); }
		}
	}

	function fire() {
		var p = player, n = p.projCount, spread = 0.12 * (n - 1);
		for (var i = 0; i < n; i++) {
			var a = p.aim - spread / 2 + (n > 1 ? spread * (i / (n - 1)) : 0);
			bullets.push({ x: p.x + Math.cos(p.aim) * p.r, y: p.y + Math.sin(p.aim) * p.r,
				vx: Math.cos(a) * p.projSpeed, vy: Math.sin(a) * p.projSpeed, life: 1.1, pierce: p.pierce, dmg: p.damage, hit: [] });
		}
		sfx.tone({ wave: 'square', freq: 720, freqEnd: 480, dur: 0.05, vol: 0.18 });   // pew
	}

	function nearestEnemy() {
		var best = null, bd = Infinity;
		for (var i = 0; i < enemies.length; i++) {
			var d = dist2(player.x, player.y, enemies[i].x, enemies[i].y);
			if (d < bd) { bd = d; best = enemies[i]; }
		}
		return best;
	}

	/* ------------------------------ spawning ------------------------------ */

	function difficulty() { return 1 + elapsed / 60; }

	function updateSpawning(dt) {
		spawnTimer -= dt;
		var interval = Math.max(0.26, 1.15 - elapsed * 0.011);
		if (spawnTimer <= 0) {
			spawnTimer = interval;
			spawnEnemy(pickType());
		}
		eliteTimer -= dt;
		if (eliteTimer <= 0) {
			eliteTimer = 42;
			if (elapsed > 90 && Math.floor(elapsed / 120) !== spawnEnemy._lastBoss) {
				spawnEnemy._lastBoss = Math.floor(elapsed / 120);
				spawnEnemy('boss', true);
				toast('⚠ BOSS');
			} else {
				spawnEnemy('tank', false, true); // an elite (tougher) tank
			}
		}
	}

	function pickType() {
		var pool = [];
		for (var i = 0; i < UNLOCKS.length; i++) { if (elapsed >= UNLOCKS[i][0]) { pool.push(UNLOCKS[i][1]); } }
		return pick(pool);
	}

	function spawnEnemy(type, isBoss, isElite) {
		var base = ENEMY[type], d = difficulty();
		var pos = edgePosition();
		var hpMul = isBoss ? 1 : (1 + elapsed / 80) * (isElite ? 3 : 1);
		var e = {
			type: type, x: pos.x, y: pos.y, r: base.r * (isElite ? 1.4 : 1),
			hp: base.hp * hpMul, maxHp: base.hp * hpMul,
			speed: base.speed * (1 + elapsed / 300), dmg: base.dmg + (isBoss ? 1 : 0),
			score: base.score * (isElite ? 3 : 1), xp: base.xp * (isElite ? 3 : isBoss ? 6 : 1),
			color: isElite ? '#ff8a3d' : base.color, shape: base.shape,
			fireEvery: base.fireEvery || 0, fireTimer: base.fireEvery || 0,
			keepDist: base.keepDist || 0, wob: rand(0, 6.28), flash: 0, boss: !!isBoss, elite: !!isElite
		};
		enemies.push(e);
	}

	function edgePosition() {
		var s = (Math.random() * 4) | 0, m = 40;
		if (s === 0) { return { x: rand(0, W), y: -m }; }
		if (s === 1) { return { x: W + m, y: rand(0, H) }; }
		if (s === 2) { return { x: rand(0, W), y: H + m }; }
		return { x: -m, y: rand(0, H) };
	}

	/* ------------------------------ enemies ------------------------------- */

	function updateEnemies(dt) {
		var f = dt * 60, p = player;
		for (var i = enemies.length - 1; i >= 0; i--) {
			var e = enemies[i];
			var ang = Math.atan2(p.y - e.y, p.x - e.x);
			if (e.shape === 'dart') { e.wob += dt * 6; ang += Math.sin(e.wob) * 0.5; }
			// Shooters (and bosses) keep their distance and fire.
			var move = 1;
			if (e.keepDist || e.boss) {
				var d = Math.hypot(p.x - e.x, p.y - e.y);
				if (d < (e.keepDist || 200)) { move = -0.6; }
				else if (d < (e.keepDist || 200) + 60) { move = 0; }
				e.fireTimer -= dt;
				if (e.fireTimer <= 0) { e.fireTimer = e.fireEvery; enemyFire(e, ang); }
			}
			e.x += Math.cos(ang) * e.speed * move * f;
			e.y += Math.sin(ang) * e.speed * move * f;
			if (e.flash > 0) { e.flash -= dt; }

			// Contact with player.
			if (p.iframe <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r) * (e.r + p.r)) {
				damagePlayer(e.dmg);
			}
		}
	}

	function enemyFire(e, ang) {
		if (e.boss) {
			for (var k = -1; k <= 1; k++) {
				ebullets.push(mkEbullet(e, ang + k * 0.28));
			}
		} else {
			ebullets.push(mkEbullet(e, ang));
		}
	}
	function mkEbullet(e, ang) {
		return { x: e.x, y: e.y, vx: Math.cos(ang) * 3.4, vy: Math.sin(ang) * 3.4, r: 6, life: 3 };
	}

	function damagePlayer(dmg) {
		player.hp -= dmg;
		player.iframe = 1;
		fx.flash('#ff283c', 0.32); fx.shake(0.55); sfx.hit();
		if (player.hp <= 0) { player.hp = 0; endGame(); }
	}

	/* ------------------------------ bullets ------------------------------- */

	function updateBullets(dt) {
		var f = dt * 60;
		for (var i = bullets.length - 1; i >= 0; i--) {
			var b = bullets[i];
			b.x += b.vx * f; b.y += b.vy * f; b.life -= dt;
			if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) { bullets.splice(i, 1); continue; }
			for (var j = enemies.length - 1; j >= 0; j--) {
				var e = enemies[j];
				if (b.hit.indexOf(e) !== -1) { continue; }
				if (dist2(b.x, b.y, e.x, e.y) < (e.r + 3) * (e.r + 3)) {
					e.hp -= b.dmg; e.flash = 0.08; b.hit.push(e);
					spawnParticles(b.x, b.y, e.color, 3);
					if (e.hp <= 0) { killEnemy(j); }
					if (b.pierce-- <= 0) { bullets.splice(i, 1); break; }
				}
			}
		}
	}

	function killEnemy(j) {
		var e = enemies[j];
		score += e.score; kills++;
		spawnParticles(e.x, e.y, e.color, e.boss ? 30 : 8);
		sfx.play(e.boss ? 'explosion' : 'hit');
		if (e.shape === 'amoeba' && !e._split && e.r > 12) {
			for (var s = 0; s < 2; s++) {
				var c = { type: 'grunt', x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), r: 11,
					hp: 2, maxHp: 2, speed: 1.6, dmg: 1, score: 6, xp: 1, color: '#5ad1ff', shape: 'blob',
					fireEvery: 0, fireTimer: 0, keepDist: 0, wob: 0, flash: 0, _split: true };
				enemies.push(c);
			}
		}
		for (var g = 0; g < e.xp; g++) { gems.push({ x: e.x + rand(-8, 8), y: e.y + rand(-8, 8), v: 1, drift: 0 }); }
		if (e.boss) { toast('BOSS DOWN +' + e.score); fx.shake(0.9); }
		enemies.splice(j, 1);
	}

	/* --------------------------- enemy bullets ---------------------------- */

	function updateEnemyBullets(dt) {
		var f = dt * 60, p = player;
		for (var i = ebullets.length - 1; i >= 0; i--) {
			var b = ebullets[i];
			b.x += b.vx * f; b.y += b.vy * f; b.life -= dt;
			if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) { ebullets.splice(i, 1); continue; }
			if (p.iframe <= 0 && dist2(b.x, b.y, p.x, p.y) < (b.r + p.r) * (b.r + p.r)) {
				damagePlayer(1); ebullets.splice(i, 1);
			}
		}
	}

	/* -------------------------------- gems -------------------------------- */

	function updateGems(dt) {
		var f = dt * 60, p = player;
		for (var i = gems.length - 1; i >= 0; i--) {
			var g = gems[i];
			var d2 = dist2(g.x, g.y, p.x, p.y);
			if (d2 < p.magnet * p.magnet) {
				var a = Math.atan2(p.y - g.y, p.x - g.x), pull = 3 + (1 - Math.sqrt(d2) / p.magnet) * 6;
				g.x += Math.cos(a) * pull * f; g.y += Math.sin(a) * pull * f;
			}
			if (d2 < (p.r + 8) * (p.r + 8)) { gainXp(g.v); gems.splice(i, 1); sfx.tone({ wave: 'square', freq: 1100, dur: 0.04, vol: 0.18 }); }
		}
	}

	function gainXp(v) {
		xp += v;
		while (xp >= xpToNext) { xp -= xpToNext; level++; xpToNext = Math.round(xpToNext * 1.28 + 2); levelQueue++; }
		if (levelQueue > 0 && state === 'playing') { openLevelUp(); }
	}

	/* ------------------------------ particles ----------------------------- */

	function spawnParticles(x, y, color, n) {
		for (var i = 0; i < n; i++) {
			particles.push({ x: x, y: y, vx: rand(-4, 4), vy: rand(-4, 4), life: 1, color: color });
		}
	}
	function updateParticles(dt) {
		var f = dt * 60;
		for (var i = particles.length - 1; i >= 0; i--) {
			var p = particles[i];
			p.x += p.vx * f; p.y += p.vy * f; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt * 2;
			if (p.life <= 0) { particles.splice(i, 1); }
		}
	}

	/* ------------------------------ level up ------------------------------ */

	function openLevelUp() {
		state = 'levelup';
		sfx.powerup();
		var opts = UPGRADES.slice();
		for (var i = opts.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = opts[i]; opts[i] = opts[j]; opts[j] = t; }
		var choices = opts.slice(0, 3);
		el.cards.innerHTML = '';
		choices.forEach(function (u) {
			var b = document.createElement('button');
			b.className = 'card';
			b.innerHTML = '<span class="card__name">' + u.name + '</span><span class="card__desc">' + u.desc + '</span>';
			b.addEventListener('click', function () { chooseUpgrade(u); });
			el.cards.appendChild(b);
		});
		el.hudLevel.textContent = 'LV ' + level;
		showScreen('screenLevelup');
	}

	function chooseUpgrade(u) {
		sfx.select();
		u.apply(player);
		levelQueue--;
		if (levelQueue > 0) { openLevelUp(); }
		else { showScreen(null); state = 'playing'; }
	}

	/* -------------------------------- render ------------------------------ */

	function render() {
		fx.preRender(ctx);
		drawArena();
		for (var i = 0; i < gems.length; i++) { drawGem(gems[i]); }
		for (i = 0; i < enemies.length; i++) { drawEnemy(enemies[i]); }
		for (i = 0; i < ebullets.length; i++) { drawEbullet(ebullets[i]); }
		if (player) { drawPlayer(); }
		for (i = 0; i < bullets.length; i++) { drawBullet(bullets[i]); }
		for (i = 0; i < particles.length; i++) { drawParticle(particles[i]); }
		fx.postRender(ctx);
	}

	function drawArena() {
		ctx.fillStyle = '#080a16'; ctx.fillRect(0, 0, W, H);
		ctx.strokeStyle = 'rgba(90,120,220,.10)'; ctx.lineWidth = 1;
		ctx.beginPath();
		for (var x = 0; x <= W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
		for (var y = 0; y <= H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
		ctx.stroke();
		ctx.strokeStyle = 'rgba(120,150,255,.35)'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, W - 4, H - 4);
	}

	function drawPlayer() {
		var p = player;
		ctx.save();
		ctx.translate(p.x, p.y); ctx.rotate(p.aim);
		if (p.iframe > 0 && Math.floor(p.iframe * 20) % 2) { ctx.globalAlpha = 0.4; }
		ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 14;
		ctx.fillStyle = '#00e5ff';
		ctx.beginPath();
		ctx.moveTo(p.r + 4, 0); ctx.lineTo(-p.r * 0.7, p.r * 0.7); ctx.lineTo(-p.r * 0.3, 0); ctx.lineTo(-p.r * 0.7, -p.r * 0.7);
		ctx.closePath(); ctx.fill();
		ctx.fillStyle = '#eaffff';
		ctx.beginPath(); ctx.arc(0, 0, p.r * 0.28, 0, 6.28); ctx.fill();
		ctx.restore();
	}

	function drawEnemy(e) {
		ctx.save();
		ctx.translate(e.x, e.y);
		var col = e.flash > 0 ? '#ffffff' : e.color;
		ctx.shadowColor = e.color; ctx.shadowBlur = e.boss ? 20 : 8;
		ctx.fillStyle = col;
		if (e.shape === 'dart') {
			ctx.rotate(Math.atan2(player.y - e.y, player.x - e.x));
			ctx.beginPath(); ctx.moveTo(e.r, 0); ctx.lineTo(-e.r, e.r * 0.7); ctx.lineTo(-e.r, -e.r * 0.7); ctx.closePath(); ctx.fill();
		} else if (e.shape === 'hex' || e.shape === 'boss') {
			ctx.beginPath();
			for (var k = 0; k < 6; k++) { var a = k / 6 * 6.28; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * e.r, Math.sin(a) * e.r); }
			ctx.closePath(); ctx.fill();
			ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(0, 0, e.r * 0.45, 0, 6.28); ctx.fill();
		} else if (e.shape === 'eye') {
			ctx.beginPath(); ctx.arc(0, 0, e.r, 0, 6.28); ctx.fill();
			ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(0, 0, e.r * 0.45, 0, 6.28); ctx.fill();
			ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.r * 0.15, -e.r * 0.15, e.r * 0.18, 0, 6.28); ctx.fill();
		} else {
			// blob / amoeba
			ctx.beginPath(); ctx.arc(0, 0, e.r, 0, 6.28); ctx.fill();
			ctx.fillStyle = 'rgba(0,0,0,.3)';
			ctx.beginPath(); ctx.arc(-e.r * 0.3, -e.r * 0.2, e.r * 0.16, 0, 6.28);
			ctx.arc(e.r * 0.3, -e.r * 0.2, e.r * 0.16, 0, 6.28); ctx.fill();
		}
		ctx.restore();
		// boss / tank health bar
		if (e.boss || e.elite) {
			var w = e.r * 2;
			ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - w / 2, e.y - e.r - 10, w, 4);
			ctx.fillStyle = e.color; ctx.fillRect(e.x - w / 2, e.y - e.r - 10, w * (e.hp / e.maxHp), 4);
		}
	}

	function drawBullet(b) {
		ctx.save(); ctx.shadowColor = '#7dffea'; ctx.shadowBlur = 8; ctx.fillStyle = '#eafffb';
		ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, 6.28); ctx.fill(); ctx.restore();
	}
	function drawEbullet(b) {
		ctx.save(); ctx.shadowColor = '#ff5e7e'; ctx.shadowBlur = 8; ctx.fillStyle = '#ff5e7e';
		ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.28); ctx.fill(); ctx.restore();
	}
	function drawGem(g) {
		ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(0.785); ctx.shadowColor = '#39ff9e'; ctx.shadowBlur = 8;
		ctx.fillStyle = '#39ff9e'; ctx.fillRect(-4, -4, 8, 8); ctx.restore();
	}
	function drawParticle(p) {
		ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); ctx.globalAlpha = 1;
	}

	/* -------------------------------- HUD --------------------------------- */

	function updateHud() {
		el.hudScore.textContent = score.toLocaleString();
		el.hudTime.textContent = fmtTime(elapsed);
		el.hudWave.textContent = 'Wave ' + wave;
		el.hudHealth.textContent = player ? '♥'.repeat(Math.max(0, player.hp)) + '<span class="hp-empty">' + '♡'.repeat(Math.max(0, player.maxHp - player.hp)) + '</span>' : '';
		el.hudHealth.innerHTML = el.hudHealth.textContent;
		el.hudLevel.textContent = 'LV ' + level;
		el.xpFill.style.width = (100 * xp / xpToNext) + '%';
	}
	function fmtTime(s) { var m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + (r < 10 ? '0' : '') + r; }

	var toastTimer;
	function toast(msg) {
		el.toast.textContent = msg; el.toast.classList.add('toast--show');
		clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.toast.classList.remove('toast--show'); }, 1400);
	}

	/* ----------------------------- end / flow ----------------------------- */

	function endGame() {
		state = 'ending';
		sfx.jingle('gameover');
		board.qualifies(score).then(function (ok) { ok ? showInitials() : showGameover(); });
	}
	function showGameover() {
		state = 'gameover';
		el.goScore.textContent = score.toLocaleString();
		el.goSub.textContent = 'Survived ' + fmtTime(elapsed) + ' · Wave ' + wave + ' · ' + kills + ' kills';
		showScreen('screenGameover');
	}

	/* --------------------------- initials entry --------------------------- */

	function showInitials() {
		state = 'initials'; initEntry.reset(); initEntry.active = true;
		el.initScore.textContent = score.toLocaleString();
		showScreen('screenInitials');
	}
	function submitInitials() {
		if (state !== 'initials') { return; }
		initEntry.active = false;
		var initials = initEntry.value();
		board.submit(initials, score, wave).then(function () { showLeaderboard(initials); });
	}

	/* ----------------------------- leaderboard ---------------------------- */

	function showLeaderboard(highlight) {
		state = 'leaderboard';
		el.lbTitle.textContent = 'High Scores';
		el.lbMode.textContent = board.mode === 'supabase' ? 'online' : 'this device';
		Retroix.renderLeaderboard(el.lbBody, null, { loadingText: 'Loading…' });
		showScreen('screenLeaderboard');
		board.top().then(function (rows) {
			Retroix.renderLeaderboard(el.lbBody, rows, {
				columns: ['rank', 'initials', 'score', 'stage'],
				highlightInitials: highlight, highlightScore: score,
				emptyText: 'No scores yet — be the first!'
			});
		});
	}
	function refreshTitleTop() {
		board.top(1).then(function (rows) { el.titleTop.textContent = rows.length ? 'Best: ' + Number(rows[0].score).toLocaleString() + ' — ' + rows[0].initials : ''; });
	}

	/* ------------------------------ screens ------------------------------- */

	function showScreen(id) { if (id) { screens.show(id); } else { screens.hideAll(); } }
	function showTitle() { state = 'title'; showScreen('screenTitle'); refreshTitleTop(); }
	function togglePause() {
		if (state === 'playing') { state = 'paused'; showScreen('screenPause'); }
		else if (state === 'paused') { showScreen(null); state = 'playing'; }
	}

	/* ------------------------------- input -------------------------------- */

	function canvasPoint(cx, cy) { var r = canvas.getBoundingClientRect(); return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H }; }

	function bindInput() {
		canvas.addEventListener('mousemove', function (e) { var p = canvasPoint(e.clientX, e.clientY); input.mouseX = p.x; input.mouseY = p.y; input.hasMouse = true; });
		canvas.addEventListener('mouseleave', function () { input.hasMouse = false; });

		canvas.addEventListener('touchstart', touchMove, { passive: false });
		canvas.addEventListener('touchmove', touchMove, { passive: false });
		canvas.addEventListener('touchend', function () { input.touch = null; });
		function touchMove(e) {
			var t = e.touches[0]; if (!t) { return; }
			var p = canvasPoint(t.clientX, t.clientY);
			// Move toward the touch point relative to the ship (drag-to-steer), auto-aim handles firing.
			var dx = p.x - player.x, dy = p.y - player.y, m = Math.hypot(dx, dy);
			input.touch = m > 8 ? { dx: dx / m, dy: dy / m } : { dx: 0, dy: 0 };
			input.hasMouse = false;
			e.preventDefault();
		}

		document.addEventListener('keydown', function (e) {
			var k = e.key.toLowerCase();
			if (state === 'initials') { return; }   // Retroix initials entry handles keys
			if (k === 'arrowup' || k === 'w') { input.up = true; }
			else if (k === 'arrowdown' || k === 's') { input.down = true; }
			else if (k === 'arrowleft' || k === 'a') { input.left = true; }
			else if (k === 'arrowright' || k === 'd') { input.right = true; }
			else if (k === 'p' || k === 'escape') { togglePause(); }
			else if (k === 'm') { sfx.toggle(); }
			else if (k === 'enter' || k === ' ') { if (state === 'title') { startGame(); } }
			if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) !== -1) { e.preventDefault(); }
		});
		document.addEventListener('keyup', function (e) {
			var k = e.key.toLowerCase();
			if (k === 'arrowup' || k === 'w') { input.up = false; }
			else if (k === 'arrowdown' || k === 's') { input.down = false; }
			else if (k === 'arrowleft' || k === 'a') { input.left = false; }
			else if (k === 'arrowright' || k === 'd') { input.right = false; }
		});
	}

	function bindButtons() {
		on('btnPlay', startGame); on('btnHow', function () { showScreen('screenHowto'); }); on('btnHowClose', showTitle);
		on('btnTitleLb', function () { showLeaderboard(null); });
		on('btnResume', togglePause); on('btnPauseMenu', showTitle);
		on('btnAgain', startGame); on('btnGoLb', function () { showLeaderboard(null); }); on('btnMenu', showTitle);
		on('btnInitEnter', submitInitials);
		on('btnLbAgain', startGame); on('btnLbMenu', showTitle);
	}
	function on(id, fn) { var n = document.getElementById(id); if (n) { n.addEventListener('click', fn); } }

	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); }
	else { boot(); }
})();
