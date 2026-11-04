// Home page: the margin record (the needle follows your reading position) and the
// study monitor numbers read live from dashboard.html.
(function () {
	var folio = document.querySelector('.folio');
	var disc = folio.querySelector('.folio__disc');
	var arm = folio.querySelector('.folio__arm');
	var gaps = folio.querySelector('.disc__gaps');
	var numEl = folio.querySelector('.folio__num');
	var titleEl = folio.querySelector('.folio__title');
	var links = Array.prototype.slice.call(folio.querySelectorAll('.folio__list a'));
	var hero = document.getElementById('top');
	var why = document.getElementById('why');
	var chapters = Array.prototype.slice.call(document.querySelectorAll('main [data-title]'));
	var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	var sc = window.ScrollCraft && ScrollCraft.instances[0];

	// Grooves run from 94% of the disc radius (start of A1) to 40% (end of the page).
	var R_OUT = 0.94, R_IN = 0.4;
	var tops = [], startY = 0, endY = 1, R = 0, pivot = null, armLen = 0;
	var queued = false;

	function grooveRadius(f) { return R_OUT - f * (R_OUT - R_IN); }

	function measure() {
		tops = chapters.map(function (c) { return c.getBoundingClientRect().top + scrollY; });
		var probe = innerHeight * 0.4;
		startY = tops[0];
		endY = Math.max(document.documentElement.scrollHeight - innerHeight + probe, startY + 1);
		R = disc.offsetWidth / 2;
		// Pivot sits up and to the right of the disc, like a real tonearm base.
		pivot = { x: R * 1.05, y: -R * 1.0 };
		armLen = R * 1.25;
		arm.style.left = (R + pivot.x) + 'px';
		arm.style.top = (R + pivot.y) + 'px';
		arm.style.width = armLen + 'px';
		// One thin ring per chapter start: the gaps between tracks on a real LP.
		gaps.textContent = '';
		tops.slice(1).forEach(function (t) {
			var f = Math.min(Math.max((t - startY) / (endY - startY), 0), 1);
			var i = document.createElement('i');
			var size = grooveRadius(f) * 2 * R;
			i.style.width = i.style.height = size + 'px';
			gaps.appendChild(i);
		});
		update();
	}

	// Angle of the arm so its tip sits at radius r from the disc centre (law of cosines).
	function armAngle(r) {
		var d = Math.hypot(pivot.x, pivot.y);
		var cos = (d * d + armLen * armLen - r * r) / (2 * d * armLen);
		var alpha = Math.acos(Math.min(Math.max(cos, -1), 1));
		var toCentre = Math.atan2(-pivot.y, -pivot.x);
		return toCentre - alpha;
	}

	function update() {
		queued = false;
		var y = scrollY + innerHeight * 0.4;
		var f = Math.min(Math.max((y - startY) / (endY - startY), 0), 1);
		if (R) arm.style.transform = 'rotate(' + armAngle(grooveRadius(f) * R) + 'rad)';

		var idx = 0;
		for (var i = 0; i < tops.length; i++) if (y >= tops[i]) idx = i;
		var ch = chapters[idx];
		if (titleEl.textContent !== ch.dataset.title) {
			numEl.textContent = ch.dataset.num;
			titleEl.textContent = ch.dataset.title;
			links.forEach(function (a, n) {
				if (n === idx) a.setAttribute('aria-current', 'true');
				else a.removeAttribute('aria-current');
			});
		}

		// Side B starts once the black wipe in the Why chapter is underway.
		var w = why.getBoundingClientRect();
		var sideB = -w.top >= 0.2 * (w.height - innerHeight);
		folio.classList.toggle('is-b', sideB);
		folio.classList.toggle('is-dark', sideB && ch.id !== 'notes');
		folio.classList.toggle('is-on', hero.getBoundingClientRect().bottom < innerHeight * 0.5);

		if (!reduce) folio.style.setProperty('--spin', (scrollY * 0.35) + 'deg');
	}

	function request() {
		if (!queued) { queued = true; requestAnimationFrame(update); }
	}

	addEventListener('scroll', request, { passive: true });
	addEventListener('resize', measure);
	addEventListener('load', measure);
	if (document.fonts) document.fonts.ready.then(function () { measure(); if (sc) sc.layout(); });
	measure();

	// ---- Study monitor: same rules as website.js (pass at 5.5, 60 EC in the year).
	var monitor = document.querySelector('[data-monitor]');
	if (!monitor || !window.fetch) return;

	fetch('dashboard.html')
		.then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
		.then(function (html) {
			var doc = new DOMParser().parseFromString(html, 'text/html');
			var earned = 0, sum = 0, graded = 0, courses = 0;
			doc.querySelectorAll('tbody tr').forEach(function (row) {
				var g = row.querySelector('.grade'), e = row.querySelector('.ec');
				if (!g || !e) return;
				courses++;
				var grade = parseFloat(g.textContent.replace(',', '.'));
				if (isNaN(grade)) return;
				graded++;
				sum += grade;
				if (grade >= 5.5) earned += parseFloat(e.textContent) || 0;
			});
			if (!courses) return;

			var values = {
				earned: earned,
				average: graded ? sum / graded : 0,
				graded: graded,
				courses: courses
			};
			monitor.hidden = false;
			measure();
			if (sc) sc.layout();

			function show(t) {
				Object.keys(values).forEach(function (k) {
					var el = monitor.querySelector('[data-live="' + k + '"]');
					var v = values[k] * t;
					el.textContent = k === 'average' ? (graded ? v.toFixed(1) : '--') : Math.round(v);
				});
			}
			function run() {
				monitor.style.setProperty('--fill', Math.min(earned, 60) / 60);
				if (reduce) { show(1); return; }
				var t0 = 0;
				(function frame(now) {
					if (!t0) t0 = now;
					var t = Math.min((now - t0) / 1400, 1);
					show(1 - Math.pow(1 - t, 3));
					if (t < 1) requestAnimationFrame(frame);
				})(performance.now());
			}
			show(0);
			if (!('IntersectionObserver' in window)) { run(); return; }
			var io = new IntersectionObserver(function (entries) {
				if (entries[0].intersectionRatio >= 0.5) { io.disconnect(); run(); }
			}, { threshold: 0.5 });
			io.observe(monitor);
		})
		.catch(function () { /* opened from disk or offline: the chapter still reads fine without numbers */ });
})();
