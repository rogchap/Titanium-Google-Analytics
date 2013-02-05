# Google Analytics for Titanium Mobile


I started this project by creating a Titanium Module for wrapping the Google Analytics SDK iOS static library. However that effort faild; due to using the sql dynamic library 3.0. I just could not get it working!

So, I rolled out the functionality directly in Titanium.

It works exacly the same by tracking pageviews in a database and periodically sending them to Google Analytics, if and when a network conection is available.

**Note:** To make sure that the database does not get flooded with data it holds a max of 1000 events.
This also helps load when it sends the events to Google. Once the event is sent to Google it is ejected
from the database.

**To use:** all you need is the `Ti.Google.Analytics.js` file and follow the examples in the `app.js`.

**From Google:** You must indicate to your users, either in the application itself or in your 
terms of service, that you reserve the right to anonymously track and report a user's activity 
inside of your app.

I hope some people find this useful.

## Google Analytics SDK v2

Google has released a new version of the analytics specifically for mobile applications. This is a huge improvement over 'faking' mobile application analytics as a website.

However, **v1.x of this module is only compatible with GA v1.x**

I'm looking to create v2 of this module and the issue is beeing tracked here: #11

Switching to use Git Flow, so new developments will be merged into the develop branch, and the master branch will be used for release versions.

v2 is likely to break v1.x as Google have added a lot of new functionality to GA SDK v2


----------------------------------

Copyright (c) 2012 by Roger Chapman. All Rights Reserved.

This code is licensed under the MIT License. Please
see the LICENSE file for the full license.

