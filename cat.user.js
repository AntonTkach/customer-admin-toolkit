// ==UserScript==
// @name         Colourul tasks
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Change the color of tasks based on their type
// @author       Anton Tkach <anton.tkach.dev@gmail.com>
// @include      https://*.kommo.com/todo/calendar/week/*
// @updateURL    https://raw.githubusercontent.com/AntonTkach/customer-admin-toolkit/master/cat.user.js
// @downloadURL  https://raw.githubusercontent.com/AntonTkach/customer-admin-toolkit/master/cat.user.js
// @icon         https://pcfcdn.kommo.com/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  function changeEventColors() {
      const events = document.querySelectorAll('a.fc-time-grid-event:not(.fc-completed)');

      events.forEach(event => {
          const eventDiv = event.querySelector('div.fc-content[title]');

          if (eventDiv) {
              const title = eventDiv.getAttribute('title');

              // Use a switch-case to determine the color based on the title
              switch(true) {
                  case title.includes('Check payment'):
                      event.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
                      break;
                  case title.includes('Recheck'):
                      event.style.backgroundColor = 'rgba(255, 255, 0, 0.8)';
                      event.style.color = 'rgb(0, 0, 0)';
                      break;
                  default:
                      break;
              }
          }
      });
  }

  const observer = new MutationObserver(() => {
      changeEventColors();
  });

  observer.observe(document.body, {
      childList: true,
      subtree: true
  });
  changeEventColors();
})();
