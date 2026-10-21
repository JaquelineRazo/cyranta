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

// Hero: type "anything." once the page is ready (static with reduced motion).
(function () {
	var el = document.querySelector('[data-typed]');
	if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
	var text = el.getAttribute('data-typed');
	var i = 0;
	el.textContent = '';
	function type() {
		el.textContent = text.slice(0, ++i);
		if (i < text.length) { setTimeout(type, 95 + Math.random() * 70); }
	}
	setTimeout(type, 700);
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

// Contact form: first-touch source, background submit through razzo-forms.
(function () {
	var form = document.getElementById('contact-form');
	if (!form) { return; }
	var status = form.querySelector('.form-status');
	var button = form.querySelector('button[type="submit"]');

	var params = new URLSearchParams(location.search);
	var source = params.get('utm_source') || params.get('ref');
	try {
		if (source && !sessionStorage.getItem('cyranta_source')) { sessionStorage.setItem('cyranta_source', source); }
		source = sessionStorage.getItem('cyranta_source') || source;
	} catch (e) {}
	form.querySelector('input[name="source"]').value = source || (document.referrer && document.referrer.indexOf(location.host) === -1 ? 'referral' : 'direct');

	function fail(message) {
		form.classList.remove('is-sending');
		button.disabled = false;
		button.textContent = 'Request a free Snapshot';
		status.classList.add('is-error');
		status.innerHTML = message;
	}

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		var missing = false;
		form.querySelectorAll('[required]').forEach(function (field) {
			var bad = !field.value.trim() || (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim()));
			field.closest('.field').classList.toggle('is-invalid', bad);
			if (bad) { missing = true; }
		});
		if (missing) { fail('Please add your name, a valid work email and your industry and use case.'); return; }

		var data = {};
		new FormData(form).forEach(function (value, key) { data[key] = value; });
		form.classList.add('is-sending');
		button.disabled = true;
		button.textContent = 'Sending…';
		status.classList.remove('is-error');
		status.textContent = '';

		var controller = window.AbortController ? new AbortController() : null;
		var timer = setTimeout(function () { if (controller) { controller.abort(); } }, 10000);
		fetch(form.action, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
			body: JSON.stringify(data),
			signal: controller ? controller.signal : undefined
		}).then(function (r) { return r.json(); }).then(function (res) {
			clearTimeout(timer);
			if (!res || res.success !== true) { throw new Error(res && res.error); }
			if (window.umami && typeof window.umami.track === 'function') {
				window.umami.track('form-submit', { brand: 'cyranta', need: data.need, buyer: data.buyer, source: data.source });
			}
			form.classList.remove('is-sending');
			form.classList.add('is-sent');
			status.textContent = 'Thank you. We received your request and will be in touch.';
		}).catch(function () {
			clearTimeout(timer);
			fail('We couldn’t send your request. Please email <a href="mailto:cyranta@razzobusiness.com">cyranta@razzobusiness.com</a>.');
		});
	});
})();
