---
layout: post
title:  "Smart Mirror - The Mirror"
date:   2015-07-24 14:00:00
categories: blog
---
Michael, of the original Magic Mirror project already wrote 
[an interface](https://github.com/MichMich/MagicMirror) which is functional, 
but I'm sort of particular about how I want my interface, so I decided
to do my own from scratch. It also has some custom gesture features that I'll
have to build in.

![](/img/20150724/code.jpg)

You can find my (currently incomplete) code on my
[Github](https://github.com/alaycock/SmartMirror), I'm also going to use a
browser for the interface, because of the low overhead. Basically it's a node
server that serves static files. The front end JavaScript does the heavy lifting
in terms of displaying and updating the time, time, weather and news. I'm
planning on adding a few more sections, including my calendar, email, etc.

Finally, I'll also need come code to tie into the Hover for gesture control. The
Hover has a [library](https://github.com/hoverlabs/hover_raspberrypi) for Python
already, so that will capture the input, then from there I can send keyboard
input to the browser. I haven't narrowed down the best way to do that yet
because I still have a number of steps to complete before that's necessary.