/**
 * Created by arc on 19/02/2016.
 */

var CANVAS = document.getElementById("renderCanvas");

alert("Move with arrow keys, click'n'hold to move the camera. Working bullet collisions, but buggy.");

// Disable right click
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

// DEBUG: Turns off music and stuff
var DEBUG = false;

if (BABYLON.Engine.isSupported()) {

    // CONSTANTS

    var CUBE_SIZE = 5.5;
    var ENGINE = new BABYLON.Engine(CANVAS, false); // true = enable smoothing/antialiasing
    var SPRITES = []; // Array containing all the sprites
    var BULLETS = []; // Array containing all the bullets
    var BULLET_SPEED = 1;

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
        // TODO: HAXX var self = this;
        this.animationFrames = frames;
        this.animationDelay = animationDelay;
        this.numberOfUnits = number;
        this.type = type;
        this.cellSize = cellSize;
        this.isAnimated = isAnimated; // BOOL
        var painSfx = new BABYLON.Sound("shotgunSfx", "snds/dspopain.wav", scene);

        switch (this.type) {
            case "imp":
                this.spritePath = "gfx/doom/sheets/TMPimp_sheet.png";
                break;
            case "doomguy":
                this.spritePath = "gfx/doomguy.png";
                break;
            default:
                LOG("Wrong sprite name.");
                break;
        }

        this.spriteManager = new BABYLON.SpriteManager("spriteManager", this.spritePath, this.numberOfUnits, this.cellSize, scene);
        //this.sprite = new BABYLON.Sprite( "sprite", this.spriteManager );
        //this.sprite.checkCollisions = true;

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

        this.suffer = function () {
            painSfx.play();
        };

// this is good:
        //this.render = function () {
        //    if ( this.isAnimated ) {
        //        this.sprite.playAnimation( 0, this.animationFrames, true, this.animationDelay );
        //        this.sprite.position.y = 1;
        //        this.sprite.size = 2.5;
        //        this.hitbox.position = this.sprite.position;
        //        SPRITES.push( this );
        //    } else {
        //        this.sprite.stopAnimation();
        //        this.sprite.position.y = 1;
        //        this.sprite.size = 2.5;
        //        this.hitbox.position = this.sprite.position;
        //        SPRITES.push( this );
        //    }
        //}

        this.dispose = function () {
            this.hitbox.sprite.dispose();
            this.hitbox.dispose();
            LOG("monster instance deleted");
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
        self.mesh = BABYLON.Mesh.CreateSphere("bullet", 10, .1, scene);
        self.mesh.material = new BABYLON.StandardMaterial("bulletTexture", scene);
        self.mesh.position = camera.position.clone();
        self.mesh.material.alpha = 0;
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
        return new BABYLON.Sound("E1M1", "snds/E1M1.mp3", scene, null, {loop: true, autoplay: true});
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
        // Works:
        //for ( var i = 0; i < 10; i++ ) {
        //    var doomguy = new Monster( scene, null, null, 10, "doomguy", 64, false );
        //    doomguy.checkCollisions = true;
        //    doomguy.sprite.position.x = getRandomInt( 0, 50 );
        //    doomguy.sprite.position.z = getRandomInt( 0, 50 );
        //    doomguy.sprite.position.y = 1;
        //    doomguy.sprite.size = 2.5;
        //    doomguy.render();
        //}
    };

    var renderAnimatedMonsters = function (scene) {
        var frames = 2;
        var delay = 300;

        for (var i = 0; i < 100; i++) {
            var imp = new Monster(scene, frames, delay, 100, "imp", 64, true);
            imp.checkCollisions = true;
            imp.hitbox.sprite.position.x = getRandomInt(0, 50);
            imp.hitbox.sprite.position.z = getRandomInt(0, 50);
            imp.render();
        }
        // WORKS:
        //for ( var i = 0; i < 100; i++ ) {
        //    var imp = new Monster( scene, frames, delay, 100, "imp", 64, true );
        //    imp.checkCollisions = true;
        //    imp.sprite.position.x = getRandomInt( 0, 50 );
        //    imp.sprite.position.z = getRandomInt( 0, 50 );
        //    imp.render();
        //}
    };

    var createScene = function () {
        ENGINE.isPointerLock = true;

        var scene = new BABYLON.Scene(ENGINE);
        scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
        scene.gravity = new BABYLON.Vector3(0, -9.81, 0);
        scene.collisionsEnabled = true;

        var camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 10, -20), scene);
        camera.applyGravity = true;
        camera.checkCollisions = true;
        camera.setTarget(BABYLON.Vector3.Zero());
        camera.attachControl(CANVAS, false);
        if (DEBUG) {
            // TODO: keyboard layout selection
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
        renderDoomguys(scene);
        renderAnimatedMonsters(scene);

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
        //for (var i = 0; i < BULLETS.length; i++) {
        //    BULLETS[i].update();
        //}
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
    window.alert("YOUR BROWSER IS NOT SUPPORTED. YOU NEED A RECENT/MODERN WEBGL COMPATIBLE WEB BROWSER TO PLAY THIS GAME.");
}

window.addEventListener('resize', function () {
    ENGINE.resize();
});