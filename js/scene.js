/**
 * Created by arc on 19/02/2016.
 */

"use strict";

alert( "Move with arrow keys, click'n'hold to move the camera. No bullet collisions yet." );

// Disable right click
document.addEventListener( "contextmenu", function ( e ) {
    e.preventDefault();
} );

if ( BABYLON.Engine.isSupported() ) {

    // CONSTANTS

    var CUBE_SIZE = 5.5;
    var CANVAS = document.getElementById( "renderCanvas" );
    var ENGINE = new BABYLON.Engine( CANVAS, true ); // true = enable smoothing
    var WIDTH = ENGINE.getRenderWidth();
    var HEIGHT = ENGINE.getRenderHeight();
    var SPRITES = []; // Array containing all the sprites
    var BULLETS = []; // Array containing all the bullets

    // UTILS

    var getRandomInt = function ( min, max ) {
        return Math.floor( Math.random() * (max - min) ) + min;
    };

    var getForwardVector = function ( rotation ) {
        var rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll( rotation.y, rotation.x, rotation.z );
        return BABYLON.Vector3.TransformCoordinates( new BABYLON.Vector3( 0, 0, 1 ), rotationMatrix );
    };

    // Thats because I'm lazy af
    var LOG = function ( txt ) {
        console.log( txt );
    };

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
    var Monster = function ( scene, frames, animationDelay, number, type, cellSize, isAnimated ) {
        // TODO: var self = this;
        this.animationFrames = frames;
        this.animationDelay = animationDelay;
        this.numberOfUnits = number;
        this.type = type;
        this.cellSize = cellSize;
        this.isAnimated = isAnimated; // BOOL

        switch ( this.type ) {
            case "imp":
                this.spritePath = "gfx/doom/sheets/TMPimp_sheet.png";
                break;
            case "doomguy":
                this.spritePath = "gfx/doomguy.png";
                break;
            default:
                LOG( "Wrong sprite name." );
                break;
        }

        this.spriteManager = new BABYLON.SpriteManager( "spriteManager", this.spritePath, this.numberOfUnits, this.cellSize, scene );
        this.sprite = new BABYLON.Sprite( "sprite", this.spriteManager );

        // DEBUG
        for ( var i = 0; i < this.spriteManager.sprites.length; i++ ) {
            LOG( this.spriteManager.sprites[ i ] );
        }
        // TODO: remove either this or the SPRITES.push()
        SPRITES = this.spriteManager.sprites;


        this.render = function () {
            if ( this.isAnimated ) {
                this.sprite.playAnimation( 0, this.animationFrames, true, this.animationDelay );
                this.sprite.position.y = 1;
                this.sprite.size = 2.5;
                SPRITES.push( this.sprite );
            } else {
                this.sprite.stopAnimation();
                this.sprite.position.y = 1;
                this.sprite.size = 2.5;
                SPRITES.push( this.sprite );
            }
        };
    };

    /**
     * Creates an instance of a 3D bullet.
     * @param {BABYLON.Camera} camera
     * @param {BABYLON.Scene} scene
     * @constructor
     */
    var Bullet = function ( camera, scene ) {
        var self = this; // HAXX
        self.mesh = BABYLON.Mesh.CreateSphere( "bullet", 10, .1, scene );
        self.mesh.material = new BABYLON.StandardMaterial( "bulletTexture", scene );
        self.mesh.material.diffuseTexture = new BABYLON.Texture( "gfx/doom/fire.png", scene );
        self.mesh.position = camera.position.clone();
        self.speed = 2;
        self.isAlive = true;
        self.lifeDuration = null; // How long will the bullet stay "alive"
        self.scene = scene;

        var direction = getForwardVector( camera.rotation );
        direction.normalize();

        var deleteBullet = function () {
            if ( self.isAlive ) {
                if ( self.lifeDuration ) {
                    window.clearTimeout( self.lifeDuration );
                }

                // Mesh destruction
                self.mesh.dispose();
                self.lifeDuration = null;
                self.isAlive = false;
            }
        };

        // After X seconds, delete the bullet from the screen
        self.lifeDuration = window.setTimeout( function () {
            deleteBullet();
        }, 300 );

        self.update = function () {
            // If bullet is dead, abort
            if ( !self.isAlive ) {
                return false;
            }

            // Moving the bullet according to the speed
            self.mesh.position.x += direction.x * self.speed;
            self.mesh.position.y += direction.y * self.speed;
            self.mesh.position.z += direction.z * self.speed;

            // Collision testing

            // TODO: col with sprites


            return false;
        };
        //
        //for ( var i = 0; i < SPRITES.length; i++ ) {
        //    SPRITES[ i ].dispose();
        //    LOG( "DISPOSED" + i );
        //    SPRITES[ ].
        //}

        self.dispose = function () {
            deleteBullet();
        };
    };

    var playBackgroundMusic = function ( scene ) {
        return new BABYLON.Sound( "E1M1", "snds/E1M1.mp3", scene, null, { loop: true, autoplay: true } );
    };

    var genCubes = function ( scene ) {
        var cubeMaterial = new BABYLON.StandardMaterial( "txtCube", scene );
        cubeMaterial.diffuseTexture = new BABYLON.Texture( "gfx/doom/skulls.png", scene );

        for ( var i = 0; i < 20; i++ ) {
            var cube = new BABYLON.Mesh.CreateBox( "cube", CUBE_SIZE, scene );
            cube.tag = "cube";
            // Random pos
            cube.position = new BABYLON.Vector3( getRandomInt( 0, 50 ), CUBE_SIZE / 2, getRandomInt( 0, 50 ) );
            cube.material = cubeMaterial;
            cube.checkCollisions = true;
        }
    };

    var renderWeapon = function ( scene, camera ) {
        var gun = BABYLON.Mesh.CreateBox( "gun", 1, scene );
        gun.material = new BABYLON.StandardMaterial( "gunTxt", scene );
        gun.material.diffuseTexture = new BABYLON.Texture( "gfx/grass.png", scene );

        gun.scaling = new BABYLON.Vector3( .2, .2, .5 );
        gun.position.x = .4;
        gun.position.y = -0.3;
        gun.position.z = 1;
        gun.parent = camera;
    };

    var renderDoomguys = function ( scene ) {
        for ( var i = 0; i < 10; i++ ) {
            var doomguy = new Monster( scene, null, null, 10, "doomguy", 64, false );
            doomguy.sprite.position.x = getRandomInt( 0, 50 );
            doomguy.sprite.position.z = getRandomInt( 0, 50 );
            doomguy.sprite.position.y = 1;
            doomguy.sprite.size = 2.5;
            doomguy.render();
        }
    };

    var renderAnimatedMonsters = function ( scene ) {
        var frames = 2;
        var delay = 300;

        for ( var i = 0; i < 100; i++ ) {
            var imp = new Monster( scene, frames, delay, 100, "imp", 64, true );
            imp.sprite.position.x = getRandomInt( 0, 50 );
            imp.sprite.position.z = getRandomInt( 0, 50 );
            imp.render();
        }
    };

    var createScene = function () {
        var scene = new BABYLON.Scene( ENGINE );
        scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
        scene.gravity = new BABYLON.Vector3( 0, -9.81, 0 );

        var camera = new BABYLON.FreeCamera( 'camera', new BABYLON.Vector3( 0, 10, -20 ), scene );
        camera.applyGravity = true;
        camera.checkCollisions = true;
        camera.setTarget( BABYLON.Vector3.Zero() );
        camera.attachControl( CANVAS, false );

        var light = new BABYLON.HemisphericLight( 'light', new BABYLON.Vector3( 0, 1, 0 ), scene );

        var ground = BABYLON.Mesh.CreatePlane( 'ground', 500, scene );
        ground.rotation.x = Math.PI / 2; // TODO: simplify this (CreateGround())
        ground.checkCollisions = true;
        ground.material = new BABYLON.StandardMaterial( "txtGround", scene );
        ground.material.diffuseTexture = new BABYLON.Texture( "gfx/doom/acid.png", scene );
        ground.material.diffuseTexture.uScale = 20.0;
        ground.material.diffuseTexture.vScale = 20.0;

        genCubes( scene );
        renderDoomguys( scene );
        renderAnimatedMonsters( scene );
        playBackgroundMusic( scene );

        var shotgunSfx = new BABYLON.Sound( "shotgunSfx", "snds/dsshotgn.wav", scene );
        window.addEventListener( "click", function ( e ) {
            if ( e.button === 0 ) {
                shotgunSfx.play();
            }

            var bullet = new Bullet( camera, scene );
            BULLETS.push( bullet );
        } );

        return scene;
    };

    var scene = createScene();

    ENGINE.runRenderLoop( function () {
        var toRemove = [];
        for ( var i = 0, l = BULLETS.length; i < l; i++ ) {
            if ( BULLETS[ i ].update() ) {
                toRemove.push( i );
                BULLETS[ i ].dispose();
            }
        }

        for ( var i = 0, l = toRemove.length; i < l; i++ ) {
            BULLETS.splice( toRemove[ i ], 1 );
        }


        scene.render();
    } );
}

window.addEventListener( 'resize', function () {
    ENGINE.resize();
} );