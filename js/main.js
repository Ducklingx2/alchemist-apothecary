import * as THREE from "three";

/* =========================================================
   THE ALCHEMIST'S APOTHECARY
   main.js
   ========================================================= */

/* =========================================================
   STATE
   ========================================================= */

const state = {
    ingredients: [],
    cauldronIngredients: [],

    temperature: 25,
    method: "mix",
    brewTime: 0,
    brewing: false,

    discoveredRecipes: [],

    three: {
        scene: null,
        camera: null,
        renderer: null,
        particles: null,
        clock: new THREE.Clock()
    }
};


/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) =>
    Array.from(document.querySelectorAll(selector));


const dom = {
    leftShelf: $("#left-ingredients"),
    rightShelf: $("#right-ingredients"),

    cauldron: $("#cauldron"),
    potionLiquid: $("#potion-liquid"),
    cauldronStatus: $("#cauldron-status"),

    ingredientCount: $("#ingredient-count"),
    interactionMessage: $("#interaction-message"),

    tooltip: $("#ingredient-tooltip"),
    tooltipName: $("#tooltip-name"),
    tooltipType: $("#tooltip-type"),
    tooltipDescription: $("#tooltip-description"),

    temperatureDial: $("#temperature-dial"),
    temperatureMarker: $(".dial-marker"),
    temperatureValue: $("#temperature-value"),

    timerDisplay: $("#timer-display"),
    timerPlus: $("#timer-plus"),
    timerMinus: $("#timer-minus"),

    brewButton: $("#brew-button"),

    grimoireButton: $("#grimoire-button"),
    grimoireOverlay: $("#grimoire-overlay"),
    closeGrimoire: $("#close-grimoire"),
    recipeList: $("#recipe-list"),

    resultOverlay: $("#result-overlay"),
    resultName: $("#result-name"),
    resultDescription: $("#result-description"),
    resultProperties: $("#result-properties"),
    closeResult: $("#close-result"),

    discoveredCount: $("#discovered-count"),
    totalCount: $("#total-count"),

    backgroundCanvas: $("#three-background")
};


/* =========================================================
   CONSTANTS
   ========================================================= */

const MAX_INGREDIENTS = 12;

const PHYSICAL_INGREDIENT_IDS = [
    "nightleaf",
    "glowcap",
    "emberroot",
    "frostpetal",
    "sunberry",
    "shadowmoss",
    "rose_petal",
    "lavender"
];

const FALLBACK_INGREDIENTS = [
    {
        id: "nightleaf",
        name: "Nightleaf",
        rarity: "common",
        type: "herb",
        description:
            "A dark herb that seems to drink surrounding light.",
        visual: {
            primary_color: "#27364a"
        },
        properties: {
            shadow: 3,
            magic: 2,
            cooling: 2
        }
    },

    {
        id: "glowcap",
        name: "Glowcap",
        rarity: "common",
        type: "fungus",
        description:
            "A softly luminous mushroom.",
        visual: {
            primary_color: "#76c9a4"
        },
        properties: {
            light: 4,
            magic: 1,
            luminosity: 5
        }
    },

    {
        id: "emberroot",
        name: "Emberroot",
        rarity: "uncommon",
        type: "root",
        description:
            "A root that retains remarkable heat.",
        visual: {
            primary_color: "#c56a38"
        },
        properties: {
            fire: 5,
            heat: 5,
            stability: 1
        }
    },

    {
        id: "frostpetal",
        name: "Frostpetal",
        rarity: "uncommon",
        type: "flower",
        description:
            "A flower cold enough to frost nearby glass.",
        visual: {
            primary_color: "#86b6d8"
        },
        properties: {
            ice: 5,
            cooling: 5
        }
    },

    {
        id: "sunberry",
        name: "Sunberry",
        rarity: "uncommon",
        type: "fruit",
        description:
            "A warm golden berry containing concentrated sunlight.",
        visual: {
            primary_color: "#d9a83d"
        },
        properties: {
            light: 5,
            energy: 4,
            heat: 2
        }
    },

    {
        id: "shadowmoss",
        name: "Shadowmoss",
        rarity: "uncommon",
        type: "moss",
        description:
            "Moss that grows where light rarely reaches.",
        visual: {
            primary_color: "#34452f"
        },
        properties: {
            shadow: 6,
            darkness: 4
        }
    },

    {
        id: "rose_petal",
        name: "Rose Petal",
        rarity: "common",
        type: "flower",
        description:
            "A delicate petal carrying faint emotional resonance.",
        visual: {
            primary_color: "#9a5261"
        },
        properties: {
            heart: 3,
            beauty: 3
        }
    },

    {
        id: "lavender",
        name: "Lavender",
        rarity: "common",
        type: "herb",
        description:
            "A calming herb commonly used in restorative infusions.",
        visual: {
            primary_color: "#75658f"
        },
        properties: {
            calm: 4,
            sleep: 3
        }
    }
];


