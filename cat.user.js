// ==UserScript==
// @name         Customer Admin Toolkit
// @namespace    http://tampermonkey.net/
// @version      0.6.3
// @description  Add QoL improvement to CRM
// @author       Anton Tkach <anton.tkach.dev@gmail.com>
// @include      https://*.kommo.com/todo/calendar/week/*
// @include      https://*.kommo.com/todo/calendar/day/*
// @include      https://*.kommo.com/leads/detail/*
// @resource     INTERNAL_CSS https://raw.githubusercontent.com/AntonTkach/customer-admin-toolkit/master/style.css
// @updateURL    https://raw.githubusercontent.com/AntonTkach/customer-admin-toolkit/master/cat.user.js
// @downloadURL  https://raw.githubusercontent.com/AntonTkach/customer-admin-toolkit/master/cat.user.js
// @icon         https://pcfcdn.kommo.com/favicon.ico
// @license      PolyForm Strict License 1.0.0 (https://polyformproject.org/licenses/strict/1.0.0/)
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

/*
Customer Admin Toolkit
Copyright (C) 2025 Anton Tkach <anton.tkach.dev@gmail.com>

This program is licensed under the PolyForm Strict License 1.0.0.
You may obtain a copy of the License at:
https://polyformproject.org/licenses/strict/1.0.0/

The software is provided as a UserScript and relies on the specified @updateURL
for new versions. The Copyright Holder may update the software at any time.

Notwithstanding the foregoing PolyForm Strict License, the Copyright Holder (Anton Tkach)
grants a temporary, non-exclusive, royalty-free license to E-Smoke OÜ (the "Company")
and its bona fide employees to install and use the functional versions of this software
internally for its intended purpose, solely for the duration of the Copyright Holder's
active employment with the Company.

This temporary license automatically and immediately terminates without notice
upon the cessation of the Copyright Holder's employment with the Company
for any reason. Upon termination of this temporary license:
  a) All rights to use, reproduce, or distribute any functional version of the
     software by the Company or its employees are revoked.
  b) The Copyright Holder reserves the right to update the software via the
     @updateURL to a version that may have reduced or no functionality,
     reflecting the termination of the license to use prior functional versions.
  c) Continued use of any prior functional version, or attempts to circumvent
     updates to a non-functional version, will be subject to the terms of the
     PolyForm Strict License 1.0.0, or a separately negotiated commercial
     license with the Copyright Holder.

All other rights are reserved by the Copyright Holder.
This software is provided "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED.
*/

