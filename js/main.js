import * as THREE from "three";

/* =========================================================
   GLOBAL STATE
========================================================= */

const state = {
    data: null,

    scene: null,
    camera: null,
    renderer: null,

    clock: new THREE.Clock(),

    objects: [],

    hoveredObject: null,

    cauldronIngredients: []
};

/* =========================================================
   DOM
========================================================= */

const interaction = document.getElementById("interaction");
const interactionName = document.getElementById("interaction-name");
const interactionHint = document.getElementById("interaction-hint");
const ingredientCount = document.getElementById("ingredient-count");

const loading = document.getElementById("loading");

/* =========================================================
   INITIALIZATION
========================================================= */

async function init() {

    await loadDatabase();

    createScene();
    createLighting();
    createRoom();
    createWorkbench();
    createCauldron();
    createShelves();
    createIngredients();
    createCandles();
    createWindow();

    setupInteraction();

    animate();

    setTimeout(() => {
        loading.classList.add("hidden");
    }, 700);
}

/* =========================================================
   DATABASE
========================================================= */

async function loadDatabase() {

    try {

        const response = await fetch(
            "./data/ingredients.json"
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        state.data = await response.json();

        console.log(
            "Alchemy database loaded:",
            state.data
        );

        console.log(
            "Ingredient count:",
            Object.keys(
                state.data.ingredients || {}
            ).length
        );

    } catch (error) {

        console.error(
            "Failed to load alchemy database:",
            error
        );

        loading.querySelector(
            ".loading-subtitle"
        ).textContent =
            "The grimoire could not be opened.";

        throw error;
    }
}

/* =========================================================
   THREE.JS SCENE
========================================================= */

function createScene() {

    state.scene = new THREE.Scene();

    state.scene.background =
        new THREE.Color(0x080705);

    state.camera = new THREE.OrthographicCamera(
        -10,
        10,
        6,
        -6,
        0.1,
        100
    );

    state.camera.position.set(
        0,
        8,
        12
    );

    state.camera.lookAt(
        0,
        1.8,
        0
    );

    state.renderer =
        new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });

    state.renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );

    state.renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    state.renderer.shadowMap.enabled = true;

    state.renderer.shadowMap.type =
        THREE.PCFSoftShadowMap;

    state.renderer.outputColorSpace =
        THREE.SRGBColorSpace;

    state.renderer.toneMapping =
        THREE.ACESFilmicToneMapping;

    state.renderer.toneMappingExposure =
        0.9;

    document
        .getElementById("game")
        .appendChild(state.renderer.domElement);

    window.addEventListener(
        "resize",
        onResize
    );
}

/* =========================================================
   LIGHTING
========================================================= */

function createLighting() {

    const ambient =
        new THREE.HemisphereLight(
            0x6d7890,
            0x21170d,
            1.8
        );

    state.scene.add(ambient);

    const moonLight =
        new THREE.DirectionalLight(
            0x8096b8,
            2.0
        );

    moonLight.position.set(
        -5,
        8,
        -6
    );

    moonLight.castShadow = true;

    state.scene.add(moonLight);

    const warmLight =
        new THREE.PointLight(
            0xffa94d,
            3,
            10
        );

    warmLight.position.set(
        4,
        3,
        1
    );

    warmLight.castShadow = true;

    state.scene.add(warmLight);

    /* Cauldron glow */

    const cauldronLight =
        new THREE.PointLight(
            0x5978ff,
            1.5,
            5
        );

    cauldronLight.position.set(
        0,
        2,
        1
    );

    cauldronLight.userData.cauldronLight = true;

    state.scene.add(
        cauldronLight
    );
}

/* =========================================================
   ROOM
========================================================= */

function createRoom() {

    const floorMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x21170e,
            roughness: 0.82
        });

    const floor =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                20,
                0.35,
                14
            ),
            floorMaterial
        );

    floor.position.y = -0.2;

    floor.receiveShadow = true;

    state.scene.add(floor);

    /* Back wall */

    const wallMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x120e0a,
            roughness: 1
        });

    const backWall =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                20,
                9,
                0.4
            ),
            wallMaterial
        );

    backWall.position.set(
        0,
        4,
        -5
    );

    backWall.receiveShadow = true;

    state.scene.add(backWall);

    /* Side walls */

    const leftWall =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.4,
                9,
                14
            ),
            wallMaterial
        );

    leftWall.position.set(
        -10,
        4,
        0
    );

    state.scene.add(leftWall);

    const rightWall =
        leftWall.clone();

    rightWall.position.x = 10;

    state.scene.add(rightWall);
}