/* =========================================================
   UTILITY
   ========================================================= */

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}


function capitalize(value) {
    if (!value) return "";

    return value.charAt(0).toUpperCase() +
        value.slice(1);
}


function prettyProperty(value) {
    return String(value)
        .replaceAll("_", " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}


function showMessage(message) {
    if (dom.interactionMessage) {
        dom.interactionMessage.textContent = message;
    }
}


/* =========================================================
   DATABASE
   ========================================================= */

async function loadDatabase() {

    try {

        const response =
            await fetch("./data/ingredients.json", {
                cache: "no-cache"
            });

        if (!response.ok) {
            throw new Error(
                `Ingredient database returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (
            !data ||
            !Array.isArray(data.ingredients)
        ) {
            throw new Error(
                "ingredients.json does not contain an ingredients array."
            );
        }

        state.ingredients =
            data.ingredients.filter(
                ingredient =>
                    ingredient &&
                    typeof ingredient.id === "string"
            );

        console.log(
            `Loaded ${state.ingredients.length} ingredients.`
        );

    } catch (error) {

        console.error(
            "Failed to load ingredient database:",
            error
        );

        state.ingredients =
            FALLBACK_INGREDIENTS;

        showMessage(
            "The full ingredient ledger could not be opened. The emergency shelf has been restored."
        );
    }

    dom.totalCount.textContent =
        state.ingredients.length || 125;

    createIngredientShelves();
}


/* =========================================================
   INGREDIENT SHELVES
   ========================================================= */

function createIngredientShelves() {

    dom.leftShelf.innerHTML = "";
    dom.rightShelf.innerHTML = "";

    let physical = PHYSICAL_INGREDIENT_IDS
        .map(id =>
            state.ingredients.find(
                ingredient => ingredient.id === id
            )
        )
        .filter(Boolean);

    if (physical.length < 4) {
        physical = state.ingredients.slice(0, 8);
    }

    physical.forEach(
        (ingredient, index) => {

            const element =
                createIngredientElement(ingredient);

            if (index % 2 === 0) {
                dom.leftShelf.appendChild(element);
            } else {
                dom.rightShelf.appendChild(element);
            }
        }
    );
}


/* =========================================================
   INGREDIENT ELEMENT
   ========================================================= */

function createIngredientElement(ingredient) {

    const element =
        document.createElement("div");

    element.className = "ingredient";

    element.dataset.ingredientId =
        ingredient.id;

    element.draggable = true;

    const color =
        ingredient.visual?.primary_color ||
        ingredient.visual?.color ||
        "#668f86";

    element.style.setProperty(
        "--ingredient-color",
        color
    );


    /* -------------------------------
       IMAGE
    ------------------------------- */

    const imagePath =
        ingredient.visual?.image ||
        ingredient.image ||
        null;

    if (imagePath) {

        const image =
            document.createElement("img");

        image.className =
            "ingredient-image";

        image.src = imagePath;

        image.alt =
            ingredient.name || ingredient.id;

        image.addEventListener(
            "error",
            () => {

                image.remove();

                if (
                    !element.querySelector(
                        ".ingredient-placeholder"
                    )
                ) {
                    element.prepend(
                        createIngredientPlaceholder(
                            ingredient
                        )
                    );
                }
            },
            { once: true }
        );

        element.appendChild(image);

    } else {

        element.appendChild(
            createIngredientPlaceholder(
                ingredient
            )
        );
    }


    /* -------------------------------
       INFORMATION
    ------------------------------- */

    const info =
        document.createElement("div");

    info.className =
        "ingredient-info";

    const name =
        document.createElement("div");

    name.className =
        "ingredient-name";

    name.textContent =
        ingredient.name ||
        ingredient.id;


    const rarity =
        document.createElement("div");

    rarity.className =
        "ingredient-rarity";

    rarity.textContent =
        ingredient.rarity ||
        "unknown";


    info.appendChild(name);
    info.appendChild(rarity);

    element.appendChild(info);


    /* -------------------------------
       DRAG
    ------------------------------- */

    element.addEventListener(
        "dragstart",
        event => {

            if (state.brewing) {
                event.preventDefault();
                return;
            }

            element.classList.add("dragging");

            event.dataTransfer.effectAllowed =
                "copy";

            event.dataTransfer.setData(
                "text/plain",
                ingredient.id
            );

            showMessage(
                `Bring ${ingredient.name} to the cauldron.`
            );
        }
    );


    element.addEventListener(
        "dragend",
        () => {

            element.classList.remove(
                "dragging"
            );
        }
    );


    /* -------------------------------
       DOUBLE CLICK FALLBACK
    ------------------------------- */

    element.addEventListener(
        "dblclick",
        () => {

            if (!state.brewing) {
                addIngredientToCauldron(
                    ingredient.id
                );
            }
        }
    );


    /* -------------------------------
       TOOLTIP
    ------------------------------- */

    element.addEventListener(
        "mouseenter",
        event => {

            showIngredientTooltip(
                ingredient,
                event.clientX,
                event.clientY
            );
        }
    );

    element.addEventListener(
        "mousemove",
        event => {

            moveTooltip(
                event.clientX,
                event.clientY
            );
        }
    );

    element.addEventListener(
        "mouseleave",
        hideTooltip
    );


    return element;
}


function createIngredientPlaceholder(ingredient) {

    const placeholder =
        document.createElement("div");

    placeholder.className =
        "ingredient-placeholder";

    placeholder.textContent =
        "✦";

    placeholder.style.setProperty(
        "--ingredient-color",
        ingredient.visual?.primary_color ||
        "#668f86"
    );

    return placeholder;
}


/* =========================================================
   CAULDRON DRAG/DROP
   ========================================================= */

function setupCauldronInteraction() {

    dom.cauldron.addEventListener(
        "dragover",
        event => {

            if (state.brewing) {
                return;
            }

            event.preventDefault();

            dom.cauldron.style.transform =
                "scale(1.035)";
        }
    );


    dom.cauldron.addEventListener(
        "dragleave",
        () => {

            dom.cauldron.style.transform =
                "";
        }
    );


    dom.cauldron.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            dom.cauldron.style.transform =
                "";

            if (state.brewing) {
                return;
            }

            const id =
                event.dataTransfer.getData(
                    "text/plain"
                );

            if (id) {
                addIngredientToCauldron(id);
            }
        }
    );


    /* Double-click cauldron clears it */

    dom.cauldron.addEventListener(
        "dblclick",
        () => {

            if (
                state.cauldronIngredients.length &&
                !state.brewing
            ) {
                clearCauldron();
            }
        }
    );
}


/* =========================================================
   ADD INGREDIENT
   ========================================================= */

function addIngredientToCauldron(id) {

    if (state.cauldronIngredients.length >= MAX_INGREDIENTS) {

        showMessage(
            "The cauldron has reached its safe capacity of 12 ingredients."
        );

        return;
    }


    const ingredient =
        state.ingredients.find(
            item => item.id === id
        );

    if (!ingredient) {
        return;
    }


    state.cauldronIngredients.push(id);

    updateCauldron();

    showMessage(
        `${ingredient.name} has entered the brew.`
    );


    /* Visually remove ingredient */

    const elements =
        $$(
            `[data-ingredient-id="${CSS.escape(id)}"]`
        );

    elements.forEach(element => {

        element.style.opacity = "0.25";
        element.style.pointerEvents = "none";

    });
}


/* =========================================================
   CLEAR CAULDRON
   ========================================================= */

function clearCauldron() {

    state.cauldronIngredients = [];

    restoreIngredientShelves();

    updateCauldron();

    showMessage(
        "The cauldron has been emptied."
    );
}


/* =========================================================
   RESTORE SHELVES
   ========================================================= */

function restoreIngredientShelves() {

    $$(".ingredient").forEach(
        element => {

            element.style.opacity = "";
            element.style.pointerEvents = "";
        }
    );
}


/* =========================================================
   CAULDRON VISUAL
   ========================================================= */

function updateCauldron() {

    const count =
        state.cauldronIngredients.length;

    dom.ingredientCount.textContent =
        `${count} ingredient${count === 1 ? "" : "s"} in cauldron`;


    const hue =
        calculatePotionHue();

    dom.potionLiquid.style.background =
        `
        radial-gradient(
            ellipse at 45% 35%,
            hsl(${hue}, 65%, 62%),
            hsl(${hue}, 55%, 30%) 55%,
            hsl(${hue}, 50%, 12%)
        )
        `;

    dom.potionLiquid.style.boxShadow =
        `
        0 0 28px
        hsla(${hue}, 70%, 55%, 0.28)
        `;


    if (count === 0) {

        dom.cauldronStatus.innerHTML =
            `
            <span class="status-dot"></span>
            Cauldron ready
            `;

    } else {

        dom.cauldronStatus.innerHTML =
            `
            <span class="status-dot"></span>
            ${count} reagent${count === 1 ? "" : "s"} loaded
            `;
    }
}


/* =========================================================
   POTION COLOR
   ========================================================= */

function calculatePotionHue() {

    if (
        state.cauldronIngredients.length === 0
    ) {
        return 165;
    }


    let totalHue = 0;
    let count = 0;


    for (
        const id of state.cauldronIngredients
    ) {

        const ingredient =
            state.ingredients.find(
                item => item.id === id
            );

        if (!ingredient) {
            continue;
        }


        const color =
            ingredient.visual?.primary_color ||
            ingredient.visual?.color;

        if (!color) {
            continue;
        }


        const hue =
            colorToHue(color);

        if (hue !== null) {

            totalHue += hue;
            count++;
        }
    }


    if (!count) {
        return 165;
    }


    return Math.round(
        totalHue / count
    );
}


function colorToHue(color) {

    if (
        typeof color !== "string"
    ) {
        return null;
    }


    let hex = color.trim();


    if (hex.startsWith("#")) {
        hex = hex.slice(1);
    }


    if (hex.length !== 6) {
        return null;
    }


    const number =
        Number.parseInt(hex, 16);

    if (
        Number.isNaN(number)
    ) {
        return null;
    }


    const r =
        ((number >> 16) & 255) / 255;

    const g =
        ((number >> 8) & 255) / 255;

    const b =
        (number & 255) / 255;


    const max =
        Math.max(r, g, b);

    const min =
        Math.min(r, g, b);

    const delta =
        max - min;


    if (delta === 0) {
        return 0;
    }


    let hue;


    if (max === r) {

        hue =
            60 * (
                ((g - b) / delta) % 6
            );

    } else if (max === g) {

        hue =
            60 * (
                (b - r) / delta + 2
            );

    } else {

        hue =
            60 * (
                (r - g) / delta + 4
            );
    }


    if (hue < 0) {
        hue += 360;
    }


    return hue;
}


/* =========================================================
   TEMPERATURE
   ========================================================= */

function setupTemperature() {

    if (!dom.temperatureDial) {
        return;
    }


    dom.temperatureDial.addEventListener(
        "click",
        () => {

            if (state.brewing) {
                return;
            }


            state.temperature += 5;


            if (
                state.temperature > 100
            ) {
                state.temperature = -10;
            }


            updateTemperature();

            showMessage(
                `Temperature set to ${state.temperature}°C.`
            );
        }
    );


    updateTemperature();
}


function updateTemperature() {

    dom.temperatureValue.textContent =
        `${state.temperature}°C`;


    const normalized =
        (state.temperature + 10) / 110;


    const rotation =
        -130 + normalized * 260;


    dom.temperatureMarker.style.transform =
        `
        translateX(-50%)
        rotate(${rotation}deg)
        `;
}


/* =========================================================
   METHODS
   ========================================================= */

function setupMethods() {

    $$(".method").forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    if (state.brewing) {
                        return;
                    }


                    $$(".method").forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    button.classList.add(
                        "active"
                    );


                    state.method =
                        button.dataset.method ||
                        "mix";


                    showMessage(
                        `Method selected: ${capitalize(state.method)}.`
                    );
                }
            );
        }
    );
}


/* =========================================================
   TIMER
   ========================================================= */

function setupTimer() {

    dom.timerPlus.addEventListener(
        "click",
        () => {

            if (state.brewing) {
                return;
            }

            state.brewTime =
                clamp(
                    state.brewTime + 5,
                    0,
                    600
                );

            updateTimer();
        }
    );


    dom.timerMinus.addEventListener(
        "click",
        () => {

            if (state.brewing) {
                return;
            }

            state.brewTime =
                clamp(
                    state.brewTime - 5,
                    0,
                    600
                );

            updateTimer();
        }
    );


    updateTimer();
}


function updateTimer() {

    const minutes =
        Math.floor(
            state.brewTime / 60
        );

    const seconds =
        state.brewTime % 60;


    dom.timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


/* =========================================================
   BREWING
   ========================================================= */

function setupBrewing() {

    dom.brewButton.addEventListener(
        "click",
        brew
    );
}


function brew() {

    if (state.brewing) {
        return;
    }


    if (
        state.cauldronIngredients.length === 0
    ) {

        showMessage(
            "The cauldron is empty. Even alchemy requires ingredients."
        );

        return;
    }


    state.brewing = true;


    dom.brewButton.disabled = true;

    dom.brewButton.innerHTML =
        `
        <span class="brew-symbol">⚗</span>
        Brewing...
        `;


    dom.cauldron.classList.add(
        "brewing"
    );


    showMessage(
        "The ingredients begin to react..."
    );


    const brewDuration =
        clamp(
            state.brewTime > 0
                ? state.brewTime * 100
                : 1800,
            900,
            5000
        );


    setTimeout(
        finishBrew,
        brewDuration
    );
}


/* =========================================================
   BREW RESOLUTION
   ========================================================= */

function finishBrew() {

    const ingredients =
        state.cauldronIngredients
            .map(
                id =>
                    state.ingredients.find(
                        ingredient =>
                            ingredient.id === id
                    )
            )
            .filter(Boolean);


    const result =
        resolveBrew(
            ingredients
        );


    showResult(result);


    state.cauldronIngredients = [];

    restoreIngredientShelves();

    updateCauldron();


    state.brewing = false;

    dom.cauldron.classList.remove(
        "brewing"
    );


    dom.brewButton.disabled = false;

    dom.brewButton.innerHTML =
        `
        <span class="brew-symbol">⚗</span>
        Begin Brewing
        `;
}


/* =========================================================
   RESOLVE BREW
   ========================================================= */

function resolveBrew(ingredients) {

    /*
     * This is deliberately an experimental resolver for now.
     *
     * Once recipes.json is wired in, this function becomes
     * the bridge between the ingredient database and the
     * actual recipe engine.
     */

    const properties =
        calculateProperties(
            ingredients
        );


    const dominant =
        Object.entries(properties)
            .filter(
                ([, value]) =>
                    typeof value === "number" &&
                    Number.isFinite(value)
            )
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )[0];


    if (!dominant) {

        return {
            name: "Unstable Mixture",
            description:
                "The ingredients combined, but their magical properties produced no clearly dominant reaction.",
            properties: {}
        };
    }


    const [
        dominantProperty,
        dominantValue
    ] = dominant;


    const propertyName =
        prettyProperty(
            dominantProperty
        );


    const name =
        generatePotionName(
            dominantProperty
        );


    const description =
        generatePotionDescription(
            dominantProperty,
            ingredients
        );


    return {
        name,
        description,

        properties: {
            [propertyName]:
                clamp(
                    Math.round(
                        dominantValue
                    ),
                    1,
                    10
                )
        }
    };
}


/* =========================================================
   PROPERTY CALCULATION
   ========================================================= */

function calculateProperties(ingredients) {

    const properties = {};


    for (
        const ingredient of ingredients
    ) {

        const source =
            ingredient.properties ||
            ingredient.alchemical_properties ||
            {};


        for (
            const [property, rawValue]
            of Object.entries(source)
        ) {

            const value =
                Number(rawValue);


            if (
                !Number.isFinite(value)
            ) {
                continue;
            }


            properties[property] =
                (properties[property] || 0) +
                value;
        }
    }


    return properties;
}


/* =========================================================
   POTION NAME GENERATION
   ========================================================= */

function generatePotionName(
    property
) {

    const names = {

        healing:
            "Restorative Draught",

        light:
            "Luminous Elixir",

        luminosity:
            "Radiant Elixir",

        shadow:
            "Shadow Elixir",

        darkness:
            "Umbral Tincture",

        fire:
            "Ember Tonic",

        heat:
            "Infernal Infusion",

        ice:
            "Frost Elixir",

        cooling:
            "Winter's Draught",

        magic:
            "Arcane Elixir",

        energy:
            "Surge Tonic",

        dream:
            "Dream Tea",

        mind:
            "Clarity Elixir",

        sleep:
            "Somnolent Draught",

        calm:
            "Serenity Tea",

        growth:
            "Verdant Growth",

        earth:
            "Earthen Mixture",

        cosmic:
            "Astral Elixir",

        void:
            "Void Essence",

        spirit:
            "Spirit Essence",

        ethereal:
            "Ethereal Tincture",

        lightning:
            "Storm Elixir",

        air:
            "Zephyr Tonic",

        water:
            "Aquatic Elixir",

        luck:
            "Fortune Draught",

        fortune:
            "Fortune Draught",

        rebirth:
            "Rebirth Draught",

        poison:
            "Venomous Tincture",

        venom:
            "Serpent Tincture",

        transformation:
            "Transmutation Elixir",

        purity:
            "Purification Draught",

        warding:
            "Warding Tonic"
    };


    return (
        names[property] ||
        `${prettyProperty(property)} Elixir`
    );
}


/* =========================================================
   POTION DESCRIPTION
   ========================================================= */

function generatePotionDescription(
    property,
    ingredients
) {

    const ingredientNames =
        ingredients
            .map(
                ingredient =>
                    ingredient.name
            )
            .join(", ");


    const descriptions = {

        healing:
            "A restorative mixture carrying concentrated regenerative energy.",

        light:
            "The brew glows with a steady inner light.",

        shadow:
            "Darkness gathers unnaturally around the surface of the potion.",

        fire:
            "Heat rolls from the brew even after the flame beneath it has died.",

        ice:
            "The mixture remains unnaturally cold despite the warmth of the laboratory.",

        magic:
            "Arcane energy dances across the surface in tiny geometric patterns.",

        dream:
            "A soft haze rises from the potion, carrying the strange quality of an unfinished dream.",

        sleep:
            "The potion emits a quiet, almost hypnotic shimmer.",

        growth:
            "The mixture pulses faintly with the energy of living things.",

        cosmic:
            "Tiny points of light drift beneath the surface like distant stars.",

        void:
            "The brew appears to absorb the surrounding light.",

        spirit:
            "A faint translucent mist moves against the direction of the air.",

        lightning:
            "Small electrical arcs jump between bubbles on the surface.",

        luck:
            "The potion refuses to settle into a predictable pattern.",

        rebirth:
            "Warm golden particles rise from the mixture and vanish before reaching the rim."
    };


    const base =
        descriptions[property] ||
        "An experimental alchemical mixture whose properties are still being catalogued.";


    return `${base} Formed from ${ingredientNames}.`;
}


/* =========================================================
   RESULT UI
   ========================================================= */

function showResult(result) {

    dom.resultName.textContent =
        result.name;


    dom.resultDescription.textContent =
        result.description;


    dom.resultProperties.innerHTML =
        "";


    for (
        const [property, value]
        of Object.entries(
            result.properties || {}
        )
    ) {

        const element =
            document.createElement("span");

        element.className =
            "property";

        element.textContent =
            `${property}: ${value}`;

        dom.resultProperties.appendChild(
            element
        );
    }


    dom.resultOverlay.classList.remove(
        "hidden"
    );
}


function setupResultOverlay() {

    dom.closeResult.addEventListener(
        "click",
        () => {

            dom.resultOverlay.classList.add(
                "hidden"
            );
        }
    );


    dom.resultOverlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                dom.resultOverlay
            ) {

                dom.resultOverlay.classList.add(
                    "hidden"
                );
            }
        }
    );
}


/* =========================================================
   GRIMOIRE
   ========================================================= */

function setupGrimoire() {

    dom.grimoireButton.addEventListener(
        "click",
        openGrimoire
    );


    dom.closeGrimoire.addEventListener(
        "click",
        closeGrimoire
    );


    dom.grimoireOverlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                dom.grimoireOverlay
            ) {
                closeGrimoire();
            }
        }
    );


    renderGrimoire();
}


function openGrimoire() {

    renderGrimoire();

    dom.grimoireOverlay.classList.remove(
        "hidden"
    );
}


function closeGrimoire() {

    dom.grimoireOverlay.classList.add(
        "hidden"
    );
}


function renderGrimoire() {

    dom.recipeList.innerHTML = "";


    if (
        state.discoveredRecipes.length === 0
    ) {

        const entry =
            document.createElement("article");

        entry.className =
            "recipe-entry unknown";

        entry.innerHTML =
            `
            <div class="recipe-name">
                UNKNOWN RECIPE
            </div>

            <div class="recipe-description">
                The pages remain blank. Experimentation will reveal what the apothecary has forgotten.
            </div>
            `;

        dom.recipeList.appendChild(
            entry
        );

        updateDiscoveryCounter();

        return;
    }


    state.discoveredRecipes.forEach(
        recipe => {

            const entry =
                document.createElement("article");

            entry.className =
                "recipe-entry";


            const name =
                document.createElement("div");

            name.className =
                "recipe-name";

            name.textContent =
                recipe.name;


            const description =
                document.createElement("div");

            description.className =
                "recipe-description";

            description.textContent =
                recipe.description;


            entry.appendChild(name);
            entry.appendChild(description);

            dom.recipeList.appendChild(
                entry
            );
        }
    );


    updateDiscoveryCounter();
}


function updateDiscoveryCounter() {

    dom.discoveredCount.textContent =
        state.discoveredRecipes.length;

    dom.totalCount.textContent =
        state.ingredients.length || 125;
}


/* =========================================================
   TOOLTIP
   ========================================================= */

function showIngredientTooltip(
    ingredient,
    x,
    y
) {

    dom.tooltipName.textContent =
        ingredient.name ||
        ingredient.id;


    dom.tooltipType.textContent =
        ingredient.type ||
        ingredient.rarity ||
        "ingredient";


    dom.tooltipDescription.textContent =
        ingredient.description ||
        "Its properties have not yet been fully catalogued.";


    dom.tooltip.classList.remove(
        "hidden"
    );


    moveTooltip(x, y);
}


function moveTooltip(x, y) {

    const width = 240;
    const height = 130;

    const left =
        Math.min(
            x + 16,
            window.innerWidth - width - 12
        );

    const top =
        Math.min(
            y + 16,
            window.innerHeight - height - 12
        );


    dom.tooltip.style.left =
        `${Math.max(8, left)}px`;

    dom.tooltip.style.top =
        `${Math.max(8, top)}px`;
}


function hideTooltip() {

    dom.tooltip.classList.add(
        "hidden"
    );
}


/* =========================================================
   KEYBOARD SHORTCUTS
   ========================================================= */

function setupKeyboard() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.target instanceof
                HTMLInputElement ||
                event.target instanceof
                HTMLTextAreaElement ||
                event.target instanceof
                HTMLSelectElement
            ) {
                return;
            }


            if (
                event.key === "Escape"
            ) {

                dom.grimoireOverlay.classList.add(
                    "hidden"
                );

                dom.resultOverlay.classList.add(
                    "hidden"
                );

                hideTooltip();

                return;
            }


            if (
                event.key.toLowerCase() === "g"
            ) {

                if (
                    dom.grimoireOverlay.classList.contains(
                        "hidden"
                    )
                ) {
                    openGrimoire();
                } else {
                    closeGrimoire();
                }
            }


            if (
                event.key.toLowerCase() === "b"
            ) {

                if (!state.brewing) {
                    brew();
                }
            }


            if (
                event.key === "Delete" &&
                !state.brewing
            ) {

                clearCauldron();
            }
        }
    );
}


/* =========================================================
   THREE.JS ATMOSPHERE
   ========================================================= */

function initThreeBackground() {

    if (!dom.backgroundCanvas) {
        return;
    }


    const scene =
        new THREE.Scene();


    const camera =
        new THREE.OrthographicCamera(
            -1,
            1,
            1,
            -1,
            0,
            10
        );


    camera.position.z = 2;


    const renderer =
        new THREE.WebGLRenderer({
            canvas: dom.backgroundCanvas,
            alpha: true,
            antialias: true
        });


    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );


    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );


    state.three.scene =
        scene;

    state.three.camera =
        camera;

    state.three.renderer =
        renderer;


    createAtmosphericParticles();

    animateThree();
}


/* =========================================================
   THREE PARTICLES
   ========================================================= */

function createAtmosphericParticles() {

    const count = 350;


    const positions =
        new Float32Array(
            count * 3
        );


    for (
        let i = 0;
        i < count;
        i++
    ) {

        positions[i * 3] =
            (Math.random() - 0.5) * 2.2;

        positions[i * 3 + 1] =
            (Math.random() - 0.5) * 2.2;

        positions[i * 3 + 2] =
            Math.random();
    }


    const geometry =
        new THREE.BufferGeometry();


    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
            positions,
            3
        )
    );


    const material =
        new THREE.PointsMaterial({

            color: 0x9bc8bd,

            size: 0.009,

            transparent: true,

            opacity: 0.2,

            depthWrite: false
        });


    const particles =
        new THREE.Points(
            geometry,
            material
        );


    state.three.scene.add(
        particles
    );


    state.three.particles =
        particles;
}


/* =========================================================
   THREE ANIMATION
   ========================================================= */

function animateThree() {

    requestAnimationFrame(
        animateThree
    );


    if (
        !state.three.renderer
    ) {
        return;
    }


    const elapsed =
        state.three.clock.getElapsedTime();


    if (
        state.three.particles
    ) {

        state.three.particles.rotation.y =
            elapsed * 0.008;

        state.three.particles.rotation.x =
            Math.sin(
                elapsed * 0.08
            ) * 0.015;
    }


    state.three.renderer.render(
        state.three.scene,
        state.three.camera
    );
}


/* =========================================================
   RESIZE
   ========================================================= */

function setupResize() {

    window.addEventListener(
        "resize",
        () => {

            if (
                !state.three.renderer
            ) {
                return;
            }


            state.three.renderer.setSize(
                window.innerWidth,
                window.innerHeight
            );
        }
    );
}


/* =========================================================
   INIT
   ========================================================= */

async function init() {

    initThreeBackground();

    setupCauldronInteraction();

    setupTemperature();

    setupMethods();

    setupTimer();

    setupBrewing();

    setupResultOverlay();

    setupGrimoire();

    setupKeyboard();

    setupResize();

    await loadDatabase();

    updateCauldron();

    updateTimer();

    updateTemperature();

    updateDiscoveryCounter();

    showMessage(
        "The apothecary is ready."
    );
}


init();
