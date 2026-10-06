import * as THREE from "three";


/* =========================================
   GAME STATE
========================================= */

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


/* =========================================
   DOM
========================================= */

const $ = (selector) => document.querySelector(selector);

const leftShelf = $("#left-ingredients");
const rightShelf = $("#right-ingredients");

const cauldron = $("#cauldron");
const potionLiquid = $("#potion-liquid");

const ingredientCount = $("#ingredient-count");
const interactionMessage = $("#interaction-message");

const tooltip = $("#ingredient-tooltip");
const tooltipName = $("#tooltip-name");
const tooltipType = $("#tooltip-type");
const tooltipDescription = $("#tooltip-description");

const temperatureValue = $("#temperature-value");
const timerDisplay = $("#timer-display");

const brewButton = $("#brew-button");

const grimoireButton = $("#grimoire-button");
const grimoireOverlay = $("#grimoire-overlay");
const closeGrimoire = $("#close-grimoire");
const recipeList = $("#recipe-list");

const resultOverlay = $("#result-overlay");
const resultName = $("#result-name");
const resultDescription = $("#result-description");
const resultProperties = $("#result-properties");
const closeResult = $("#close-result");

const discoveredCount = $("#discovered-count");
const totalCount = $("#total-count");


/* =========================================
   DATABASE
========================================= */

async function loadIngredients() {

    try {

        const response =
            await fetch("./data/ingredients.json");

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data = await response.json();

        state.ingredients =
            Array.isArray(data.ingredients)
                ? data.ingredients
                : [];

        totalCount.textContent =
            state.ingredients.length || 125;

        createIngredientShelf();

    } catch (error) {

        console.error(
            "Ingredient database failed:",
            error
        );

        interactionMessage.textContent =
            "The ingredient database could not be opened.";

        createFallbackIngredients();
    }
}


/* =========================================
   INGREDIENT SHELVES
========================================= */

function createIngredientShelf() {

    leftShelf.innerHTML = "";
    rightShelf.innerHTML = "";

    const physicalIngredients =
        choosePhysicalIngredients();

    physicalIngredients.forEach(
        (ingredient, index) => {

            const element =
                createIngredientElement(
                    ingredient
                );

            if (index % 2 === 0) {
                leftShelf.appendChild(element);
            } else {
                rightShelf.appendChild(element);
            }

        }
    );
}


function choosePhysicalIngredients() {

    const preferredIds = [
        "nightleaf",
        "glowcap",
        "emberroot",
        "frostpetal",
        "sunberry",
        "shadowmoss",
        "rose_petal",
        "lavender"
    ];

    const preferred =
        preferredIds
            .map(
                id =>
                    state.ingredients.find(
                        ingredient =>
                            ingredient.id === id
                    )
            )
            .filter(Boolean);

    if (preferred.length >= 4) {
        return preferred;
    }

    return state.ingredients.slice(0, 8);
}


/* =========================================
   INGREDIENT ELEMENT
========================================= */

