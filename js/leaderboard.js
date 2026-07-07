/*
 * Leaderboard — a tiny, dependency-free high-score store.
 *
 * Shared design for all of Dan's arcade games: a single Supabase `scores`
 * table namespaced by a `game` column. If Supabase isn't configured it falls
 * back to localStorage so the game is always playable.
 *
 * Public API (all async):
 *   Leaderboard.top(limit)            -> [{ initials, score, stage, created_at }]
 *   Leaderboard.submit(initials, score, stage) -> saved entry
 *   Leaderboard.qualifies(score, limit)        -> boolean (is it a top score?)
 *   Leaderboard.mode                  -> 'supabase' | 'local'
 */
window.Leaderboard = (function () {
	'use strict';

	var cfg = window.GAME_CONFIG || {};
	var GAME = cfg.gameId || 'game';
	var SIZE = cfg.leaderboardSize || 10;
	var useSupabase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
	var LOCAL_KEY = 'leaderboard-' + GAME;

	/* ------------------------------- Supabase ------------------------------ */

	function sbHeaders(extra) {
		var h = {
			apikey: cfg.supabaseAnonKey,
			Authorization: 'Bearer ' + cfg.supabaseAnonKey
		};
		for (var k in extra) { h[k] = extra[k]; }
		return h;
	}

	function sbTop(limit) {
		var url = cfg.supabaseUrl.replace(/\/$/, '') +
			'/rest/v1/scores?game=eq.' + encodeURIComponent(GAME) +
			'&select=initials,score,stage,created_at&order=score.desc,created_at.asc&limit=' + limit;
		return fetch(url, { headers: sbHeaders() }).then(function (r) {
			if (!r.ok) { throw new Error('load failed: ' + r.status); }
			return r.json();
		});
	}

	function sbSubmit(entry) {
		var url = cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/scores';
		return fetch(url, {
			method: 'POST',
			headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
			body: JSON.stringify(entry)
		}).then(function (r) {
			if (!r.ok) { throw new Error('submit failed: ' + r.status); }
			return entry;
		});
	}

	/* ------------------------------ localStorage --------------------------- */

	function localAll() {
		try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; }
		catch (e) { return []; }
	}

	function localTop(limit) {
		var rows = localAll().sort(function (a, b) { return b.score - a.score; });
		return Promise.resolve(rows.slice(0, limit));
	}

	function localSubmit(entry) {
		var rows = localAll();
		rows.push(entry);
		rows.sort(function (a, b) { return b.score - a.score; });
		rows = rows.slice(0, 100); // cap stored history
		try { localStorage.setItem(LOCAL_KEY, JSON.stringify(rows)); } catch (e) {}
		return Promise.resolve(entry);
	}

	/* -------------------------------- public ------------------------------- */

	function top(limit) {
		limit = limit || SIZE;
		if (useSupabase) {
			return sbTop(limit).catch(function () { return localTop(limit); });
		}
		return localTop(limit);
	}

	function submit(initials, score, stage) {
		var entry = {
			game: GAME,
			initials: String(initials).toUpperCase().slice(0, 3),
			score: Math.max(0, Math.floor(score)),
			stage: stage || 1,
			created_at: new Date().toISOString()
		};
		if (useSupabase) {
			return sbSubmit(entry).catch(function () { return localSubmit(entry); });
		}
		return localSubmit(entry);
	}

	function qualifies(score, limit) {
		limit = limit || SIZE;
		if (score <= 0) { return Promise.resolve(false); }
		return top(limit).then(function (rows) {
			return rows.length < limit || score > rows[rows.length - 1].score;
		});
	}

	return {
		top: top,
		submit: submit,
		qualifies: qualifies,
		mode: useSupabase ? 'supabase' : 'local'
	};
})();
