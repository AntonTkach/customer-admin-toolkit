// ==UserScript==
// @name         Customer Admin Toolkit
// @namespace    http://tampermonkey.net/
// @version      0.3.1
// @description  Add QoL improvement to CRM
// @author       Anton Tkach <anton.tkach.dev@gmail.com>
// @include      https://*.kommo.com/todo/calendar/week/*
// @include      https://*.kommo.com/leads/detail/*
// @resource     INTERNAL_CSS https://raw.githubusercontent.com/AntonTkach/customer-admin-toolkit/master/style.css
// @updateURL    https://raw.githubusercontent.com/AntonTkach/customer-admin-toolkit/master/cat.user.js
// @downloadURL  https://raw.githubusercontent.com/AntonTkach/customer-admin-toolkit/master/cat.user.js
// @icon         https://pcfcdn.kommo.com/favicon.ico
// @license      PolyForm Strict License 1.0.0
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const style = GM_getResourceText("INTERNAL_CSS");
    GM_addStyle(style);

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
        datetime.setHours(datetime.getHours() + Math.floor(hours));    // Add integer hours
        datetime.setMinutes(datetime.getMinutes() + (hours % 1) * 60); // Add fractional minutes
        return formatDatetime(datetime)
    }

    function addQolButtons() {
        const dateSource = document.querySelector('[data-id="770966"]');
        const dateSourceValue = dateSource ? dateSource.querySelector('input').value : null;
        const dateTargetInput = document.querySelector('[data-id="770968"] input')
        const sumSource = document.querySelector('[data-id="771808"]');
        const sumTargetInput = document.querySelector('[data-id="771810"] input');
        const budgetInput = document.querySelector('input[name="lead[PRICE]"]');
        const budgetValue = budgetInput ? budgetInput.value : 0;

        if (dateSource && dateTargetInput && dateSourceValue) {
            if (dateSource.querySelector('.qol-button')) return;
            dateSource.querySelector('.linked-form__field__value').style.setProperty('max-width', '150px');

            const button1h = document.createElement('div');
            button1h.textContent = '+1h';
            button1h.classList.add('qol-button');

            const button2_5h = document.createElement('div');
            button2_5h.textContent = '+2.5h';
            button2_5h.classList.add('qol-button');

            const setupHourAdder = (hoursToAdd) => {
                return (event) => {
                    event.preventDefault();  // Prevent the form submission to ajax
                    event.stopPropagation(); // Stop the event from propagating up the DOM

                    dateTargetInput.focus();
                    dateTargetInput.value = addHours(dateSourceValue, hoursToAdd);
                    dateTargetInput.blur();
                };
            };

            button1h.addEventListener('click', setupHourAdder(1));     // Adds 1 hour
            button2_5h.addEventListener('click', setupHourAdder(2.5)); // Adds 2.5 hours

            dateSource.appendChild(button1h);
            dateSource.appendChild(button2_5h);
        }      

        if (sumSource && sumTargetInput && budgetValue) {
            if (sumSource.querySelector('.qol-button')) return;
            sumSource.querySelector('.linked-form__field__value').style.setProperty('max-width', '150px');

            const autoComputeSumButton = document.createElement('div');
            autoComputeSumButton.innerHTML = '<svg class="svg-common--refresh-dims"><use xlink:href="#common--refresh"></use></svg>';
            autoComputeSumButton.classList.add('qol-button');

            const autoComputeSum = () => {
                return (event) => {
                    event.preventDefault();  // Prevent the form submission to ajax
                    event.stopPropagation(); // Stop the event from propagating up the DOM

                    const sumSourceValue = sumSource ? document.querySelector('[name="CFV[771808]"]').value : 0;

                    if (!sumSourceValue) {
                        sumTargetInput.focus();
                        sumSource.querySelector('input').value = 0
                        sumTargetInput.blur();
                    }

                    sumTargetInput.focus();
                    sumTargetInput.value = budgetValue - sumSourceValue;
                    sumTargetInput.blur();
                }
            }
            autoComputeSumButton.addEventListener('click', autoComputeSum());
            sumSource.appendChild(autoComputeSumButton);
        }
    }

    let debounceTimeout;
    const debounce = (func, delay) => {
        return (...args) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                func(...args);
            }, delay);
        };
    };

    const observer = new MutationObserver(debounce(() => {
        changeEventColors();
        addQolButtons();
    }, 50));

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    changeEventColors();
    addQolButtons();
})();