function createIngredientElement(ingredient) {

    const element =
        document.createElement("div");

    element.className = "ingredient";

    element.draggable = true;

    element.dataset.ingredientId =
        ingredient.id;

    const color =
        ingredient.visual?.primary_color ||
        "#658c82";

    element.style.setProperty(
        "--ingredient-color",
        color
    );

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
            ingredient.name || "Ingredient";

        image.onerror = () => {

            image.remove();

            element
                .querySelector(".ingredient-visual")
                ?.remove();

            const placeholder =
                createPlaceholder(ingredient);

            element.prepend(placeholder);
        };

        element.appendChild(image);

    } else {

        element.appendChild(
            createPlaceholder(ingredient)
        );

    }


    const info =
        document.createElement("div");

    info.className =
        "ingredient-info";

    const name =
        document.createElement("div");

    name.className =
        "ingredient-name";

    name.textContent =
        ingredient.name || ingredient.id;

    const rarity =
        document.createElement("div");

    rarity.className =
        "ingredient-rarity";

    rarity.textContent =
        ingredient.rarity || "unknown";

    info.appendChild(name);
    info.appendChild(rarity);

    element.appendChild(info);


    /* Dragging */

    element.addEventListener(
        "dragstart",
        event => {

            element.classList.add("dragging");

            event.dataTransfer.effectAllowed =
                "copy";

            event.dataTransfer.setData(
                "text/plain",
                ingredient.id
            );

            showMessage(
                `Drag ${ingredient.name} into the cauldron.`
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


    /* Double-click fallback */

    element.addEventListener(
        "dblclick",
        () => {

            addIngredientToCauldron(
                ingredient.id
            );

        }
    );


    /* Tooltip */

    element.addEventListener(
        "mouseenter",
        event => {

            showTooltip(
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


function createPlaceholder(ingredient) {

    const placeholder =
        document.createElement("div");

    placeholder.className =
        "ingredient-placeholder";

    placeholder.textContent = "✦";

    return placeholder;
}


/* =========================================
   CAULDRON DROP
========================================= */

cauldron.addEventListener(
    "dragover",
    event => {

        event.preventDefault();

        cauldron.style.transform =
            "scale(1.035)";

    }
);


cauldron.addEventListener(
    "dragleave",
    () => {

        cauldron.style.transform =
            "";

    }
);


cauldron.addEventListener(
    "drop",
    event => {

        event.preventDefault();

        cauldron.style.transform =
            "";

        const id =
            event.dataTransfer.getData(
                "text/plain"
            );

        if (id) {
            addIngredientToCauldron(id);
        }
    }
);


/* =========================================
   ADD INGREDIENT
========================================= */

function addIngredientToCauldron(id) {

    const ingredient =
        state.ingredients.find(
            item => item.id === id
        );

    if (!ingredient) {
        return;
    }

    if (state.cauldronIngredients.length >= 12) {

        showMessage(
            "The cauldron cannot safely hold more than 12 ingredients."
        );

        return;
    }

    state.cauldronIngredients.push(id);

    updateCauldron();

    showMessage(
        `${ingredient.name} added to the cauldron.`
    );

    /* Make the physical ingredient disappear */

    const element =
        document.querySelector(
            `[data-ingredient-id="${CSS.escape(id)}"]`
        );

    if (element) {

        element.style.opacity = "0.25";
        element.style.pointerEvents = "none";

    }
}


/* =========================================
   CAULDRON UI
========================================= */

function updateCauldron() {

    const count =
        state.cauldronIngredients.length;

    ingredientCount.textContent =
        `${count} ingredient${count === 1 ? "" : "s"} in cauldron`;

    const hue =
        calculatePotionHue();

    potionLiquid.style.background =
        `
        radial-gradient(
            ellipse at 45% 35%,
            hsl(${hue}, 65%, 62%),
            hsl(${hue}, 55%, 30%) 55%,
            hsl(${hue}, 50%, 12%)
        )
        `;

    potionLiquid.style.boxShadow =
        `
        0 0 28px
        hsla(${hue}, 70%, 55%, 0.28)
        `;

}


function calculatePotionHue() {

    if (!state.cauldronIngredients.length) {
        return 165;
    }

    let total = 0;
    let count = 0;

    for (const id of state.cauldronIngredients) {

        const ingredient =
            state.ingredients.find(
                item => item.id === id
            );

        const color =
            ingredient?.visual?.primary_color;

        if (!color) {
            continue;
        }

        const hue =
            colorToHue(color);

        if (hue !== null) {

            total += hue;
            count++;

        }
    }

    return count
        ? Math.round(total / count)
        : 165;
}


function colorToHue(color) {

    const match =
        color.match(
            /^#([0-9a-f]{6})$/i
        );

    if (!match) {
        return null;
    }

    const value =
        parseInt(match[1], 16);

    const r =
        (value >> 16) & 255;

    const g =
        (value >> 8) & 255;

    const b =
        value & 255;

    const max =
        Math.max(r, g, b);

    const min =
        Math.min(r, g, b);

    if (max === min) {
        return 0;
    }

    let h;

    const d = max - min;

    if (max === r) {
        h = (g - b) / d;
    } else if (max === g) {
        h = 2 + (b - r) / d;
    } else {
        h = 4 + (r - g) / d;
    }

    h *= 60;

    if (h < 0) {
        h += 360;
    }

    return h;
}


/* =========================================
   TEMPERATURE
========================================= */

$("#temperature-dial").addEventListener(
    "click",
    () => {

        state.temperature += 5;

        if (state.temperature > 100) {
            state.temperature = -10;
        }

        temperatureValue.textContent =
            `${state.temperature}°C`;

        updateDial();

    }
);


function updateDial() {

    const normalized =
        (state.temperature + 10) / 110;

    const rotation =
        -130 + normalized * 260;

    $(".dial-marker").style.transform =
        `
        translateX(-50%)
        rotate(${rotation}deg)
        `;

}


/* =========================================
   METHODS
========================================= */

document
    .querySelectorAll(".method")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".method")
                    .forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );

                button.classList.add("active");

                state.method =
                    button.dataset.method;

                showMessage(
                    `Brewing method: ${state.method}`
                );
            }
        );

    });


/* =========================================
   TIMER
========================================= */

$("#timer-plus").addEventListener(
    "click",
    () => {

        state.brewTime =
            Math.min(
                state.brewTime + 5,
                600
            );

        updateTimer();

    }
);


$("#timer-minus").addEventListener(
    "click",
    () => {

        state.brewTime =
            Math.max(
                state.brewTime - 5,
                0
            );

        updateTimer();

    }
);


function updateTimer() {

    const minutes =
        Math.floor(
            state.brewTime / 60
        );

    const seconds =
        state.brewTime % 60;

    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


/* =========================================
   BREWING
========================================= */

brewButton.addEventListener(
    "click",
    brew
);


function brew() {

    if (state.brewing) {
        return;
    }

    if (!state.cauldronIngredients.length) {

        showMessage(
            "The cauldron contains nothing but your questionable confidence."
        );

        return;
    }

    state.brewing = true;

    brewButton.textContent =
        "Brewing...";

    cauldron.classList.add(
        "brewing"
    );

    showMessage(
        "The
