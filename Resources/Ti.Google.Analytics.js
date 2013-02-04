/*jslint maxerr:1000 */
/*
The MIT License

Copyright (c) 2010 Roger Chapman

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function() {
  var initializing = false, fnTest = /xyz/.test(function() {
    var xyz;
  }) ? /\b_super\b/ : /.*/;
  // The base Class implementation (does nothing)
  this.AnalyticsBase = function() {
  };

  // Create a new Class that inherits from this class
  AnalyticsBase.extend = function(prop) {
    var _super = this.prototype;

    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;

    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
          typeof _super[name] == "function" && fnTest.test(prop[name]) ?
          (function(name, fn) {
            return function() {
              var tmp = this._super;

              // Add a new ._super() method that is the same method
              // but on the super-class
              this._super = _super[name];

              // The method only need to be bound temporarily, so we
              // remove it when we're done executing
              var ret = fn.apply(this, arguments);
              this._super = tmp;

              return ret;
            };
          })(name, prop[name]) :
          prop[name];
    }

    // The dummy class constructor
    function AnalyticsBase() {
      // All construction is actually done in the init method
      if (!initializing && this.init)
        this.init.apply(this, arguments);
    }

    // Populate our constructed prototype object
    AnalyticsBase.prototype = prototype;

    // Enforce the constructor to be what we expect
    AnalyticsBase.constructor = AnalyticsBase;

    // And make this class extendable
    AnalyticsBase.extend = arguments.callee;

    return AnalyticsBase;
  };
})();

