// ==UserScript==
// @name         Customer Admin Toolkit
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Adds QoL improvement to CRM
// @author       Anton Tkach <anton.tkach.dev@gmail.com>
// @include      https://*.kommo.com/todo/calendar/week/*
// @include      https://*.kommo.com/leads/detail/*
// @updateURL    https://raw.githubusercontent.com/AntonTkach/customer-admin-toolkit/master/cat.user.js
// @downloadURL  https://raw.githubusercontent.com/AntonTkach/customer-admin-toolkit/master/cat.user.js
// @icon         https://pcfcdn.kommo.com/favicon.ico
// @license      PolyForm Strict License 1.0.0
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

      // ================ +1h, +2.5h section =============
      /**
       * Converts sting date time to Date object
       * @param {String} dateStr souce value to add to
       * @returns {Date} Date object
       */
      function strToDate(dateStr) {
        // Step 1: Convert to Date object (dd.mm.yyyy hh:mm)
        const [day, month, yearAndTime] = dateStr.split('.');
        const [year, time] = yearAndTime.split(' ');
        const formattedStr = `${year}-${month}-${day}T${time}:00`; // ISO format
        const date = new Date(formattedStr);
        return date;
    }

    /**
     * Format to 'dd.mm.yyyy hh:mm'
     * @param {Date} datetime 
     * @returns {String}
     */
    function formatDatetime(datetime) {

        const pad = n => n.toString().padStart(2, '0');
        const result =
          `${pad(datetime.getDate())}.${pad(datetime.getMonth() + 1)}.${datetime.getFullYear()} ` +
          `${pad(datetime.getHours())}:${pad(datetime.getMinutes())}`;
        return result
    }

    function addHours(dateStr, hours) {
        const datetime = strToDate(dateStr)
        datetime.setHours(datetime.getHours() + Math.floor(hours));  // Add integer hours
        datetime.setMinutes(datetime.getMinutes() + (hours % 1) * 60);  // Add fractional minutes
        return formatDatetime(datetime)
    }

    const dateStr = document.querySelector('[data-id="770966"] input').value

    console.log(addHours(dateStr,1));
    
    const dateSource = document.querySelector('[data-id="770966"]');
    const dateTargetInput = document.querySelector('[data-id="770968"] input')

    const button1h = document.createElement('div');

    button1h.textContent = '+1h';

    button1h.style.marginLeft = '5px';
    // button1h.style.padding = '5px 10px';
    button1h.style.cursor = 'pointer';
    button1h.style.display = 'inline-block';
    button1h.style.backgroundColor = '#3498db';
    button1h.style.color = 'white';
    button1h.style.textAlign = 'center';
    button1h.style.borderRadius = '5px';
    button1h.style.userSelect = 'none';

    const button2_5h = document.createElement('div');

    button2_5h.textContent = '+2.5h';

    button2_5h.style.marginLeft = '5px';
    // button2_5h.style.padding = '5px 10px';
    button2_5h.style.cursor = 'pointer';
    button2_5h.style.display = 'inline-block';
    button2_5h.style.backgroundColor = '#3498db';
    button2_5h.style.color = 'white';
    button2_5h.style.textAlign = 'center';
    button2_5h.style.borderRadius = '5px';
    button2_5h.style.userSelect = 'none';

    const setupHourAdder = (hoursToAdd) => {
        return (event) => {
            event.preventDefault(); // Prevent the form submission to ajax
            event.stopPropagation(); // Stop the event from propagating up the DOM
        
            const inputElement = dateSource.querySelector('input');
            if (inputElement && inputElement.value) {
                const targetString = addHours(inputElement.value, hoursToAdd);
            
                // Add timeout to reduce flakiness
                document.body.style.cursor = 'progress';
                // setTimeout(() => {
                    dateTargetInput.focus();
                    dateTargetInput.value = targetString;
                    dateTargetInput.blur();
                    // document.body.style.cursor = 'default';
                // }, 500);
            }
        };
    };
    
    button1h.addEventListener('click', setupHourAdder(1));     // Adds 1 hour
    button2_5h.addEventListener('click', setupHourAdder(2.5)); // Adds 2.5 hours
    
    dateSource.appendChild(button1h);
    dateSource.appendChild(button2_5h);
})();
