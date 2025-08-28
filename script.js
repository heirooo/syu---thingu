const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start-button');
const returnButton = document.getElementById('return-button');
const titleScreen = document.getElementById('title-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameTimeDisplay = document.getElementById('game-time');
const livesCountDisplay = document.getElementById('lives-count');

canvas.width = 450;
canvas.height = 800;

let gameRunning = false;
let lastTime = 0;
let deltaTime = 0;
let gameStartTime = 0;
let touchStartX = 0;
let touchStartY = 0;

// キャラクター、弾、敵の画像
// TODO: ここに用意した画像のパスを設定してください
const playerImage = new Image();
const playerBulletImage = new Image();
const enemyImage = new Image();
const enemyBulletImage = new Image();
const obstacleImage = new Image();

// 画像をロードする
// playerImage.src = 'player.png';
// playerBulletImage.src = 'playertama.png';
// enemyImage.src = 'teki.png';
// enemyBulletImage.src = 'tekitama.png';
// obstacleImage.src = 'obj.png';

// ゲームオブジェクトクラス
class GameObject {
    constructor(x, y, width, height, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = image;
    }

    draw() {
        if (this.image) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            // 画像がない場合は四角形で代用
            ctx.fillStyle = 'blue';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    // 衝突判定
    isColliding(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }
}

// プレイヤー
let player = new GameObject(canvas.width / 2 - 25, canvas.height - 100, 50, 50, playerImage);
let playerLives = 3;
let isInvincible = false;
let lastShotTime = 0;
const fireRate = 1000 / 5; // 1秒に5発

// 弾
let playerBullets = [];
let enemyBullets = [];

// 敵と障害物
let enemies = [];
let obstacles = [];
let lastEnemySpawn = 0;
let lastObstacleSpawn = 0;

// 敵と障害物の出現頻度
let enemySpawnInterval = 5000;
let obstacleSpawnInterval = 3000;

// ゲームのリセット
function resetGame() {
    player = new GameObject(canvas.width / 2 - 25, canvas.height - 100, 50, 50, playerImage);
    playerLives = 3;
    isInvincible = false;
    playerBullets = [];
    enemyBullets = [];
    enemies = [];
    obstacles = [];
    lastShotTime = 0;
    lastEnemySpawn = 0;
    lastObstacleSpawn = 0;
    enemySpawnInterval = 5000;
    obstacleSpawnInterval = 3000;
    livesCountDisplay.textContent = `残機: ${playerLives}`;
}

// ゲーム開始
function startGame() {
    resetGame();
    titleScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameRunning = false; // キャラクターを触るまでゲームを開始しない
    gameStartTime = Date.now();
    requestAnimationFrame(gameLoop);
}

// ゲームループ
function gameLoop(timestamp) {
    deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // ゲームが開始していない場合はプレイヤーのみ描画
    if (!gameRunning) {
        player.draw();
        requestAnimationFrame(gameLoop);
        return;
    }

    // 時間経過で出現頻度を上げる
    const timeElapsed = Date.now() - gameStartTime;
    enemySpawnInterval = Math.max(1000, 5000 - timeElapsed * 0.005);
    obstacleSpawnInterval = Math.max(1000, 3000 - timeElapsed * 0.003);

    // オブジェクトの更新
    updatePlayer();
    updatePlayerBullets();
    updateEnemies();
    updateEnemyBullets();
    updateObstacles();

    // 描画
    drawObjects();
    
    // 衝突判定
    checkCollisions();

    // ゲームオーバー判定
    if (playerLives <= 0) {
        endGame();
        return;
    }

    requestAnimationFrame(gameLoop);
}

function updatePlayer() {
    // プレイヤーの動きはタッチイベントで処理
}

function updatePlayerBullets() {
    playerBullets.forEach(bullet => bullet.y -= 7);
    playerBullets = playerBullets.filter(bullet => bullet.y > -bullet.height);
}

function updateEnemies() {
    if (Date.now() - lastEnemySpawn > enemySpawnInterval && enemies.length < 3) {
        const x = Math.random() * (canvas.width - 50);
        const y = -50;
        enemies.push({
            ...new GameObject(x, y, 50, 50, enemyImage),
            health: 5,
            lastShot: Date.now()
        });
        lastEnemySpawn = Date.now();
    }
    enemies.forEach(enemy => enemy.y += 1);
    
    // 敵の弾発射
    enemies.forEach(enemy => {
        if (Date.now() - enemy.lastShot > 5000) {
            const bulletSpeed = 3;
            for (let i = -1; i <= 1; i++) { // 3方向に発射
                enemyBullets.push(new GameObject(enemy.x + enemy.width / 2, enemy.y + enemy.height, 10, 10, enemyBulletImage));
                enemyBullets[enemyBullets.length - 1].dx = i * 2;
                enemyBullets[enemyBullets.length - 1].dy = bulletSpeed;
            }
            enemy.lastShot = Date.now();
        }
    });

    enemies = enemies.filter(enemy => enemy.y < canvas.height);
}

function updateEnemyBullets() {
    enemyBullets.forEach(bullet => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;
    });
    enemyBullets = enemyBullets.filter(bullet => bullet.y < canvas.height);
}

function updateObstacles() {
    if (Date.now() - lastObstacleSpawn > obstacleSpawnInterval) {
        const width = 50 + Math.random() * (canvas.width - 100);
        const x = Math.random() * (canvas.width - width);
        const y = -50;
        obstacles.push({
            ...new GameObject(x, y, width, 50, obstacleImage),
            health: 3
        });
        lastObstacleSpawn = Date.now();
    }
    obstacles.forEach(obstacle => obstacle.y += 1.5);
    obstacles = obstacles.filter(obstacle => obstacle.y < canvas.height);
}

function drawObjects() {
    player.draw();
    playerBullets.forEach(bullet => bullet.draw());
    enemies.forEach(enemy => enemy.draw());
    enemyBullets.forEach(bullet => bullet.draw());
    obstacles.forEach(obstacle => obstacle.draw());
}

function checkCollisions() {
    // プレイヤーと敵の弾
    if (!isInvincible) {
        enemyBullets.forEach((bullet, bIndex) => {
            if (player.isColliding(bullet)) {
                takeDamage();
                enemyBullets.splice(bIndex, 1);
            }
        });
    }

    // プレイヤーと障害物
    if (!isInvincible) {
        obstacles.forEach((obstacle) => {
            if (player.isColliding(obstacle)) {
                takeDamage();
            }
        });
    }

    // プレイヤーの弾と敵
    playerBullets.forEach((pBullet, pbIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (pBullet.isColliding(enemy)) {
                enemy.health--;
                playerBullets.splice(pbIndex, 1);
                if (enemy.health <= 0) {
                    enemies.splice(eIndex, 1);
                }
            }
        });
    });

    // プレイヤーの弾と障害物
    playerBullets.forEach((pBullet, pbIndex) => {
        obstacles.forEach((obstacle, oIndex) => {
            if (pBullet.isColliding(obstacle)) {
                obstacle.health--;
                playerBullets.splice(pbIndex, 1);
                if (obstacle.health <= 0) {
                    obstacles.splice(oIndex, 1);
                }
            }
        });
    });
}

function takeDamage() {
    playerLives--;
    livesCountDisplay.textContent = `残機: ${playerLives}`;
    isInvincible = true;
    setTimeout(() => {
        isInvincible = false;
    }, 1000); // 1秒間の無敵時間
}

function endGame() {
    gameRunning = false;
    gameOverScreen.classList.remove('hidden');
    const timeInSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const seconds = (timeInSeconds % 60).toString().padStart(2, '0');
    gameTimeDisplay.textContent = `タイム：${minutes}:${seconds}`;
}

// イベントリスナー
startButton.addEventListener('click', startGame);
returnButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    titleScreen.classList.remove('hidden');
});

// タッチイベント
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameRunning) {
        gameRunning = true; // ゲーム開始
    }
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (gameRunning) {
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        
        player.x = Math.min(Math.max(0, player.x + dx), canvas.width - player.width);
        player.y = Math.min(Math.max(0, player.y + dy), canvas.height - player.height);
        
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;

        // 押している間だけ弾を発射
        if (Date.now() - lastShotTime > fireRate) {
            playerBullets.push(new GameObject(player.x + player.width / 2 - 2, player.y, 4, 15, playerBulletImage));
            lastShotTime = Date.now();
        }
    }
});