var Analytics = AnalyticsBase.extend({

	//Constants
	_PAGEVIEW:'__##PAGEVIEW##__',
	_USER_AGENT:'GoogleAnalytics/1.0 ('+ Titanium.Platform.username +'; U; CPU '+ Titanium.Platform.name + ' ' + Titanium.Platform.version + ' like Mac OS X; ' + Titanium.Platform.locale + '-' + Titanium.Locale.getCurrentCountry() + ')',
	
	//Private properties
	_accountId: undefined,
	_db: undefined,
	_session: undefined,
	_storedEvents:0,
	_dispatcherIsBusy:false,
	_httpClient:undefined,
	
	//Public properties
	enabled: true,
	
	/*
	* Constructor: 
	* var gaModule = require('Ti.Google.Analytics');
	*	var analytics = new gaModule('UA-XXXXXX-X');
	*/
	init: function(accountId){
		if(Titanium.Platform.osname === 'android') {
			this._USER_AGENT = 'GoogleAnalytics/1.0 (Linux; U; Android ' + Titanium.Platform.version + '; ' + Titanium.Locale.currentLocale + '; ' + Titanium.Platform.model + ')';
		}
		this._accountId = accountId;
		this._db = Titanium.Database.open('analytics');
		this._initialize_db();
	},
	
	//Main public methods
	start: function(dispatchPeriod,isAsync){
        this._isAsync = (isAsync == (undefined || true) ? true : false);
		if (this.enabled) {
			this._startNewVisit();
			this._httpClient = Titanium.Network.createHTTPClient();

			var context = this;
			setInterval(function(){
				context._dispatchEvents();
			}, dispatchPeriod * 1000);
		}
	},
	
	stop: function(){
		this.enabled = false;
	},
	
	trackPageview: function(pageUrl){
		
		if (this._session && this.enabled) {
					
			this._createEvent(this._PAGEVIEW, pageUrl, null, -1);
		}
	},
	
	trackEvent: function(category, action, label, value){
		if (this._session && this.enabled) {
			this._createEvent(category, action, label, value);
		}
	},
	
	reset:function(){
		Titanium.App.Properties.setString('analytics_session', null);	
	},
	
	// Private methods
	_initialize_db: function(){
	
		this._db.execute('CREATE TABLE IF NOT EXISTS events (' +
		'event_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
		'user_id INTEGER NOT NULL, ' +
		'random_val INTEGER NOT NULL, ' +
		'timestamp_first INTEGER NOT NULL, ' +
		'timestamp_previous INTEGER NOT NULL, ' +
		'timestamp_current INTEGER NOT NULL, ' +
		'visits INTEGER NOT NULL, ' +
		'category STRING NOT NULL, ' +
		'action STRING NOT NULL, ' +
		'label STRING NULL, ' +
		'value INTEGER NOT NULL);');
		
		var rowCount = this._db.execute('SELECT COUNT(*) FROM events');
	    while (rowCount.isValidRow()) {
	        this._storedEvents = rowCount.field(0);
	        rowCount.next();
	    }
	    rowCount.close();
	},
	
	_startNewVisit: function(){
		
		var now = Math.round(new Date().getTime() / 1000);
		if (!Titanium.App.Properties.hasProperty('analytics_session')) {
			
			this._session = {
				user_id:Math.floor(Math.random()*9999999999),
				timestamp_first:now,
				timestamp_previous:now,
				timestamp_current:now,
				visits:1
			};
		}
		else {
			var oldSession = JSON.parse(Titanium.App.Properties.getString('analytics_session'));
			
			this._session = {
				user_id:oldSession.user_id,
				timestamp_first:oldSession.timestamp_first,
				timestamp_previous:oldSession.timestamp_current,
				timestamp_current:now,
				visits:oldSession.visits + 1
			};

		}
		
		Titanium.App.Properties.setString('analytics_session', JSON.stringify(this._session));	
		
	},
	
	_createEvent : function(category, action, label, value) {
		
		if(this._storedEvents >= 1000) {
			Titanium.API.warn('Analytics: Store full, not storing last event');
			return;
		}

		var rnd = Math.floor(Math.random()*999999999);
		
		this._db.execute('INSERT INTO events (user_id, random_val, timestamp_first, timestamp_previous, timestamp_current, visits, category, action, label, value) VALUES (?,?,?,?,?,?,?,?,?,?)', this._session.user_id, rnd, this._session.timestamp_first, this._session.timestamp_previous, this._session.timestamp_current, this._session.visits, category, action, label, value);
		this._storedEvents++;
	},
	
	_dispatchEvents : function() {
		
		if(!this._dispatcherIsBusy && Titanium.Network.online){
			
			this._dispatcherIsBusy = true;
			
			var eventRows = this._db.execute('SELECT * FROM events');
			
			var eventsToDelete = [];
			
			while(eventRows.isValidRow()) {
				
				var event = {
					event_id:eventRows.fieldByName('event_id'),
					user_id:eventRows.fieldByName('user_id'),
					random_val:eventRows.fieldByName('random_val'),
					timestamp_first:eventRows.fieldByName('timestamp_first'),
					timestamp_previous:eventRows.fieldByName('timestamp_previous'),
					timestamp_current:eventRows.fieldByName('timestamp_current'),
					visits:eventRows.fieldByName('visits'),
					category:eventRows.fieldByName('category'),
					action:eventRows.fieldByName('action'),
					label:eventRows.fieldByName('label'),
					value:eventRows.fieldByName('value'),
				};
				
				var path = this._constructRequestPath(event);
				
				this._httpClient.open('GET', 'http://www.google-analytics.com' + path, this._isAsync);
				this._httpClient.setRequestHeader('User-Agent', this._USER_AGENT);
				this._httpClient.send();
				
				eventsToDelete.push(event.event_id);
				
				eventRows.next();
			}
			
			eventRows.close();		
			
			for(var i = 0; i < eventsToDelete.length; i++) {
				this._db.execute('DELETE FROM events WHERE event_id = ?', eventsToDelete[i]);
			}	
			
			this._dispatcherIsBusy = false;
		}
	},
	
	_constructRequestPath : function(event) {
		var path = new StringBuilder('/__utm.gif');
		path.append('?utmwv=4.4mi');
		path.append('&utmn=').append(event.random_val);
		path.append('&utmcs=UTF-8');
		path.append('&utmsr=' + Titanium.Platform.displayCaps.platformWidth + 'x' + Titanium.Platform.displayCaps.platformHeight);
		path.append('&utmsc=24-bit');
		path.append('&utmul='+ Titanium.Platform.locale + '-' + Titanium.Platform.countryCode);
		
		path.append('&utmac=').append(this._accountId);
		
		if (event.category == this._PAGEVIEW) {
		    //just page tracking
		    path.append('&utmp=').append(event.action);
	    } else {
		    //event tracking
		    var tmpValue = (event.value > 0) ? event.value : 1;
		    path.append('&utmt=event');
		    path.append('&utme=5('+event.category+'*'+event.action+'*'+event.label+')('+tmpValue+')');
		}
		
		path.append('&utmcc=');
		
		var cookie = new StringBuilder('__utma=');
		cookie.append('737325').append('.');
		cookie.append(event.user_id).append('.');
		cookie.append(event.timestamp_first).append(".");
		cookie.append(event.timestamp_previous).append(".");
		cookie.append(event.timestamp_current).append(".");
		cookie.append(event.visits);
		
		path.append(cookie.toString());
		
		return path.toString();
	},
});

// Initializes a new instance of the StringBuilder class
// and appends the given value if supplied
function StringBuilder(value)
{
    this.strings = new Array('');
    this.append(value);
};

// Appends the given value to the end of this instance.
StringBuilder.prototype.append = function (value)
{
    if (value) {
        this.strings.push(value);
    }
	return this;
};

// Clears the string buffer
StringBuilder.prototype.clear = function (){
    this.strings.length = 1;
};

// Converts this instance to a String.
StringBuilder.prototype.toString = function (){
    return this.strings.join('');
};

var commonJSWrapper = function(key) {
	return new Analytics(key);
};

module.exports = commonJSWrapper;
