import "./style.css";
import Phaser from "phaser";

const sizes = {
  width: 800,
  height: 900,
};

const GRID_SIZE = 4;
const TILE_SIZE = 150;
const TILE_PADDING = 10;
const GRID_OFFSET_X = (sizes.width - GRID_SIZE * (TILE_SIZE + TILE_PADDING)) / 2;
const GRID_OFFSET_Y = 150;

const gameStartDiv = document.querySelector("#gameStartDiv");
const gameStartBtn = document.querySelector("#gameStartBtn");
const gameEndDiv = document.querySelector("#gameEndDiv");
const gameEndBtn = document.querySelector("#gameEndBtn");
const gameWinLoseSpan = document.querySelector("#gameWinLoseSpan");
const gameEndScoreSpan = document.querySelector("#gameEndScoreSpan");

class MergeGameScene extends Phaser.Scene {
  constructor() {
    super("merge-game");
    this.grid = [];
    this.tiles = [];
    this.score = 0;
    this.textScore = null;
    this.selectedTile = null;
    this.canInteract = true;
    this.mergeSound = null;
    this.moveSound = null;
    this.bgMusic = null;
    this.nextId = 1;
    this.egg = null;
    this.eggUses = 5;
    this.eggUsesText = null;
  }

  preload() {
    this.load.image("tile1", "/assets/tile1.png");
    this.load.image("tile2", "/assets/tile2.png");
    this.load.image("tile3", "/assets/tile3.png");
    this.load.image("tile4", "/assets/tile4.png");
    this.load.image("tile5", "/assets/tile5.png");
    this.load.image("tile6", "/assets/tile6.png");
    this.load.image("tile7", "/assets/tile7.png");
    this.load.image("egg", "/assets/egg.png");
    
    this.load.audio("merge", "/assets/merge.mp3");
    this.load.audio("move", "/assets/move.mp3");
    this.load.audio("bgMusic", "/assets/bgMusic.mp3");
  }

  create() {
    this.score = 0;
    this.nextId = 1;
    this.canInteract = true;
    this.eggUses = 5;

    // Background
    this.add.rectangle(sizes.width / 2, sizes.height / 2, sizes.width, sizes.height, 0x2c3e50);

    // Title
    this.add.text(sizes.width / 2, 40, "MERGE GAME", {
      font: "bold 40px Arial",
      fill: "#ffffff",
      align: "center"
    }).setOrigin(0.5);

    // Score display
    this.textScore = this.add.text(sizes.width / 2, 90, "Score: 0", {
      font: "28px Arial",
      fill: "#ffd700",
      align: "center"
    }).setOrigin(0.5);

    // Grid background
    this.add.rectangle(
      GRID_OFFSET_X + (GRID_SIZE * (TILE_SIZE + TILE_PADDING)) / 2,
      GRID_OFFSET_Y + (GRID_SIZE * (TILE_SIZE + TILE_PADDING)) / 2,
      GRID_SIZE * (TILE_SIZE + TILE_PADDING),
      GRID_SIZE * (TILE_SIZE + TILE_PADDING),
      0x1a252f
    );

    // Initialize grid
    this.grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    this.tiles = [];

    // Audio
    this.mergeSound = this.sound.add("merge");
    this.moveSound = this.sound.add("move");
    
    if (!this.sound.get("bgMusic")) {
      this.bgMusic = this.sound.add("bgMusic");
      this.bgMusic.play({ loop: true });
    } else {
      this.bgMusic = this.sound.get("bgMusic");
    }

    // Create egg
    this.createEgg();

    // Add starting tiles
    this.spawnNewTile();
    this.spawnNewTile();
  }

  createEgg() {
    const eggX = sizes.width - 80;
    const eggY = GRID_OFFSET_Y + 50;

    this.egg = this.add.container(eggX, eggY);
    
    const eggImage = this.add.image(0, 0, "egg");
    eggImage.setDisplaySize(60, 60);

    this.eggUsesText = this.add.text(0, 0, this.eggUses.toString(), {
      font: "bold 20px Arial",
      fill: "#ffffff",
      align: "center"
    }).setOrigin(0.5);

    this.egg.add(eggImage);
    this.egg.add(this.eggUsesText);

    this.egg.setInteractive(
      new Phaser.Geom.Circle(0, 0, 35),
      Phaser.Geom.Circle.Contains
    );

    this.egg.on("pointerdown", () => {
      this.clickEgg();
    });

    this.egg.on("pointerover", () => {
      this.tweens.add({
        targets: this.egg,
        scale: 1.1,
        duration: 100
      });
    });

    this.egg.on("pointerout", () => {
      this.tweens.add({
        targets: this.egg,
        scale: 1,
        duration: 100
      });
    });
  }