/* =========================================================
   WORKBENCH
========================================================= */

function createWorkbench() {

    const wood =
        new THREE.MeshStandardMaterial({
            color: 0x3a2414,
            roughness: 0.72
        });

    const top =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                16,
                0.55,
                4
            ),
            wood
        );

    top.position.set(
        0,
        1.2,
        0
    );

    top.castShadow = true;
    top.receiveShadow = true;

    state.scene.add(top);

    /* Legs */

    for (const x of [-6.8, 6.8]) {

        const leg =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.6,
                    2.6,
                    3.2
                ),
                wood
            );

        leg.position.set(
            x,
            0,
            0
        );

        leg.castShadow = true;

        state.scene.add(leg);
    }
}

/* =========================================================
   CAULDRON
========================================================= */

function createCauldron() {

    const metal =
        new THREE.MeshStandardMaterial({
            color: 0x17191a,
            roughness: 0.28,
            metalness: 0.85
        });

    const cauldron =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                2,
                48,
                24,
                0,
                Math.PI * 2,
                0,
                Math.PI * 0.62
            ),
            metal
        );

    cauldron.scale.y = 0.72;

    cauldron.position.set(
        0,
        2.35,
        0
    );

    cauldron.castShadow = true;
    cauldron.receiveShadow = true;

    cauldron.userData.type =
        "cauldron";

    cauldron.userData.name =
        "Cauldron";

    cauldron.userData.interactive = true;

    state.scene.add(cauldron);

    state.objects.push(cauldron);

    /* Liquid */

    const liquidMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x243c66,
            emissive: 0x182b5b,
            emissiveIntensity: 1.2,
            roughness: 0.15,
            metalness: 0.05,
            transparent: true,
            opacity: 0.92
        });

    const liquid =
        new THREE.Mesh(
            new THREE.CircleGeometry(
                1.55,
                64
            ),
            liquidMaterial
        );

    liquid.rotation.x =
        -Math.PI / 2;

    liquid.position.set(
        0,
        2.55,
        0
    );

    liquid.userData.type =
        "liquid";

    state.scene.add(liquid);

    /* Rim */

    const rim =
        new THREE.Mesh(
            new THREE.TorusGeometry(
                1.7,
                0.12,
                16,
                64
            ),
            metal
        );

    rim.rotation.x =
        Math.PI / 2;

    rim.position.set(
        0,
        2.55,
        0
    );

    state.scene.add(rim);

    /* Legs */

    for (
        const x of [-1.3, 1.3]
    ) {

        const leg =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.16,
                    0.2,
                    1.2,
                    12
                ),
                metal
            );

        leg.position.set(
            x,
            1.2,
            0
        );

        state.scene.add(leg);
    }
}

/* =========================================================
   SHELVES
========================================================= */

function createShelves() {

    const wood =
        new THREE.MeshStandardMaterial({
            color: 0x2d1b10,
            roughness: 0.75
        });

    for (
        const x of [-7, 7]
    ) {

        for (
            let y = 3;
            y <= 6;
            y += 1.5
        ) {

            const shelf =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        4,
                        0.25,
                        1.1
                    ),
                    wood
                );

            shelf.position.set(
                x,
                y,
                -4.25
            );

            shelf.castShadow = true;
            shelf.receiveShadow = true;

            state.scene.add(shelf);

            createShelfBottles(
                x,
                y
            );
        }
    }
}