(function() {
    'use strict';

    const style = GM_getResourceText("INTERNAL_CSS");
    GM_addStyle(style);

    // ================ Settings section =============
    const settingsMenuStructure = [
        { "settingsKey": "dayArea", "type": "switch", "description": "How much area for the whole day tasks is visible", 
          "values": [ "0%", "25%", "50%", "100%" ], "default": "25%" },
        { "settingsKey": "colorUpdateRate", "type": "switch", "description": "Task color update interval", 
          "values": [ "Always", "1h", "24h" ], "default": "24h" }
    ];
    
    /**
     * Creates the settings panel with all the settings
     */
    function createSettingsPanel () {
        const curtain = document.createElement('div'); 
        curtain.id = 'tm-curtain';

        const settingsMenu = document.createElement('div');
        settingsMenu.id = 'tm-panel';

        settingsMenuStructure.forEach((setting, index) => {
            const descriptionP = document.createElement('p');
            descriptionP.textContent = setting.description;
            settingsMenu.appendChild(descriptionP);

            const settingsWrappedDiv = document.createElement('div');
            settingsWrappedDiv.className = 'tm-settings-wrapper';

            // Ensure, that the value is set
            GM_setValue(setting.settingsKey, GM_getValue(setting.settingsKey) || setting.default);
            const storedSettingValue = GM_getValue(setting.settingsKey);

            setting.values.forEach((value, i) => {
                const settingDiv = document.createElement('div');
                settingDiv.className = 'tm-setting';

                switch (setting.type) {
                  case 'switch': {
                    const settingLabel = document.createElement('label');
                    const inputId = `tm-setting-${setting.settingsKey}-${i}`;
                    settingLabel.setAttribute('for', inputId);
                    settingLabel.textContent = value;
                    // settingLabel.textContent = `Option ${value}`;
                    settingLabel.className = 'tm-setting-option';

                    const switchLabel = document.createElement('label');
                    // switchLabel.setAttribute('for', inputId);
                    switchLabel.className = 'tm-switch';

                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.id = inputId;
                    input.name = `group-${index}`; 
                    input.value = value
                    input.addEventListener('click', ()=> {
                        GM_setValue(setting.settingsKey, input.value);
                    })

                    input.checked = storedSettingValue === value;

                    const spanSlider = document.createElement('span');
                    spanSlider.className = 'slider round';

                    switchLabel.appendChild(input);
                    switchLabel.appendChild(spanSlider);
                    settingLabel.appendChild(switchLabel);
                    settingDiv.appendChild(settingLabel);
                    break;
                  }
                  default:
                    break;
                }
                settingsWrappedDiv.appendChild(settingDiv);
            });
            settingsMenu.appendChild(settingsWrappedDiv);
        });

        curtain.appendChild(settingsMenu);
        document.body.appendChild(curtain);

        const dropCurtain = function() {
            curtain.style.top = '0';
        };

        const closeCurtain = () => {
          initializeSettings()
          curtain.style.top = '-100%';
        }

        curtain.addEventListener('click', function(e) {
            if (e.target === curtain) {
                closeCurtain()
            }
        });

        GM_registerMenuCommand('⚙️ Settings', dropCurtain);
        initializeSettings();
    }

    /**
     * Sets day area size based on user settings
     */
    function setDayAreaSize() {
      const dayAreaElement = document.querySelector('.fc-day-grid');
      if (!dayAreaElement) return;
      const dayAreaSetting = parseFloat(GM_getValue('dayArea')) / 100;
      const maxDayAreaHeight = 100;//px
      const dayAreaHeight = maxDayAreaHeight * dayAreaSetting;
      dayAreaElement.style.maxHeight = `${dayAreaHeight}px`;
    }

    /**
     * Triggers all settings to be applied
     */
    function initializeSettings() {
      setDayAreaSize();
      window.dispatchEvent(new Event('resize'));
    }

    /**
     * Extracts the task types and their corresponding colors
     * @returns {JSON} JSON of `{ "task type": { r, g, b, a} }` pairs
     */
    function extractTaskTypeColors() {
        const scripts = document.querySelectorAll('script');
        let targetScriptContent = null;

        const hex2rgba = (hex, alpha = 1) => {
            const [r, g, b] = hex.match(/\w\w/g).map(x => parseInt(x, 16));
            return {r, g, b, a:alpha};
        };

        for (const script of scripts) {
            if (script.textContent && script.textContent.includes("APP.constant('task_types'")) {
                targetScriptContent = script.textContent;
                break;
            }
        }

        // [\s\S]*? is used to match any character including newlines, non-greedily.
        const regex = /APP\.constant\s*\(\s*['"]task_types['"]\s*,\s*(\{[\s\S]*?\})\s*\)\s*;/;
        const match = targetScriptContent.match(regex);

        if (!match || !match[1]) {
            console.warn("Could not extract the task_types object string using regex.");
            return [];
        }

        const objectString = match[1];
        let taskTypesData;
        taskTypesData = JSON.parse(objectString);

        const result = {};
        for (const key in taskTypesData) {
            if (Object.prototype.hasOwnProperty.call(taskTypesData, key)) {
                const item = taskTypesData[key];
                if (item && typeof item.option === 'string' && typeof item.color === 'string') {
                    result[item.option] = hex2rgba(item.color, 1);
                }
            }
        }
      
        return result;
    }

    /**
     * Applies colors to events/tasks
     */
    function changeEventColors() {
        const events = document.querySelectorAll('a.fc-time-grid-event:not(.fc-completed)');
        let colors = {}
        const colorUpdateRate = GM_getValue('colorUpdateRate');
        if (colorUpdateRate === 'Always' || Date.now() - GM_getValue('lastColorUpdate', 0) > parseInt(colorUpdateRate) * 3600 * 1000){
            colors = extractTaskTypeColors()
            GM_setValue('colors', JSON.stringify(colors));
            GM_setValue('lastColorUpdate', Date.now());
        } else {
            colors = JSON.parse(GM_getValue('colors'))
        }
        events.forEach(event => {
            const eventDiv = event.querySelector('div.fc-content[title]');
            if (eventDiv) {
                const title = eventDiv.getAttribute('title');
                // Check payment: 123 -> Check payment
                const eventType = title.split(':')[0]
                const EXCLUSIONS = ['Связаться', 'Бронь']
                if (EXCLUSIONS.includes(eventType)) {
                    return;
                }
                event.style.backgroundColor = 
                    `rgba(${colors[eventType].r}, ${colors[eventType].g}, \
                    ${colors[eventType].b}, ${colors[eventType].a})`;
                // https://www.w3.org/TR/WCAG20/#relativeluminancedef
                if (0.299 * colors[eventType].r + 0.587 * colors[eventType].g + 0.114 * colors[eventType].b > 186) {
                    event.style.color = 'rgb(0, 0, 0)';
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
        const dateSource = document?.querySelector('[data-id="770966"]');
        if (!dateSource) return;
        const dateTargetInput = document.querySelector('[data-id="770968"] input')
        const sumSource = document.querySelector('[data-id="771808"]');
        const sumSourceInput = sumSource.querySelector('input');
        const sumTarget = document.querySelector('[data-id="771810"]');
        const sumTargetInput = sumTarget.querySelector('input');
        const dateArrivalInput = document.querySelector('input[name="CFV[770714]"]');
        const budgetInput = document.querySelector('input[name="lead[PRICE]"]');

        const setValueAndApply = (element, value) => {
            return (event) => {
                event.preventDefault();  // Prevent the form submission to ajax
                event.stopPropagation(); // Stop the event from propagating up the DOM
                
                element.value = value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };

        if (dateSource && dateTargetInput && dateSource.querySelector('input').value) {
            if (dateSource.querySelector('.qol-button')) return;
            dateSource.querySelector('.linked-form__field__value').style.setProperty('max-width', '150px');
            
            const timeButtons = [1, 2.5]
            timeButtons.forEach(button => {
                const buttonElement = document.createElement('div');
                buttonElement.textContent = `+${button}h`;
                buttonElement.classList.add('qol-button');
                buttonElement.addEventListener('click', (e) => {
                    setValueAndApply(dateTargetInput, addHours(dateSource ? dateSource.querySelector('input').value : null, button))(e)
                    setValueAndApply(dateArrivalInput, formatDatetime(strToDate(dateSource ? dateSource.querySelector('input').value : null)))(e)
                });
                dateSource.appendChild(buttonElement);
            });
        }

        if (sumSource && sumTargetInput && budgetInput) {
            if (sumSource.querySelector('.qol-button')) return;
            sumSource.querySelector('.linked-form__field__value').style.setProperty('max-width', '150px');
            sumTarget.querySelector('.linked-form__field__value').style.setProperty('max-width', '150px');

            const autoComputeSumButton = document.createElement('div');
            autoComputeSumButton.innerHTML = '<svg class="svg-common--refresh-dims"><use xlink:href="#common--refresh"></use></svg>';
            autoComputeSumButton.classList.add('qol-button');

            const autoComputeSource = () => {
                const sumSourceValue = sumSource ? sumSourceInput.value : 0;
                return !sumSourceValue ? 0 : sumSourceValue;
            }

            const autoComputeSum = () => {
                const budgetValue = budgetInput ? budgetInput.value : 0;
                return budgetValue - autoComputeSource();
            }

            autoComputeSumButton.addEventListener('click', e => {
                setValueAndApply(sumSourceInput, autoComputeSource())(e)
                setValueAndApply(sumTargetInput, autoComputeSum())(e)
            });
            sumTarget.appendChild(autoComputeSumButton);

            const percentageButtons = [50, 100]
            percentageButtons.forEach(button => {
                const buttonElement = document.createElement('div');
                buttonElement.textContent = `${button}%`;
                buttonElement.classList.add('qol-button');
                buttonElement.addEventListener('click', e => {
                    setValueAndApply(sumSourceInput, budgetInput.value * button / 100)(e);
                    autoComputeSumButton.click();
                });
                sumSource.appendChild(buttonElement);
            });
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

    let isSettingsInitialized = false
    const observer = new MutationObserver(debounce(() => {
        changeEventColors();
        addQolButtons();

        if (!isSettingsInitialized) {
            initializeSettings();
            isSettingsInitialized = true;
        }
    }, 50));

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    createSettingsPanel();
    changeEventColors();
    addQolButtons();
})();