  clickEgg() {
    if (this.eggUses <= 0) return;

    this.eggUses--;
    this.eggUsesText.setText(this.eggUses.toString());

    // Spawn a new tile1 in a random empty cell
    this.spawnNewTile();

    // Egg animation
    this.tweens.add({
      targets: this.egg,
      scale: { from: 1, to: 0.9 },
      duration: 150,
      yoyo: true
    });

    // Remove egg if out of uses
    if (this.eggUses <= 0) {
      this.tweens.add({
        targets: this.egg,
        alpha: 0.5,
        duration: 300
      });
      this.egg.disableInteractive();
    }
  }

  update() {
    this.tiles.forEach(tile => {
      if (tile.targetX !== undefined) {
        tile.graphics.x = Phaser.Math.Linear(tile.graphics.x, tile.targetX, 0.15);
        tile.graphics.y = Phaser.Math.Linear(tile.graphics.y, tile.targetY, 0.15);
      }
    });
  }

  spawnNewTile() {
    const emptyCells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.grid[row][col] === null) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length === 0) {
      this.endGame();
      return;
    }

    const { row, col } = Phaser.Utils.Array.GetRandom(emptyCells);
    const level = Math.random() < 0.9 ? 1 : 2; 
    this.createTile(row, col, level);
  }

  createTile(row, col, level) {
    const x = GRID_OFFSET_X + col * (TILE_SIZE + TILE_PADDING) + TILE_SIZE / 2;
    const y = GRID_OFFSET_Y + row * (TILE_SIZE + TILE_PADDING) + TILE_SIZE / 2;

    const tileGraphics = this.add.container(x, y);
    
    // Make the container interactive
    tileGraphics.setInteractive(
      new Phaser.Geom.Rectangle(
        -(TILE_SIZE - TILE_PADDING) / 2,
        -(TILE_SIZE - TILE_PADDING) / 2,
        TILE_SIZE - TILE_PADDING,
        TILE_SIZE - TILE_PADDING
      ),
      Phaser.Geom.Rectangle.Contains
    );

    const tileAsset = `tile${level}`;
    const tileImage = this.add.image(0, 0, tileAsset);
    tileImage.setDisplaySize(TILE_SIZE - TILE_PADDING, TILE_SIZE - TILE_PADDING);

    const levelText = this.add.text(0, 0, level.toString(), {
      font: "bold 32px Arial",
      fill: "#ffffff",
      align: "center"
    }).setOrigin(0.5);

    tileGraphics.add(tileImage);
    tileGraphics.add(levelText);

    this.tweens.add({
      targets: tileGraphics,
      scale: { from: 0.5, to: 1 },
      duration: 200,
      ease: "Back.out"
    });

    const tileObject = {
      id: this.nextId++,
      level,
      row,
      col,
      graphics: tileGraphics,
      image: tileImage,
      text: levelText,
      targetX: x,
      targetY: y,
      isNew: true
    };

    // Add click listener directly to the container
    tileGraphics.on("pointerdown", () => {
      this.handleTileClick(tileObject);
    });

    this.grid[row][col] = tileObject;
    this.tiles.push(tileObject);
  }

  handleTileClick(clickedTile) {
    if (!this.canInteract) return;

    if (this.selectedTile === null) {
      this.selectedTile = clickedTile;
      this.highlightTile(clickedTile);
    } else if (this.selectedTile.id === clickedTile.id) {
      this.unhighlightTile(clickedTile);
      this.selectedTile = null;
    } else {
      this.attemptMergeOrSwap(this.selectedTile, clickedTile);
      this.unhighlightTile(this.selectedTile);
      this.selectedTile = null;
    }
  }

  highlightTile(tile) {
    this.tweens.add({
      targets: tile.graphics,
      scale: 1.15,
      duration: 150,
      ease: "Power2.out"
    });
  }

  unhighlightTile(tile) {
    this.tweens.add({
      targets: tile.graphics,
      scale: 1,
      duration: 150,
      ease: "Power2.out"
    });
  }

  attemptMergeOrSwap(tile1, tile2) {
    if (tile1.level === tile2.level) {
      this.mergeTiles(tile1, tile2);
    } else {
      this.swapTiles(tile1, tile2);
    }
  }

  mergeTiles(tile1, tile2) {
    this.canInteract = false;

    // Clean out tile1's old grid coordinates so the space is marked empty
    this.grid[tile1.row][tile1.col] = null;
    
    this.tiles = this.tiles.filter(t => t.id !== tile1.id);
    
    const explodeX = tile1.graphics.x;
    const explodeY = tile1.graphics.y;

    this.tweens.add({
      targets: tile1.graphics,
      scale: 0,
      alpha: 0,
      duration: 200,
      ease: "Power2.in",
      onComplete: () => {
        tile1.graphics.destroy();
      }
    });

    tile2.level++;
    this.updateTileGraphics(tile2);
    // Make sure tile2 stays in the grid with updated reference
    this.grid[tile2.row][tile2.col] = tile2;
    
    this.score += Math.pow(2, tile2.level);
    this.textScore.setText(`Score: ${this.score}`);

    this.tweens.add({
      targets: tile2.graphics,
      scale: { from: 1, to: 1.2 },
      duration: 150,
      ease: "Back.out",
      yoyo: true
    });

    this.mergeSound.play();
    this.createParticles(explodeX, explodeY);

    if (tile2.level >= 7) {
      this.time.delayedCall(500, () => {
        this.winGame();
      });
    } else {
      this.time.delayedCall(300, () => {
        this.canInteract = true;
        this.spawnNewTile();
      });
    }
  }

  swapTiles(tile1, tile2) {
    this.moveSound.play();
    
    [this.grid[tile1.row][tile1.col], this.grid[tile2.row][tile2.col]] = 
    [this.grid[tile2.row][tile2.col], this.grid[tile1.row][tile1.col]];

    [tile1.row, tile1.col, tile2.row, tile2.col] = 
    [tile2.row, tile2.col, tile1.row, tile1.col];

    const x1 = GRID_OFFSET_X + tile1.col * (TILE_SIZE + TILE_PADDING) + TILE_SIZE / 2;
    const y1 = GRID_OFFSET_Y + tile1.row * (TILE_SIZE + TILE_PADDING) + TILE_SIZE / 2;
    const x2 = GRID_OFFSET_X + tile2.col * (TILE_SIZE + TILE_PADDING) + TILE_SIZE / 2;
    const y2 = GRID_OFFSET_Y + tile2.row * (TILE_SIZE + TILE_PADDING) + TILE_SIZE / 2;

    tile1.targetX = x1;
    tile1.targetY = y1;
    tile2.targetX = x2;
    tile2.targetY = y2;
  }

  updateTileGraphics(tile) {
    const newAsset = `tile${Math.min(tile.level, 7)}`;
    tile.image.setTexture(newAsset);
    tile.text.setText(tile.level.toString());
  }

  createParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const vx = Math.cos(angle) * 200;
      const vy = Math.sin(angle) * 200;

      const particle = this.add.rectangle(x, y, 10, 10, 0xffd700);
      this.tweens.add({
        targets: particle,
        x: x + vx * 0.5,
        y: y + vy * 0.5,
        alpha: 0,
        scale: 0,
        duration: 400,
        ease: "Power2.out",
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  winGame() {
    this.canInteract = false; 
    gameWinLoseSpan.textContent = "You Win!";
    gameEndScoreSpan.textContent = this.score;
    gameEndDiv.style.display = "flex";
    this.triggerConfetti();
  }

  endGame() {
    this.canInteract = false;
    gameWinLoseSpan.textContent = "Game Over!";
    gameEndScoreSpan.textContent = this.score;
    gameEndDiv.style.display = "flex";
    this.triggerSadFaces();
  }

  triggerConfetti() {
    if (typeof confetti === "function") {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => {
        confetti({ particleCount: 50, spread: 100, origin: { y: 0.6 } });
      }, 250);
    } else {
      console.log("Confetti system loaded successfully! Player wins!");
    }
  }

  triggerSadFaces() {
    const sadFaceCount = 10;
    
    for (let i = 0; i < sadFaceCount; i++) {
      const sadFace = this.add.text(
        Phaser.Math.Between(0, sizes.width),
        Phaser.Math.Between(-50, -100),
        "☹️",
        { fontSize: "48px" }
      );

      this.tweens.add({
        targets: sadFace,
        y: sizes.height + 50,
        rotation: Phaser.Math.PI * 2,
        duration: Phaser.Math.Between(2000, 3500),
        delay: i * 100,
        ease: "Linear",
        onComplete: () => {
          sadFace.destroy();
          if (i === sadFaceCount - 1) {
            this.scene.pause("merge-game");
          }
        }
      });
    }
  }
}

const config = {
  type: Phaser.WEBGL,
  width: sizes.width,
  height: sizes.height,
  canvas: document.querySelector("#gameCanvas"),
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [MergeGameScene],
};

const game = new Phaser.Game(config);

setTimeout(() => {
  game.scene.pause("merge-game");
}, 100);

// Start Button Handler
gameStartBtn.addEventListener("click", () => {
  gameStartDiv.style.display = "none";
  game.scene.resume("merge-game");
});

// Try Again Button Handler
gameEndBtn.addEventListener("click", () => {
  gameEndDiv.style.display = "none";
  const currentScene = game.scene.keys["merge-game"];
  
  if (currentScene) {
    game.scene.resume("merge-game");
    currentScene.scene.restart();
  }
});