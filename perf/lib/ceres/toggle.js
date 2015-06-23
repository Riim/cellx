(function() {
	var reWrapper = /(?:^|\s)\-jsw(?:\s|$)/;
	var reToggle = /(?:^|\s)\-js(t|s)(?:\s|$)/;

	document.addEventListener('click', function(evt) {
		var docEl = document.documentElement;
		var el = evt.target;

		while (el != docEl) {
			if (reToggle.test(el.className)) {
				if (el.tagName != 'INPUT') {
					evt.preventDefault();
				}

				var toogle = RegExp.$1 == 't';
				var cl = el.rel || el.getAttribute('data-rel') || (el.nodeName == 'INPUT' && el.value) || '-jse';

				do {
					el = el.parentNode;

					if (reWrapper.test(el.className)) {
						if (toogle) {
							$(el).toggleClass(cl);
						} else {
							el.className = '-jsw ' + cl;
						}

						return;
					}
				} while (el != docEl);

				return;
			}

			el = el.parentNode;
		}
	}, false);
})();
