/********************************************************************
 *	Kalendae, a framework agnostic javascript date picker           *
 *	Copyright(c) 2013 Jarvis Badgley (chipersoft@gmail.com)         *
 *	http://github.com/ChiperSoft/Kalendae                           *
 *	Version 0.4.1                                                   *
 ********************************************************************/

(function (undefined) {

var today, moment;

var Kalendae = function (targetElement, options) {
	if (typeof document.addEventListener !== 'function' && !util.isIE8()) return;

	//if the first argument isn't an element and isn't a string, assume that it is the options object
	var is_element = false;
	try {
		is_element = targetElement instanceof Element;
	}
	catch (err) {
		is_element = !!targetElement && is_element.nodeType === 1;
	}
	if (!(is_element || typeof(targetElement) === 'string')) options = targetElement;

	var self = this,
		classes = self.classes,
		opts = self.settings = util.merge(self.defaults, {attachTo:targetElement}, options || {}),
		$container = self.container = util.make('div', {'class':classes.container}),
		calendars = self.calendars = [],
		startDay = moment().day(opts.weekStart),
		vsd,
		columnHeaders = [],
		$cal,
		$title,
		$caption,
		$header,
		$days, dayNodes = [],
		$span,
		i = 0,
		j = opts.months;

	if (util.isIE8()) util.addClassName($container, 'ie8');

	//generate the column headers (Su, Mo, Tu, etc)
	i = 7;
	while (i--) {
		columnHeaders.push( startDay.format(opts.columnHeaderFormat) );
		startDay.add('days',1);
	}

	//setup publish/subscribe and apply any subscriptions passed in settings
	MinPubSub(self);
	if (typeof opts.subscribe === 'object') {
		for (i in opts.subscribe) if (opts.subscribe.hasOwnProperty(i)) {
			self.subscribe(i, opts.subscribe[i]);
		}
	}

	//process default selected dates
	self._sel = [];
	if (!!opts.selected) self.setSelected(opts.selected, false);

	//set the view month
	if (!!opts.viewStartDate) {
		vsd = moment(opts.viewStartDate, opts.format);
	} else if (self._sel.length > 0) {
		vsd = moment(self._sel[0]);
	} else {
		vsd = moment();
	}
	self.viewStartDate = vsd.date(1);

	var viewDelta = ({
		'past'          : opts.months-1,
		'today-past'    : opts.months-1,
		'any'           : opts.months>2?Math.floor(opts.months/2):0,
		'today-future'  : 0,
		'future'        : 0
	})[this.settings.direction];


	if (viewDelta && moment().month()==moment(self.viewStartDate).month()){
		self.viewStartDate = moment(self.viewStartDate).subtract({M:viewDelta}).date(1);
	}


	if (typeof opts.blackout === 'function') {
		self.blackout = opts.blackout;
	} else if (!!opts.blackout) {
		var bdates = parseDates(opts.blackout, opts.parseSplitDelimiter, opts.format);
		self.blackout = function (input) {
			input = moment(input).yearDay();
			if (input < 1 || !self._sel) return false;
			var i = bdates.length;
			while (i--) if (bdates[i].yearDay() === input) return true;
			return false;
		};
	} else {
		self.blackout = function () {return false;};
	}


	self.direction = self.directions[opts.direction] ? self.directions[opts.direction] : self.directions['any'];


	//for the total months setting, generate N calendar views and add them to the container
	j = Math.max(opts.months,1);
	while (j--) {
		$cal = util.make('div', {'class':classes.calendar}, $container);

		$cal.setAttribute('data-cal-index', j);
		if (opts.months > 1) {
			if (j == Math.max(opts.months-1,1)) util.addClassName($cal, classes.monthFirst);
			else if (j === 0) util.addClassName($cal, classes.monthLast);
			else util.addClassName($cal, classes.monthMiddle);
		}

		//title bar
		$title = util.make('div', {'class':classes.title}, $cal);
		if(!opts.useYearNav){
			util.addClassName($title, classes.disableYearNav);
		}
		util.make('a', {'class':classes.previousYear}, $title);           //previous button
		util.make('a', {'class':classes.previousMonth}, $title);          //previous button
		util.make('a', {'class':classes.nextYear}, $title);               //next button
		util.make('a', {'class':classes.nextMonth}, $title);              //next button
		$caption = util.make('span', {'class':classes.caption}, $title);  //title caption

		//column headers
		$header = util.make('div', {'class':classes.header}, $cal);
		i = 0;
		do {
			$span = util.make('span', {}, $header);
			$span.innerHTML = columnHeaders[i];
		} while (++i < 7);

		//individual day cells
		$days = util.make('div', {'class':classes.days}, $cal);
		i = 0;
		dayNodes = [];
		while (i++ < 42) {
			dayNodes.push(util.make('span', {}, $days));
		}

		//store each calendar view for easy redrawing
		calendars.push({
			caption:$caption,
			days:dayNodes
		});

		if (j) util.make('div', {'class':classes.monthSeparator}, $container);
	}

	self.draw();

	util.addEvent($container, 'mousedown', function (event, target) {
		var clickedDate;
		if (util.hasClassName(target, classes.nextMonth)) {
		//NEXT MONTH BUTTON
			if (!self.disableNext && self.publish('view-changed', self, ['next-month']) !== false) {
				self.viewStartDate.add('months',1);
				self.draw();
			}
			return false;

		} else if (util.hasClassName(target, classes.previousMonth)) {
		//PREVIOUS MONTH BUTTON
			if (!self.disablePreviousMonth && self.publish('view-changed', self, ['previous-month']) !== false) {
				self.viewStartDate.subtract('months',1);
				self.draw();
			}
			return false;

		} else if (util.hasClassName(target, classes.nextYear)) {
		//NEXT MONTH BUTTON
			if (!self.disableNext && self.publish('view-changed', self, ['next-year']) !== false) {
				self.viewStartDate.add('years',1);
				self.draw();
			}
			return false;

		} else if (util.hasClassName(target, classes.previousYear)) {
		//PREVIOUS MONTH BUTTON
			if (!self.disablePreviousMonth && self.publish('view-changed', self, ['previous-year']) !== false) {
				self.viewStartDate.subtract('years',1);
				self.draw();
			}
			return false;



		} else if (util.hasClassName(target.parentNode, classes.days) && util.hasClassName(target, classes.dayActive) && (clickedDate = target.getAttribute('data-date'))) {
		//DAY CLICK
			clickedDate = moment(clickedDate, opts.dayAttributeFormat).hours(12);
			if (self.publish('date-clicked', self, [clickedDate]) !== false) {

				switch (opts.mode) {
					case 'multiple':
						if (!self.addSelected(clickedDate)) self.removeSelected(clickedDate);
						break;
					case 'range':
						self.addSelected(clickedDate);
						break;
					case 'single':
						/* falls through */
					default:
						self.addSelected(clickedDate);
						break;
				}

			}
			return false;

		}
		return false;
	});


	if (!!(opts.attachTo = util.$(opts.attachTo))) {
		opts.attachTo.appendChild($container);
	}

};

Kalendae.prototype = {
	defaults : {
		attachTo              :null,            /* the element to attach the root container to. can be string or DOMElement */
		months                :1,               /* total number of months to display side by side */
		weekStart             :0,               /* day to use for the start of the week. 0 is Sunday */
		direction             :'any',           /* past, today-past, any, today-future, future */
		directionScrolling    :true,            /* if a direction other than any is defined, prevent scrolling out of range */
		viewStartDate         :null,            /* date in the month to display.  When multiple months, this is the left most */
		blackout              :null,            /* array of dates, or function to be passed a date */
		selected              :null,            /* dates already selected.  can be string, date, or array of strings or dates. */
		mode                  :'single',        /* single, multiple, range */
		dayOutOfMonthClickable:false,
		format                :null,            /* string used for parsing dates. */
		subscribe             :null,            /* object containing events to subscribe to */

		columnHeaderFormat    :'dd',            /* number of characters to show in the column headers */
		titleFormat           :'MMMM, YYYY',    /* format mask for month titles. See momentjs.com for rules */
		dayNumberFormat       :'D',             /* format mask for individual days */
		dayAttributeFormat    :'YYYY-MM-DD',    /* format mask for the data-date attribute set on every span */
		parseSplitDelimiter   : /,\s*|\s+-\s+/, /* regex to use for splitting multiple dates from a passed string */
		rangeDelimiter        :' - ',           /* string to use between dates when outputting in range mode */
		multipleDelimiter     :', ',            /* string to use between dates when outputting in multiple mode */
		useYearNav            :true,

		dateClassMap          :{}
	},
	classes : {
		container       :'kalendae',
		calendar        :'k-calendar',
		monthFirst      :'k-first-month',
		monthMiddle     :'k-middle-month',
		monthLast       :'k-last-month',
		title           :'k-title',
		previousMonth   :'k-btn-previous-month',
		nextMonth       :'k-btn-next-month',
		previousYear    :'k-btn-previous-year',
		nextYear        :'k-btn-next-year',
		caption         :'k-caption',
		header          :'k-header',
		days            :'k-days',
		dayOutOfMonth   :'k-out-of-month',
		dayInMonth      :'k-in-month',
		dayActive       :'k-active',
		daySelected     :'k-selected',
		dayInRange      :'k-range',
		dayToday        :'k-today',
		monthSeparator  :'k-separator',
		disablePreviousMonth    :'k-disable-previous-month-btn',
		disableNextMonth        :'k-disable-next-month-btn',
		disablePreviousYear     :'k-disable-previous-year-btn',
		disableNextYear         :'k-disable-next-year-btn',
		disableYearNav          :'k-disable-year-nav'
	},

	disablePreviousMonth: false,
	disableNextMonth: false,
	disablePreviousYear: false,
	disableNextYear: false,

	directions: {
		'past'          :function (date) {return moment(date).yearDay() >= today.yearDay();},
		'today-past'    :function (date) {return moment(date).yearDay() > today.yearDay();},
		'any'           :function (date) {return false;},
		'today-future'  :function (date) {return moment(date).yearDay() < today.yearDay();},
		'future'        :function (date) {return moment(date).yearDay() <= today.yearDay();}
	},

	getSelectedAsDates : function () {
		var out = [];
		var i=0, c = this._sel.length;
		for (;i<c;i++) {
			out.push(this._sel[i].toDate());
		}
		return out;
	},

	getSelectedAsText : function (format) {
		var out = [];
		var i=0, c = this._sel.length;
		for (;i<c;i++) {
			out.push(this._sel[i].format(format || this.settings.format || 'YYYY-MM-DD'));
		}
		return out;
	},

	getSelectedRaw : function () {
		var out = [];
		var i=0, c = this._sel.length;
		for (;i<c;i++) {
			out.push(moment(this._sel[i]));
		}
		return out;
	},

	getSelected : function (format) {
		var sel = this.getSelectedAsText(format);
		switch (this.settings.mode) {
			case 'range':
				sel.splice(2); //shouldn't be more than two, but lets just make sure.
				return sel.join(this.settings.rangeDelimiter);

			case 'multiple':
				return sel.join(this.settings.multipleDelimiter);

			case 'single':
				/* falls through */
			default:
				return sel[0];
		}
	},

	isSelected : function (input) {
		input = moment(input).yearDay();
		if (input < 1 || !this._sel || this._sel.length < 1) return false;

		switch (this.settings.mode) {
			case 'range':
				var a = this._sel[0] ? this._sel[0].yearDay() : 0,
					b = this._sel[1] ? this._sel[1].yearDay() : 0;

				if (a === input || b === input) return 1;
				if (!a || !b) return 0;

				if ((input > a && input < b) || (a<b && input < a && input > b))  return -1;
				return false;

			case 'multiple':
				var i = this._sel.length;
				while (i--) {
					if (this._sel[i].yearDay() === input) {
						return true;
					}
				}
				return false;


			case 'single':
				/* falls through */
			default:
				return (this._sel[0] && (this._sel[0].yearDay() === input));
		}

		return false;
	},

	setSelected : function (input, draw) {
		var i,
			new_dates = parseDates(input, this.settings.parseSplitDelimiter, this.settings.format),
			old_dates = parseDates(this.getSelected(), this.settings.parseSplitDelimiter, this.settings.format);

		i = old_dates.length;
		while(i--) { this.removeSelected(old_dates[i], draw); }

		i = new_dates.length;
		while(i--) { this.addSelected(new_dates[i], draw); }

		if (draw !== false) this.draw();
	},

	addSelected : function (date, draw) {
		date = moment(date, this.settings.format).hours(12);

		if(this.settings.dayOutOfMonthClickable && this.settings.mode !== 'range'){ this.makeSelectedDateVisible(date); }

		switch (this.settings.mode) {
			case 'multiple':
				if (!this.isSelected(date)) this._sel.push(date);
				else return false;
				break;
			case 'range':

				if (this._sel.length !== 1) this._sel = [date];
				else {
					if (date.yearDay() > this._sel[0].yearDay()) this._sel[1] = date;
					else this._sel = [date, this._sel[0]];
				}
				break;
			case 'single':
				/* falls through */
			default:
				this._sel = [date];
				break;
		}
		this._sel.sort(function (a,b) {return a.yearDay() - b.yearDay();});
		this.publish('change', this, [date]);
		if (draw !== false) this.draw();
		return true;
	},

	makeSelectedDateVisible: function (date) {
		outOfViewMonth = moment(date).date('1').diff(this.viewStartDate,'months');

		if(outOfViewMonth < 0){
			this.viewStartDate.subtract('months',1);
		}
		else if(outOfViewMonth > 0 && outOfViewMonth >= this.settings.months){
			this.viewStartDate.add('months',1);
		}
	},

	removeSelected : function (date, draw) {
		date = moment(date, this.settings.format).hours(12);
		var i = this._sel.length;
		while (i--) {
			if (this._sel[i].yearDay() === date.yearDay()) {
				this._sel.splice(i,1);
				this.publish('change', this, [date]);
				if (draw !== false) this.draw();
				return true;
			}
		}
		return false;
	},

	draw : function draw() {
		// return;
		var month = moment(this.viewStartDate).hours(12), //force middle of the day to avoid any weird date shifts
			day,
			classes = this.classes,
			cal,
			$span,
			klass,
			i=0, c,
			j=0, k,
			s,
			dateString,
			opts = this.settings,
			diff;

		c = this.calendars.length;

		do {
			day = moment(month).date(1);
			day.day( day.day() < this.settings.weekStart ? this.settings.weekStart-7 : this.settings.weekStart);
			//if the first day of the month is less than our week start, back up a week

			cal = this.calendars[i];
			cal.caption.innerHTML = month.format(this.settings.titleFormat);
			j = 0;
			do {
				$span = cal.days[j];

				klass = [];

				s = this.isSelected(day);

				if (s) klass.push(({'-1':classes.dayInRange,'1':classes.daySelected, 'true':classes.daySelected})[s]);

				if (day.month() != month.month()) klass.push(classes.dayOutOfMonth);
				else klass.push(classes.dayInMonth);

				if (!(this.blackout(day) || this.direction(day) || (day.month() != month.month() && opts.dayOutOfMonthClickable === false)) || s>0) klass.push(classes.dayActive);

				if (day.yearDay() === today.yearDay()) klass.push(classes.dayToday);

				dateString = day.format(this.settings.dayAttributeFormat);
				if (opts.dateClassMap[dateString]) klass.push(opts.dateClassMap[dateString]);

				$span.innerHTML = day.format(opts.dayNumberFormat);
				$span.className = klass.join(' ');
				$span.setAttribute('data-date', dateString);


				day.add('days',1);
			} while (++j < 42);
			month.add('months',1);
		} while (++i < c);

		if (opts.directionScrolling) {
			if (opts.direction==='today-past' || opts.direction==='past') {
				diff = month.add({m:1}).diff(moment(), 'months', true);
				if (diff <= 0) {
					this.disableNextMonth = false;
					util.removeClassName(this.container, classes.disableNextMonth);
				} else {
					this.disableNextMonth = true;
					util.addClassName(this.container, classes.disableNextMonth);
				}

			} else if (opts.direction==='today-future' || opts.direction==='future') {
				diff = month.subtract({m:1}).diff(moment(), 'months', true);
				if (diff > opts.months) {
					this.disablePreviousMonth = false;
					util.removeClassName(this.container, classes.disablePreviousMonth);
				} else {
					this.disablePreviousMonth = true;
					util.addClassName(this.container, classes.disablePreviousMonth);
				}

			}


			if (opts.direction==='today-past' || opts.direction==='past') {
				diff = month.add({m:12}).diff(moment(), 'months', true);
				if (diff <= -11) {
					this.disableNextYear = false;
					util.removeClassName(this.container, classes.disableNextYear);
				} else {
					this.disableNextYear = true;
					util.addClassName(this.container, classes.disableNextYear);
				}

			} else if (opts.direction==='today-future' || opts.direction==='future') {
				diff = month.subtract({m:12}).diff(moment(), 'months', true);
				if (diff > (11 + opts.months)) {
					this.disablePreviousYear = false;
					util.removeClassName(this.container, classes.disablePreviousYear);
				} else {
					this.disablePreviousYear = true;
					util.addClassName(this.container, classes.disablePreviousYear);
				}

			}

		}
	}
};

var parseDates = function (input, delimiter, format) {
	var output = [];

	if (typeof input === 'string') {
		input = input.split(delimiter);
	} else if (!util.isArray(input)) {
		input = [input];
	}

	var c = input.length,
		i = 0;

	do {
		if (input[i]) output.push( moment(input[i], format).hours(12) );
	} while (++i < c);

	return output;
};



window.Kalendae = Kalendae;

var util = Kalendae.util = {

	isIE8: function() {
		return !!( (/msie 8./i).test(navigator.appVersion) && !(/opera/i).test(navigator.userAgent) && window.ActiveXObject && XDomainRequest && !window.msPerformance );
	},

// ELEMENT FUNCTIONS

	$: function (elem) {
		return (typeof elem == 'string') ? document.getElementById(elem) : elem;
	},

	$$: function (selector) {
		return document.querySelectorAll(selector);
	},

	make: function (tagName, attributes, attach) {
		var k, e = document.createElement(tagName);
		if (!!attributes) for (k in attributes) if (attributes.hasOwnProperty(k)) e.setAttribute(k, attributes[k]);
		if (!!attach) attach.appendChild(e);
		return e;
	},

	// Returns true if the DOM element is visible, false if it's hidden.
	// Checks if display is anything other than none.
	isVisible: function (elem) {
		// shamelessly copied from jQuery
		return elem.offsetWidth > 0 || elem.offsetHeight > 0;
	},

	getStyle: function (elem, styleProp) {
		var y;
		if (elem.currentStyle) {
			y = elem.currentStyle[styleProp];
		} else if (window.getComputedStyle) {
			y = window.getComputedStyle(elem, null)[styleProp];
		}
		return y;
	},

	domReady:function (f){/in/.test(document.readyState) ? setTimeout(function() {util.domReady(f);},9) : f()},

	// Adds a listener callback to a DOM element which is fired on a specified
	// event.  Callback is sent the event object and the element that triggered the event
	addEvent: function (elem, eventName, callback) {
		var listener = function (event) {
			event = event || window.event;
			var target = event.target || event.srcElement;
			var block = callback.apply(elem, [event, target]);
			if (block === false) {
				if (!!event.preventDefault) event.preventDefault();
				else {
					event.returnValue = false;
					event.cancelBubble = true;
				}
			}
			return block;
		};
		if (elem.attachEvent) { // IE only.  The "on" is mandatory.
			elem.attachEvent("on" + eventName, listener);
		} else { // Other browsers.
			elem.addEventListener(eventName, listener, false);
		}
		return listener;
	},

	// Removes a listener callback from a DOM element which is fired on a specified
	// event.
	removeEvent: function (elem, event, listener) {
		if (elem.detachEvent) {	// IE only.  The "on" is mandatory.
			elem.detachEvent("on" + event, listener);
		} else { // Other browsers.
			elem.removeEventListener(event, listener, false);
		}
	},

	hasClassName: function(elem, className) { //copied and modified from Prototype.js
		if (!(elem = util.$(elem))) return false;
		var eClassName = elem.className;
		return (eClassName.length > 0 && (eClassName == className || new RegExp("(^|\\s)" + className + "(\\s|$)").test(eClassName)));
	},

	addClassName: function(elem, className) { //copied and modified from Prototype.js
		if (!(elem = util.$(elem))) return;
		if (!util.hasClassName(elem, className)) elem.className += (elem.className ? ' ' : '') + className;
	},

	removeClassName: function(elem, className) { //copied and modified from Prototype.js
		if (!(elem = util.$(elem))) return;
		elem.className = util.trimString(elem.className.replace(new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' '));
	},

	isFixed: function (elem) {
		do {
			if (util.getStyle(elem, 'position') === 'fixed') return true;
		} while ((elem = elem.offsetParent));
		return false;
	},

	scrollContainer: function (elem) {
		do {
			var overflow = util.getStyle(elem, 'overflow');
			if (overflow === 'auto' || overflow === 'scroll') return elem;
		} while ((elem = elem.parentNode) && elem != window.document.body);
		return null;
	},

	getPosition: function (elem, isInner) {
		var x = elem.offsetLeft,
			y = elem.offsetTop,
			r = {};

		if (!isInner) {
			while ((elem = elem.offsetParent)) {
				x += elem.offsetLeft;
				y += elem.offsetTop;
			}
		}

		r[0] = r.left = x;
		r[1] = r.top = y;
		return r;
	},

	getHeight: function (elem) {
		return elem.offsetHeight || elem.scrollHeight;
	},

	getWidth: function (elem) {
		return elem.offsetWidth || elem.scrollWidth;
	},


// TEXT FUNCTIONS

	trimString: function (input) {
		return input.replace(/^\s+/, '').replace(/\s+$/, '');
	},


// OBJECT FUNCTIONS

	merge: function () {
		/* Combines multiple objects into one.
		 * Syntax: util.extend([true], object1, object2, ... objectN)
		 * If first argument is true, function will merge recursively.
		 */

		var deep = (arguments[0]===true),
			d = {},
			i = deep?1:0;

		var _c = function (a, b) {
			if (typeof b !== 'object') return;
			for (var k in b) if (b.hasOwnProperty(k)) {
				//if property is an object or array, merge the contents instead of overwriting, if extend() was called as such
				if (deep && typeof a[k] === 'object' && typeof b[k] === 'object') _update(a[k], b[k]);
				else a[k] = b[k];
			}
			return a;
		};

		for (; i < arguments.length; i++) {
			_c(d, arguments[i]);
		}
		return d;
	},

	isArray: function (array) {
		return Object.prototype.toString.call(array) == "[object Array]"
	}
};


//auto-initializaiton code
if (typeof document.addEventListener === 'function') Kalendae.util.domReady(function () {
	var els = util.$$('.auto-kal'),
		i = els.length,
		e,
		options,
		optionsRaw;

	while (i--) {
		e = els[i];
		optionsRaw = e.getAttribute('data-kal');
		options = (optionsRaw == null || optionsRaw == "") ? {} : (new Function('return {' + optionsRaw + '};'))();

		if (e.tagName === 'INPUT') {
			//if element is an input, bind a popup calendar to the input.
			new Kalendae.Input(e, options);
		} else {
			//otherwise, insert a flat calendar into the element.
			new Kalendae(util.merge(options, {attachTo:e}));
		}

	}
});
Kalendae.Input = function (targetElement, options) {
	if (typeof document.addEventListener !== 'function'  && !util.isIE8()) return;

	var $input = this.input = util.$(targetElement),
		overwriteInput,
		$closeButton;

	if (!$input || $input.tagName !== 'INPUT') throw "First argument for Kalendae.Input must be an <input> element or a valid element id.";

	var self = this,
		classes = self.classes,
		opts = self.settings = util.merge(self.defaults, options);

	//force attachment to the body
	opts.attachTo = window.document.body;

	//if no override provided, use the input's contents
	if (!opts.selected) opts.selected = $input.value;
	else overwriteInput = true;

	//call our parent constructor
	Kalendae.call(self, opts);

	//create the close button
	if (opts.closeButton) {
		$closeButton = util.make('a', {'class':classes.closeButton}, self.container);
		util.addEvent($closeButton, 'click', function () {
			$input.blur();
		});
	}

	if (overwriteInput) $input.value = self.getSelected();

	var $container = self.container,
		noclose = false;

	$container.style.display = 'none';
	util.addClassName($container, classes.positioned);

	util.addEvent($container, 'mousedown', function (event, target) {
		noclose = true; //IE8 doesn't obey event blocking when it comes to focusing, so we have to do this shit.
	});
	util.addEvent(window.document, 'mousedown', function (event, target) {
		noclose = false;
	});

	util.addEvent($input, 'focus', function () {
		self.setSelected(this.value);
		self.show();
	});

	util.addEvent($input, 'blur', function () {
		if (noclose && util.isIE8()) {
			noclose = false;
			$input.focus();
		}
		else self.hide();
	});
	util.addEvent($input, 'keyup', function (event) {
		self.setSelected(this.value);
	});

	var $scrollContainer = util.scrollContainer($input);

	if( $scrollContainer ) {

		// Hide calendar when $scrollContainer is scrolled
		util.addEvent($scrollContainer, 'scroll', function (event) {
			$input.blur();
		});
	}

	self.subscribe('change', function () {
		$input.value = self.getSelected();
	});

};

Kalendae.Input.prototype = util.merge(Kalendae.prototype, {
	defaults : util.merge(Kalendae.prototype.defaults, {
		format: 'MM/DD/YYYY',
		side: 'bottom',
		closeButton: true,
		offsetLeft: 0,
		offsetTop: 0
	}),
	classes : util.merge(Kalendae.prototype.classes, {
		positioned : 'k-floating',
		closeButton: 'k-btn-close'
	}),

	show : function () {
		var $container = this.container,
			style = $container.style,
			$input = this.input,
			pos = util.getPosition($input),
			$scrollContainer = util.scrollContainer($input),
			scrollTop = $scrollContainer ? $scrollContainer.scrollTop : 0,
			opts = this.settings;

		style.display = '';
		switch (opts.side) {
			case 'left':
				style.left = (pos.left - util.getWidth($container) + opts.offsetLeft) + 'px';
				style.top  = (pos.top + opts.offsetTop - scrollTop) + 'px';
				break;
			case 'right':
				style.left = (pos.left + util.getWidth($input)) + 'px';
				style.top  = (pos.top + opts.offsetTop - scrollTop) + 'px';
				break;
			case 'top':
				style.left = (pos.left + opts.offsetLeft) + 'px';
				style.top  = (pos.top - util.getHeight($container) + opts.offsetTop - scrollTop) + 'px';
				break;
			case 'bottom':
				/* falls through */
			default:
				style.left = (pos.left + opts.offsetLeft) + 'px';
				style.top  = (pos.top + util.getHeight($input) + opts.offsetTop - scrollTop) + 'px';
				break;
		}

		style.position = util.isFixed($input) ? 'fixed' : 'absolute';

		this.publish('show', this);
	},

	hide : function () {
		this.container.style.display = 'none';
		this.publish('hide', this);
	}

});


/*!
* MinPubSub, modified for use on Kalendae
* Copyright(c) 2011 Daniel Lamb <daniellmb.com>
* https://github.com/daniellmb/MinPubSub
* MIT Licensed
*/

var MinPubSub = function(d){

	if (!d) d = this;

	// the topic/subscription hash
	var cache = d.c_ || {}; //check for "c_" cache for unit testing

	d.publish = function(/* String */ topic, /* Object */ target, /* Array? */ args){
		// summary:
		//		Publish some data on a named topic.
		// topic: String
		//		The channel to publish on
		// args: Array?
		//		The data to publish. Each array item is converted into an ordered
		//		arguments on the subscribed functions.
		//
		// example:
		//		Publish stuff on '/some/topic'. Anything subscribed will be called
		//		with a function signature like: function(a,b,c){ ... }
		//
		//		publish("/some/topic", ["a","b","c"]);

		var subs = cache[topic],
			len = subs ? subs.length : 0,
			r;

		//can change loop or reverse array if the order matters
		while(len--){
			r = subs[len].apply(target, args || []);
			if (typeof r === 'boolean') return r;
		}
	};

	d.subscribe = function(/* String */ topic, /* Function */ callback, /* Boolean */ topPriority){
		// summary:
		//		Register a callback on a named topic.
		// topic: String
		//		The channel to subscribe to
		// callback: Function
		//		The handler event. Anytime something is publish'ed on a
		//		subscribed channel, the callback will be called with the
		//		published array as ordered arguments.
		//
		// returns: Array
		//		A handle which can be used to unsubscribe this particular subscription.
		//
		// example:
		//		subscribe("/some/topic", function(a, b, c){ /* handle data */ });

		if(!cache[topic]){
			cache[topic] = [];
		}
		if (topPriority)
			cache[topic].push(callback);
		else
			cache[topic].unshift(callback);
		return [topic, callback]; // Array
	};

	d.unsubscribe = function(/* Array */ handle){
		// summary:
		//		Disconnect a subscribed function for a topic.
		// handle: Array
		//		The return value from a subscribe call.
		// example:
		//		var handle = subscribe("/some/topic", function(){});
		//		unsubscribe(handle);

		var subs = cache[handle[0]],
			callback = handle[1],
			len = subs ? subs.length : 0;

		while(len--){
			if(subs[len] === callback){
				subs.splice(len, 1);
			}
		}
	};

};
if (!Kalendae.moment) {
	if (window.moment) {
		Kalendae.moment = window.moment;
	} else {
		throw "Kalendae requires moment.js. You must use kalendae.standalone.js if moment is not available on the page.";
	}
}

moment = Kalendae.moment;

//function to reset the date object to 00:00 GMT
moment.fn.stripTime = function () {
	this._d = new Date(Math.floor(this._d.valueOf() / 86400000) * 86400000);
	return this;
};


//function to get the total number of days since the epoch.
moment.fn.yearDay = function (input) {
	var yearday = Math.floor(this._d / 86400000);
    return (typeof input === 'undefined') ? yearday :
        this.add({ d : input - yearday });
};

today = Kalendae.moment().stripTime();

if (typeof jQuery !== 'undefined' && (typeof document.addEventListener === 'function' || util.isIE8())) {
	jQuery.fn.kalendae = function (options) {
		this.each(function (i, e) {
			if (e.tagName === 'INPUT') {
				//if element is an input, bind a popup calendar to the input.
				$(e).data('kalendae', new Kalendae.Input(e, options));
			} else {
				//otherwise, insert a flat calendar into the element.
				$(e).data('kalendae', new Kalendae($.extend({}, {attachTo:e}, options)));
			}
		});
		return this;
	};
}


})();
