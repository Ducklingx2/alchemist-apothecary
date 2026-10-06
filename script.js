/* =========================================================
   POTION LAB
   Core game logic
========================================================= */


/* =========================
   INGREDIENT DATA
========================= */

const ingredients = {

    nightleaf: {
        name: "Nightleaf",
        icon: "🌿",
        type: "permanent"
    },

    glowcap: {
        name: "Glowcap",
        icon: "🍄",
        type: "permanent"
    },

    ember: {
        name: "Ember",
        icon: "🔥",
        type: "permanent"
    },

    moonwater: {
        name: "Moonwater",
        icon: "💧",
        type: "permanent"
    }
};


/* =========================
   INITIAL RECIPES
========================= */

const recipes = {

    "glowcap+nightleaf": {
        name: "Dreamroot",
        rarity: "Uncommon",
        description: "A soft violet potion whose vapors make the world feel strangely distant.",
        effect: "Dreams become unusually vivid.",
        icon: "🧪"
    },

    "ember+nightleaf": {
        name: "Blackfire",
        rarity: "Rare",
        description: "A dark flame burns silently beneath the surface of the liquid.",
        effect: "Produces a flame that gives no heat.",
        icon: "🔥"
    },

    "ember+moonwater": {
        name: "Steamheart",
        rarity: "Uncommon",
        description: "A warm silver potion constantly shifts between liquid and mist.",
        effect: "Creates an endless cloud of harmless steam.",
        icon: "🧪"
    },

    "glowcap+moonwater": {
        name: "Moonlit Bloom",
        rarity: "Rare",
        description: "Tiny flowers of light drift across the surface of the potion.",
        effect: "Nearby plants briefly glow.",
        icon: "🌸"
    },

    "ember+glowcap": {
        name: "Sunshroom",
        rarity: "Uncommon",
        description: "A golden liquid that smells faintly of summer.",
        effect: "Produces a miniature artificial sunrise.",
        icon: "☀️"
    },

    "moonwater+nightleaf": {
        name: "Lunar Veil",
        rarity: "Rare",
        description: "Silver mist curls around the bottle like a living thing.",
        effect: "Makes the laboratory briefly resemble midnight.",
        icon: "🌙"
    },

    "ember+glowcap+nightleaf": {
        name: "Wildfire Dream",
        rarity: "Epic",
        description: "A crimson-violet potion containing a tiny forest fire that never spreads.",
        effect: "Summons a miniature burning forest inside the cauldron.",
        icon: "🌲"
    },

    "glowcap+moonwater+nightleaf": {
        name: "Astral Sleep",
        rarity: "Epic",
        description: "The potion contains tiny stars that slowly drift beneath its surface.",
        effect: "The laboratory ceiling briefly disappears into a night sky.",
        icon: "✨"
    },

    "ember+moonwater+nightleaf": {
        name: "Eternal Twilight",
        rarity: "Legendary",
        description: "Neither hot nor cold, the potion exists somewhere between day and night.",
        effect: "Temporarily freezes the laboratory at sunset.",
        icon: "🌅"
    }
};


/* =========================
   STATE
========================= */

let brewIngredients = [];

let discovered = JSON.parse(
    localStorage.getItem("potionLabDiscoveries") || "[]"
);


/* =========================
   ELEMENTS
========================= */

const cauldron = document.getElementById("cauldron");
const brewButton = document.getElementById("brewButton");

const discoveryCount =
    document.getElementById("discoveryCount");

const potionReveal =
    document.getElementById("potionReveal");

const revealName =
    document.getElementById("revealName");

const revealDescription =
    document.getElementById("revealDescription");

const revealRarity =
    document.getElementById("revealRarity");

const revealPotion =
    document.getElementById("revealPotion");

const closeReveal =
    document.getElementById("closeReveal");

const eventMessage =
    document.getElementById("eventMessage");

const eventTitle =
    document.getElementById("eventTitle");

const eventText =
    document.getElementById("eventText");


/* =========================
   DISCOVERY COUNT
========================= */

function updateDiscoveryCount() {

    discoveryCount.textContent =
        discovered.length;
}

updateDiscoveryCount();


/* =========================
   DRAGGING
========================= */

document.querySelectorAll(".ingredient").forEach(ingredient => {

    ingredient.addEventListener("dragstart", event => {

        event.dataTransfer.setData(
            "ingredient",
            ingredient.dataset.ingredient
        );

        ingredient.classList.add("dragging");
    });

    ingredient.addEventListener("dragend", () => {

        ingredient.classList.remove("dragging");
    });
});


/* =========================
   CAULDRON DROP
========================= */

cauldron.addEventListener("dragover", event => {

    event.preventDefault();

    cauldron.style.filter =
        "drop-shadow(0 0 25px rgba(170,120,255,.8))";
});


cauldron.addEventListener("dragleave", () => {

    cauldron.style.filter = "";
});


cauldron.addEventListener("drop", event => {

    event.preventDefault();

    cauldron.style.filter = "";

    const ingredient =
        event.dataTransfer.getData("ingredient");

    addIngredient(ingredient);
});


/* =========================
   ADD INGREDIENT
========================= */

function addIngredient(id) {

    if (!ingredients[id]) return;

    if (brewIngredients.includes(id)) {
        showEvent(
            "Already added",
            `${ingredients[id].name} is already in the cauldron.`
        );

        return;
    }

    if (brewIngredients.length >= 4) {

        showEvent(
            "The cauldron resists",
            "Four ingredients are enough. Even alchemy has limits."
        );

        return;
    }

    brewIngredients.push(id);

    spawnIngredientParticle();

    cauldron.classList.add("reacting");

    setTimeout(() => {
        cauldron.classList.remove("reacting");
    }, 500);

    updateBrewButton();
}