function createShelfBottles(
    x,
    y
) {

    const colors = [
        0x496f8e,
        0x6c4b76,
        0x66774c,
        0x8b5b38,
        0x5d3e2e
    ];

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        const material =
            new THREE.MeshStandardMaterial({
                color:
                    colors[
                        i %
                        colors.length
                    ],
                roughness: 0.2,
                metalness: 0.1
            });

        const bottle =
            new THREE.Mesh(
                new THREE.CapsuleGeometry(
                    0.18,
                    0.5,
                    6,
                    12
                ),
                material
            );

        bottle.position.set(
            x - 1.4 + i * 0.9,
            y + 0.45,
            -3.8
        );

        bottle.scale.y =
            0.8 +
            Math.random() * 0.4;

        bottle.castShadow = true;

        state.scene.add(
            bottle
        );
    }
}

/* =========================================================
   INGREDIENTS
========================================================= */

function createIngredients() {

    if (
        !state.data?.ingredients
    ) {
        return;
    }

    const ingredients =
        Object.values(
            state.data.ingredients
        );

    /*
        Only spawn a small physical selection
        for now.

        Eventually availability data will
        determine what exists in the room.
    */

    const deskIngredients =
        ingredients
            .filter(
                ingredient =>
                    ingredient.id === "nightleaf" ||
                    ingredient.id === "glowcap" ||
                    ingredient.id === "emberroot" ||
                    ingredient.id === "frostpetal"
            );

    deskIngredients.forEach(
        (
            ingredient,
            index
        ) => {

            createIngredientObject(
                ingredient,
                -5 +
                    index * 2,
                1.85,
                0.3
            );
        }
    );
}

function createIngredientObject(
    ingredient,
    x,
    y,
    z
) {

    const color =
        getIngredientColor(
            ingredient
        );

    const material =
        new THREE.MeshStandardMaterial({
            color,
            roughness: 0.45
        });

    const object =
        new THREE.Mesh(
            new THREE.DodecahedronGeometry(
                0.42,
                1
            ),
            material
        );

    object.position.set(
        x,
        y,
        z
    );

    object.castShadow = true;

    object.userData.type =
        "ingredient";

    object.userData.ingredient =
        ingredient;

    object.userData.interactive =
        true;

    state.scene.add(object);

    state.objects.push(object);
}

function getIngredientColor(
    ingredient
) {

    if (
        ingredient.visual
        ?.primary_color
    ) {

        return new THREE.Color(
            ingredient.visual.primary_color
        );
    }

    const map = {

        nightleaf: 0x253d2b,

        glowcap: 0xc5e889,

        emberroot: 0xb94a24,

        frostpetal: 0x9bd5ff
    };

    return new THREE.Color(
        map[ingredient.id]
        ?? 0x8a806c
    );
}

/* =========================================================
   CANDLES
========================================================= */

function createCandles() {

    const wax =
        new THREE.MeshStandardMaterial({
            color: 0xb6a17b,
            roughness: 0.8
        });

    for (
        const x of [-4.5, 4.5]
    ) {

        const candle =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.16,
                    0.18,
                    0.9,
                    16
                ),
                wax
            );

        candle.position.set(
            x,
            1.95,
            0
        );

        state.scene.add(
            candle
        );

        const flame =
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.12,
                    12,
                    12
                ),
                new THREE.MeshBasicMaterial({
                    color: 0xffb65e
                })
            );

        flame.scale.y = 1.8;

        flame.position.set(
            x,
            2.48,
            0
        );

        state.scene.add(
            flame
        );

        const light =
            new THREE.PointLight(
                0xffa044,
                1.5,
                4
            );

        light.position.copy(
            flame.position
        );

        light.userData.flame =
            true;

        state.scene.add(light);
    }
}

/* =========================================================
   WINDOW
========================================================= */

function createWindow() {

    const frame =
        new THREE.MeshStandardMaterial({
            color: 0x26180f,
            roughness: 0.7
        });

    const glass =
        new THREE.MeshBasicMaterial({
            color: 0x101827,
            transparent: true,
            opacity: 0.75
        });

    const windowFrame =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                4,
                4,
                0.25
            ),
            frame
        );

    windowFrame.position.set(
        0,
        5,
        -4.7
    );

    state.scene.add(
        windowFrame
    );

    const windowGlass =
        new THREE.Mesh(
            new THREE.PlaneGeometry(
                3.2,
                3.2
            ),
            glass
        );

    windowGlass.position.set(
        0,
        5,
        -4.55
    );

    state.scene.add(
        windowGlass
    );

    /* Moon */

    const moon =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.55,
                32,
                32
            ),
            new THREE.MeshBasicMaterial({
                color: 0xe1dfc7
            })
        );

    moon.position.set(
        0.7,
        5.7,
        -4.45
    );

    state.scene.add(moon);
}

