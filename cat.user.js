// ==UserScript==
// @name         Customer Admin Toolkit
// @namespace    http://tampermonkey.net/
// @version      0.8.0.2
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
    async function extractTaskTypeColors() {
        const scripts = document.querySelectorAll('script');
        let targetScriptContent = null;

        const hex2rgba = (hex, alpha = 1) => {
            const [r, g, b] = hex.match(/\w\w/g).map(x => parseInt(x, 16));
            return { r, g, b, a: alpha };
        };

        for (const script of scripts) {
            if (script.textContent && script.textContent.includes("APP.constant('task_types'")) {
                targetScriptContent = script.textContent;
                break;
            }
        }

        // [\s\S]*? is used to match any character including newlines, non-greedily.
        const regex = /APP\.constant\s*\(\s*['"]task_types['"]\s*,\s*(\{[\s\S]*?\})\s*(?:,\s*\{.*?\})?\s*\)\s*;/;
        let objectString = null;

        if (targetScriptContent) {
            const matchInline = targetScriptContent.match(regex);
            if (matchInline && matchInline[1]) {
                objectString = matchInline[1];
            }
        }

        // If not found inline, try to fetch external constants script
        if (!objectString) {
            try {
                let externalUrl = null;
                const externalScript = Array.from(document.querySelectorAll('script[src]'))
                    .find(s => /custom-fields-and-types/i.test(s.getAttribute('src') || ''));
                if (externalScript) {
                    externalUrl = new URL(externalScript.getAttribute('src'), location.origin).href;
                } else {
                    const preloadLink = Array.from(document.querySelectorAll('link[rel="preload"][as="script"][href]'))
                        .find(l => /custom-fields-and-types/i.test(l.getAttribute('href') || ''));
                    if (preloadLink) {
                        externalUrl = new URL(preloadLink.getAttribute('href'), location.origin).href;
                    }
                }

                if (externalUrl) {
                    const response = await fetch(externalUrl, { credentials: 'include', cache: 'no-store' });
                    if (response.ok) {
                        const jsText = await response.text();
                        const matchExternal = jsText.match(regex);
                        if (matchExternal && matchExternal[1]) {
                            objectString = matchExternal[1];
                        }
                    } else {
                        console.warn('Failed to fetch external constants script:', response.status, response.statusText);
                    }
                }
            } catch (error) {
                console.warn('Error while fetching external constants script:', error);
            }
        }

        if (!objectString) {
            console.warn("Could not extract the task_types object string using regex.");
            return {};
        }

        let taskTypesData = {};
        try {
            taskTypesData = JSON.parse(objectString);
        } catch (e) {
            console.warn('Failed to parse task_types JSON:', e);
            return {};
        }

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
        const colorUpdateRate = GM_getValue('colorUpdateRate');
        if (colorUpdateRate === 'Always' || Date.now() - GM_getValue('lastColorUpdate', 0) > parseInt(colorUpdateRate) * 3600 * 1000) {
            extractTaskTypeColors()
                .then((colors) => {
                    colors = colors || {};
                    GM_setValue('colors', JSON.stringify(colors));
                    GM_setValue('lastColorUpdate', Date.now());
                    applyColors(colors);
                })
                .catch((e) => {
                    console.warn('Failed to update colors from task types:', e);
                    applyColors(JSON.parse(GM_getValue('colors')));
                });
        } else {
          applyColors(JSON.parse(GM_getValue('colors')));
        }
    }

    function applyColors(colors) {
        const events = document.querySelectorAll('a.fc-time-grid-event:not(.fc-completed)');
        events.forEach(event => {
            const eventDiv = event.querySelector('div.fc-content[title]');
            if (eventDiv) {
                const title = eventDiv.getAttribute('title');
                // Check payment: 123 -> Check payment
                const eventType = title.split(':')[0];
                const EXCLUSIONS = ['Связаться', 'Бронь'];
                if (EXCLUSIONS.includes(eventType)) {
                    return;
                }
                const color = colors[eventType];
                if (!color) return;

                const bgColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
                if (getComputedStyle(event).borderColor == 'rgb(199, 80, 80)') {
                    event.style.backgroundImage = `repeating-linear-gradient(45deg, ${bgColor}, ${bgColor} 10px, transparent 10px, transparent 14px)`;
                } else {
                    event.style.backgroundColor = bgColor;
                }
                // https://www.w3.org/TR/WCAG20/#relativeluminancedef
                if (0.299 * color.r + 0.587 * color.g + 0.114 * color.b > 186) {
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
            // dayOfWeek bitmask is a byteword, cause we are only storing positional data
            // aka Tuesday is 2 == 0b0000010 <= start from smallest bit
            // Using EU convention: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
            { name: 'Adventure',  price: 250, dayOfWeek: 0b0001111, defaultPlayerAmount: 10 },
            { name: 'EPIC',       price: 450, dayOfWeek: 0b0001111, defaultPlayerAmount: 20 },
            { name: 'VIP',        price: 650, dayOfWeek: 0b0001111, defaultPlayerAmount: 30 },
            { name: 'Adventure',  price: 320, dayOfWeek: 0b1110000, defaultPlayerAmount: 10 },
            { name: 'EPIC',       price: 520, dayOfWeek: 0b1110000, defaultPlayerAmount: 20 },
            { name: 'VIP',        price: 720, dayOfWeek: 0b1110000, defaultPlayerAmount: 30 },
        ]

        // Order reversed to accommodate Array.find()
        const playersPriceTable = [
            { price: 20, dayOfWeek: 0b0001111, minPlayerAmount: 6 }, // 6+  Mon-Thu
            { price: 22, dayOfWeek: 0b0001111, minPlayerAmount: 3 }, // 3-5 Mon-Thu
            { price: 25, dayOfWeek: 0b0001111, minPlayerAmount: 1 }, // 1-2 Mon-Thu
            { price: 25, dayOfWeek: 0b1110000, minPlayerAmount: 6 }, // 6+  Fri-Sun
            { price: 27, dayOfWeek: 0b1110000, minPlayerAmount: 3 }, // 3-5 Fri-Sun
            { price: 30, dayOfWeek: 0b1110000, minPlayerAmount: 1 }, // 1-2 Fri-Sun
        ]

        const watchedInputs = new WeakSet();

        const lead = {
            budget: 0,
            playerAmount: 0,
            tariffName: null,
            menu: [],
            // getters read UI to lead object, setters update UI from lead object

            setBudget() {
                if (!document.querySelector('[data-id="771816"] input[type="radio"]:checked')) {
                    document.querySelector('input[name="CFV[771816]"]').click();
                    return;
                }
                this.getTariff();
                this.playerAmount = 0;
                this.getPlayerAmount();

                let tariffPrice = 0;
                let tariffPlayerAmount = 0;
                if (this.tariffName != 'No tariff') {
                    const match = tariffPriceTable.find(t => t.name == this.tariffName && t.dayOfWeek & 1 << this.weekday());
                    [tariffPrice, tariffPlayerAmount] = [match.price || 0, match.defaultPlayerAmount]
                    if (!this.playerAmount) {
                        this.playerAmount = tariffPlayerAmount;
                        this.setPlayerAmount(tariffPlayerAmount)
                    }
                }
                let playersPrice = 0;
                if (!tariffPrice) {
                    const localPrice = playersPriceTable.find(p => (p.dayOfWeek & 1 << this.weekday()) && this.playerAmount >= p.minPlayerAmount)?.price ?? 0; 
                    playersPrice = this.playerAmount * localPrice;
                }
                this.budget = tariffPrice + playersPrice;
                this.getMenu();
                this.menu.forEach(m => { this.budget += m.price });

                const budgetInput = document.querySelector('#lead_card_budget');

                manualSetValueAndApply(budgetInput, this.budget)
                document.querySelector('#autoComputeSumButton').click();
            },

            getTariff(radio = document.querySelector('[data-id="771816"] input[type="radio"]:checked')) {
                this.tariffName = radio.closest('label')?.querySelector('.control-radio-label-text')?.textContent.trim();
                if (this.tariffName.includes('VIP')) {
                    this.tariffName = this.tariffName.split(' ')[0];
                }
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

            weekday() {
                const fullDate = `${this.getDate('[data-id="770966"] input').date}.${new Date().getFullYear()}`
                const jsWeekday = new Date(fullDate.split('.').reverse().join('-')).getDay() ?? new Date().getDay();
                // Convert US week (Sun=0) to EU week (Mon=0): (jsWeekday + 6) % 7
                return (jsWeekday + 6) % 7;
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
            },

            getPlayerAmount(){
                const playerAmountElement = document?.querySelector('[data-id="768812"]');
                if (!playerAmountElement) { return }
                this.playerAmount = playerAmountElement?.querySelector('input').value ?? 0;
                this.playerAmount = parseInt(String(this.playerAmount).match(/\d+/)?.[0]) || 0; // allways an Integer
            },

            setPlayerAmount(newAmount){
                manualSetValueAndApply(document?.querySelector('[data-id="768812"] input'), newAmount);
            },

            setLeadName(){
                const leadName = document?.querySelector('#person_n');
                if (!leadName) { return }
                this.getTariff();
                this.getPlayerAmount();
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
                      const checkCalendarVisibility = () => {
                        const isHidden = getComputedStyle(document.querySelector('.kalendae.k-floating')).display == 'none';
                        if (isHidden && dateSource.querySelector('input').value) {
                            this.addQolButtons();
                            return;
                        }
                        setTimeout(checkCalendarVisibility, 200);
                      };
                      checkCalendarVisibility();
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
            },

            addQolMenuButtons(){
                const cardFieldsTop = document.querySelector('.card-fields__top-name-more');
                if (!cardFieldsTop) return;

                const cardPrintElement = document.getElementById('card_print');
                if (!cardPrintElement) return;

                const parentUl = cardPrintElement.closest('ul.button-input__context-menu');
                if (!parentUl) return;

                // Check if buttons already exist
                if (parentUl.querySelector('[data-qol-menu-button]')) return;

                // Reverse order for proper insertion
                const menuButtons = [
                    { label: 'Письмо в Lohesaba', action: () =>{return lead.compileLohesabaLetter()}},
                    { label: 'Письмо клиенту Рус', action: () =>{return lead.compileLetterToClient('rus')}},
                    { label: 'Письмо клиенту Эст', action: () =>{return lead.compileLetterToClient('est')}},
                ];

                menuButtons.forEach((button, index) => {
                    const li = document.createElement('li');
                    li.className = 'button-input__context-menu__item element__';
                    li.setAttribute('data-qol-menu-button', index);

                    li.innerHTML = `
                        <div class="button-input__context-menu__item__inner">
                            <span class="button-input__context-menu__item__icon-container">
                                <svg class="button-input__context-menu__item__icon svg-icon svg-common--mail-dims">
                                    <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#common--mail"></use>
                                </svg>
                            </span>
                            <span class="button-input__context-menu__item__text">
                                ${button.label}
                            </span>
                        </div>
                    `;

                                        // Add click handler
                    li.addEventListener('click', () => {
                        const letter = button.action();
                        const notificationMessage = `${button.label} скопировано в буфер обмена`;

                        navigator.clipboard.writeText(letter).then(() => {
                            this.showSimpleNotification(notificationMessage);
                        }).catch(err => {
                            console.error('Failed to copy text: ', err);
                            this.showSimpleNotification('Ошибка при копировании в буфер обмена', true);
                        });
                    });

                    // Insert after card_print element
                    cardPrintElement.parentNode.insertBefore(li, cardPrintElement.nextSibling);
                });
            },

            compileLohesabaLetter(){
                const { date, time } = this.getDate('[data-id="770966"] input');
                this.getMenu();

                if (this.menu.length === 0) {
                    this.showSimpleNotification('Еда не выбрана в меню', true);
                    return null; // No menu items selected
                }

                let menuText = '';
                this.menu.forEach((item, index) => {
                    const playerCount = item.name.match(/\d+/)?.[0];
                    let cleanItemName = item.name.replace(/\d+/, '').trim();

                    let itemText;
                    if (cleanItemName.toLowerCase().includes('burger')) {
                        itemText = `${cleanItemName} на ${playerCount} человек`;
                    } else {
                        const pakettName = cleanItemName.includes('pakett') ? cleanItemName : `${cleanItemName} pakett`;
                        itemText = `${pakettName} на ${playerCount} человек`;
                    }

                    menuText += itemText;
                    if (index < this.menu.length - 1) {
                        menuText += '.\n';
                    }
                });

                const letter = this.dedent(`
                    Добрый день,

                    Заказ:
                    ${menuText}

                    Место проведения/адрес: Mustamäe tee 50, Tallinn
                    Дата и время: ${date} начало в ${time}.

                    Спасибо за сотрудничество.

                    С уважением,
                `);

                return letter;
            },

            compileLetterToClient(language){
                const { date, time } = this.getDate('[data-id="770966"] input');
                const dateWithoutYear = date.replace(/\.\d{4}/, '');
                const budget = document.querySelector('input[name="lead[PRICE]"]')?.value || '0';
                const paymentDeadline = this.computePaymentDeadline();
                const halfPayment = parseFloat(budget) * 0.5;
                this.getTariff();

                const match = tariffPriceTable.find(t => t.name == this.tariffName && t.dayOfWeek & 1 << this.weekday());
                const maxPlayers = match ? match.defaultPlayerAmount : this.playerAmount;

                let letter = '';

                if (language === 'est') {
                    letter = this.dedent(`
                        Tere!

                        Täname Teid meie teenuste kasutamise eest.
                        Saadame Teile broneeringu üksikasjad ja ettemaksuarve.

                        Kuupäev ja kellaaeg: ${dateWithoutYear}, kell ${time}
                        Toimumiskoht/aadress: Mustamäe tee 50, Tallinn
                        Osalejate arv: kuni ${maxPlayers} inimest
                        Tariif: ${this.tariffName}

                        Arve summa: ${budget}€
                        Ettemaks 50%: ${halfPayment}€
                        Maksetähtaeg ${paymentDeadline}
                        Kirjale on lisatud arve tasumiseks.

                        Lugupidamisega,
                    `);
                } else {
                    letter = this.dedent(`
                        Добрый день!

                        Спасибо, что воспользовались нашими услугами.
                        Высылаем Вам информацию по бронировке и счет на предоплату.

                        Дата и время: ${dateWithoutYear}, в ${time}
                        Место проведения / Адрес: Mustamäe tee 50, Tallinn
                        Кол-во участников: до ${maxPlayers} человек
                        Тариф: ${this.tariffName}

                        Сумма счета: ${budget}€
                        Предоплата 50%: ${halfPayment}€
                        Срок оплаты: ${paymentDeadline}
                        Счет на предоплату в приложении.

                        С уважением,
                    `);
                }

                return letter;
            },

            dedent(str){
                const match = str.match(/^[ \t]*(?=\S)/gm);
                if (!match) return str;
                const indent = Math.max(...match.map(x => x.length));
                const regex = new RegExp(`^[ \\t]{${indent}}`, 'gm');
                let result = str.replace(regex, '');

                result = result.replace(/^\n+/, '').trim();

                return result;
            },

            showSimpleNotification(message, isError = false){
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    bottom: -100px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: ${isError ? '#ff4444' : '#44aa44'};
                    color: white;
                    padding: 16px 24px;
                    border-radius: 8px;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    z-index: 10000;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                    max-width: 400px;
                    word-wrap: break-word;
                    text-align: center;
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                    border-left: 4px solid ${isError ? '#cc0000' : '#00aa00'};
                `;
                notification.textContent = message;

                document.body.appendChild(notification);

                setTimeout(() => {
                    notification.style.bottom = '30px';
                    notification.style.opacity = '1';
                }, 10);

                setTimeout(() => {
                    notification.style.bottom = '-100px';
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }, 2700);
            },
            
            computePaymentDeadline(){
                const { date } = this.getDate('[data-id="770966"] input');
                const eventDate = new Date(date.split('.').reverse().join('-'));
                const today = new Date();
                const daysDiff = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));

                let deadlineDate;
                if (daysDiff > 14) {
                    deadlineDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
                } else if (daysDiff > 7) {
                    deadlineDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
                } else {
                    deadlineDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
                }

                const pad = n => n.toString().padStart(2, '0');
                return `${pad(deadlineDate.getDate())}.${pad(deadlineDate.getMonth() + 1)}`;
            },

        };

        const ensureQolButtonsAreDrawn = (retries = 10, delay = 200) => {
            if (document.querySelector('.qol-button')) return;
            lead.addQolButtons();
            lead.addQolMenuButtons();
            if (!document.querySelector('.qol-button') && retries > 0) {
                setTimeout(() => ensureQolButtonsAreDrawn(retries - 1, delay), delay);
            }
        };
        ensureQolButtonsAreDrawn();

        const multiselectRoot = document?.querySelector('[data-id="791446"]');
        if (!multiselectRoot) return;
        multiselectRoot.addEventListener('change', e => {
            lead.setBudget();
        });

        const tariffField = document?.querySelector('[data-id="771816"]');
        if (!tariffField) return;
        tariffField.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('click', () => {
                if (radio.checked) {
                    lead.getTariff(radio);
                    lead.setBudget();
                    lead.setLeadName();
                }
            });
        });

        const playerAmountField = document?.querySelector('[data-id="768812"]');
        if (!playerAmountField) return;
        playerAmountField.addEventListener('change', () => {
            lead.getPlayerAmount();
            lead.setBudget()
            lead.setLeadName()
        });
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
    }, 50));

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
