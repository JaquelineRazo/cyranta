// CYRANTA — loads the glass swarm after the page content, if WebGL works.
(function () {
	var canvas = document.querySelector('[data-swarm]');
	var probe = document.createElement('canvas');
	var gl = null;
	try { gl = probe.getContext('webgl2') || probe.getContext('webgl'); } catch (e) {}
	var saveData = navigator.connection && navigator.connection.saveData;
	if (!gl || saveData) { canvas.remove(); return; }

	function start() {
		import('./swarm.js').catch(function () { canvas.remove(); });
	}
	if (document.readyState === 'complete') { start(); } else { window.addEventListener('load', start); }
})();

// Illustrations fade in (and quality bars fill) when they reach the screen.
(function () {
	var items = document.querySelectorAll('.reveal');
	if (!('IntersectionObserver' in window)) {
		items.forEach(function (el) { el.classList.add('is-in'); });
		return;
	}
	var io = new IntersectionObserver(function (entries) {
		entries.forEach(function (entry) {
			if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
		});
	}, { rootMargin: '0px 0px -12% 0px' });
	items.forEach(function (el) { io.observe(el); });
})();

// Snapshot tabs (arrow keys move between tabs).
(function () {
	var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
	function select(tab) {
		tabs.forEach(function (t) {
			var on = t === tab;
			t.setAttribute('aria-selected', on ? 'true' : 'false');
			t.tabIndex = on ? 0 : -1;
			document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
		});
	}
	tabs.forEach(function (tab, i) {
		tab.addEventListener('click', function () { select(tab); });
		tab.addEventListener('keydown', function (e) {
			var next = e.key === 'ArrowRight' ? tabs[(i + 1) % tabs.length] : e.key === 'ArrowLeft' ? tabs[(i - 1 + tabs.length) % tabs.length] : null;
			if (next) { e.preventDefault(); select(next); next.focus(); }
		});
	});
})();

// Prototype form: no sending yet.
(function () {
	var form = document.querySelector('[data-proto-form]');
	if (!form) { return; }
	form.addEventListener('submit', function (e) {
		e.preventDefault();
		form.querySelector('[data-proto-note]').textContent = 'Prototype: nothing was sent.';
	});
})();