/* =========================================================
   INTERACTION
========================================================= */

function setupInteraction() {

    const raycaster =
        new THREE.Raycaster();

    const pointer =
        new THREE.Vector2();

    window.addEventListener(
        "pointermove",
        event => {

            pointer.x =
                (
                    event.clientX /
                    window.innerWidth
                ) * 2 - 1;

            pointer.y =
                -(
                    event.clientY /
                    window.innerHeight
                ) * 2 + 1;

            raycaster.setFromCamera(
                pointer,
                state.camera
            );

            const hits =
                raycaster.intersectObjects(
                    state.objects
                );

            if (
                hits.length
            ) {

                const object =
                    hits[0].object;

                state.hoveredObject =
                    object;

                showInteraction(
                    object
                );

            } else {

                state.hoveredObject =
                    null;

                hideInteraction();
            }
        }
    );

    window.addEventListener(
        "click",
        () => {

            if (
                !state.hoveredObject
            ) {
                return;
            }

            const object =
                state.hoveredObject;

            if (
                object.userData.type ===
                "ingredient"
            ) {

                addIngredientToCauldron(
                    object
                );
            }

            if (
                object.userData.type ===
                "cauldron"
            ) {

                console.log(
                    "Cauldron clicked"
                );
            }
        }
    );
}

function showInteraction(
    object
) {

    if (
        object.userData.type ===
        "ingredient"
    ) {

        interactionName.textContent =
            object.userData.ingredient
                .name;

        interactionHint.textContent =
            "Click to add to cauldron";

    } else {

        interactionName.textContent =
            object.userData.name ||
            "Unknown";

        interactionHint.textContent =
            "Click to interact";
    }

    interaction.classList.add(
        "visible"
    );
}

function hideInteraction() {

    interaction.classList.remove(
        "visible"
    );
}

/* =========================================================
   BREWING PLACEHOLDER
========================================================= */

function addIngredientToCauldron(
    object
) {

    const ingredient =
        object.userData.ingredient;

    state.cauldronIngredients.push(
        ingredient
    );

    ingredientCount.textContent =
        state.cauldronIngredients.length;

    console.log(
        "Added ingredient:",
        ingredient.name
    );

    /*
        Temporary visual feedback.
        This will eventually be replaced by
        actual ingredient animation + liquid
        shader interaction.
    */

    object.scale.multiplyScalar(
        0.82
    );

    object.position.y +=
        0.25;

    setTimeout(() => {

        object.visible = false;

    }, 180);
}

/* =========================================================
   ANIMATION
========================================================= */

function animate() {

    requestAnimationFrame(
        animate
    );

    const elapsed =
        state.clock.getElapsedTime();

    /* Candle flicker */

    state.scene.traverse(
        object => {

            if (
                object.userData.flame
            ) {

                object.intensity =
                    1.2 +
                    Math.sin(
                        elapsed * 8 +
                        object.id
                    ) * 0.25 +
                    Math.sin(
                        elapsed * 17
                    ) * 0.12;
            }
        }
    );

    /* Cauldron breathing */

    state.scene.traverse(
        object => {

            if (
                object.userData.type ===
                "liquid"
            ) {

                object.scale.x =
                    1 +
                    Math.sin(
                        elapsed * 1.8
                    ) * 0.015;

                object.scale.y =
                    1 +
                    Math.cos(
                        elapsed * 1.5
                    ) * 0.012;
            }
        }
    );

    state.renderer.render(
        state.scene,
        state.camera
    );
}

/* =========================================================
   RESIZE
========================================================= */

function onResize() {

    const aspect =
        window.innerWidth /
        window.innerHeight;

    const height = 12;

    const width =
        height * aspect;

    state.camera.left =
        -width / 2;

    state.camera.right =
        width / 2;

    state.camera.top =
        height / 2;

    state.camera.bottom =
        -height / 2;

    state.camera.updateProjectionMatrix();

    state.renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
}

/* =========================================================
   START
========================================================= */

init();
