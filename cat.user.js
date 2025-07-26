// ==UserScript==
// @name         Customer Admin Toolkit
// @namespace    http://tampermonkey.net/
// @version      0.7.5.1
// @description  Add QoL improvement to CRM
// @author       Anton Tkach <anton.tkach.dev@gmail.com>
// @match        https://*.kommo.com/*
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
        const regex = /APP\.constant\s*\(\s*['"]task_types['"]\s*,\s*(\{[\s\S]*?\})\s*(?:,\s*\{.*?\})?\s*\)\s*;/;
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

                const bgColor = `rgba(${colors[eventType].r}, ${colors[eventType].g}, \
                                 ${colors[eventType].b}, ${colors[eventType].a})`;
                if (getComputedStyle(event).borderColor == 'rgb(199, 80, 80)') {
                    event.style.backgroundImage = `repeating-linear-gradient(45deg, ${bgColor}, ${bgColor} 10px, transparent 10px, transparent 14px)`
                } else {
                    event.style.backgroundColor = bgColor
                }
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

    function setValueAndApply(element, value){
        return (event) => {
            event.preventDefault();  // Prevent the form submission to ajax
            event.stopPropagation(); // Stop the event from propagating up the DOM
            
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    function manualSetValueAndApply(element, value) {
        setValueAndApply(element, value)(new Event('manual'));
    }

    function bindLeadListeners() {
        const tariffPriceTable = [
            // dayOfWeek is a byteword, cause we are only storing positional data aka Tuesday is 2 == 0b0010000
            { name: 'Adventure',  price: 250, dayOfWeek: 0b0111110, defaultPlayerAmount: 10 },
            { name: 'EPIC',       price: 450, dayOfWeek: 0b0111110, defaultPlayerAmount: 20 },
            { name: 'VIP',        price: 625, dayOfWeek: 0b0111110, defaultPlayerAmount: 30 },
            { name: 'Adventure',  price: 320, dayOfWeek: 0b1000001, defaultPlayerAmount: 10 },
            { name: 'EPIC',       price: 520, dayOfWeek: 0b1000001, defaultPlayerAmount: 20 },
            { name: 'VIP',        price: 720, dayOfWeek: 0b1000001, defaultPlayerAmount: 30 },
        ]

        // Order reverset to accomodate Array.find()
        const playersPriceTable = [
            { price: 20, dayOfWeek: 0b0111110, minPlayerAmount: 6 }, // 6+
            { price: 22, dayOfWeek: 0b0111110, minPlayerAmount: 3 }, // 3-5
            { price: 25, dayOfWeek: 0b0111110, minPlayerAmount: 1 }, // 1-2
            { price: 25, dayOfWeek: 0b1000001, minPlayerAmount: 6 }, // 6+
            { price: 27, dayOfWeek: 0b1000001, minPlayerAmount: 3 }, // 3-5
            { price: 30, dayOfWeek: 0b1000001, minPlayerAmount: 1 }, // 1-2
        ]

        const watchedInputs = new WeakSet();

        const lead = {
            budget: 0,
            playerAmount: 0,
            tariffName: null,
            menu: [],
            // getters read UI to lead object, setters update UI from lead object

            setBudget() {
                if (!this.tariffName) {
                    document.querySelector('input[name="CFV[771816]"]').click();
                    return;
                }
                this.playerAmount = 0;
                this.getPlayerAmount();

                const fullDate = `${this.getDate('[data-id="770966"] input').date}.${new Date().getFullYear()}`
                const weekday = new Date(fullDate.split('.').reverse().join('-')).getDay() ?? new Date().getDay();


                let tariffPrice = 0;
                let tariffPlayerAmount = 0;
                if (this.tariffName != 'No tariff') {
                    const match = tariffPriceTable.find(t => t.name == this.tariffName && t.dayOfWeek & 1 << weekday);
                    [tariffPrice, tariffPlayerAmount] = [match.price || 0, match.defaultPlayerAmount]
                    if (!this.playerAmount) {
                        this.playerAmount = tariffPlayerAmount;
                        this.setPlayerAmount(tariffPlayerAmount)
                    }
                }
                let playersPrice = 0;
                if (!tariffPrice) {
                    const localPrice = playersPriceTable.find(p => (p.dayOfWeek & 1 << weekday) && this.playerAmount >= p.minPlayerAmount)?.price ?? 0; 
                    playersPrice = this.playerAmount * localPrice;
                }
                this.budget = tariffPrice + playersPrice;
                this.menu.forEach(m => { this.budget += m.price });

                const budgetInput = document.querySelector('#lead_card_budget');

                manualSetValueAndApply(budgetInput, this.budget)
                document.querySelector('#autoComputeSumButton').click();
            },

            getTariff(radio) {
                this.tariffName = radio.closest('label')?.querySelector('.control-radio-label-text')?.textContent.trim();
                if (this.tariffName.includes('VIP')) {
                    this.tariffName = this.tariffName.split(' ')[0];
                }
                this.setBudget();
                this.setLeadName();
            },

            getDate(selector) {
                const dateInput = document?.querySelector(selector);
                const dateInputValue = dateInput.value.trim();
                const [date, time] = dateInputValue.split(' ');

                return {
                    date: date?.slice(0, 5) || '',
                    time: time || ''
                };
            },

            getMenu(){
                const multiselect = document?.querySelector('[data-id="791446"]');
                if (!multiselect) { return }

                function getAllSelectedMultiselectItems(rootElement) {
                    const selectedLabels = Array.from(
                        rootElement.querySelectorAll('.js-item-checkbox:checked')
                    ).map(checkbox => {
                        const label = checkbox.closest('.checkboxes_dropdown__item')?.querySelector('.checkboxes_dropdown__label_title');
                        return label?.textContent.trim();
                    }).filter(Boolean);

                    return selectedLabels;
                }

                const selectedOptions = getAllSelectedMultiselectItems(multiselect);
                selectedOptions.forEach((item, i) => {
                    const [name, price] = item.split('-').map(l => l.trim());
                    selectedOptions[i] = { name, price: parseInt(price) };
                });
                this.menu = selectedOptions;

                this.setBudget();
            },

            getPlayerAmount(){
                const playerAmountElement = document?.querySelector('[data-id="768812"]');
                if (!playerAmountElement) { return }
                this.playerAmount = playerAmountElement?.querySelector('input').value ?? 0;
                this.playerAmount = parseInt(String(this.playerAmount).match(/\d+/)?.[0]) || 0; // allways an Integer
            },

            setPlayerAmount(newAmount){
                manualSetValueAndApply(document?.querySelector('[data-id="768812"]'), newAmount);
            },

            setLeadName(){
                const leadName = document?.querySelector('#person_n');
                if (!leadName) { return }
                const { date, time: timeFrom } = this.getDate('[data-id="770966"] input')
                const { time: timeTo } = this.getDate('[data-id="770968"] input')
                const leadNameCombined = `${date} ${timeFrom}-${timeTo} ${this.playerAmount} ${this.tariffName == "No tariff" ? 'players' : `pl ${this.tariffName}`}`
                manualSetValueAndApply(leadName, leadNameCombined)
            },

            createQolButton(parent, label, handler){
                const btn = document.createElement('div');
                btn.textContent = label;
                btn.classList.add('qol-button');
                btn.addEventListener('click', handler);
                parent.appendChild(btn);
            },

            addQolButtons() {
                const dateSource = document?.querySelector('[data-id="770966"]');
                if (!dateSource) return;
                const dateTargetInput = document.querySelector('[data-id="770968"] input')
                const sumSource = document.querySelector('[data-id="771808"]');
                const sumSourceInput = sumSource.querySelector('input');
                const sumTarget = document.querySelector('[data-id="771810"]');
                const sumTargetInput = sumTarget.querySelector('input');
                const dateArrivalInput = document.querySelector('input[name="CFV[770714]"]');
                const budgetInput = document.querySelector('input[name="lead[PRICE]"]');

                if (dateSource && dateTargetInput && dateSource.querySelector('input').value) {
                    if (dateSource.querySelector('.qol-button')) return;
                    dateSource.querySelector('.linked-form__field__value').style.setProperty('max-width', '150px');

                    const timeButtons = [1, 2.5]
                    timeButtons.forEach(buttonLabel => {
                        this.createQolButton(dateSource, `+${buttonLabel}h`, (e) => {
                            setValueAndApply(dateTargetInput, addHours(dateSource ? dateSource.querySelector('input').value : null, buttonLabel))(e)
                            setValueAndApply(dateArrivalInput, formatDatetime(strToDate(dateSource ? dateSource.querySelector('input').value : null)))(e)
                            if (buttonLabel === 1) { // integer 1
                                document.querySelector('input[name="CFV[771816]"]').click();
                            }
                        });
                    });
                } else if (dateSource) {
                  const dateSourceInput = dateSource.querySelector('input')
                  if (watchedInputs.has(dateSourceInput)) { return };
                  watchedInputs.add(dateSourceInput);
                  dateSourceInput.addEventListener('focus', () => { 
                      const check = () => {
                        const isHidden = getComputedStyle(document.querySelector('.kalendae.k-floating')).display == 'none';
                        if (isHidden && dateSource.querySelector('input').value) {
                            this.addQolButtons();
                            return;
                        }
                        setTimeout(check, 200);
                      };
                      check();
                  });
                }

                if (sumSource && sumTargetInput && budgetInput) {
                    if (sumSource.querySelector('.qol-button')) return;
                    sumSource.querySelector('.linked-form__field__value').style.setProperty('max-width', '150px');
                    sumTarget.querySelector('.linked-form__field__value').style.setProperty('max-width', '150px');

                    const autoComputeSumButton = document.createElement('div');
                    autoComputeSumButton.id = 'autoComputeSumButton';
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
                        this.createQolButton(sumSource, `${button}%`, e => {
                            setValueAndApply(sumSourceInput, budgetInput.value * button / 100)(e);
                            autoComputeSumButton.click();
                        });
                    });
                }
            }
        };

        const multiselectRoot = document?.querySelector('[data-id="791446"]');
        if (!multiselectRoot) return;
        multiselectRoot.addEventListener('change', e => {
            lead.getMenu();
        });

        const tariffField = document?.querySelector('[data-id="771816"]');
        if (!tariffField) return;
        tariffField.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('click', () => {
                if (radio.checked) {
                    lead.getTariff(radio);
                }
            });
        });

        const playerAmountField = document?.querySelector('[data-id="768812"]');
        if (!playerAmountField) return;
        playerAmountField.addEventListener('change', () => {
            lead.setBudget()
            lead.setLeadName()
        });

        lead.addQolButtons();
    };
    
    let lastURL = location.href;
    setInterval(() => {
        if (location.href !== lastURL) {
            lastURL = location.href;
            ensureInitialized(); // Re-init on internal navigation
        }
    }, 250);

    function safeInit() {
        changeEventColors();
        bindLeadListeners();
        createSettingsPanel();
        initializeSettings();
    }

    // Retry if elements aren't present
    function ensureInitialized(retries = 10, delay = 200) {
        if (document.querySelector('[name="lead[PRICE]') ||
                document.querySelector('a.fc-time-grid-event:not(.fc-completed)')
        ) {
            safeInit();
        } else if (retries > 0) {
            setTimeout(() => ensureInitialized(retries - 1, delay), delay);
        }
    }

    ensureInitialized();

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
        if (!/\/todo\/calendar\/(week|day)\//.test(location.pathname)) return;
        changeEventColors();
        createSettingsPanel();
        initializeSettings();
    }, 50));

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
