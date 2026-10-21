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

// Prototype form: no sending yet.
(function () {
	var form = document.querySelector('[data-proto-form]');
	if (!form) { return; }
	form.addEventListener('submit', function (e) {
		e.preventDefault();
		form.querySelector('[data-proto-note]').textContent = 'Prototype: nothing was sent.';
	});
})();
