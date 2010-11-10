// this sets the background color of the master UIView (when there are no windows/tab groups on it)
Titanium.UI.setBackgroundColor('#000');

//Set up analytics
Titanium.include('analytics.js');
var analytics = new Analytics('UA-XXXXXX-X');
// Call the next function if you want to reset the analytics to a new first time visit.
// This is useful for development only and should not go into a production app.
//analytics.reset();

// The analytics object functions must be called on app.js otherwise it will loose it's context
Titanium.App.addEventListener('analytics_trackPageview', function(e){
	analytics.trackPageview('/iPad' + e.pageUrl);
});

Titanium.App.addEventListener('analytics_trackEvent', function(e){
	analytics.trackEvent(e.category, e.action, e.label, e.value);
});


// I've set a global Analytics object to contain the two functions to make it easier to fire the analytics events from other windows
Titanium.App.Analytics = {
	trackPageview:function(pageUrl){
		Titanium.App.fireEvent('analytics_trackPageview', {pageUrl:pageUrl});
	},
	trackEvent:function(category, action, label, value){
		Titanium.App.fireEvent('analytics_trackEvent', {category:category, action:action, label:label, value:value});
	}
}

// Starts a new session as long as analytics.enabled = true
// Function takes an integer which is the dispatch interval in seconds
analytics.start(10);



// create tab group
var tabGroup = Titanium.UI.createTabGroup();


//
// create base UI tab and root window
//
var win1 = Titanium.UI.createWindow({  
    title:'Tab 1',
    backgroundColor:'#fff'
});

// track page view on focus
win1.addEventListener('focus', function(e){
	Titanium.App.Analytics.trackPageview('/win1');
});

var tab1 = Titanium.UI.createTab({  
    icon:'KS_nav_views.png',
    title:'Tab 1',
    window:win1
});

var label1 = Titanium.UI.createLabel({
	color:'#999',
	text:'I am Window 1',
	font:{fontSize:20,fontFamily:'Helvetica Neue'},
	textAlign:'center',
	width:'auto'
});

win1.add(label1);

//
// create controls tab and root window
//
var win2 = Titanium.UI.createWindow({  
    title:'Tab 2',
    backgroundColor:'#fff'
});

// track page view on focus
win2.addEventListener('focus', function(e){
	Titanium.App.Analytics.trackPageview('/win2');
});

var tab2 = Titanium.UI.createTab({  
    icon:'KS_nav_ui.png',
    title:'Tab 2',
    window:win2
});

var label2 = Titanium.UI.createLabel({
	color:'#999',
	text:'I am Window 2',
	font:{fontSize:20,fontFamily:'Helvetica Neue'},
	textAlign:'center',
	width:'auto'
});

win2.add(label2);


//
//  add tabs
//
tabGroup.addTab(tab1);  
tabGroup.addTab(tab2);  


// open tab group
tabGroup.open();


// You don't need to call stop on application close, but this is just to show you can call stop at any time (Basically sets enabled = false)
Titanium.App.addEventListener('close', function(e){
	analytics.stop();
});