/* =========================
   BREW BUTTON
========================= */

brewButton.addEventListener("click", brew);


function brew() {

    if (brewIngredients.length < 2) {

        showEvent(
            "The mixture is incomplete",
            "A single ingredient cannot create much of a potion."
        );

        return;
    }

    const key =
        [...brewIngredients]
            .sort()
            .join("+");

    const potion = recipes[key];

    if (potion) {

        revealPotionResult(potion);

        if (!discovered.includes(key)) {

            discovered.push(key);

            localStorage.setItem(
                "potionLabDiscoveries",
                JSON.stringify(discovered)
            );

            updateDiscoveryCount();
        }

    } else {

        revealPotionResult({
            name: "Unstable Mixture",
            rarity: "Unknown",
            description:
                "The potion bubbles suspiciously before settling into an unimpressive puddle.",
            effect:
                "Nothing happened. Probably for the best.",
            icon: "🫗"
        });
    }

    brewIngredients = [];

    updateBrewButton();
}


/* =========================
   REVEAL
========================= */

function revealPotionResult(potion) {

    revealName.textContent =
        potion.name;

    revealDescription.textContent =
        `${potion.description} ${potion.effect}`;

    revealRarity.textContent =
        potion.rarity;

    revealPotion.textContent =
        potion.icon;

    potionReveal.classList.add("visible");

    createBurst();
}


closeReveal.addEventListener("click", () => {

    potionReveal.classList.remove("visible");
});


/* =========================
   BREW BUTTON STATE
========================= */

function updateBrewButton() {

    if (brewIngredients.length === 0) {

        brewButton.innerHTML =
            "<span>✦</span> BREW <span>✦</span>";

        brewButton.disabled = false;

        return;
    }

    brewButton.innerHTML =
        `<span>✦</span> BREW ${brewIngredients.length}/4 <span>✦</span>`;
}


/* =========================
   EVENT SYSTEM
========================= */

const events = [

    {
        title: "The candles flicker...",
        text: "For a moment, every flame in the laboratory burns violet."
    },

    {
        title: "Something moved outside.",
        text: "A strange light passed beyond the laboratory window."
    },

    {
        title: "The cauldron whispers.",
        text: "You could have sworn it said your name."
    },

    {
        title: "The air grows colder.",
        text: "The glass bottles on the shelves have begun to frost."
    }

];


function triggerRandomEvent() {

    const event =
        events[
            Math.floor(
                Math.random() * events.length
            )
        ];

    showEvent(
        event.title,
        event.text
    );
}


function showEvent(title, text) {

    eventTitle.textContent = title;

    eventText.textContent = text;

    eventMessage.classList.add("visible");

    setTimeout(() => {

        eventMessage.classList.remove("visible");

    }, 5000);
}


/* =========================
   RANDOM EVENTS
========================= */

function scheduleEvent() {

    const delay =
        15000 +
        Math.random() * 25000;

    setTimeout(() => {

        triggerRandomEvent();

        scheduleEvent();

    }, delay);
}

scheduleEvent();


/* =========================
   MAGIC PARTICLES
========================= */

function createDust() {

    const dust =
        document.createElement("div");

    dust.className = "dust";

    dust.style.left =
        `${Math.random() * 100}%`;

    dust.style.top =
        `${60 + Math.random() * 40}%`;

    dust.style.animationDuration =
        `${5 + Math.random() * 8}s`;

    dust.style.animationDelay =
        `${Math.random() * 5}s`;

    document
        .getElementById("magic-dust")
        .appendChild(dust);

    setTimeout(() => {
        dust.remove();
    }, 15000);
}


setInterval(createDust, 350);


/* =========================
   INGREDIENT PARTICLES
========================= */

function spawnIngredientParticle() {

    for (let i = 0; i < 12; i++) {

        const particle =
            document.createElement("div");

        particle.className = "dust";

        particle.style.position = "fixed";

        particle.style.left = "50%";
        particle.style.top = "58%";

        particle.style.animationDuration =
            `${.7 + Math.random() * .7}s`;

        document
            .getElementById("magic-dust")
            .appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 1500);
    }
}


/* =========================
   POTION BURST
========================= */

function createBurst() {

    for (let i = 0; i < 45; i++) {

        const particle =
            document.createElement("div");

        particle.className = "dust";

        particle.style.position = "fixed";

        particle.style.left = "50%";
        particle.style.top = "50%";

        particle.style.animation =
            "none";

        const angle =
            Math.random() * Math.PI * 2;

        const distance =
            100 + Math.random() * 300;

        particle.animate(
            [
                {
                    transform: "translate(0,0)",
                    opacity: 1
                },
                {
                    transform:
                        `translate(
                            ${Math.cos(angle) * distance}px,
                            ${Math.sin(angle) * distance}px
                        )`,
                    opacity: 0
                }
            ],
            {
                duration: 1000,
                easing: "cubic-bezier(.1,.8,.2,1)"
            }
        );

        document
            .getElementById("magic-dust")
            .appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 1100);
    }
}


/* =========================
   CONSOLE
========================= */

console.log(
    "%c🧪 THE ALCHEMIST'S APOTHECARY",
    "color:#d8b56a;font-size:20px;font-weight:bold"
);

console.log(
    "The laboratory is awake."
);
