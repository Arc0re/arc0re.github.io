/**
 * Created by arc on 19/02/2016.
 */

var CANVAS = document.getElementById("renderCanvas");
var KB_LAYOUT = "AZERTY";

if (confirm("Would you like to use a QWERTY layout?")) {
    console.log("Keyboard layout set to QWERTY");
    KB_LAYOUT = "QWERTY";
} else {
    console.log("Keyboard layout defaults to AZERTY");
}

alert("Move with either WASD (QWERTY) or ZQSD(AZERTY), click the game screen once for it to grab your mouse. Escape to free the pointer. THIS IS AN EARLY EARLY ALPHA");

// Disable right click menu
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

// DEBUG: Turns off music, shows hitboxes, and bullet mesh
var DEBUG = false;

if (BABYLON.Engine.isSupported()) {

    // CONSTANTS

    var CUBE_SIZE = 5.5;
    var ENGINE = new BABYLON.Engine(CANVAS, false); // true = enable smoothing/antialiasing
    var SPRITES = []; // Array containing all the sprites
    var BULLETS = []; // Array containing all the bullets
    var BULLET_SPEED = 1;
    var SHOTGUN_BULLET_SIZE = 3; // Should be lots of little pellets, but one big bullet does the trick
    var MUSIC_VOLUME = 0.1;

    // MONSTER CONSTANTS
    var IMP_MAX_HP = 10;
    var MARINE_MAX_HP = 5;

    // UTILS

    var getRandomInt = function (min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    };

    var getForwardVector = function (rotation) {
        var rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(rotation.y, rotation.x, rotation.z);
        return BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(0, 0, 1), rotationMatrix);
    };

    // Thats because I'm lazy af
    function LOG(txt) {
        console.log(txt);
    }

    // GAME

    /**
     * Creates an instance of Monster.
     * @param {BABYLON.Scene} scene
     * @param frames
     * @param animationDelay
     * @param number
     * @param {string} type
     * @param cellSize
     * @param {boolean} isAnimated
     * @constructor
     */
    var Monster = function (scene, frames, animationDelay, number, type, cellSize, isAnimated) {
        var self = this;
        this.animationFrames = frames;
        this.animationDelay = animationDelay;
        this.numberOfUnits = number;
        this.type = type;
        this.health = IMP_MAX_HP;
        this.cellSize = cellSize;
        this.isAnimated = isAnimated; // BOOL
        var painSfx = new BABYLON.Sound("shotgunSfx", "snds/dspopain.wav", scene);

        switch (this.type) {
            case "imp":
                this.spritePath = "gfx/doom/sheets/imp_anims.png";
                break;
            case "doomguy":
                this.spritePath = "gfx/doomguy.png";
                break;
            case "marine":
                this.spritePath = "gfx/doom/sheets/marine_anims.png";
                break;
            default:
                LOG("Wrong sprite name.");
                break;
        }

        this.spriteManager = new BABYLON.SpriteManager("spriteManager", this.spritePath, this.numberOfUnits, this.cellSize, scene);

        this.hitbox = new BABYLON.Mesh.CreatePlane("plane", 3, scene);
        this.material = new BABYLON.StandardMaterial("hitboxTxt", scene);
        if (DEBUG) {
            this.material.alpha = 0.4;
        } else {
            this.material.alpha = 0;
        }
        this.hitbox.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y; // ALL
        this.hitbox.material = this.material;
        this.hitbox.checkCollisions = true;
        this.hitbox.tag = "plane";

        this.hitbox.sprite = new BABYLON.Sprite("sprite", this.spriteManager);
        this.hitbox.sprite.checkCollisions = true;

        this.render = function () {
            if (this.isAnimated) {
                this.hitbox.sprite.playAnimation(0, this.animationFrames, true, this.animationDelay);
                this.hitbox.sprite.position.y = 1;
                this.hitbox.sprite.size = 2.5;
                this.hitbox.position = this.hitbox.sprite.position;
                SPRITES.push(this);
            } else {
                this.hitbox.sprite.stopAnimation();
                this.hitbox.sprite.position.y = 1;
                this.hitbox.sprite.size = 2.5;
                this.hitbox.position = this.hitbox.sprite.position;
                SPRITES.push(this);
            }
        };

        this.playAnimation = function (from, to, delay) {
            this.hitbox.sprite.playAnimation(from, to, false, delay);
            LOG("ANIMATION PLAYED");
        };

        this.suffer = function () {
            painSfx.play();
        };

        this.dispose = function () {
            if (this.isAnimated) {
                var rnum = getRandomInt(1, 5);
                switch (rnum) {
                    case 1:
                    case 2:
                    case 3:
                        switch (this.type) {
                            case "imp":
                                this.playAnimation(3, 7, 150); // death animation
                                break;
                            case "marine":
                                this.playAnimation(3, 8, 150);
                                break;
                        }
                        break;
                    case 4:
                    case 5:
                        switch (this.type) {
                            case "imp":
                                this.playAnimation(8, 15, 150); // death animation
                                break;
                            case "marine":
                                this.playAnimation(9, 16, 150);
                                break;
                        }
                        break;
                }
            }

            setTimeout(function () {
                self.hitbox.sprite.dispose();
                self.hitbox.dispose();
                LOG("monster instance deleted");
            }, 5000);
        };
    };

    /**
     * Creates an instance of a 3D bullet.
     * @param {BABYLON.Camera} camera
     * @param {BABYLON.Scene} scene
     * @constructor
     */
    var Bullet = function (camera, scene) {
        var self = this; // HAXX
        self.mesh = BABYLON.Mesh.CreateSphere("bullet", 3, SHOTGUN_BULLET_SIZE, scene);
        self.mesh.material = new BABYLON.StandardMaterial("bulletTexture", scene);
        self.mesh.position = camera.position.clone();
        if (DEBUG) {
            self.mesh.material.alpha = 0.8;
        } else {
            self.mesh.material.alpha = 0;
        }
        self.speed = BULLET_SPEED;
        self.isAlive = true;
        self.lifeDuration = null; // How long will the bullet stay "alive"
        self.scene = scene;
        self.mesh.checkCollisions = true;

        var direction = getForwardVector(camera.rotation);
        direction.normalize();

        var deleteBullet = function () {
            if (self.isAlive) {
                if (self.lifeDuration) {
                    window.clearTimeout(self.lifeDuration);
                }

                // Mesh destruction
                self.mesh.dispose();
                self.lifeDuration = null;
                self.isAlive = false;
            }
        };

        // After X seconds, delete the bullet from the screen
        self.lifeDuration = setTimeout(function () {
            deleteBullet();
            BULLETS.splice(self, 1);
        }, 1000);

        self.update = function () {
            if (!self.isAlive) {
                return false;
            }

            // Moving the bullet according to the speed
            self.mesh.position.x += direction.x * self.speed;
            self.mesh.position.y += direction.y * self.speed;
            self.mesh.position.z += direction.z * self.speed;

            // Collision testing

            //for ( var i = 0; i < self.scene.meshes.length; i++ ) {
            //
            //    if ( self.mesh.intersectsMesh( self.scene.meshes[ i ], false ) ) {
            //
            //        //for ( var s = 0; s < SPRITES.length; s++ ) {
            //        if ( self.scene.meshes[ i ].tag === "plane" ) {
            //            LOG( "TOUCHED PLANE" );
            //            self.scene.meshes[ i ].dispose();
            //
            //            //if ( SPRITES[ i ].hitbox === undefined ) {
            //            //    SPRITES[ i ].dispose();
            //            //    SPRITES.splice( i, 1 );
            //            //}
            //            //for ( var s = 0; s < SPRITES.length; s++ ) {
            //            //    LOG( "Line 171:" + typeof SPRITES[ s ].type );
            //            //}
            //        }
            //        //}
            //
            //    }
            //}
            for (var i = 0; i < SPRITES.length; i++) {
                if (self.mesh.intersectsMesh(SPRITES[i].hitbox, false)) {
                    SPRITES[i].suffer();
                    SPRITES[i].dispose();
                    SPRITES.splice(i, 1);
                    self.dispose();
                    return true;
                }
            }
            return false;
        };

        self.dispose = function () {
            deleteBullet();
        };
    };

    var playBackgroundMusic = function (scene) {
        return new BABYLON.Sound("E1M1", "snds/E1M1.mp3", scene, null, {
            loop: true,
            autoplay: true,
            volume: MUSIC_VOLUME
        });
    };

    var genCubes = function (scene) {
        var cubeMaterial = new BABYLON.StandardMaterial("txtCube", scene);
        cubeMaterial.diffuseTexture = new BABYLON.Texture("gfx/doom/skulls.png", scene);

        for (var i = 0; i < 20; i++) {
            var cube = new BABYLON.Mesh.CreateBox("cube", CUBE_SIZE, scene);
            cube.tag = "cube";
            // Random pos
            cube.position = new BABYLON.Vector3(getRandomInt(0, 50), CUBE_SIZE / 2, getRandomInt(0, 50));
            cube.material = cubeMaterial;
            cube.checkCollisions = true;
        }
    };

    // Unused.
    var renderWeapon = function (scene, camera) {
        var gun = BABYLON.Mesh.CreateBox("gun", 1, scene);
        gun.material = new BABYLON.StandardMaterial("gunTxt", scene);
        gun.material.diffuseTexture = new BABYLON.Texture("gfx/grass.png", scene);

        gun.scaling = new BABYLON.Vector3(.2, .2, .5);
        gun.position.x = .4;
        gun.position.y = -0.3;
        gun.position.z = 1;
        gun.parent = camera;
    };

    var renderDoomguys = function (scene) {
        for (var i = 0; i < 10; i++) {
            var doomguy = new Monster(scene, null, null, 10, "doomguy", 64, false);
            doomguy.checkCollisions = true;
            doomguy.hitbox.sprite.position.x = getRandomInt(0, 50);
            doomguy.hitbox.sprite.position.z = getRandomInt(0, 50);
            doomguy.hitbox.sprite.position.y = 1;
            doomguy.hitbox.sprite.size = 2.5;
            doomguy.render();
        }
    };

    var renderAnimatedMonsters = function (scene) {
        var frames = 2; //2
        var delay = 200; // 300

        for (var i = 0; i < 30; i++) {
            var imp = new Monster(scene, frames, delay, 100, "imp", 64, true);
            imp.checkCollisions = true;
            imp.hitbox.sprite.position.x = getRandomInt(0, 50);
            imp.hitbox.sprite.position.z = getRandomInt(0, 50);
            imp.render();
        }
    };

    var renderAnimatedMarines = function (scene) {
        var frames = 3;
        var delay = 300;

        for (var i = 0; i < 40; i++) {
            var marine = new Monster(scene, frames, delay, 100, "marine", 64, true);
            marine.checkCollisions = true;
            marine.hitbox.sprite.position.x = getRandomInt(0, 50);
            marine.hitbox.sprite.position.z = getRandomInt(0, 50);
            marine.render();
        }
    };

    // ============================================================================================================================
    // ============================================================================================================================
    var createScene = function () {
        var scene = new BABYLON.Scene(ENGINE);
        scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
        scene.gravity = new BABYLON.Vector3(0, -9.81, 0);
        scene.collisionsEnabled = true;

        var camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 10, -20), scene);
        camera.applyGravity = true;
        camera.checkCollisions = true;
        camera.setTarget(BABYLON.Vector3.Zero());
        camera.attachControl(CANVAS, false);

        if (KB_LAYOUT === "QWERTY") {
            // QWERTY (master race)
            camera.keysUp = [87];
            camera.keysLeft = [65];
            camera.keysRight = [68];
            camera.keysDown = [83];
        } else {
            // AZERTY
            camera.keysUp = [90];
            camera.keysLeft = [81];
            camera.keysRight = [68];
            camera.keysDown = [83];
        }

        // Request pointer lock
        var canvas = ENGINE.getRenderingCanvas();
        canvas.addEventListener("click", function (evt) {
            canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
            if (canvas.requestPointerLock) {
                canvas.requestPointerLock();
            }
        }, false);
        // Event listener when the pointerlock event is updated.
        var pointerLockChange = function (event) {
            this.controlEnabled = (document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas || document.msPointerLockElement === canvas || document.pointerLockElement === canvas);
            if (this.controlEnabled) {
                this.camera.detachControl(canvas);
            } else {
                this.camera.attachControl(canvas);
            }
        };
        document.addEventListener("pointerlockchange", pointerLockChange, false);
        document.addEventListener("mspointerlockchange", pointerLockChange, false);
        document.addEventListener("mozpointerlockchange", pointerLockChange, false);
        document.addEventListener("webkitpointerlockchange", pointerLockChange, false);

        var light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);

        var ground = BABYLON.Mesh.CreatePlane('ground', 500, scene);
        ground.tag = "ground";
        ground.rotation.x = Math.PI / 2; // TODO: simplify this (CreateGround())
        ground.checkCollisions = true;
        ground.material = new BABYLON.StandardMaterial("txtGround", scene);
        ground.material.diffuseTexture = new BABYLON.Texture("gfx/doom/acid.png", scene);
        ground.material.diffuseTexture.uScale = 20.0;
        ground.material.diffuseTexture.vScale = 20.0;

        genCubes(scene);
        renderAnimatedMonsters(scene);
        renderAnimatedMarines(scene);

        if (!DEBUG) {
            playBackgroundMusic(scene);
        }

        var shotgunSfx = new BABYLON.Sound("shotgunSfx", "snds/dsshotgn.wav", scene);
        window.addEventListener("click", function (e) {
            if (e.button === 0) {
                shotgunSfx.play();
            }

            var bullet = new Bullet(camera, scene);
            BULLETS.push(bullet);
            LOG("Sprites remaining: " + SPRITES.length);
        });

        return scene;
    };

    var scene = createScene();

    ENGINE.runRenderLoop(function () {
        LOG("BULLETS ON SCREEN: " + BULLETS.length);
        for (var i = 0; i < BULLETS.length; i++) {
            if (BULLETS[i].update()) {
                BULLETS[i].dispose();
                BULLETS.splice(i, 1);
            }
        }

        scene.render();
    });
} else {
    alert("YOUR BROWSER IS NOT SUPPORTED. YOU NEED A RECENT/MODERN WEBGL COMPATIBLE WEB BROWSER TO PLAY THIS GAME.");
}

window.addEventListener('resize', function () {
    ENGINE.resize();
});